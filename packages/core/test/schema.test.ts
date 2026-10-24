import { describe, expect, it } from 'vitest'

import { parseZcfConfig } from '../src/schema/config'

describe('parseZcfConfig', () => {
  it('fills defaults for a minimal config', () => {
    const result = parseZcfConfig({ version: 1 })
    expect(result).toEqual({
      success: true,
      config: {
        version: 1,
        tools: [],
        mcpServers: {},
        skills: [],
      },
    })
  })

  it('accepts a full config and applies nested defaults', () => {
    const result = parseZcfConfig({
      version: 1,
      tools: ['claude-code', 'codex'],
      provider: {
        name: ' GLM ',
        apiKey: 'key',
        anthropic: { baseUrl: 'https://example.com/anthropic' },
      },
      mcpServers: {
        context7: { type: 'http', url: 'https://mcp.context7.com/mcp' },
        fs_local: { type: 'stdio', command: 'npx' },
      },
      skills: [{ source: 'vercel-labs/agent-skills' }],
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.config.provider).toEqual({
      name: 'GLM',
      apiKey: 'key',
      anthropic: { baseUrl: 'https://example.com/anthropic', authType: 'auth_token' },
      models: {},
    })
    expect(result.config.mcpServers.context7).toEqual({
      type: 'http',
      url: 'https://mcp.context7.com/mcp',
      headers: {},
    })
    expect(result.config.mcpServers.fs_local).toEqual({
      type: 'stdio',
      command: 'npx',
      args: [],
      env: {},
    })
    expect(result.config.skills).toEqual([{ source: 'vercel-labs/agent-skills', skills: [] }])
  })

  it('reports each problem with its path', () => {
    const result = parseZcfConfig({
      version: 2,
      tools: ['cursor'],
      provider: {
        name: 'x',
        apiKey: '',
        anthropic: { baseUrl: 'not a url' },
      },
      mcpServers: {
        'bad name': { type: 'http', url: 'https://example.com' },
      },
    })
    expect(result.success).toBe(false)
    if (result.success) return
    const paths = result.issues.map(issue => issue.path)
    expect(paths).toEqual(
      expect.arrayContaining(['version', 'tools.0', 'provider.apiKey', 'provider.anthropic.baseUrl']),
    )
    expect(result.issues.some(issue => issue.message.includes('MCP server names'))).toBe(true)
  })

  it('rejects input that is not an object', () => {
    const result = parseZcfConfig('nope')
    expect(result).toMatchObject({
      success: false,
      issues: [{ path: '' }],
    })
  })

  it('leaves the rejected value out of messages, since it may be a credential', () => {
    const result = parseZcfConfig({
      version: 1,
      provider: { name: 'x', apiKey: 12345, anthropic: { baseUrl: 'sk-pasted-into-the-wrong-field' } },
    })
    expect(result).toEqual({
      success: false,
      issues: [
        { path: 'provider.apiKey', message: 'Invalid type: Expected string' },
        { path: 'provider.anthropic.baseUrl', message: 'Invalid URL' },
      ],
    })
  })
})
