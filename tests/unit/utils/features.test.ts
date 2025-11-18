import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

vi.mock('../../../src/utils/config', () => ({
  applyAiLanguageDirective: vi.fn(),
  configureApi: vi.fn(),
  updateDefaultModel: vi.fn(),
  updateCustomModel: vi.fn(),
  getExistingApiConfig: vi.fn(),
  getExistingModelConfig: vi.fn(),
  switchToOfficialLogin: vi.fn(),
  promptApiConfigurationAction: vi.fn(),
}))

vi.mock('../../../src/utils/config-operations', () => ({
  configureApiCompletely: vi.fn(),
  modifyApiConfigPartially: vi.fn(),
}))

vi.mock('../../../src/utils/claude-code-incremental-manager', () => ({
  configureIncrementalManagement: vi.fn(),
}))

vi.mock('../../../src/utils/ccr/config', () => ({
  setupCcrConfiguration: vi.fn(),
  configureCcrProxy: vi.fn(),
}))

vi.mock('../../../src/utils/ccr/installer', () => ({
  isCcrInstalled: vi.fn(),
  installCcr: vi.fn(),
}))

vi.mock('../../../src/utils/claude-config', () => ({
  backupMcpConfig: vi.fn(),
  buildMcpServerConfig: vi.fn(),
  fixWindowsMcpConfig: vi.fn(),
  mergeMcpServers: vi.fn(),
  readMcpConfig: vi.fn(),
  writeMcpConfig: vi.fn(),
}))

vi.mock('../../../src/utils/mcp-selector', () => ({
  selectMcpServices: vi.fn(),
}))

vi.mock('../../../src/utils/simple-config', () => ({
  importRecommendedEnv: vi.fn(),
  importRecommendedPermissions: vi.fn(),
  openSettingsJson: vi.fn(),
}))

vi.mock('../../../src/utils/prompts', () => ({
  resolveAiOutputLanguage: vi.fn(),
  selectAiOutputLanguage: vi.fn(),
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../../src/utils/output-style', () => ({
  configureOutputStyle: vi.fn(),
  selectOutputStyles: vi.fn(),
}))

vi.mock('../../../src/utils/platform', () => ({
  isWindows: vi.fn(),
}))

vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

// Mock Codex-related functions
vi.mock('../../../src/utils/code-tools/codex', () => ({
  readCodexConfig: vi.fn(),
  writeCodexConfig: vi.fn(),
  runCodexSystemPromptSelection: vi.fn(),
  backupCodexConfig: vi.fn(),
  backupCodexAgents: vi.fn(),
  getBackupMessage: vi.fn(),
}))

vi.mock('../../../src/utils/prompt-helpers', () => ({
  addNumbersToChoices: vi.fn(choices => choices),
}))

// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    // Only mock initialization functions to avoid setup issues in tests
    ensureI18nInitialized: vi.fn(),
  }
})

// Partial mock for features module to allow real Codex functions while mocking other dependencies
vi.mock('../../../src/utils/features', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/utils/features')>()
  return {
    ...actual,
    // Keep all original exports, no mocking needed for features module itself
    // All dependencies are already mocked above
  }
})

const togglePromptModule = await import('../../../src/utils/toggle-prompt')
const mockedPromptBoolean = vi.mocked(togglePromptModule.promptBoolean)
function queuePromptBooleans(...values: boolean[]) {
  values.forEach(value => mockedPromptBoolean.mockResolvedValueOnce(value))
}

describe('features utilities', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(inquirer.prompt).mockReset()
    mockedPromptBoolean.mockReset()
    mockedPromptBoolean.mockResolvedValue(false)
  })

  it('should load features module', async () => {
    const module = await import('../../../src/utils/features')
    expect(module).toBeDefined()
  })

  it('should export all feature functions', async () => {
    const module = await import('../../../src/utils/features')

    expect(module.configureApiFeature).toBeDefined()
    expect(module.configureMcpFeature).toBeDefined()
    expect(module.configureDefaultModelFeature).toBeDefined()
    expect(module.configureAiMemoryFeature).toBeDefined()
    // clearZcfCacheFeature was replaced with uninstall functionality
    expect(module.changeScriptLanguageFeature).toBeDefined()
    expect(module.configureEnvPermissionFeature).toBeDefined()

    expect(typeof module.configureApiFeature).toBe('function')
    expect(typeof module.configureMcpFeature).toBe('function')
    expect(typeof module.configureDefaultModelFeature).toBe('function')
    expect(typeof module.configureAiMemoryFeature).toBe('function')
    // clearZcfCacheFeature was replaced with uninstall functionality
    expect(typeof module.changeScriptLanguageFeature).toBe('function')
    expect(typeof module.configureEnvPermissionFeature).toBe('function')
  })

  describe('configureApiFeature', () => {
    it('should handle official login mode', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features')
      const { switchToOfficialLogin } = await import('../../../src/utils/config')

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ mode: 'official' })
      vi.mocked(switchToOfficialLogin).mockReturnValue(true)

      await configureApiFeature()

      expect(switchToOfficialLogin).toHaveBeenCalled()
    })

    it('should handle custom API mode', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features')
      const incrementalManagerModule = await import('../../../src/utils/claude-code-incremental-manager')

      const mockPrompt = vi.mocked(inquirer.prompt)
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })

      // Mock the incremental configuration manager
      const mockConfigureIncrementalManagement = vi.mocked(incrementalManagerModule.configureIncrementalManagement).mockResolvedValue()

      await configureApiFeature()

      // For Claude Code, should call configureIncrementalManagement instead of the old functions
      expect(mockConfigureIncrementalManagement).toHaveBeenCalled()
      expect(mockPrompt).toHaveBeenCalledTimes(1) // Only mode selection
    })

    it('should handle CCR proxy mode', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features')
      const ccrConfigModule = await import('../../../src/utils/ccr/config')
      const ccrInstallerModule = await import('../../../src/utils/ccr/installer')

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ mode: 'ccr' })
      vi.mocked(ccrInstallerModule.isCcrInstalled).mockResolvedValue({ hasCorrectPackage: true } as any)
      vi.mocked(ccrConfigModule.setupCcrConfiguration).mockResolvedValue(true as any)

      await configureApiFeature()

      expect(ccrConfigModule.setupCcrConfiguration).toHaveBeenCalled()
    })

    it('should handle skip mode', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features')

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ mode: 'skip' })

      await configureApiFeature()

      // Should not call any configuration functions except the cancellation message
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('cancelled'))
    })
  })

  describe('configureMcpFeature', () => {
    it('should configure MCP servers', async () => {
      const { configureMcpFeature } = await import('../../../src/utils/features')
      const { selectMcpServices } = await import('../../../src/utils/mcp-selector')
      const { readMcpConfig, writeMcpConfig, mergeMcpServers } = await import('../../../src/utils/claude-config')

      vi.mocked(selectMcpServices).mockResolvedValue(['fs'])
      vi.mocked(readMcpConfig).mockReturnValue({ mcpServers: {} })
      vi.mocked(mergeMcpServers).mockReturnValue({ mcpServers: { fs: {} } } as any)
      vi.mocked(writeMcpConfig).mockResolvedValue(undefined)

      await configureMcpFeature()

      expect(selectMcpServices).toHaveBeenCalled()
      expect(writeMcpConfig).toHaveBeenCalled()
    })
  })

  describe('configureDefaultModelFeature', () => {
    it('should update default model when no existing config', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const configModule = await import('../../../src/utils/config')

      vi.mocked(configModule.getExistingModelConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ model: 'opus' })
      vi.mocked(configModule.updateDefaultModel).mockResolvedValue(undefined)

      await configureDefaultModelFeature()

      expect(configModule.getExistingModelConfig).toHaveBeenCalled()
      expect(configModule.updateDefaultModel).toHaveBeenCalledWith('opus')
    })

    it('should show existing config and ask for modification', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const configModule = await import('../../../src/utils/config')

      vi.mocked(configModule.getExistingModelConfig).mockReturnValue('sonnet')
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ model: 'opus' })
      queuePromptBooleans(true)
      vi.mocked(configModule.updateDefaultModel).mockResolvedValue(undefined)

      await configureDefaultModelFeature()

      expect(configModule.getExistingModelConfig).toHaveBeenCalled()
      expect(inquirer.prompt).toHaveBeenCalledTimes(1)
      expect(configModule.updateDefaultModel).toHaveBeenCalledWith('opus')
    })

    it('should keep existing config when user declines modification', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const { updateDefaultModel, getExistingModelConfig } = await import('../../../src/utils/config')

      vi.mocked(getExistingModelConfig).mockReturnValue('opus')
      queuePromptBooleans(false)

      await configureDefaultModelFeature()

      expect(getExistingModelConfig).toHaveBeenCalled()
      expect(inquirer.prompt).not.toHaveBeenCalled()
      expect(updateDefaultModel).not.toHaveBeenCalled()
    })

    it('should handle default model option selection', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const configModule = await import('../../../src/utils/config')

      vi.mocked(configModule.getExistingModelConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ model: 'default' })
      vi.mocked(configModule.updateDefaultModel).mockResolvedValue(undefined)

      await configureDefaultModelFeature()

      expect(configModule.updateDefaultModel).toHaveBeenCalledWith('default')
    })

    it('should handle user cancellation', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const configModule = await import('../../../src/utils/config')

      vi.mocked(configModule.getExistingModelConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ model: undefined })

      await configureDefaultModelFeature()

      expect(configModule.updateDefaultModel).not.toHaveBeenCalled()
    })

    it('should set correct default choice based on existing config', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const { getExistingModelConfig } = await import('../../../src/utils/config')

      vi.mocked(getExistingModelConfig).mockReturnValue('opus')
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ model: 'sonnet' })
      queuePromptBooleans(true)

      await configureDefaultModelFeature()

      const modelPrompt = vi.mocked(inquirer.prompt).mock.calls[0][0] as any
      expect(modelPrompt.default).toBe(1) // 'opus' is at index 1
    })

    it('should show custom model option in choices', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const { getExistingModelConfig } = await import('../../../src/utils/config')

      vi.mocked(getExistingModelConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ model: 'default' })

      await configureDefaultModelFeature()

      const firstCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as any
      const choices = firstCall.choices

      // Should include custom option
      expect(choices.some((choice: any) => choice.value === 'custom')).toBe(true)
    })

    it('should handle custom model selection with input prompts', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const { getExistingModelConfig, updateCustomModel } = await import('../../../src/utils/config')

      vi.mocked(getExistingModelConfig).mockReturnValue(null)
      // First prompt: choose custom, then two input prompts for model names
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ model: 'custom' })
        .mockResolvedValueOnce({ primaryModel: 'claude-3-5-sonnet-20241022' })
        .mockResolvedValueOnce({ fastModel: 'claude-3-haiku-20240307' })

      await configureDefaultModelFeature()

      expect(inquirer.prompt).toHaveBeenCalledTimes(3)
      expect(updateCustomModel).toHaveBeenCalledWith('claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307')
    })

    it('should handle custom model with empty inputs (skip both)', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const { getExistingModelConfig } = await import('../../../src/utils/config')

      vi.mocked(getExistingModelConfig).mockReturnValue(null)
      // Choose custom, then skip both inputs
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ model: 'custom' })
        .mockResolvedValueOnce({ primaryModel: '' })
        .mockResolvedValueOnce({ fastModel: '' })

      // This should not modify configuration when both are skipped
      await configureDefaultModelFeature()

      // Should show skip message but not call updateDefaultModel
      expect(inquirer.prompt).toHaveBeenCalledTimes(3)
    })
  })

  describe('configureAiMemoryFeature', () => {
    it('should configure AI language when no existing config', async () => {
      const { configureAiMemoryFeature } = await import('../../../src/utils/features')
      const { applyAiLanguageDirective } = await import('../../../src/utils/config')
      await import('../../../src/utils/output-style')
      const { selectAiOutputLanguage } = await import('../../../src/utils/prompts')
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({} as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({
        option: 'language',
      })
      vi.mocked(selectAiOutputLanguage).mockResolvedValue('chinese-simplified')
      vi.mocked(applyAiLanguageDirective).mockResolvedValue(undefined)
      vi.mocked(updateZcfConfig).mockResolvedValue(undefined)

      await configureAiMemoryFeature()

      expect(selectAiOutputLanguage).toHaveBeenCalledWith()
      expect(applyAiLanguageDirective).toHaveBeenCalledWith('chinese-simplified')
      expect(updateZcfConfig).toHaveBeenCalledWith({ aiOutputLang: 'chinese-simplified' })
    })

    it('should show existing language config and ask for modification', async () => {
      const { configureAiMemoryFeature } = await import('../../../src/utils/features')
      const { applyAiLanguageDirective } = await import('../../../src/utils/config')
      const { selectAiOutputLanguage } = await import('../../../src/utils/prompts')
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ aiOutputLang: 'en' } as any)
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ option: 'language' })
      queuePromptBooleans(true)
      vi.mocked(selectAiOutputLanguage).mockResolvedValue('zh-CN')
      vi.mocked(applyAiLanguageDirective).mockResolvedValue(undefined)
      vi.mocked(updateZcfConfig).mockResolvedValue(undefined)

      await configureAiMemoryFeature()

      expect(inquirer.prompt).toHaveBeenCalledTimes(1)
      expect(selectAiOutputLanguage).toHaveBeenCalled()
      expect(applyAiLanguageDirective).toHaveBeenCalledWith('zh-CN')
    })

    it('should keep existing language config when user declines modification', async () => {
      const { configureAiMemoryFeature } = await import('../../../src/utils/features')
      const { applyAiLanguageDirective } = await import('../../../src/utils/config')
      const { selectAiOutputLanguage } = await import('../../../src/utils/prompts')
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ aiOutputLang: 'chinese-simplified' } as any)
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ option: 'language' })
      queuePromptBooleans(false)

      await configureAiMemoryFeature()

      expect(selectAiOutputLanguage).not.toHaveBeenCalled()
      expect(applyAiLanguageDirective).not.toHaveBeenCalled()
      expect(updateZcfConfig).not.toHaveBeenCalled()
    })

    it('should configure AI output style when outputStyle option selected', async () => {
      const { configureAiMemoryFeature } = await import('../../../src/utils/features')
      const { configureOutputStyle: _configureOutputStyle } = await import('../../../src/utils/output-style')

      vi.mocked(inquirer.prompt).mockResolvedValue({ option: 'outputStyle' })
      vi.mocked(_configureOutputStyle).mockResolvedValue(undefined)

      await configureAiMemoryFeature()

      expect(_configureOutputStyle).toHaveBeenCalledWith()
    })

    it('should handle user cancellation', async () => {
      const { configureAiMemoryFeature } = await import('../../../src/utils/features')
      const { applyAiLanguageDirective } = await import('../../../src/utils/config')
      const { configureOutputStyle: _configureOutputStyle } = await import('../../../src/utils/output-style')

      vi.mocked(inquirer.prompt).mockResolvedValue({ option: undefined })

      await configureAiMemoryFeature()

      expect(applyAiLanguageDirective).not.toHaveBeenCalled()
      expect(_configureOutputStyle).not.toHaveBeenCalled()
    })
  })

  // clearZcfCacheFeature tests removed - functionality replaced with uninstall command

  describe('changeScriptLanguageFeature', () => {
    it('should change script language', async () => {
      const { changeScriptLanguageFeature } = await import('../../../src/utils/features')
      const { updateZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: 'en' })
      vi.mocked(updateZcfConfig).mockResolvedValue(undefined)

      const result = await changeScriptLanguageFeature('zh-CN')

      expect(result).toBe('en')
      expect(updateZcfConfig).toHaveBeenCalledWith({ preferredLang: 'en' })
    })
  })

  describe('configureEnvPermissionFeature', () => {
    it('should configure environment permissions', async () => {
      const { configureEnvPermissionFeature } = await import('../../../src/utils/features')
      const { importRecommendedEnv } = await import('../../../src/utils/simple-config')

      vi.mocked(inquirer.prompt).mockResolvedValue({
        choice: 'env',
      })
      vi.mocked(importRecommendedEnv).mockResolvedValue(undefined)

      await configureEnvPermissionFeature()

      expect(importRecommendedEnv).toHaveBeenCalled()
    })
  })

  describe('configureCodexDefaultModelFeature', () => {
    beforeEach(() => {
      vi.mocked(inquirer.prompt).mockReset()
    })

    it('should handle new model configuration when no existing config', async () => {
      const { configureCodexDefaultModelFeature } = await import('../../../src/utils/features')
      const { readCodexConfig } = await import('../../../src/utils/code-tools/codex')

      vi.mocked(readCodexConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ model: 'gpt-5' })

      await configureCodexDefaultModelFeature()

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'model',
          type: 'list',
          choices: expect.any(Array),
        }),
      )
    })

    it('should handle existing model configuration', async () => {
      const { configureCodexDefaultModelFeature } = await import('../../../src/utils/features')
      const { readCodexConfig } = await import('../../../src/utils/code-tools/codex')

      vi.mocked(readCodexConfig).mockReturnValue({
        model: 'gpt-5-codex',
        modelProvider: 'openai',
        providers: [],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ modify: false })

      await configureCodexDefaultModelFeature()

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Keeping existing model'))
    })

    it('should handle custom model selection', async () => {
      const { configureCodexDefaultModelFeature } = await import('../../../src/utils/features')
      const { readCodexConfig } = await import('../../../src/utils/code-tools/codex')

      vi.mocked(readCodexConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ model: 'custom' })
        .mockResolvedValueOnce({ customModel: 'custom-gpt-6' })

      await configureCodexDefaultModelFeature()

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Custom model configuration completed'))
    })

    it('should handle custom model selection with empty input', async () => {
      const { configureCodexDefaultModelFeature } = await import('../../../src/utils/features')
      const { readCodexConfig } = await import('../../../src/utils/code-tools/codex')

      vi.mocked(readCodexConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ model: 'custom' })
        .mockResolvedValueOnce({ customModel: '   ' })

      await configureCodexDefaultModelFeature()

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Custom model configuration skipped'))
    })

    it('should handle user cancellation', async () => {
      const { configureCodexDefaultModelFeature } = await import('../../../src/utils/features')
      const { readCodexConfig } = await import('../../../src/utils/code-tools/codex')

      vi.mocked(readCodexConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ model: undefined })

      await configureCodexDefaultModelFeature()

      // Should handle cancellation gracefully
    })
  })

  describe('configureCodexAiMemoryFeature', () => {
    beforeEach(() => {
      vi.mocked(inquirer.prompt).mockReset()
    })

    it('should handle language configuration option', async () => {
      const { configureCodexAiMemoryFeature } = await import('../../../src/utils/features')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { selectAiOutputLanguage } = await import('../../../src/utils/prompts')

      vi.mocked(readZcfConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ option: 'language' })
      vi.mocked(selectAiOutputLanguage).mockResolvedValue('chinese-simplified')

      await configureCodexAiMemoryFeature()

      expect(selectAiOutputLanguage).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('AI output language configured'))
    })

    it('should handle existing language configuration', async () => {
      const { configureCodexAiMemoryFeature } = await import('../../../src/utils/features')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        codeToolType: 'codex',
        lastUpdated: new Date().toISOString(),
        aiOutputLang: 'english',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ option: 'language' })
        .mockResolvedValueOnce({ modify: false })

      await configureCodexAiMemoryFeature()

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Keeping existing language'))
    })

    it('should handle system prompt configuration option', async () => {
      const { configureCodexAiMemoryFeature } = await import('../../../src/utils/features')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { runCodexSystemPromptSelection } = await import('../../../src/utils/code-tools/codex')

      vi.mocked(readZcfConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        codeToolType: 'codex',
        lastUpdated: new Date().toISOString(),
        aiOutputLang: 'english',
      })
      vi.mocked(inquirer.prompt).mockResolvedValue({ option: 'systemPrompt' })
      vi.mocked(runCodexSystemPromptSelection).mockResolvedValue(undefined)

      await configureCodexAiMemoryFeature()

      expect(runCodexSystemPromptSelection).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('system prompt'))
    })

    it('should handle user cancellation', async () => {
      const { configureCodexAiMemoryFeature } = await import('../../../src/utils/features')

      vi.mocked(inquirer.prompt).mockResolvedValue({ option: undefined })

      await configureCodexAiMemoryFeature()

      // Should return early without further processing
      expect(inquirer.prompt).toHaveBeenCalledTimes(1)
    })
  })

  // Note: ensureLanguageDirectiveInAgents, updateCodexLanguageDirective, and updateCodexModelProvider
  // are internal functions (not exported) and should not be tested directly

  describe('error handling for Codex features', () => {
    it('should handle errors in configureCodexDefaultModelFeature', async () => {
      const { configureCodexDefaultModelFeature } = await import('../../../src/utils/features')
      const { readCodexConfig } = await import('../../../src/utils/code-tools/codex')

      vi.mocked(readCodexConfig).mockImplementation(() => {
        throw new Error('Config read failed')
      })

      await expect(configureCodexDefaultModelFeature()).rejects.toThrow('Config read failed')
    })

    it('should handle errors in configureCodexAiMemoryFeature', async () => {
      const { configureCodexAiMemoryFeature } = await import('../../../src/utils/features')

      vi.mocked(inquirer.prompt).mockRejectedValue(new Error('Prompt failed'))

      await expect(configureCodexAiMemoryFeature()).rejects.toThrow('Prompt failed')
    })
  })

  // Edge case tests for successful operations
  describe('additional successful operation cases', () => {
    it('should handle MCP service selection cancellation gracefully', async () => {
      const { configureMcpFeature } = await import('../../../src/utils/features')
      const { selectMcpServices } = await import('../../../src/utils/mcp-selector')

      vi.mocked(selectMcpServices).mockResolvedValue([])

      // Should handle empty service selection gracefully
      await expect(configureMcpFeature()).resolves.not.toThrow()
    })

    it('should handle backup creation failures and continue', async () => {
      const { configureMcpFeature } = await import('../../../src/utils/features')
      const { selectMcpServices } = await import('../../../src/utils/mcp-selector')
      const { backupMcpConfig } = await import('../../../src/utils/claude-config')

      vi.mocked(selectMcpServices).mockResolvedValue(['context7'])
      vi.mocked(backupMcpConfig).mockReturnValue(null)

      // Should proceed even if backup fails
      await expect(configureMcpFeature()).resolves.not.toThrow()
    })

    it('should handle successful API configuration with complete setup', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features')
      const { getExistingApiConfig } = await import('../../../src/utils/config')
      const { configureApiCompletely } = await import('../../../src/utils/config-operations')

      vi.mocked(getExistingApiConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ action: 'complete' })
      vi.mocked(configureApiCompletely).mockResolvedValue({ url: 'https://api.test.com', key: 'test-key', authType: 'api_key' })

      // Should complete successfully
      await expect(configureApiFeature()).resolves.not.toThrow()
    })
  })
})
