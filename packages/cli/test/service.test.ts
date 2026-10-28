import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { createContext } from '@zcf/core'
import type { StepEvent } from '@zcf/ui-kit'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createLocalService } from '../src/service'

let home: string
let path: string

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'zcf-service-'))
  path = join(home, '.ufomiao', 'zcf', 'zcf.json')
})

afterEach(async () => {
  await rm(home, { recursive: true, force: true })
})

function service() {
  const ctx = createContext({
    home,
    platform: 'linux',
    env: {},
    runner: {
      run: async (command, args) =>
        [command, ...args].join(' ') === 'claude --version'
          ? { exitCode: 0, stdout: '2.1.0', stderr: '' }
          : { exitCode: 0, stdout: '', stderr: '' },
    },
  })
  return createLocalService(ctx, path, () => new Date('2026-10-24T08:00:00.000Z'))
}

describe('createLocalService', () => {
  it('starts from an empty draft when there is no config yet, and saves it', async () => {
    const local = service()
    expect(await local.load()).toEqual({ path, draft: { version: 1 }, exists: false, issues: [] })

    await local.save({ version: 1, tools: ['claude-code'] })
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ version: 1, tools: ['claude-code'] })
    expect(await local.load()).toMatchObject({ exists: true, draft: { tools: ['claude-code'] } })
  })

  it('reports the mirror ZCF_MIRROR picks, which outranks the config', async () => {
    const ctx = createContext({ home, platform: 'linux', env: { ZCF_MIRROR: 'cn' } })
    expect(await createLocalService(ctx, path).load()).toMatchObject({ envMirror: 'china' })
    expect(await service().load()).not.toHaveProperty('envMirror')
  })

  it('answers with no presets when no source can be reached', async () => {
    // A port on this machine that nothing listens on: the fetch refuses at once, so no
    // real network is touched and the answer is the empty list.
    const ctx = createContext({ home, platform: 'linux', env: { ZCF_PRESETS_URL: 'https://127.0.0.1:1/none.json' } })
    await expect(createLocalService(ctx, path).presets()).resolves.toEqual({ presets: [], source: 'none' })
  })

  it('backs up the config before the first save of a session', async () => {
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, '{ "version": 1, "tools": [] }\n')
    const local = service()
    await local.load()
    await local.save({ version: 1, tools: ['codex'] })
    await local.save({ version: 1, tools: ['claude-code'] })
    const run = join(home, '.ufomiao', 'zcf', 'backups', '2026-10-24T08-00-00-000Z')
    const backup = join(run, '.ufomiao', 'zcf', 'zcf.json')
    expect(await readFile(backup, 'utf8')).toBe('{ "version": 1, "tools": [] }\n')
    expect(JSON.parse(await readFile(join(run, 'manifest.json'), 'utf8'))).toMatchObject({
      version: 1,
      reason: 'save',
      entries: [{ path: '.ufomiao/zcf/zcf.json', sha256: expect.any(String) }],
    })
  })

  it('lists, restores and prunes backups', async () => {
    const local = service()
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, '{ "version": 2 }')
    // A run from before manifests existed, seeded by hand at an earlier time.
    const earlier = join(home, '.ufomiao', 'zcf', 'backups', '2026-10-23T08-00-00-000Z', '.ufomiao', 'zcf')
    await mkdir(earlier, { recursive: true })
    await writeFile(join(earlier, 'zcf.json'), '{ "version": 0 }')
    expect(await local.backups()).toMatchObject([
      { id: '2026-10-23T08-00-00-000Z', entries: [{ path: '.ufomiao/zcf/zcf.json' }] },
    ])

    const result = await local.restoreBackup('2026-10-23T08-00-00-000Z')
    expect(result).toMatchObject({ id: '2026-10-24T08-00-00-000Z', changed: 1, unchanged: 0, missing: 0 })
    expect(await readFile(path, 'utf8')).toBe('{ "version": 0 }')
    // The restore itself is undoable: its run holds what the file looked like before.
    expect(
      await readFile(
        join(home, '.ufomiao', 'zcf', 'backups', '2026-10-24T08-00-00-000Z', '.ufomiao', 'zcf', 'zcf.json'),
        'utf8',
      ),
    ).toBe('{ "version": 2 }')

    await expect(local.restoreBackup('nope')).rejects.toMatchObject({ detail: { key: 'cli.backup.missing' } })
    expect(await local.pruneBackups(1)).toEqual(['2026-10-23T08-00-00-000Z'])
    expect(await local.backups()).toMatchObject([{ id: '2026-10-24T08-00-00-000Z', reason: 'restore' }])
  })

  it("keeps one editor's save when another editor saves from the same starting point", async () => {
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, '{ "version": 1, "tools": [] }\n')
    const local = service()
    const { draft: start } = await local.load()
    // Two browser tabs loaded the same config; each saves a different change.
    await local.save({ ...start!, tools: ['codex'] }, start)
    await local.save({ ...start!, mirror: 'china' }, start)
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ version: 1, tools: ['codex'], mirror: 'china' })
  })

  it('reports why a broken config cannot be loaded', async () => {
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, '{ "version": ')
    expect(await service().load()).toMatchObject({
      path,
      exists: true,
      issues: [{ message: { key: 'configIssue.syntax' } }],
    })
  })

  it('detects tools, plans the saved config with previews and secrets, and applies it', async () => {
    const local = service()
    await local.save({
      version: 1,
      tools: ['claude-code'],
      provider: {
        name: 'relay',
        apiKey: 'sk-test-secret',
        anthropic: { baseUrl: 'https://relay.example.com' },
        models: {},
      },
    })
    expect(await local.detect(['claude-code'])).toEqual({
      'claude-code': { installed: true, command: 'claude', version: '2.1.0' },
    })

    const view = await local.plan()
    const steps = view.plan.tools[0]!.steps
    expect(view.previews[0]).toHaveLength(steps.length)
    expect(view.previews[0]!.some(preview => preview?.changed)).toBe(true)
    expect(view.secrets).toContain('sk-test-secret')

    const events: StepEvent[] = []
    const outcome = await local.apply(event => events.push(event))
    expect(outcome.results[0]!.ok).toBe(true)
    expect(events).toHaveLength(steps.length)
    expect(outcome.backupDir).toContain('2026-10-24T08-00-00-000Z')
  })

  it('refuses to plan a config that is not saved', async () => {
    await expect(service().plan()).rejects.toMatchObject({ detail: { key: 'service.configInvalid' } })
  })

  it('searches community skills, handing the index answer to the front ends', async () => {
    const real = globalThis.fetch
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          skills: [
            { name: 'using-git-worktrees', installs: 541, metadata: { repoOwner: 'obra', repoName: 'superpowers' } },
          ],
        }),
      )
    try {
      expect(await service().searchSkills('git')).toEqual({
        source: 'remote',
        skills: [{ name: 'using-git-worktrees', source: 'obra/superpowers', installs: 541 }],
      })
    } finally {
      globalThis.fetch = real
    }
  })
})
