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

vi.mock('../../../src/utils/config', () => ({
  checkExistingConfig: vi.fn(),
  backupExistingConfig: vi.fn(),
  copyConfigFiles: vi.fn(),
  configureApi: vi.fn(),
  applyAiLanguageDirective: vi.fn(),
  getExistingApiConfig: vi.fn(),
  ensureClaudeDir: vi.fn(),
}))

vi.mock('../../../src/utils/config-operations', () => ({
  configureApiCompletely: vi.fn(),
  modifyApiConfigPartially: vi.fn(),
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
  readZcfConfig: any
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
    const { copyConfigFiles, applyAiLanguageDirective } = await import('../../../src/utils/config')
    const { selectMcpServices } = await import('../../../src/utils/mcp-selector')
    const { selectAndInstallWorkflows } = await import('../../../src/utils/workflow-installer')
    const { configureOutputStyle } = await import('../../../src/utils/output-style')
    const { updateZcfConfig, readZcfConfig } = await import('../../../src/utils/zcf-config')
    const { existsSync } = await import('node:fs')

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
    }
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
      const codexInitSpy = vi.spyOn(codexModule, 'runCodexFullInit').mockResolvedValue(undefined)

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
          .mockResolvedValueOnce({ shouldInstall: true })
          .mockResolvedValueOnce({ shouldConfigureMcp: false })
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
  })
})
