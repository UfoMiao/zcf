import { beforeEach, describe, expect, it } from 'vitest'
import { claudeCodeAdapter } from '../../../src/code-tools/claude-code/adapter'
import { codexAdapter } from '../../../src/code-tools/codex/adapter'
import { registerBuiltinCodeTools } from '../../../src/code-tools/register-builtins'
import {
  getCodeTool,
  getCodeToolAliasMap,
  getCodeToolBanners,
  isCodeToolRegistered,
  listCodeToolIds,
  listCodeTools,
  registerCodeTool,
  resolveCodeTool,
} from '../../../src/code-tools/registry'

describe('code-tools registry', () => {
  beforeEach(() => {
    registerBuiltinCodeTools()
  })

  it('registers built-in adapters', () => {
    expect(listCodeToolIds()).toEqual(expect.arrayContaining(['claude-code', 'codex']))
    expect(listCodeTools()).toHaveLength(2)
  })

  it('resolves aliases', () => {
    expect(resolveCodeTool('cc')?.id).toBe('claude-code')
    expect(resolveCodeTool('cx')?.id).toBe('codex')
    expect(getCodeTool('claude-code').displayName).toBe('Claude Code')
  })

  it('exposes banners and alias map', () => {
    const banners = getCodeToolBanners()
    expect(banners['claude-code']).toBe('for Claude Code')
    expect(banners.codex).toBe('for Codex')
    expect(getCodeToolAliasMap().cc).toBe('claude-code')
  })

  it('checks registration', () => {
    expect(isCodeToolRegistered('codex')).toBe(true)
    expect(isCodeToolRegistered('unknown')).toBe(false)
  })

  it('rejects duplicate registration', () => {
    expect(() => registerCodeTool(claudeCodeAdapter)).toThrow(/already registered/)
  })
})

describe('codex adapter', () => {
  it('exposes metadata for registry consumers', () => {
    expect(codexAdapter.skillsAgents).toEqual(['codex'])
    expect(codexAdapter.paths.templateDir).toBe('templates/codex')
    expect(codexAdapter.aliases).toContain('cx')
  })
})

describe('claude-code adapter', () => {
  it('exposes metadata for registry consumers', () => {
    expect(claudeCodeAdapter.skillsAgents).toEqual(['claude-code', 'universal'])
    expect(claudeCodeAdapter.aliases).toContain('cc')
    expect(claudeCodeAdapter.paths.homeDir).toContain('.claude')
  })
})
