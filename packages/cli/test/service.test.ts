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
    await expect(service().plan()).rejects.toThrow('missing or not valid')
  })
})
