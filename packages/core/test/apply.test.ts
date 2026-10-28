import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'

import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import type { CommandRunner } from '../src/exec/runner'
import type { ApplyEvent } from '../src/plan/apply'
import { applyPlan } from '../src/plan/apply'
import type { Plan } from '../src/plan/types'
import { fakeRunner, tempDir } from './helpers'

const title = { key: 'test' }

const npxStep = (name: string, serial?: string) => ({
  kind: 'command' as const,
  title,
  command: 'npx',
  args: [name],
  serial,
})

describe('applyPlan', () => {
  it('copies shipped templates, counting an identical copy as unchanged', async () => {
    const home = await tempDir()
    const backupDir = join(home, 'backups')
    const template = join(home, 'tpl', 'planner.md')
    const target = join(home, '.claude', 'agents', 'zcf', 'planner.md')
    await mkdir(join(home, 'tpl'))
    await writeFile(template, '# planner\n')

    const copy = { kind: 'copy' as const, title, from: template, to: target }
    const plan: Plan = { tools: [{ tool: 'claude-code', notices: [], steps: [copy] }] }
    const [first] = await applyPlan(plan, { runner: fakeRunner(), backupDir, home })
    expect(first!.steps[0]!.status).toBe('done')
    expect(await readFile(target, 'utf8')).toBe('# planner\n')

    // The same content again is no work; a changed template refreshes the file.
    const [again] = await applyPlan(plan, { runner: fakeRunner(), backupDir: join(home, 'backups2'), home })
    expect(again!.steps[0]!.status).toBe('unchanged')
    await writeFile(template, '# planner v2\n')
    const [updated] = await applyPlan(plan, { runner: fakeRunner(), backupDir: join(home, 'backups3'), home })
    expect(updated!.steps[0]!.status).toBe('done')
    expect(updated!.steps[0]!.backup).toBe(join(join(home, 'backups3'), '.claude', 'agents', 'zcf', 'planner.md'))
    expect(await readFile(target, 'utf8')).toBe('# planner v2\n')

    // A missing template is a packaging bug, reported as a failure, never an empty write.
    const [broken] = await applyPlan(
      { tools: [{ tool: 'claude-code', notices: [], steps: [{ ...copy, from: join(home, 'tpl', 'absent.md') }] }] },
      { runner: fakeRunner(), backupDir: join(home, 'backups4'), home },
    )
    expect(broken!.steps[0]!.status).toBe('failed')
    expect(await readFile(target, 'utf8')).toBe('# planner v2\n')
  })

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
    // The run describes what it copied in a manifest.
    const manifest = JSON.parse(await readFile(join(backupDir, 'manifest.json'), 'utf8'))
    expect(manifest).toEqual({
      version: 1,
      createdAt: expect.any(String),
      reason: 'apply',
      entries: [
        {
          path: '.claude/settings.json',
          sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
          size: 13,
          mode: (await stat(settings)).mode,
        },
      ],
    })
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

  it("shows a failed command's error, not npm's notices", async () => {
    const runner = fakeRunner({
      'npx skills': {
        exitCode: 1,
        stderr: 'Error: skill "x" not found\nnpm notice\nnpm notice New version of npm available',
      },
    })
    const step = { kind: 'command' as const, title, command: 'npx', args: ['skills'] }
    const [result] = await applyPlan(
      { tools: [{ tool: 'codex', notices: [], steps: [step] }] },
      { runner, backupDir: await tempDir() },
    )
    expect(result!.steps[0]!.detail).toBe('Error: skill "x" not found')

    // The error may be on stdout while npx writes only (colored) notices to stderr.
    const quiet = fakeRunner({
      'npx skills': { exitCode: 1, stdout: 'Error: no such repo', stderr: '\u001B[37mnpm notice\u001B[39m update' },
    })
    const [stdoutOnly] = await applyPlan(
      { tools: [{ tool: 'codex', notices: [], steps: [step] }] },
      { runner: quiet, backupDir: await tempDir() },
    )
    expect(stdoutOnly!.steps[0]!.detail).toBe('Error: no such repo')

    // Notices alone are still better than nothing.
    const only = fakeRunner({ 'npx skills': { exitCode: 1, stderr: 'npm notice update' } })
    const [noticeOnly] = await applyPlan(
      { tools: [{ tool: 'codex', notices: [], steps: [step] }] },
      { runner: only, backupDir: await tempDir() },
    )
    expect(noticeOnly!.steps[0]!.detail).toBe('npm notice update')
  })

  it("passes a command step's environment to the runner", async () => {
    const seen: unknown[] = []
    const runner: CommandRunner = {
      async run(_command, _args, options) {
        seen.push(options)
        return { exitCode: 0, stdout: '', stderr: '' }
      },
    }
    const step = { kind: 'command' as const, title, command: 'npm', args: ['install'] }
    await applyPlan(
      {
        tools: [
          {
            tool: 'codex',
            notices: [],
            steps: [{ ...step, env: { npm_config_registry: 'https://registry.npmmirror.com' } }, step],
          },
        ],
      },
      { runner, backupDir: await tempDir() },
    )
    expect(seen).toEqual([{ env: { npm_config_registry: 'https://registry.npmmirror.com' } }, undefined])
  })

  it('runs commands that share a serial key one at a time across tools', async () => {
    const home = await tempDir()
    let running = 0
    let most = 0
    const order: string[] = []
    const runner: CommandRunner = {
      async run(_command, args) {
        running++
        most = Math.max(most, running)
        await new Promise(resolve => setTimeout(resolve, 5))
        order.push(args[0]!)
        running--
        // The first serial command fails; the queue still moves on to the next one.
        return { exitCode: args[0] === 'a' ? 1 : 0, stdout: '', stderr: '' }
      },
    }
    const results = await applyPlan(
      {
        tools: [
          { tool: 'claude-code', notices: [], steps: [npxStep('a', 'npx')] },
          { tool: 'codex', notices: [], steps: [npxStep('b', 'npx')] },
          { tool: 'pi', notices: [], steps: [npxStep('c', 'npx')] },
        ],
      },
      { runner, backupDir: join(home, 'backups') },
    )
    expect(most).toBe(1)
    expect(order).toEqual(['a', 'b', 'c'])
    expect(results.map(result => result.ok)).toEqual([false, true, true])

    // Without a key, the same commands run at once.
    most = 0
    await applyPlan(
      {
        tools: [
          { tool: 'claude-code', notices: [], steps: [npxStep('d')] },
          { tool: 'codex', notices: [], steps: [npxStep('e')] },
        ],
      },
      { runner, backupDir: join(home, 'backups') },
    )
    expect(most).toBe(2)
  })

  it('keeps the error message above a stack trace in a failed step', async () => {
    const home = await tempDir()
    const stderr = [
      'node:internal/modules/cjs/loader:1228',
      '  throw err;',
      "Error: Cannot find module '/npx/node_modules/skills/dist/cli.mjs'",
      'Require stack:',
      '    at Module._resolveFilename (node:internal/modules/cjs/loader:1225:15)',
      "  code: 'MODULE_NOT_FOUND',",
      '  requireStack: []',
      '}',
      'Node.js v22.20.0',
    ].join('\n')
    const [result] = await applyPlan(
      {
        tools: [
          { tool: 'claude-code', notices: [], steps: [{ kind: 'command', title, command: 'npx', args: ['skills'] }] },
        ],
      },
      { runner: fakeRunner({ 'npx skills': { exitCode: 1, stderr } }), backupDir: join(home, 'backups') },
    )
    expect(result!.steps[0]!.detail).toBe(
      [
        "Error: Cannot find module '/npx/node_modules/skills/dist/cli.mjs'",
        '    at Module._resolveFilename (node:internal/modules/cjs/loader:1225:15)',
        "  code: 'MODULE_NOT_FOUND',",
        '  requireStack: []',
        '}',
        'Node.js v22.20.0',
      ].join('\n'),
    )
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

  it('leaves no backup folder when nothing was backed up', async () => {
    const home = await tempDir()
    const backupDir = join(home, 'backups')
    await applyPlan(
      {
        tools: [{ tool: 'codex', notices: [], steps: [{ kind: 'command', title, command: 'ok', args: [] }] }],
      },
      { runner: fakeRunner({ ok: {} }), backupDir, home },
    )
    await expect(readdir(backupDir)).rejects.toThrow(/ENOENT/)
  })
})
