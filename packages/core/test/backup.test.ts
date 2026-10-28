import { createHash } from 'node:crypto'
import { chmod, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import process from 'node:process'

import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import { BackupRun, backupRunDir, listBackups, pruneBackups, restoreBackup } from '../src/io/backup'
import { writeFileAtomic } from '../src/io/fs'
import { tempDir } from './helpers'

const at = (iso: string) => () => new Date(iso)

describe('BackupRun', () => {
  it('describes what it copied in a manifest', async () => {
    const home = await tempDir()
    const settings = join(home, '.claude', 'settings.json')
    await writeFileAtomic(settings, 'before')
    const run = new BackupRun(join(home, 'backups', 'run'), home, at('2026-10-24T08:00:00.000Z'), 'apply')

    expect(await run.snapshot(settings)).toBe(join(run.dir, '.claude', 'settings.json'))
    expect(await run.snapshot(settings)).toBe(join(run.dir, '.claude', 'settings.json'))
    expect(await run.snapshot(join(home, 'missing.json'))).toBeUndefined()
    await run.finish()

    expect(JSON.parse(await readFile(join(run.dir, 'manifest.json'), 'utf8'))).toEqual({
      version: 1,
      createdAt: '2026-10-24T08:00:00.000Z',
      reason: 'apply',
      entries: [
        {
          path: '.claude/settings.json',
          sha256: createHash('sha256').update('before').digest('hex'),
          size: 6,
          mode: (await stat(settings)).mode,
        },
      ],
    })
  })

  it('leaves no folder behind when it copied nothing', async () => {
    const home = await tempDir()
    const run = new BackupRun(join(home, 'backups', 'run'), home)
    await run.snapshot(join(home, 'missing.json'))
    await run.finish()
    await expect(readdir(join(home, 'backups'))).rejects.toThrow(/ENOENT/)

    // Even a folder something else left there does not survive an empty run; only the run's own folder goes.
    const emptied = new BackupRun(join(home, 'backups', 'run'), home)
    await mkdir(emptied.dir, { recursive: true })
    await emptied.finish()
    expect(await readdir(join(home, 'backups'))).toEqual([])
  })
})

describe('listBackups', () => {
  it('lists runs newest first, reading manifests and walking those without one', async () => {
    const home = await tempDir()
    const root = join(home, 'backups')

    const config = join(home, '.ufomiao', 'zcf', 'zcf.json')
    await writeFileAtomic(config, '{"version":1}')
    const newest = new BackupRun(
      backupRunDir(root, new Date('2026-10-24T08:00:00.000Z')),
      home,
      at('2026-10-24T08:00:00.000Z'),
      'save',
    )
    await newest.snapshot(config)
    await newest.finish()

    // A run from before manifests existed.
    const legacy = backupRunDir(root, new Date('2026-10-23T08:00:00.000Z'))
    await mkdir(join(legacy, '.claude'), { recursive: true })
    await writeFile(join(legacy, '.claude', 'settings.json'), 'old')
    await writeFile(join(legacy, 'stray.tmp'), 'x')

    // A run whose manifest cannot be parsed is walked like a legacy one, manifest skipped.
    const broken = backupRunDir(root, new Date('2026-10-22T08:00:00.000Z'))
    await mkdir(broken, { recursive: true })
    await writeFile(join(broken, 'manifest.json'), '{ nope')
    await writeFile(join(broken, 'a.txt'), 'a')

    const backups = await listBackups(root)
    expect(backups.map(backup => backup.id)).toEqual([
      '2026-10-24T08-00-00-000Z',
      '2026-10-23T08-00-00-000Z',
      '2026-10-22T08-00-00-000Z',
    ])
    expect(backups[0]).toMatchObject({
      reason: 'save',
      entries: [{ path: '.ufomiao/zcf/zcf.json', sha256: expect.any(String) }],
    })
    expect(backups[1]!.entries.map(entry => entry.path).toSorted()).toEqual(['.claude/settings.json', 'stray.tmp'])
    expect(backups[1]).not.toHaveProperty('reason')
    expect(backups[2]!.entries.map(entry => entry.path)).toEqual(['a.txt'])
  })

  it('reports nothing when there is no folder yet', async () => {
    expect(await listBackups(join(await tempDir(), 'backups'))).toEqual([])
  })
})

describe('restoreBackup', () => {
  it('puts files back with their mode, and is itself undoable', async () => {
    const home = await tempDir()
    const root = join(home, 'backups')
    const settings = join(home, '.claude', 'settings.json')
    const gone = join(home, '.codex', 'config.toml')
    const same = join(home, 'zcf.json')
    await writeFileAtomic(settings, 'before')
    await writeFileAtomic(gone, 'gone-before')
    await writeFileAtomic(same, 'same')

    const run = new BackupRun(
      backupRunDir(root, new Date('2026-10-24T08:00:00.000Z')),
      home,
      at('2026-10-24T08:00:00.000Z'),
    )
    await Promise.all([settings, gone, same].map(path => run.snapshot(path)))
    await run.finish()

    // What the machine looks like after the apply: one file changed, one deleted, one untouched.
    await writeFile(settings, 'after')
    await rm(gone)
    if (process.platform !== 'win32') await chmod(settings, 0o755)

    const result = await restoreBackup(root, '2026-10-24T08-00-00-000Z', home, at('2026-10-24T09:00:00.000Z'))
    expect(result).toEqual({ id: '2026-10-24T09-00-00-000Z', changed: 1, unchanged: 1, missing: 1 })
    expect(await readFile(settings, 'utf8')).toBe('before')
    expect(await readFile(gone, 'utf8')).toBe('gone-before')

    // The undo run holds what the files looked like before the restore, and only those that existed.
    const undo = (await listBackups(root)).find(backup => backup.id === result.id)
    expect(undo).toMatchObject({ reason: 'restore' })
    expect(undo!.entries.map(entry => entry.path).toSorted()).toEqual(['.claude/settings.json', 'zcf.json'])
    expect(await readFile(join(root, result.id, '.claude', 'settings.json'), 'utf8')).toBe('after')

    // Restoring the undo run puts the post-apply state back.
    const undone = await restoreBackup(root, result.id, home, at('2026-10-24T10:00:00.000Z'))
    expect(undone).toMatchObject({ changed: 1, unchanged: 1, missing: 0 })
    expect(await readFile(settings, 'utf8')).toBe('after')
  })

  it.skipIf(process.platform === 'win32')('restores the mode a file had', async () => {
    const home = await tempDir()
    const root = join(home, 'backups')
    const settings = join(home, 'settings.json')
    await writeFileAtomic(settings, 'private')
    const run = new BackupRun(
      backupRunDir(root, new Date('2026-10-24T08:00:00.000Z')),
      home,
      at('2026-10-24T08:00:00.000Z'),
    )
    await run.snapshot(settings)
    await run.finish()

    await chmod(settings, 0o755)
    await restoreBackup(root, '2026-10-24T08-00-00-000Z', home, at('2026-10-24T09:00:00.000Z'))
    expect((await stat(settings)).mode & 0o777).toBe(0o600)
  })

  it('restores binary content untouched', async () => {
    const home = await tempDir()
    const root = join(home, 'backups')
    const binary = join(home, 'bin', 'claude')
    const bytes = Buffer.from([0x00, 0x01, 0xff, 0xfe, 0x0a, 0x0d, 0x00, 0x7f])
    await mkdir(join(home, 'bin'), { recursive: true })
    await writeFile(binary, bytes)
    const run = new BackupRun(
      backupRunDir(root, new Date('2026-10-24T08:00:00.000Z')),
      home,
      at('2026-10-24T08:00:00.000Z'),
    )
    await run.snapshot(binary)
    await run.finish()

    await writeFile(binary, 'a text replacement')
    await restoreBackup(root, '2026-10-24T08-00-00-000Z', home, at('2026-10-24T09:00:00.000Z'))
    expect(await readFile(binary)).toEqual(bytes)
  })

  it('refuses an id with no run folder', async () => {
    const home = await tempDir()
    await expect(restoreBackup(join(home, 'backups'), 'nope', home)).rejects.toThrow(/No backup at/)
  })
})

describe('pruneBackups', () => {
  it('removes the oldest runs beyond the newest keep', async () => {
    const root = join(await tempDir(), 'backups')
    await Promise.all(
      [21, 22, 23, 24].map(async day => {
        const run = backupRunDir(root, new Date(`2026-10-${day}T08:00:00.000Z`))
        await mkdir(run, { recursive: true })
        await writeFile(join(run, 'a.txt'), 'a')
      }),
    )

    // The doomed ids keep listBackups' newest-first order.
    expect(await pruneBackups(root, 2)).toEqual(['2026-10-22T08-00-00-000Z', '2026-10-21T08-00-00-000Z'])
    expect((await listBackups(root)).map(backup => backup.id)).toEqual([
      '2026-10-24T08-00-00-000Z',
      '2026-10-23T08-00-00-000Z',
    ])
    expect(await pruneBackups(root, 10)).toEqual([])
  })
})
