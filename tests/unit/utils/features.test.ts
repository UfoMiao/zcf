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
}))

vi.mock('../../../src/utils/config-operations', () => ({
  configureApiCompletely: vi.fn(),
  modifyApiConfigPartially: vi.fn(),
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

// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    // Only mock initialization functions to avoid setup issues in tests
    ensureI18nInitialized: vi.fn(),
  }
})

describe('features utilities', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
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
    it('should configure API completely when no existing config', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features')
      const { getExistingApiConfig, configureApi } = await import('../../../src/utils/config')

      vi.mocked(getExistingApiConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ apiChoice: 'api_key' })
        .mockResolvedValueOnce({ url: 'https://api.test.com' })
        .mockResolvedValueOnce({ key: 'test-key' })
      vi.mocked(configureApi).mockReturnValue({ url: 'https://api.test.com', key: 'test-key', authType: 'api_key' })

      await configureApiFeature()

      expect(getExistingApiConfig).toHaveBeenCalled()
      expect(configureApi).toHaveBeenCalledWith({ url: 'https://api.test.com', key: 'test-key', authType: 'api_key' })
    })

    it('should modify API partially when existing config', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features')
      const { getExistingApiConfig } = await import('../../../src/utils/config')
      const { modifyApiConfigPartially } = await import('../../../src/utils/config-operations')
      await import('../../../src/constants')

      vi.mocked(getExistingApiConfig).mockReturnValue({ url: 'https://api.test.com', key: 'test-key', authType: 'api_key' })
      vi.mocked(inquirer.prompt).mockResolvedValue({ action: 'modify-partial' })
      vi.mocked(modifyApiConfigPartially).mockResolvedValue(undefined)

      await configureApiFeature()

      expect(modifyApiConfigPartially).toHaveBeenCalledWith({ url: 'https://api.test.com', key: 'test-key', authType: 'api_key' })
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
      const { updateDefaultModel, getExistingModelConfig } = await import('../../../src/utils/config')

      vi.mocked(getExistingModelConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ model: 'opus' })
      vi.mocked(updateDefaultModel).mockResolvedValue(undefined)

      await configureDefaultModelFeature()

      expect(getExistingModelConfig).toHaveBeenCalled()
      expect(updateDefaultModel).toHaveBeenCalledWith('opus')
    })

    it('should show existing config and ask for modification', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const { updateDefaultModel, getExistingModelConfig } = await import('../../../src/utils/config')

      vi.mocked(getExistingModelConfig).mockReturnValue('sonnet')
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ modify: true })
        .mockResolvedValueOnce({ model: 'opus' })
      vi.mocked(updateDefaultModel).mockResolvedValue(undefined)

      await configureDefaultModelFeature()

      expect(getExistingModelConfig).toHaveBeenCalled()
      expect(inquirer.prompt).toHaveBeenCalledTimes(2)
      expect(updateDefaultModel).toHaveBeenCalledWith('opus')
    })

    it('should keep existing config when user declines modification', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const { updateDefaultModel, getExistingModelConfig } = await import('../../../src/utils/config')

      vi.mocked(getExistingModelConfig).mockReturnValue('opus')
      vi.mocked(inquirer.prompt).mockResolvedValue({ modify: false })

      await configureDefaultModelFeature()

      expect(getExistingModelConfig).toHaveBeenCalled()
      expect(inquirer.prompt).toHaveBeenCalledTimes(1)
      expect(updateDefaultModel).not.toHaveBeenCalled()
    })

    it('should handle default model option selection', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const { updateDefaultModel, getExistingModelConfig } = await import('../../../src/utils/config')

      vi.mocked(getExistingModelConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ model: 'default' })
      vi.mocked(updateDefaultModel).mockResolvedValue(undefined)

      await configureDefaultModelFeature()

      expect(updateDefaultModel).toHaveBeenCalledWith('default')
    })

    it('should handle user cancellation', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const { updateDefaultModel, getExistingModelConfig } = await import('../../../src/utils/config')

      vi.mocked(getExistingModelConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ model: undefined })

      await configureDefaultModelFeature()

      expect(updateDefaultModel).not.toHaveBeenCalled()
    })

    it('should handle opusplan model selection', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const { updateDefaultModel, getExistingModelConfig } = await import('../../../src/utils/config')

      vi.mocked(getExistingModelConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ model: 'opusplan' })
      vi.mocked(updateDefaultModel).mockResolvedValue(undefined)

      await configureDefaultModelFeature()

      expect(updateDefaultModel).toHaveBeenCalledWith('opusplan')
    })

    it('should set correct default choice based on existing config', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const { getExistingModelConfig } = await import('../../../src/utils/config')

      vi.mocked(getExistingModelConfig).mockReturnValue('opus')
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ modify: true })
        .mockResolvedValueOnce({ model: 'sonnet' })

      await configureDefaultModelFeature()

      const secondCall = vi.mocked(inquirer.prompt).mock.calls[1][0] as any
      expect(secondCall.default).toBe(1) // 'opus' is at index 1 in ['default', 'opus', 'opusplan']
    })

    it('should include opusplan in model choices', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features')
      const { getExistingModelConfig } = await import('../../../src/utils/config')

      vi.mocked(getExistingModelConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ model: 'opusplan' })

      await configureDefaultModelFeature()

      const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as any
      const choices = promptCall.choices

      // Should include opusplan option
      expect(choices.some((choice: any) => choice.value === 'opusplan')).toBe(true)
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
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ option: 'language' })
        .mockResolvedValueOnce({ modify: true })
      vi.mocked(selectAiOutputLanguage).mockResolvedValue('zh-CN')
      vi.mocked(applyAiLanguageDirective).mockResolvedValue(undefined)
      vi.mocked(updateZcfConfig).mockResolvedValue(undefined)

      await configureAiMemoryFeature()

      expect(inquirer.prompt).toHaveBeenCalledTimes(2)
      expect(selectAiOutputLanguage).toHaveBeenCalled()
      expect(applyAiLanguageDirective).toHaveBeenCalledWith('zh-CN')
    })

    it('should keep existing language config when user declines modification', async () => {
      const { configureAiMemoryFeature } = await import('../../../src/utils/features')
      const { applyAiLanguageDirective } = await import('../../../src/utils/config')
      const { selectAiOutputLanguage } = await import('../../../src/utils/prompts')
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ aiOutputLang: 'chinese-simplified' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ option: 'language' })
        .mockResolvedValueOnce({ modify: false })

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
})
