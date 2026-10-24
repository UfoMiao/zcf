import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteCodexMcpService, upsertCodexMcpService } from '../../../../src/utils/code-tools/codex-toml-updater'
import { parseToml } from '../../../../src/utils/toml-edit'

const storage = vi.hoisted(() => ({ content: '' }))
vi.mock('../../../../src/utils/fs-operations', () => ({
  exists: () => true,
  ensureDir: vi.fn(),
  readFile: () => storage.content,
  writeFile: (_path: string, content: string) => { storage.content = content },
}))

const NESTED_ENV_CONFIG = `model = "gpt-5"

[mcp_servers.node_repl]
command = "node"
args = ["repl.js"]

[mcp_servers.node_repl.env]
# keep this comment
FOO = "bar"
USER_ONLY = "1"

[mcp_servers.other]
command = "other"
args = []
`

describe('codex MCP updates with nested env tables', () => {
  beforeEach(() => {
    storage.content = NESTED_ENV_CONFIG
  })

  it('updates an existing [mcp_servers.<id>.env] table in place and keeps valid TOML', () => {
    upsertCodexMcpService('node_repl', {
      id: 'node_repl',
      command: 'node',
      args: ['repl.js'],
      env: { FOO: 'baz', SYSTEMROOT: 'C:/Windows' },
    })

    expect(parseToml(storage.content)).toMatchObject({
      model: 'gpt-5',
      mcp_servers: {
        node_repl: {
          command: 'node',
          args: ['repl.js'],
          env: { FOO: 'baz', USER_ONLY: '1', SYSTEMROOT: 'C:/Windows' },
        },
        other: { command: 'other' },
      },
    })
    expect(storage.content).toContain('[mcp_servers.node_repl.env]')
    expect(storage.content).toContain('# keep this comment')
    expect(storage.content).not.toMatch(/^env\s*=/m)
  })

  it('keeps env names that are not bare TOML keys as a single key', () => {
    storage.content = `[mcp_servers.node_repl]
command = "node"
args = []

[mcp_servers.node_repl.env]
"FOO.BAR" = "old"
`

    upsertCodexMcpService('node_repl', {
      id: 'node_repl',
      command: 'node',
      args: [],
      env: { 'FOO.BAR': 'new' },
    })

    const parsed = parseToml(storage.content) as any
    expect(parsed.mcp_servers.node_repl.env).toEqual({ 'FOO.BAR': 'new' })
  })

  it('updates env of an SSE service that uses a nested env table', () => {
    storage.content = `[mcp_servers.remote]
url = "https://mcp.example.test/sse"

[mcp_servers.remote.env]
TOKEN = "old"
`

    upsertCodexMcpService('remote', {
      id: 'remote',
      command: 'npx',
      args: [],
      env: { TOKEN: 'new' },
    })

    const parsed = parseToml(storage.content) as any
    expect(parsed.mcp_servers.remote).toEqual({
      url: 'https://mcp.example.test/sse',
      env: { TOKEN: 'new' },
    })
  })

  it('still writes env as an inline table when no env table exists', () => {
    storage.content = '[mcp_servers.fresh]\ncommand = "npx"\nargs = []\n'

    upsertCodexMcpService('fresh', {
      id: 'fresh',
      command: 'npx',
      args: ['-y', 'pkg'],
      env: { FOO: 'bar' },
    })

    expect(storage.content).toMatch(/^env = \{ FOO = "bar" \}$/m)
    expect(parseToml(storage.content)).toMatchObject({
      mcp_servers: { fresh: { command: 'npx', args: ['-y', 'pkg'], env: { FOO: 'bar' } } },
    })
  })

  it('removes the nested env table together with its service', () => {
    storage.content = NESTED_ENV_CONFIG.replace('[mcp_servers.other]', '[mcp_servers.node_repl.tools.run]\nenabled = true\n\n[mcp_servers.other]')

    deleteCodexMcpService('node_repl')

    const parsed = parseToml(storage.content) as any
    expect(parsed.mcp_servers.node_repl).toBeUndefined()
    expect(parsed.mcp_servers.other).toEqual({ command: 'other', args: [] })
    expect(parsed.model).toBe('gpt-5')
  })

  it('does not remove services whose id only shares a prefix', () => {
    storage.content = `[mcp_servers.node]
command = "a"

[mcp_servers.node_repl]
command = "b"

[mcp_servers.node_repl.env]
FOO = "bar"
`

    deleteCodexMcpService('node')

    expect(parseToml(storage.content)).toEqual({
      mcp_servers: { node_repl: { command: 'b', env: { FOO: 'bar' } } },
    })
  })
})
