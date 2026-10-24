import { chmod, lstat, readdir, readFile, stat, symlink, writeFile } from 'node:fs/promises'
import process from 'node:process'

import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import { backupRelativePath, readTextIfExists, snapshotFile, writeFileAtomic } from '../src/io/fs'
import { tempDir } from './helpers'

describe('readTextIfExists', () => {
  it('returns undefined for a missing file', async () => {
    expect(await readTextIfExists(join(await tempDir(), 'missing.json'))).toBeUndefined()
  })

  it('rethrows other errors', async () => {
    await expect(readTextIfExists(await tempDir())).rejects.toThrow(/EISDIR/)
  })
})

describe('writeFileAtomic', () => {
  it('creates parent folders and leaves no temp files', async () => {
    const dir = await tempDir()
    const path = join(dir, 'a', 'b', 'settings.json')
    await writeFileAtomic(path, '{}\n')
    expect(await readFile(path, 'utf8')).toBe('{}\n')
    expect(await readdir(join(dir, 'a', 'b'))).toEqual(['settings.json'])
  })

  it.skipIf(process.platform === 'win32')('keeps the mode of an existing file', async () => {
    const path = join(await tempDir(), 'secret.json')
    await writeFile(path, 'old')
    await chmod(path, 0o600)
    await writeFileAtomic(path, 'new')
    expect((await stat(path)).mode & 0o777).toBe(0o600)
    expect(await readFile(path, 'utf8')).toBe('new')
  })
})

describe('writeFileAtomic on POSIX', () => {
  it.skipIf(process.platform === 'win32')('creates new files readable only by the owner', async () => {
    const path = join(await tempDir(), 'new.json')
    await writeFileAtomic(path, '{}')
    expect((await stat(path)).mode & 0o777).toBe(0o600)
  })

  it.skipIf(process.platform === 'win32')('writes through a symlink and keeps the link', async () => {
    const dir = await tempDir()
    const target = join(dir, 'dotfiles', 'settings.json')
    const link = join(dir, 'settings.json')
    await writeFileAtomic(target, 'old')
    await symlink(target, link)
    await writeFileAtomic(link, 'new')
    expect((await lstat(link)).isSymbolicLink()).toBe(true)
    expect(await readFile(target, 'utf8')).toBe('new')
  })

  it.skipIf(process.platform === 'win32')('creates the missing target of a dangling symlink', async () => {
    const dir = await tempDir()
    const target = join(dir, 'dotfiles', 'settings.json')
    const link = join(dir, 'settings.json')
    await symlink('dotfiles/settings.json', link)
    await writeFileAtomic(link, 'new')
    expect((await lstat(link)).isSymbolicLink()).toBe(true)
    expect(await readFile(target, 'utf8')).toBe('new')
  })
})

describe('backupRelativePath', () => {
  it('maps paths inside home relative to it', () => {
    expect(backupRelativePath('/home/me/.claude/settings.json', '/home/me')).toBe('.claude/settings.json')
    expect(backupRelativePath('C:\\Users\\me\\.claude\\settings.json', 'C:\\Users\\me')).toBe('.claude/settings.json')
  })

  it('strips the root of paths outside home', () => {
    expect(backupRelativePath('/etc/zcf.json', '/home/me')).toBe('etc/zcf.json')
    expect(backupRelativePath('/home/me', '/home/me')).toBe('home/me')
    expect(backupRelativePath('D:\\work\\zcf.json')).toBe('D/work/zcf.json')
  })
})

describe('snapshotFile', () => {
  it('copies an existing file under the backup root', async () => {
    const home = await tempDir()
    const backups = await tempDir()
    const path = join(home, '.claude', 'settings.json')
    await writeFileAtomic(path, 'before')
    const target = await snapshotFile(path, backups, home)
    expect(target).toBe(join(backups, '.claude', 'settings.json'))
    expect(await readFile(target!, 'utf8')).toBe('before')
  })

  it('does nothing for a missing file', async () => {
    const backups = await tempDir()
    expect(await snapshotFile(join(backups, 'missing'), backups)).toBeUndefined()
    expect(await readdir(backups)).toEqual([])
  })
})
