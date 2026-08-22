import { beforeAll, describe, expect, it, vi } from 'vitest'
import { customizeHelp } from '../../../src/cli-setup'
import { getCodeToolRegistry } from '../../../src/code-tools'
import { CODE_TOOL_DEFINITIONS } from '../../../src/code-tools/definitions'
import { CODE_TOOL_ALIASES, CODE_TOOL_BANNERS, CODE_TOOL_TYPES, resolveCodeToolType } from '../../../src/constants'
import { i18n, initI18n } from '../../../src/i18n'
import { resolveCodeType } from '../../../src/utils/code-type-resolver'

describe('claude/codex main parity', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('keeps the same built-in tools, aliases, and banners as main', () => {
    expect(CODE_TOOL_TYPES).toEqual(['claude-code', 'codex'])
    expect(CODE_TOOL_ALIASES).toEqual({
      cc: 'claude-code',
      cx: 'codex',
    })
    expect(CODE_TOOL_BANNERS).toEqual({
      'claude-code': 'for Claude Code',
      'codex': 'for Codex',
    })
    expect(getCodeToolRegistry().listIds()).toEqual(['claude-code', 'codex'])
    expect(getCodeToolRegistry().resolve('gemini')).toBeUndefined()
  })

  it('keeps Claude Code and Codex install metadata identical to main', () => {
    const claude = CODE_TOOL_DEFINITIONS.find(item => item.id === 'claude-code')!
    const codex = CODE_TOOL_DEFINITIONS.find(item => item.id === 'codex')!

    expect(claude.installation).toMatchObject({
      command: 'claude',
      npmPackage: '@anthropic-ai/claude-code',
      homebrewCask: 'claude-code',
    })
    expect(codex.installation).toMatchObject({
      command: 'codex',
      npmPackage: '@openai/codex',
      homebrewCask: 'codex',
    })
    expect(claude.aliases).toEqual(['cc'])
    expect(codex.aliases).toEqual(['cx'])
  })

  it('resolves the same -T inputs as main and rejects Gemini as unknown', async () => {
    expect(resolveCodeToolType('cc')).toBe('claude-code')
    expect(resolveCodeToolType('cx')).toBe('codex')
    expect(resolveCodeToolType('claude-code')).toBe('claude-code')
    expect(resolveCodeToolType('codex')).toBe('codex')
    expect(resolveCodeToolType('openai-codex')).toBe('claude-code')
    expect(await resolveCodeType('cc')).toBe('claude-code')
    expect(await resolveCodeType('cx')).toBe('codex')
    await expect(resolveCodeType('gemini')).rejects.toThrow(/invalidCodeType|Invalid code type/)
    await expect(resolveCodeType('gm')).rejects.toThrow(/invalidCodeType|Invalid code type/)
  })

  it('keeps help copy and -T surface on the main Claude/Codex set', async () => {
    await initI18n('en')
    const help = customizeHelp([])
    const text = help.map(section => `${section.title}\n${section.body}`).join('\n')

    expect(i18n.t('cli:banner.updateSubtitle')).toBe('Update configuration for Claude Code')
    expect(i18n.t('language:selectConfigLang')).toBe('Select Claude Code configuration language')
    expect(text).toContain('Initialize Claude Code configuration')
    expect(text).toContain('claude-code, codex, cc=claude-code, cx=codex')
    expect(text).not.toMatch(/gemini/i)
    expect(text).not.toContain('-T gm')
  })

  it('falls back to Claude Code for illegal -T on init and config-switch', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { init } = await import('../../../src/commands/init')
    const { configSwitchCommand } = await import('../../../src/commands/config-switch')
    const claude = getCodeToolRegistry().get('claude-code')
    const validate = vi.spyOn(claude, 'validateInitOptions').mockResolvedValue(undefined)
    const claudeInit = vi.spyOn(claude, 'init').mockResolvedValue(undefined)
    const displayList = vi.spyOn(claude.configurations as any, 'displayList').mockResolvedValue(undefined)

    await init({ codeType: 'invalid', skipBanner: true, skipPrompt: true })
    await configSwitchCommand({ codeType: 'invalid' as any, list: true })

    expect(errorSpy).toHaveBeenCalled()
    expect(validate).toHaveBeenCalled()
    expect(claudeInit).toHaveBeenCalled()
    expect(displayList).toHaveBeenCalled()
    errorSpy.mockRestore()
    validate.mockRestore()
    claudeInit.mockRestore()
    displayList.mockRestore()
  })

  it('keeps --api-configs success copy and sinks tool-owned menu/provider contracts', () => {
    expect(i18n.t('multi-config:configsAddedSuccessfully')).toBe('API configurations added successfully')

    const claude = getCodeToolRegistry().get('claude-code')
    const codex = getCodeToolRegistry().get('codex')
    const coreActions = ['init', 'update', 'uninstall', 'check-updates']

    expect(claude.menu.updateAction).toBe('check-updates')
    expect(coreActions).not.toContain(codex.menu.updateAction)
    expect(typeof claude.providers?.toProfiles).toBe('function')
    expect(typeof codex.providers?.toProfiles).toBe('function')
  })
})
