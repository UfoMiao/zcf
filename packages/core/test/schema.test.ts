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
        profiles: [],
        mcpServers: {},
        skills: [],
        agents: [],
        workflows: [],
        styles: { outputStyles: [] },
        extras: {},
        mirror: 'official',
        language: 'auto',
        configLanguage: 'en',
      },
    })
  })

  it('accepts the China mirror and points at an unknown one', () => {
    expect(parseZcfConfig({ version: 1, mirror: 'china' })).toMatchObject({
      success: true,
      config: { mirror: 'china' },
    })
    expect(parseZcfConfig({ version: 1, mirror: 'mars' })).toEqual({
      success: false,
      issues: [
        { path: 'mirror', message: { key: 'configIssue.expected', params: { expected: '"official" | "china"' } } },
      ],
    })
  })

  it('accepts a set language and points at an unknown one', () => {
    expect(parseZcfConfig({ version: 1, language: 'zh-CN' })).toMatchObject({
      success: true,
      config: { language: 'zh-CN' },
    })
    expect(parseZcfConfig({ version: 1, language: 'fr' })).toEqual({
      success: false,
      issues: [
        { path: 'language', message: { key: 'configIssue.expected', params: { expected: '"auto" | "en" | "zh-CN"' } } },
      ],
    })
  })

  it('accepts a config language and points at an unknown one', () => {
    expect(parseZcfConfig({ version: 1, configLanguage: 'zh-CN' })).toMatchObject({
      success: true,
      config: { configLanguage: 'zh-CN' },
    })
    // No `auto`: no tool has one, and Claude Code would pass the word itself to the model.
    expect(parseZcfConfig({ version: 1, configLanguage: 'auto' })).toEqual({
      success: false,
      issues: [
        { path: 'configLanguage', message: { key: 'configIssue.expected', params: { expected: '"en" | "zh-CN"' } } },
      ],
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
      tools: ['vscode'],
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
    expect(result.issues).toContainEqual({ path: 'mcpServers.bad name', message: { key: 'configIssue.mcpServerName' } })
  })

  it('rejects input that is not an object', () => {
    const result = parseZcfConfig('nope')
    expect(result).toMatchObject({
      success: false,
      issues: [{ path: '' }],
    })
  })

  it('returns message keys without the rejected value, which may be a credential', () => {
    const result = parseZcfConfig({
      version: 2,
      tools: ['vscode'],
      provider: { name: ' ', apiKey: 12345, anthropic: { baseUrl: 'sk-pasted-into-the-wrong-field' } },
      mcpServers: { ok: { type: 'stdio' } },
      skills: 'x',
    })
    expect(result).toEqual({
      success: false,
      issues: [
        { path: 'version', message: { key: 'configIssue.expected', params: { expected: '1' } } },
        {
          path: 'tools.0',
          message: {
            key: 'configIssue.expected',
            params: { expected: '"claude-code" | "codex" | "gemini-cli" | "opencode" | "cursor" | "pi" | "dsh"' },
          },
        },
        { path: 'provider.name', message: { key: 'configIssue.empty' } },
        { path: 'provider.apiKey', message: { key: 'configIssue.expected', params: { expected: 'string' } } },
        { path: 'provider.anthropic.baseUrl', message: { key: 'configIssue.url' } },
        { path: 'mcpServers.ok.command', message: { key: 'configIssue.missing' } },
        { path: 'skills', message: { key: 'configIssue.expected', params: { expected: 'array' } } },
      ],
    })
    expect(JSON.stringify(result)).not.toContain('sk-pasted')
  })

  it('takes provider profiles, workflow bundles, styles and extras', () => {
    const result = parseZcfConfig({
      version: 1,
      profiles: [
        {
          id: 'work',
          name: 'Work',
          provider: { name: 'relay', apiKey: 'sk-1', anthropic: { baseUrl: 'https://a.example' } },
        },
      ],
      workflows: [
        { name: 'Daily', skills: [{ source: 'zcf', skills: ['workflow'] }], agents: ['planner'], mcp: ['db'] },
      ],
      agents: ['planner', 'ui-ux-designer'],
      styles: { outputStyles: ['laowang-engineer'], defaultOutputStyle: 'laowang-engineer' },
      extras: { magpie: 'cli', ccline: true },
    })
    expect(result.success).toBe(true)
    expect(result.success ? result.config.profiles[0]?.id : undefined).toBe('work')
    expect(result.success ? result.config.workflows[0]?.mcp : undefined).toEqual(['db'])
    expect(result.success ? result.config.extras : undefined).toEqual({ magpie: 'cli', ccline: true })

    // Every id and name has to be one ZCF knows; a profile id follows the server-name rule.
    const bad = parseZcfConfig({
      version: 1,
      profiles: [{ id: 'not ok', name: 'x', provider: { name: 'a', apiKey: 'k' } }],
      workflows: [{ name: 'x', agents: ['planner'], mcp: ['a b'] }],
      agents: ['made-up'],
      styles: { outputStyles: ['nope'] },
      extras: { magpie: 'both' },
    })
    expect(bad.success).toBe(false)
    expect(bad.success ? undefined : bad.issues.map(issue => issue.path)).toEqual([
      'profiles.0.id',
      'agents.0',
      'workflows.0.mcp.0',
      'styles.outputStyles.0',
      'extras.magpie',
    ])
    expect(bad.success ? undefined : bad.issues.some(issue => issue.message.key === 'configIssue.profileId')).toBe(true)
  })
})
