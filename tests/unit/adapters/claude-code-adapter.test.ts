import { beforeEach, describe, expect, it, vi } from 'vitest'
import { claudeCodeAdapter } from '../../../src/adapters/claude-code'

vi.mock('../../../src/utils/installer', () => ({
  isClaudeCodeInstalled: vi.fn().mockResolvedValue(true),
}))

describe('claudeCodeAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exposes expected metadata', () => {
    expect(claudeCodeAdapter.id).toBe('claude-code')
    expect(claudeCodeAdapter.displayName).toBe('Claude Code')
    expect(claudeCodeAdapter.aliases).toContain('cc')
    expect(claudeCodeAdapter.aliases).toContain('claude')
    expect(claudeCodeAdapter.templateDir).toBe('templates/claude-code')
  })

  it('reports installation status via installer util', async () => {
    const result = await claudeCodeAdapter.isInstalled()
    expect(result).toBe(true)
  })

  it('delegates install to init command with codeType fixed to claude-code', async () => {
    const init = vi.fn().mockResolvedValue(undefined)
    vi.doMock('../../../src/commands/init', () => ({ init }))

    await claudeCodeAdapter.install({ skipPrompt: true }, { lang: 'en' })

    expect(init).toHaveBeenCalledWith(expect.objectContaining({ codeType: 'claude-code', skipPrompt: true }))
  })
})
