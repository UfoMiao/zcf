import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock modules
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../src/utils/installer', () => ({
  checkClaudeInstalled: vi.fn(),
  installClaudeCode: vi.fn(),
  isClaudeCodeInstalled: vi.fn(),
  getInstallationStatus: vi.fn(),
  removeLocalClaudeCode: vi.fn(),
}))

vi.mock('../../../src/utils/installation-manager', () => ({
  handleMultipleInstallations: vi.fn(),
}))

vi.mock('../../../src/utils/version-checker', () => ({
  checkClaudeCodeVersionAndPrompt: vi.fn(),
}))

vi.mock('../../../src/utils/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/utils/config')>()
  return {
    ...actual,
    checkExistingConfig: vi.fn(),
    backupExistingConfig: vi.fn(),
    copyConfigFiles: vi.fn(),
    configureApi: vi.fn(),
    applyAiLanguageDirective: vi.fn(),
    getExistingApiConfig: vi.fn(),
    ensureClaudeDir: vi.fn(),
    switchToOfficialLogin: vi.fn(),
    promptApiConfigurationAction: vi.fn(),
    updateCustomModel: vi.fn(),
  }
})

vi.mock('../../../src/utils/config-operations', () => ({
  configureApiCompletely: vi.fn(),
  modifyApiConfigPartially: vi.fn(),
}))

vi.mock('../../../src/utils/claude-code-incremental-manager', () => ({
  configureIncrementalManagement: vi.fn(),
}))

vi.mock('../../../src/utils/prompts', () => ({
  selectAiOutputLanguage: vi.fn(),
  resolveAiOutputLanguage: vi.fn(),
  resolveTemplateLanguage: vi.fn(),
}))

vi.mock('../../../src/utils/claude-config', () => ({
  configureMcpServers: vi.fn(),
  addCompletedOnboarding: vi.fn(),
  backupMcpConfig: vi.fn(),
  buildMcpServerConfig: vi.fn(),
  fixWindowsMcpConfig: vi.fn(),
  mergeMcpServers: vi.fn(),
  readMcpConfig: vi.fn(),
  writeMcpConfig: vi.fn(),
}))

vi.mock('../../../src/utils/banner', () => ({
  showBanner: vi.fn(),
  displayBannerWithInfo: vi.fn(),
}))

vi.mock('../../../src/utils/output-style', () => ({
  selectOutputStyles: vi.fn(),
  configureOutputStyle: vi.fn(),
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../../src/utils/code-tools/codex', () => ({
  runCodexFullInit: vi.fn(),
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

vi.mock('../../../src/utils/mcp-selector', () => ({
  selectMcpServices: vi.fn(),
}))
vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

vi.mock('../../../src/utils/workflow-installer', () => ({
  selectAndInstallWorkflows: vi.fn(),
}))

vi.mock('../../../src/utils/ccr/installer', () => ({
  isCcrInstalled: vi.fn(),
  installCcr: vi.fn(),
}))

vi.mock('../../../src/utils/ccr/config', () => ({
  setupCcrConfiguration: vi.fn(),
}))

vi.mock('../../../src/utils/cometix/installer', () => ({
  isCometixLineInstalled: vi.fn(),
  installCometixLine: vi.fn(),
}))

vi.mock('../../../src/utils/platform', () => ({
  isWindows: vi.fn().mockReturnValue(false),
  isTermux: vi.fn().mockReturnValue(false),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))

vi.mock('../../../src/constants', () => ({
  CLAUDE_DIR: '/test/.claude',
  DEFAULT_CODE_TOOL_TYPE: 'claude-code',
  SETTINGS_FILE: '/test/.claude/settings.json',
  CODE_TOOL_BANNERS: {
    'claude-code': 'ZCF',
    'codex': 'Codex',
  },
  isCodeToolType: vi.fn((type: string) => ['claude-code', 'codex'].includes(type)),
}))

// Common test setup
interface TestMocks {
  resolveAiOutputLanguage: any
  resolveTemplateLanguage: any
  isClaudeCodeInstalled: any
  installClaudeCode: any
  getInstallationStatus: any
  handleMultipleInstallations: any
  checkClaudeCodeVersionAndPrompt: any
  copyConfigFiles: any
  applyAiLanguageDirective: any
  selectMcpServices: any
  selectAndInstallWorkflows: any
  configureOutputStyle: any
  updateZcfConfig: any
  existsSync: any
  inquirerPrompt: any
  promptBoolean: any
  readZcfConfig: any
  getExistingApiConfig: any
  switchToOfficialLogin: any
  promptApiConfigurationAction: any
  isCcrInstalled: any
  setupCcrConfiguration: any
  configureApiCompletely: any
  modifyApiConfigPartially: any
  configureIncrementalManagement: any
}

let testMocks: TestMocks

describe('init command', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    // Setup common mocks
    const { resolveAiOutputLanguage, resolveTemplateLanguage } = await import('../../../src/utils/prompts')
    const { isClaudeCodeInstalled, getInstallationStatus, installClaudeCode } = await import('../../../src/utils/installer')
    const { handleMultipleInstallations } = await import('../../../src/utils/installation-manager')
    const { checkClaudeCodeVersionAndPrompt } = await import('../../../src/utils/version-checker')
    const { copyConfigFiles, applyAiLanguageDirective, getExistingApiConfig, switchToOfficialLogin, promptApiConfigurationAction } = await import('../../../src/utils/config')
    const { selectMcpServices } = await import('../../../src/utils/mcp-selector')
    const { selectAndInstallWorkflows } = await import('../../../src/utils/workflow-installer')
    const { configureOutputStyle } = await import('../../../src/utils/output-style')
    const { updateZcfConfig, readZcfConfig } = await import('../../../src/utils/zcf-config')
    const { isCcrInstalled, installCcr: _installCcr } = await import('../../../src/utils/ccr/installer')
    const { setupCcrConfiguration } = await import('../../../src/utils/ccr/config')
    const { configureApiCompletely, modifyApiConfigPartially } = await import('../../../src/utils/config-operations')
    const { configureIncrementalManagement } = await import('../../../src/utils/claude-code-incremental-manager')
    const { existsSync } = await import('node:fs')
    const { promptBoolean } = await import('../../../src/utils/toggle-prompt')

    testMocks = {
      resolveAiOutputLanguage: vi.mocked(resolveAiOutputLanguage),
      resolveTemplateLanguage: vi.mocked(resolveTemplateLanguage),
      isClaudeCodeInstalled: vi.mocked(isClaudeCodeInstalled),
      installClaudeCode: vi.mocked(installClaudeCode),
      getInstallationStatus: vi.mocked(getInstallationStatus),
      handleMultipleInstallations: vi.mocked(handleMultipleInstallations),
      checkClaudeCodeVersionAndPrompt: vi.mocked(checkClaudeCodeVersionAndPrompt),
      copyConfigFiles: vi.mocked(copyConfigFiles),
      applyAiLanguageDirective: vi.mocked(applyAiLanguageDirective),
      selectMcpServices: vi.mocked(selectMcpServices),
      selectAndInstallWorkflows: vi.mocked(selectAndInstallWorkflows),
      configureOutputStyle: vi.mocked(configureOutputStyle),
      updateZcfConfig: vi.mocked(updateZcfConfig),
      readZcfConfig: vi.mocked(readZcfConfig),
      existsSync: vi.mocked(existsSync),
      inquirerPrompt: vi.mocked(inquirer.prompt),
      getExistingApiConfig: vi.mocked(getExistingApiConfig),
      switchToOfficialLogin: vi.mocked(switchToOfficialLogin),
      promptApiConfigurationAction: vi.mocked(promptApiConfigurationAction),
      isCcrInstalled: vi.mocked(isCcrInstalled),
      setupCcrConfiguration: vi.mocked(setupCcrConfiguration),
      configureApiCompletely: vi.mocked(configureApiCompletely),
      modifyApiConfigPartially: vi.mocked(modifyApiConfigPartially),
      configureIncrementalManagement: vi.mocked(configureIncrementalManagement),
      promptBoolean: vi.mocked(promptBoolean),
    }
    // Default promptBoolean to return false to avoid hanging
    testMocks.promptBoolean.mockResolvedValue(false)
  })

  it('should load init module', async () => {
    const module = await import('../../../src/commands/init')
    expect(module).toBeDefined()
    expect(module.init).toBeDefined()
    expect(typeof module.init).toBe('function')
  })

  describe('init function', () => {
    describe('language selection', () => {
      it('should handle script language selection', async () => {
        const { init } = await import('../../../src/commands/init')

        // Setup mocks for minimal flow
        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.existsSync.mockReturnValue(false)
        testMocks.readZcfConfig.mockReturnValue({ codeToolType: 'claude-code' } as any)
        testMocks.resolveTemplateLanguage.mockResolvedValue('zh-CN')
        testMocks.inquirerPrompt.mockResolvedValueOnce({ shouldConfigureMcp: false })
        testMocks.resolveAiOutputLanguage.mockResolvedValue('chinese-simplified')
        testMocks.selectAndInstallWorkflows.mockResolvedValue(undefined)
        testMocks.configureOutputStyle.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)

        await init({ skipBanner: true })

        // Language is now handled via resolveTemplateLanguage
        expect(testMocks.resolveTemplateLanguage).toHaveBeenCalled()
        expect(testMocks.resolveAiOutputLanguage).toHaveBeenCalled()
      })

      it('should handle options correctly', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.existsSync.mockReturnValue(false)
        testMocks.readZcfConfig.mockReturnValue({ codeToolType: 'claude-code' } as any)
        testMocks.resolveAiOutputLanguage.mockResolvedValue('english')
        testMocks.inquirerPrompt.mockResolvedValue({ shouldConfigureMcp: false })
        testMocks.selectAndInstallWorkflows.mockResolvedValue(undefined)
        testMocks.configureOutputStyle.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)

        await init({ configLang: 'en', force: true, skipBanner: true })

        // When configLang is specified, no prompt for language selection
        expect(testMocks.resolveAiOutputLanguage).toHaveBeenCalled()
      })
    })

    it('should persist resolved code tool type to zcf config', async () => {
      const { init } = await import('../../../src/commands/init')

      testMocks.getInstallationStatus.mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })
      testMocks.existsSync.mockReturnValue(false)
      testMocks.readZcfConfig.mockReturnValue({ codeToolType: 'claude-code' } as any)
      testMocks.resolveAiOutputLanguage.mockResolvedValue('english')
      testMocks.inquirerPrompt.mockResolvedValue({})
      testMocks.selectAndInstallWorkflows.mockResolvedValue(undefined)
      testMocks.configureOutputStyle.mockResolvedValue(undefined)
      testMocks.updateZcfConfig.mockResolvedValue(undefined)

      const codexModule = await import('../../../src/utils/code-tools/codex')
      const codexInitSpy = vi.spyOn(codexModule, 'runCodexFullInit').mockResolvedValue('en')

      await init({
        skipBanner: true,
        skipPrompt: true,
        codeType: 'codex',
        configLang: 'en',
        aiOutputLang: 'en',
      } as any)

      expect(testMocks.updateZcfConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          codeToolType: 'codex',
        }),
      )
      expect(codexInitSpy).toHaveBeenCalled()
      codexInitSpy.mockRestore()
    })

    describe('claude Code installation', () => {
      it('should handle Claude Code not installed', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: false,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({})
        testMocks.existsSync.mockReturnValue(false)
        testMocks.resolveTemplateLanguage.mockResolvedValue('zh-CN')
        testMocks.inquirerPrompt
          .mockResolvedValueOnce({ shouldConfigureMcp: false })
        testMocks.promptBoolean.mockResolvedValueOnce(true) // shouldInstall
        testMocks.resolveAiOutputLanguage.mockResolvedValue('chinese-simplified')
        testMocks.selectAndInstallWorkflows.mockResolvedValue(undefined)
        testMocks.configureOutputStyle.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)
        testMocks.installClaudeCode.mockResolvedValue(undefined)
        testMocks.handleMultipleInstallations.mockResolvedValue('none')
        testMocks.checkClaudeCodeVersionAndPrompt.mockResolvedValue(undefined)

        await init({ skipBanner: true })

        expect(testMocks.getInstallationStatus).toHaveBeenCalled()
        expect(testMocks.installClaudeCode).toHaveBeenCalled()
      })
    })

    describe('configuration handling', () => {
      it('should handle existing config', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({})
        testMocks.existsSync.mockReturnValue(true)
        testMocks.resolveTemplateLanguage.mockResolvedValue('zh-CN')
        testMocks.inquirerPrompt
          .mockResolvedValueOnce({ action: 'skip' })
        testMocks.resolveAiOutputLanguage.mockResolvedValue('chinese-simplified')

        await init({ skipBanner: true })

        expect(testMocks.inquirerPrompt).toHaveBeenCalled()
      })
    })

    describe('integration flow', () => {
      it('should handle full initialization flow', async () => {
        const { init } = await import('../../../src/commands/init')

        // Setup all mocks for successful flow
        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({})
        testMocks.existsSync.mockReturnValue(false) // No existing config, so action will be 'new'
        // Mock SETTINGS_FILE path specifically
        testMocks.existsSync.mockImplementation((path: string) => {
          // If it's checking for SETTINGS_FILE, return false to trigger new install flow
          if (path.includes('settings.json')) {
            return false
          }
          return false
        })
        testMocks.resolveTemplateLanguage.mockResolvedValue('zh-CN')
        testMocks.inquirerPrompt
          .mockResolvedValueOnce({ shouldConfigureMcp: false })
        testMocks.resolveAiOutputLanguage.mockResolvedValue('chinese-simplified')
        testMocks.copyConfigFiles.mockReturnValue(undefined)
        testMocks.applyAiLanguageDirective.mockReturnValue(undefined)
        testMocks.selectAndInstallWorkflows.mockResolvedValue(undefined)
        testMocks.configureOutputStyle.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockReturnValue(undefined)
        testMocks.handleMultipleInstallations.mockResolvedValue('global')
        testMocks.checkClaudeCodeVersionAndPrompt.mockResolvedValue(undefined)

        await init({ skipBanner: true })

        expect(testMocks.inquirerPrompt).toHaveBeenCalled()
        expect(testMocks.getInstallationStatus).toHaveBeenCalled()
        expect(testMocks.copyConfigFiles).toHaveBeenCalled()
        expect(testMocks.applyAiLanguageDirective).toHaveBeenCalled()
        expect(testMocks.updateZcfConfig).toHaveBeenCalled()
      }, 45000) // 45秒超时，给CI更多时间
    })

    describe('error handling', () => {
      it('should handle errors gracefully', async () => {
        const { init } = await import('../../../src/commands/init')

        const error = new Error('Test error')
        testMocks.readZcfConfig.mockImplementation(() => {
          throw error
        })

        await init({ skipBanner: true })

        expect(console.error).toHaveBeenCalled()
      })
    })

    describe('codex-specific initialization', () => {
      it('should display codex banner when codeType is codex', async () => {
        const { init } = await import('../../../src/commands/init')
        const { displayBannerWithInfo } = await import('../../../src/utils/banner')
        const displayBannerSpy = vi.mocked(displayBannerWithInfo)

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({ codeToolType: 'codex' } as any)
        testMocks.existsSync.mockReturnValue(false)

        const codexModule = await import('../../../src/utils/code-tools/codex')
        const runCodexFullInitSpy = vi.spyOn(codexModule, 'runCodexFullInit').mockResolvedValue('chinese-simplified')

        await init({
          skipBanner: false,
          codeType: 'codex',
          configLang: 'en',
          aiOutputLang: 'en',
          skipPrompt: true,
        } as any)

        // Should call displayBannerWithInfo with codex banner
        expect(displayBannerSpy).toHaveBeenCalledWith('Codex')
        expect(runCodexFullInitSpy).toHaveBeenCalledWith({
          aiOutputLang: 'en',
          skipPrompt: true,
          apiMode: 'skip',
          customApiConfig: undefined,
          workflows: ['commonTools', 'sixStepsWorkflow', 'featPlanUx', 'gitWorkflow', 'bmadWorkflow'],
        })
      })

      it('should handle codex language selection without duplicate prompts', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({
          codeToolType: 'codex',
          templateLang: 'zh-CN',
        } as any)
        testMocks.existsSync.mockReturnValue(false)

        const codexModule = await import('../../../src/utils/code-tools/codex')
        const runCodexFullInitSpy = vi.spyOn(codexModule, 'runCodexFullInit').mockResolvedValue('zh-CN')

        await init({
          skipBanner: true,
          codeType: 'codex',
          skipPrompt: true,
        } as any)

        expect(runCodexFullInitSpy).toHaveBeenCalledWith({
          aiOutputLang: undefined,
          skipPrompt: true,
          apiMode: 'skip',
          customApiConfig: undefined,
          workflows: ['commonTools', 'sixStepsWorkflow', 'featPlanUx', 'gitWorkflow', 'bmadWorkflow'],
        })
        // Should not call resolveTemplateLanguage for codex when skipPrompt is true
        expect(testMocks.resolveTemplateLanguage).not.toHaveBeenCalled()
      })

      it('should use i18n language for codex config when no template language in config', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({
          codeToolType: 'codex',
        } as any)
        testMocks.existsSync.mockReturnValue(false)

        const codexModule = await import('../../../src/utils/code-tools/codex')
        const runCodexFullInitSpy = vi.spyOn(codexModule, 'runCodexFullInit').mockResolvedValue('zh-CN')

        await init({
          skipBanner: true,
          codeType: 'codex',
          skipPrompt: false, // Interactive mode
        } as any)

        expect(runCodexFullInitSpy).toHaveBeenCalled()
        expect(runCodexFullInitSpy).toHaveBeenCalled()

        expect(runCodexFullInitSpy).toHaveBeenCalled()

        expect(runCodexFullInitSpy).toHaveBeenCalled()

        expect(testMocks.updateZcfConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            codeToolType: 'codex',
            templateLang: 'en', // Should use i18n.language fallback
            aiOutputLang: 'zh-CN', // Should use resolved value from runCodexFullInit
          }),
        )
      })

      it('should handle codex aiOutputLang resolution correctly', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({
          codeToolType: 'codex',
          aiOutputLang: 'en',
        } as any)
        testMocks.existsSync.mockReturnValue(false)

        const codexModule = await import('../../../src/utils/code-tools/codex')
        const runCodexFullInitSpy = vi.spyOn(codexModule, 'runCodexFullInit').mockResolvedValue('chinese-simplified')

        await init({
          skipBanner: true,
          codeType: 'codex',
          aiOutputLang: 'japanese', // Command line option
          skipPrompt: true,
        } as any)

        expect(runCodexFullInitSpy).toHaveBeenCalledWith({
          aiOutputLang: 'japanese',
          skipPrompt: true,
          apiMode: 'skip',
          customApiConfig: undefined,
          workflows: ['commonTools', 'sixStepsWorkflow', 'featPlanUx', 'gitWorkflow', 'bmadWorkflow'],
        })

        expect(runCodexFullInitSpy).toHaveBeenCalled()

        expect(runCodexFullInitSpy).toHaveBeenCalled()

        expect(runCodexFullInitSpy).toHaveBeenCalled()

        expect(testMocks.updateZcfConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            aiOutputLang: 'chinese-simplified', // Should use resolved value from runCodexFullInit
          }),
        )
      })

      it('should fallback to config values when runCodexFullInit returns null', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({
          codeToolType: 'codex',
          aiOutputLang: 'chinese-simplified',
        } as any)
        testMocks.existsSync.mockReturnValue(false)

        const codexModule = await import('../../../src/utils/code-tools/codex')
        const runCodexFullInitSpy = vi.spyOn(codexModule, 'runCodexFullInit').mockResolvedValue('') // Return empty string instead of null

        await init({
          skipBanner: true,
          codeType: 'codex',
          aiOutputLang: 'japanese',
          skipPrompt: true,
        } as any)

        expect(runCodexFullInitSpy).toHaveBeenCalled()

        expect(testMocks.updateZcfConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            aiOutputLang: '', // Should use resolved value from runCodexFullInit (empty string)
          }),
        )
      })

      it('should use \'en\' as final fallback for aiOutputLang', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({
          codeToolType: 'codex',
        } as any)
        testMocks.existsSync.mockReturnValue(false)

        const codexModule = await import('../../../src/utils/code-tools/codex')
        const runCodexFullInitSpy = vi.spyOn(codexModule, 'runCodexFullInit').mockResolvedValue('') // Return empty string instead of null

        await init({
          skipBanner: true,
          codeType: 'codex',
          skipPrompt: true,
          // No aiOutputLang specified
        } as any)

        expect(runCodexFullInitSpy).toHaveBeenCalled()

        expect(testMocks.updateZcfConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            aiOutputLang: '', // Should use resolved value from runCodexFullInit (empty string)
          }),
        )
      })
    })

    describe('claude-code specific initialization', () => {
      it('should display default banner for claude-code', async () => {
        const { init } = await import('../../../src/commands/init')
        const { displayBannerWithInfo } = await import('../../../src/utils/banner')
        const displayBannerSpy = vi.mocked(displayBannerWithInfo)

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({})
        testMocks.existsSync.mockReturnValue(false)
        testMocks.resolveTemplateLanguage.mockResolvedValue('zh-CN')
        testMocks.inquirerPrompt.mockResolvedValue({ shouldConfigureMcp: false })
        testMocks.resolveAiOutputLanguage.mockResolvedValue('chinese-simplified')
        testMocks.selectAndInstallWorkflows.mockResolvedValue(undefined)
        testMocks.configureOutputStyle.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)

        await init({
          skipBanner: false,
          codeType: 'claude-code',
          configLang: 'zh-CN',
        })

        // Should call displayBannerWithInfo with 'ZCF' (fallback)
        expect(displayBannerSpy).toHaveBeenCalledWith('ZCF')
      })

      it('should call resolveTemplateLanguage for claude-code in interactive mode', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({
          codeToolType: 'claude-code',
        } as any)
        testMocks.existsSync.mockReturnValue(false)
        testMocks.resolveTemplateLanguage.mockResolvedValue('zh-CN')
        testMocks.inquirerPrompt.mockResolvedValue({ shouldConfigureMcp: false })
        testMocks.resolveAiOutputLanguage.mockResolvedValue('chinese-simplified')
        testMocks.selectAndInstallWorkflows.mockResolvedValue(undefined)
        testMocks.configureOutputStyle.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)

        await init({
          skipBanner: true,
          codeType: 'claude-code',
          skipPrompt: false, // Interactive mode
        })

        expect(testMocks.resolveTemplateLanguage).toHaveBeenCalledWith(
          undefined,
          { codeToolType: 'claude-code' },
          false,
        )
      })

      it('should use en as default in skip-prompt mode for claude-code', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({
          codeToolType: 'claude-code',
        } as any)
        testMocks.existsSync.mockReturnValue(false)
        testMocks.inquirerPrompt.mockResolvedValue({ shouldConfigureMcp: false })
        testMocks.resolveAiOutputLanguage.mockResolvedValue('english')
        testMocks.selectAndInstallWorkflows.mockResolvedValue(undefined)
        testMocks.configureOutputStyle.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)

        await init({
          skipBanner: true,
          codeType: 'claude-code',
          skipPrompt: true, // Skip prompt mode
        })

        // Should call resolveTemplateLanguage in skip-prompt mode
        expect(testMocks.resolveTemplateLanguage).toHaveBeenCalledWith(
          undefined,
          { codeToolType: 'claude-code' },
          true,
        )
        // Should use 'en' as default configLang
        expect(testMocks.copyConfigFiles).toHaveBeenCalled()
      })
    })
  })

  // New API Configuration Mode Tests
  describe('new API configuration mode', () => {
    describe('selectApiConfigurationMode', () => {
      it('should display unified API configuration menu', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({
          codeToolType: 'claude-code',
        } as any)
        testMocks.existsSync.mockReturnValue(false)
        testMocks.getExistingApiConfig.mockReturnValue(null) // No existing config
        testMocks.inquirerPrompt.mockResolvedValueOnce({ apiMode: 'official' })
        testMocks.switchToOfficialLogin.mockReturnValue(true)
        testMocks.configureOutputStyle.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)

        await init({
          skipBanner: true,
          codeType: 'claude-code',
          skipPrompt: false,
        })

        // Should show unified API configuration menu
        expect(testMocks.inquirerPrompt).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'list',
            name: 'apiMode',
            message: expect.any(String),
            choices: expect.arrayContaining([
              expect.objectContaining({ value: 'official' }),
              expect.objectContaining({ value: 'custom' }),
              expect.objectContaining({ value: 'ccr' }),
              expect.objectContaining({ value: 'skip' }),
            ]),
          }),
        )
      })

      it('should handle official login mode selection', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({
          codeToolType: 'claude-code',
        } as any)
        testMocks.existsSync.mockReturnValue(false)
        testMocks.getExistingApiConfig.mockReturnValue(null)
        testMocks.inquirerPrompt.mockResolvedValueOnce({ apiMode: 'official' }) // Unified menu selection
        testMocks.switchToOfficialLogin.mockReturnValue(true)
        testMocks.configureOutputStyle.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)

        await init({
          skipBanner: true,
          codeType: 'claude-code',
          skipPrompt: false,
        })

        // Should call switchToOfficialLogin for official mode
        expect(testMocks.switchToOfficialLogin).toHaveBeenCalled()
      })

      it('should handle CCR proxy mode selection', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({
          codeToolType: 'claude-code',
        } as any)
        testMocks.existsSync.mockReturnValue(false)
        testMocks.getExistingApiConfig.mockReturnValue(null)
        testMocks.isCcrInstalled.mockResolvedValue({
          hasCorrectPackage: true,
        } as any)
        testMocks.setupCcrConfiguration.mockResolvedValue(true)
        testMocks.inquirerPrompt.mockResolvedValueOnce({ apiMode: 'ccr' }) // Unified menu selection
        testMocks.configureOutputStyle.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)

        await init({
          skipBanner: true,
          codeType: 'claude-code',
          skipPrompt: false,
        })

        // Should check CCR installation and setup CCR configuration
        expect(testMocks.isCcrInstalled).toHaveBeenCalled()
        expect(testMocks.setupCcrConfiguration).toHaveBeenCalled()
      })

      it('should handle skip mode selection', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({
          codeToolType: 'claude-code',
        } as any)
        testMocks.existsSync.mockReturnValue(false)
        testMocks.getExistingApiConfig.mockReturnValue(null)
        testMocks.inquirerPrompt.mockResolvedValueOnce({ apiMode: 'skip' })
        testMocks.configureOutputStyle.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)

        await init({
          skipBanner: true,
          codeType: 'claude-code',
          skipPrompt: false,
        })

        // Should not configure API, CCR, or official login
        expect(testMocks.configureApiCompletely).not.toHaveBeenCalled()
        expect(testMocks.switchToOfficialLogin).not.toHaveBeenCalled()
        expect(testMocks.setupCcrConfiguration).not.toHaveBeenCalled()
      })

      it('should handle custom API configuration with existing config', async () => {
        const { init } = await import('../../../src/commands/init')

        const existingConfig = {
          authType: 'api_key',
          url: 'https://api.anthropic.com',
          key: 'sk-test-key',
        }

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({
          codeToolType: 'claude-code',
        } as any)
        testMocks.existsSync.mockReturnValue(false) // Bypass global existing config prompt
        testMocks.getExistingApiConfig.mockReturnValue(existingConfig)
        testMocks.inquirerPrompt.mockResolvedValueOnce({ apiMode: 'custom' })

        // Mock the incremental configuration manager for Claude Code
        const mockConfigureIncrementalManagement = vi.spyOn(await import('../../../src/utils/claude-code-incremental-manager'), 'configureIncrementalManagement').mockResolvedValue()

        testMocks.configureOutputStyle.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)

        await init({
          skipBanner: true,
          codeType: 'claude-code',
          skipPrompt: false,
        })

        // For Claude Code, should call configureIncrementalManagement instead of promptApiConfigurationAction
        expect(mockConfigureIncrementalManagement).toHaveBeenCalled()
        expect(testMocks.promptApiConfigurationAction).not.toHaveBeenCalled()
        expect(testMocks.modifyApiConfigPartially).not.toHaveBeenCalled()
      })

      it('should handle custom API configuration without existing config', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({
          codeToolType: 'claude-code',
        } as any)
        testMocks.existsSync.mockReturnValue(false) // No existing config
        testMocks.getExistingApiConfig.mockReturnValue(null)
        testMocks.inquirerPrompt.mockResolvedValueOnce({ apiMode: 'custom' }) // Unified menu selection

        // Mock the incremental configuration manager for Claude Code
        const mockConfigureIncrementalManagement = vi.spyOn(await import('../../../src/utils/claude-code-incremental-manager'), 'configureIncrementalManagement').mockResolvedValue()

        testMocks.configureOutputStyle.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)

        await init({
          skipBanner: true,
          codeType: 'claude-code',
          skipPrompt: false,
        })

        // For Claude Code, should call configureIncrementalManagement for both existing and new configs
        expect(mockConfigureIncrementalManagement).toHaveBeenCalled()
        expect(testMocks.configureApiCompletely).not.toHaveBeenCalled()
      })

      it('should handle user cancellation gracefully', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.getInstallationStatus.mockResolvedValue({
          hasGlobal: true,
          hasLocal: false,
          localPath: '/Users/test/.claude/local/claude',
        })
        testMocks.readZcfConfig.mockReturnValue({
          codeToolType: 'claude-code',
        } as any)
        testMocks.existsSync.mockReturnValue(false)
        testMocks.getExistingApiConfig.mockReturnValue(null)
        testMocks.inquirerPrompt.mockResolvedValueOnce({ action: 'new' })
        testMocks.inquirerPrompt.mockResolvedValueOnce({ apiMode: undefined }) // User cancellation

        const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('process.exit called')
        })

        await expect(init({
          skipBanner: true,
          codeType: 'claude-code',
          skipPrompt: false,
        })).rejects.toThrow('process.exit called')

        expect(processExitSpy).toHaveBeenCalledWith(0)
      })
    })
  })
})
