import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import type { CommandRunner } from '../src/exec/runner'
import type { ApplyEvent } from '../src/plan/apply'
import { applyPlan } from '../src/plan/apply'
import type { Plan } from '../src/plan/types'
import { fakeRunner, tempDir } from './helpers'

const title = { key: 'test' }

describe('applyPlan', () => {
  it('runs commands, writes files and backs up what it changes', async () => {
    const home = await tempDir()
    const backupDir = join(home, 'backups')
    const settings = join(home, '.claude', 'settings.json')
    const created = join(home, '.claude', 'new.json')
    await mkdir(join(home, '.claude'))
    await writeFile(settings, '{\n  "a": 1\n}\n')

    const runner = fakeRunner({ 'tool install': {} })
    const events: ApplyEvent['type'][] = []
    const plan: Plan = {
      tools: [
        {
          tool: 'claude-code',
          notices: [],
          steps: [
            {
              kind: 'command',
              title,
              command: 'tool',
              args: ['install'],
            },
            {
              kind: 'file',
              title,
              path: settings,
              format: 'json',
              edits: [
                {
                  path: ['b'],
                  value: 2,
                },
              ],
            },
            {
              kind: 'file',
              title,
              path: settings,
              format: 'json',
              edits: [
                {
                  path: ['c'],
                  value: 3,
                },
              ],
            },
            {
              kind: 'file',
              title,
              path: created,
              format: 'json',
              edits: [
                {
                  path: ['a'],
                  value: 1,
                },
              ],
            },
            {
              kind: 'file',
              title,
              path: created,
              format: 'json',
              edits: [
                {
                  path: ['a'],
                  value: 1,
                },
              ],
            },
          ],
        },
      ],
    }

    const [result] = await applyPlan(plan, {
      runner,
      backupDir,
      home,
      onEvent: event => events.push(event.type),
    })

    expect(result!.ok).toBe(true)
    expect(result!.steps.map(step => step.status)).toEqual(['done', 'done', 'done', 'done', 'unchanged'])
    expect(runner.calls).toEqual([['tool', 'install']])
    expect(JSON.parse(await readFile(settings, 'utf8'))).toEqual({ a: 1, b: 2, c: 3 })
    // Backed up once, before the first change.
    expect(result!.steps[1]!.backup).toBe(join(backupDir, '.claude', 'settings.json'))
    expect(await readFile(join(backupDir, '.claude', 'settings.json'), 'utf8')).toBe('{\n  "a": 1\n}\n')
    // A file that did not exist has nothing to back up.
    expect(result!.steps[3]!.backup).toBeUndefined()
    expect(events).toEqual([
      'step-start',
      'step-end',
      'step-start',
      'step-end',
      'step-start',
      'step-end',
      'step-start',
      'step-end',
      'step-start',
      'step-end',
    ])
  })

  it('skips the rest of a tool after a failure but keeps other tools going', async () => {
    const home = await tempDir()
    const runner = fakeRunner({
      'ok run': {},
      'bad run': { exitCode: 1, stderr: 'line1\nboom\n' },
      'quiet run': { exitCode: 2 },
    })
    const plan: Plan = {
      tools: [
        {
          tool: 'claude-code',
          notices: [],
          steps: [
            {
              kind: 'command',
              title,
              command: 'bad',
              args: ['run'],
            },
            {
              kind: 'command',
              title,
              command: 'ok',
              args: ['run'],
            },
          ],
        },
        {
          tool: 'codex',
          notices: [],
          steps: [
            {
              kind: 'command',
              title,
              command: 'ok',
              args: ['run'],
            },
          ],
        },
        {
          tool: 'opencode',
          notices: [],
          steps: [
            {
              kind: 'command',
              title,
              command: 'quiet',
              args: ['run'],
            },
          ],
        },
        {
          tool: 'gemini-cli',
          notices: [],
          steps: [
            {
              kind: 'command',
              title,
              command: 'missing',
              args: [],
            },
          ],
        },
      ],
    }

    const results = await applyPlan(plan, {
      runner,
      backupDir: join(home, 'backups'),
    })

    expect(results.map(result => result.ok)).toEqual([false, true, false, false])
    expect(results[0]!.steps).toMatchObject([{ status: 'failed', detail: 'line1\nboom' }, { status: 'skipped' }])
    expect(results[2]!.steps[0]!.detail).toBe('exit code 2')
    expect(results[3]!.steps[0]!.detail).toBe('missing: not found')
    expect(runner.calls.filter(call => call[0] === 'ok')).toHaveLength(1)
  })

  it('backs up files a command touches before running it', async () => {
    const home = await tempDir()
    const backupDir = join(home, 'backups')
    const touched = join(home, '.claude.json')
    await writeFile(touched, '{"mcpServers":{"a":{}}}')
    const runner: CommandRunner = {
      async run() {
        await writeFile(touched, '{}')
        return { exitCode: 1, stdout: '', stderr: 'add failed' }
      },
    }
    const [result] = await applyPlan(
      {
        tools: [
          {
            tool: 'claude-code',
            notices: [],
            steps: [
              {
                kind: 'command',
                title,
                command: 'claude',
                args: ['mcp'],
                touches: [touched, join(home, 'missing.json')],
              },
            ],
          },
        ],
      },
      { runner, backupDir, home },
    )
    expect(result!.steps[0]).toMatchObject({ status: 'failed', backup: join(backupDir, '.claude.json') })
    expect(await readFile(join(backupDir, '.claude.json'), 'utf8')).toBe('{"mcpServers":{"a":{}}}')
  })

  it('turns a broken file into a failed step', async () => {
    const home = await tempDir()
    const path = join(home, 'broken.json')
    await writeFile(path, '{ "a": ')
    const [result] = await applyPlan(
      {
        tools: [
          {
            tool: 'claude-code',
            notices: [],
            steps: [
              {
                kind: 'file',
                title,
                path,
                format: 'json',
                edits: [
                  {
                    path: ['a'],
                    value: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        runner: fakeRunner(),
        backupDir: join(home, 'backups'),
      },
    )
    expect(result!.steps[0]).toMatchObject({
      status: 'failed',
      detail: expect.stringContaining('not valid JSON'),
    })
    expect(await readFile(path, 'utf8')).toBe('{ "a": ')
  })
})
