import { readFileSync } from 'node:fs'
import { join } from 'pathe'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { customizeHelp } from '../../../src/cli-setup'
import { getCodeToolRegistry } from '../../../src/code-tools'
import { CODE_TOOL_DEFINITIONS, getCodeToolDefinition } from '../../../src/code-tools/definitions'
import { CLAUDE_DIR, CODE_TOOL_ALIASES, CODE_TOOL_BANNERS, CODE_TOOL_TYPES, CODEX_DIR, resolveCodeToolType } from '../../../src/constants'
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

  it('derives Claude/Codex path constants from definitions only', () => {
    expect(CLAUDE_DIR).toBe(getCodeToolDefinition('claude-code').paths.homeDir)
    expect(CODEX_DIR).toBe(getCodeToolDefinition('codex').paths.homeDir)
    expect(getCodeToolDefinition('claude-code').paths.configFiles.map(file => file.path)).toContain(
      join(CLAUDE_DIR, 'settings.json'),
    )
    expect(getCodeToolDefinition('codex').paths.configFiles.map(file => file.path)).toContain(
      join(CODEX_DIR, 'config.toml'),
    )
  })

  it('keeps Claude menu switch on the adapter and off the command handler', () => {
    const featuresSource = readFileSync(join(process.cwd(), 'src/utils/features.ts'), 'utf8')
    expect(featuresSource).not.toContain('commands/config-switch')
    expect(featuresSource).toContain('interactiveSwitch')
  })

  it('types Codex adapter init options and derives reachable Claude/Codex paths from definitions', () => {
    const adapterSource = readFileSync(join(process.cwd(), 'src/code-tools/codex/adapter.ts'), 'utf8')
    const featuresSource = readFileSync(join(process.cwd(), 'src/utils/features.ts'), 'utf8')
    const uninstallerSource = readFileSync(join(process.cwd(), 'src/utils/uninstaller.ts'), 'utf8')
    const claude = getCodeToolDefinition('claude-code')
    const codex = getCodeToolDefinition('codex')

    expect(adapterSource).toContain('CodexFullInitOptions')
    expect(adapterSource).not.toContain('Record<string, unknown>')
    expect(featuresSource).not.toMatch(/join\(homedir\(\),\s*'\.codex'/)
    expect(uninstallerSource).not.toMatch(/join\(homedir\(\),\s*'\.claude'(,|\))/)
    expect(uninstallerSource).not.toMatch(/join\(homedir\(\),\s*'\.claude\.json'/)
    expect(featuresSource).toContain('getCodeToolDefinition')
    expect(uninstallerSource).toContain('getCodeToolDefinition')
    expect(claude.paths.memoryFile).toBe(join(claude.paths.homeDir, 'CLAUDE.md'))
    expect(codex.paths.memoryFile).toBe(join(codex.paths.homeDir, 'AGENTS.md'))
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
