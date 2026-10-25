import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import { cursor } from '../src/adapters/cursor'
import type { AdapterContext } from '../src/adapters/types'
import { editJson } from '../src/io/editors'
import type { CommandStep, FileStep } from '../src/plan/types'
import type { ZcfConfig, ZcfConfigInput } from '../src/schema/config'
import { parseZcfConfig } from '../src/schema/config'
import { fakeRunner } from './helpers'

const HOME = '/home/me'
const MCP_FILE = join(HOME, '.cursor', 'mcp.json')

function context(overrides: Partial<AdapterContext> = {}, files: Record<string, string> = {}): AdapterContext {
  return {
    home: HOME,
    platform: 'linux',
    env: {},
    runner: fakeRunner(),
    readFile: async path => files[path],
    ...overrides,
  }
}

function config(input: Omit<ZcfConfigInput, 'version'>): ZcfConfig {
  const result = parseZcfConfig({ version: 1, ...input })
  if (!result.success) throw new Error(JSON.stringify(result.issues))
  return result.config
}

const installed = { installed: true, command: 'cursor-agent', version: '2026.10.22-27dcf5f' }

describe('cursor.detect', () => {
  it('finds cursor-agent on PATH', async () => {
    const runner = fakeRunner({ 'cursor-agent --version': { stdout: '2026.10.22-27dcf5f\n' } })
    expect(await cursor.detect(context({ runner }))).toEqual(installed)
  })

  it("falls back to the installer's launcher on each platform", async () => {
    const runner = fakeRunner({ '/home/me/.local/bin/cursor-agent --version': { stdout: '2026.10.22-27dcf5f' } })
    expect(await cursor.detect(context({ runner }))).toMatchObject({ command: '/home/me/.local/bin/cursor-agent' })
    expect(await cursor.detect(context())).toEqual({ installed: false, command: '/home/me/.local/bin/cursor-agent' })
    expect(
      await cursor.detect(context({ platform: 'win32', env: { LOCALAPPDATA: 'C:/Users/me/AppData/Local' } })),
    ).toEqual({ installed: false, command: 'C:/Users/me/AppData/Local/cursor-agent/cursor-agent.cmd' })
  })
})

describe('cursor.plan', () => {
  it('installs with the official installer when missing', async () => {
    const linux = await cursor.plan(config({}), { installed: false, command: 'x' }, context())
    expect(linux.steps).toEqual([
      {
        kind: 'command',
        title: { key: 'step.install', params: { tool: 'cursor' } },
        command: 'bash',
        args: ['-c', 'set -o pipefail; curl -fsS https://cursor.com/install | bash'],
      },
    ])
    const windows = await cursor.plan(config({}), { installed: false, command: 'x' }, context({ platform: 'win32' }))
    expect(windows.steps[0]).toMatchObject({
      command: 'powershell',
      args: expect.arrayContaining(["irm 'https://cursor.com/install?win32=true' | iex"]),
    })
  })

  it('does nothing for an empty config on an installed tool', async () => {
    expect(await cursor.plan(config({}), installed, context())).toEqual({ tool: 'cursor', steps: [], notices: [] })
  })

  it('says Cursor has no setting of its own when the config language is Chinese', async () => {
    const plan = await cursor.plan(config({ configLanguage: 'zh-CN' }), installed, context())
    expect(plan.notices).toEqual([
      {
        level: 'warning',
        message: { key: 'notice.languageNotSupported', params: { tool: 'cursor', language: 'zh-CN' } },
      },
    ])
    // English is what every tool does on its own, so nothing is said or written.
    expect((await cursor.plan(config({ configLanguage: 'en' }), installed, context())).notices).toEqual([])
  })

  it('explains that the provider does not apply', async () => {
    const plan = await cursor.plan(
      config({ provider: { name: 'p', apiKey: 'k', openai: { baseUrl: 'https://api.example.com/v1' } } }),
      installed,
      context(),
    )
    expect(plan.steps).toEqual([])
    expect(plan.notices).toEqual([
      { level: 'info', message: { key: 'notice.providerNotSupported', params: { tool: 'cursor' } } },
    ])
  })

  it('writes MCP servers into ~/.cursor/mcp.json, keeping other entries and fields ZCF does not manage', async () => {
    const before = JSON.stringify({
      mcpServers: {
        keep: { url: 'https://keep.example.com' },
        docs: { url: 'https://old.example.com', auth: { CLIENT_ID: 'id' } },
        local: { command: 'node', args: ['old.js'], envFile: '.env' },
        open: { command: 'was-stdio', envFile: '.env' },
      },
    })
    const plan = await cursor.plan(
      config({
        mcpServers: {
          docs: { type: 'http', url: 'https://docs.example.com/mcp', headers: { Authorization: 'Bearer t' } },
          local: { type: 'stdio', command: 'npx', args: ['-y', 'pkg'], env: { TOKEN: 't' } },
          bare: { type: 'stdio', command: 'server' },
          open: { type: 'http', url: 'https://open.example.com/mcp' },
        },
      }),
      installed,
      context({}, { [MCP_FILE]: before }),
    )
    expect(plan.steps).toMatchObject([
      { kind: 'file', path: MCP_FILE, title: { key: 'step.mcpAdd', params: { name: 'docs' } } },
      { kind: 'file', path: MCP_FILE, title: { key: 'step.mcpAdd', params: { name: 'local' } } },
      { kind: 'file', path: MCP_FILE, title: { key: 'step.mcpAdd', params: { name: 'bare' } } },
      { kind: 'file', path: MCP_FILE, title: { key: 'step.mcpAdd', params: { name: 'open' } } },
    ])
    let text = before
    for (const step of plan.steps as FileStep[]) text = editJson(text, step.edits)
    expect(JSON.parse(text)).toEqual({
      mcpServers: {
        keep: { url: 'https://keep.example.com' },
        docs: {
          url: 'https://docs.example.com/mcp',
          auth: { CLIENT_ID: 'id' },
          headers: { Authorization: 'Bearer t' },
        },
        local: { command: 'npx', args: ['-y', 'pkg'], envFile: '.env', type: 'stdio', env: { TOKEN: 't' } },
        bare: { type: 'stdio', command: 'server' },
        open: { url: 'https://open.example.com/mcp' },
      },
    })
  })

  it('leaves a hand-formatted entry that already matches as it is', async () => {
    const before =
      '{\n\t"mcpServers": {\n\t\t"a": { "type": "stdio", "command": "npx", "args": ["-y", "pkg"], "env": { "K": "v" } }\n\t}\n}\n'
    const plan = await cursor.plan(
      config({ mcpServers: { a: { type: 'stdio', command: 'npx', args: ['-y', 'pkg'], env: { K: 'v' } } } }),
      installed,
      context({}, { [MCP_FILE]: before }),
    )
    expect(editJson(before, (plan.steps[0] as FileStep).edits)).toBe(before)
  })

  it('installs skills for cursor unless the named ones are present', async () => {
    const plan = await cursor.plan(
      config({ skills: [{ source: 'owner/a', skills: ['one'] }, { source: 'owner/b' }] }),
      installed,
      // The skills CLI installs Cursor's global skills into the shared ~/.agents/skills.
      context({}, { [join(HOME, '.agents', 'skills', 'one', 'SKILL.md')]: '# one' }),
    )
    expect((plan.steps as CommandStep[]).map(step => [step.command, ...step.args].join(' '))).toEqual([
      'npx -y skills add owner/b -g -y -a cursor',
    ])
  })
})

describe('cursor.planUpdate', () => {
  it('runs cursor-agent update, or notes a missing install', async () => {
    expect((await cursor.planUpdate(installed, context())).steps).toMatchObject([
      { command: 'cursor-agent', args: ['update'] },
    ])
    expect((await cursor.planUpdate({ installed: false, command: 'cursor-agent' }, context())).notices).toMatchObject([
      { message: { key: 'notice.notInstalled' } },
    ])
  })
})
