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
  selectScriptLanguage: vi.fn(),
  selectAiOutputLanguage: vi.fn(),
  resolveAiOutputLanguage: vi.fn(),
}))

vi.mock('../../../src/utils/mcp', () => ({
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

vi.mock('../../../src/utils/ai-personality', () => ({
  configureAiPersonality: vi.fn(),
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
}))

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
  selectScriptLanguage: any
  resolveAiOutputLanguage: any
  isClaudeCodeInstalled: any
  copyConfigFiles: any
  applyAiLanguageDirective: any
  selectMcpServices: any
  selectAndInstallWorkflows: any
  configureAiPersonality: any
  updateZcfConfig: any
  existsSync: any
  inquirerPrompt: any
}

let testMocks: TestMocks

describe('init command', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    // Setup common mocks
    const { selectScriptLanguage, resolveAiOutputLanguage } = await import('../../../src/utils/prompts')
    const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')
    const { copyConfigFiles, applyAiLanguageDirective } = await import('../../../src/utils/config')
    const { selectMcpServices } = await import('../../../src/utils/mcp-selector')
    const { selectAndInstallWorkflows } = await import('../../../src/utils/workflow-installer')
    const { configureAiPersonality } = await import('../../../src/utils/ai-personality')
    const { updateZcfConfig } = await import('../../../src/utils/zcf-config')
    const { existsSync } = await import('node:fs')

    testMocks = {
      selectScriptLanguage: vi.mocked(selectScriptLanguage),
      resolveAiOutputLanguage: vi.mocked(resolveAiOutputLanguage),
      isClaudeCodeInstalled: vi.mocked(isClaudeCodeInstalled),
      copyConfigFiles: vi.mocked(copyConfigFiles),
      applyAiLanguageDirective: vi.mocked(applyAiLanguageDirective),
      selectMcpServices: vi.mocked(selectMcpServices),
      selectAndInstallWorkflows: vi.mocked(selectAndInstallWorkflows),
      configureAiPersonality: vi.mocked(configureAiPersonality),
      updateZcfConfig: vi.mocked(updateZcfConfig),
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
        testMocks.selectScriptLanguage.mockResolvedValue('zh-CN')
        testMocks.isClaudeCodeInstalled.mockResolvedValue(true)
        testMocks.existsSync.mockReturnValue(false)
        testMocks.inquirerPrompt.mockResolvedValueOnce({ lang: 'zh-CN' })
        testMocks.inquirerPrompt.mockResolvedValueOnce({ shouldConfigureMcp: false })
        testMocks.resolveAiOutputLanguage.mockResolvedValue('chinese-simplified')
        testMocks.selectAndInstallWorkflows.mockResolvedValue(undefined)
        testMocks.configureAiPersonality.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)

        await init({ skipBanner: true })

        expect(testMocks.selectScriptLanguage).toHaveBeenCalled()
        expect(testMocks.resolveAiOutputLanguage).toHaveBeenCalled()
      })

      it('should handle options correctly', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.selectScriptLanguage.mockResolvedValue('en')
        testMocks.isClaudeCodeInstalled.mockResolvedValue(true)
        testMocks.existsSync.mockReturnValue(false)
        testMocks.resolveAiOutputLanguage.mockResolvedValue('english')
        testMocks.inquirerPrompt.mockResolvedValue({ shouldConfigureMcp: false })
        testMocks.selectAndInstallWorkflows.mockResolvedValue(undefined)
        testMocks.configureAiPersonality.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)

        await init({ lang: 'en', configLang: 'en', force: true, skipBanner: true })

        expect(testMocks.selectScriptLanguage).toHaveBeenCalledWith('en')
      })
    })

    describe('claude Code installation', () => {
      it('should handle Claude Code not installed', async () => {
        const { init } = await import('../../../src/commands/init')
        const { installClaudeCode } = await import('../../../src/utils/installer')

        testMocks.selectScriptLanguage.mockResolvedValue('zh-CN')
        testMocks.isClaudeCodeInstalled.mockResolvedValue(false)
        testMocks.existsSync.mockReturnValue(false)
        testMocks.inquirerPrompt
          .mockResolvedValueOnce({ lang: 'zh-CN' })
          .mockResolvedValueOnce({ shouldInstall: true })
          .mockResolvedValueOnce({ shouldConfigureMcp: false })
        testMocks.resolveAiOutputLanguage.mockResolvedValue('chinese-simplified')
        testMocks.selectAndInstallWorkflows.mockResolvedValue(undefined)
        testMocks.configureAiPersonality.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)
        vi.mocked(installClaudeCode).mockResolvedValue(undefined)

        await init({ skipBanner: true })

        expect(testMocks.isClaudeCodeInstalled).toHaveBeenCalled()
        expect(installClaudeCode).toHaveBeenCalled()
      })
    })

    describe('configuration handling', () => {
      it('should handle existing config', async () => {
        const { init } = await import('../../../src/commands/init')

        testMocks.selectScriptLanguage.mockResolvedValue('zh-CN')
        testMocks.isClaudeCodeInstalled.mockResolvedValue(true)
        testMocks.existsSync.mockReturnValue(true)
        testMocks.inquirerPrompt
          .mockResolvedValueOnce({ lang: 'zh-CN' })
          .mockResolvedValueOnce({ action: 'skip' })
        testMocks.resolveAiOutputLanguage.mockResolvedValue('chinese-simplified')

        await init({ skipBanner: true })

        expect(testMocks.selectScriptLanguage).toHaveBeenCalled()
      })
    })

    describe('integration flow', () => {
      it('should handle full initialization flow', async () => {
        const { init } = await import('../../../src/commands/init')

        // Setup all mocks for successful flow
        testMocks.selectScriptLanguage.mockResolvedValue('zh-CN')
        testMocks.isClaudeCodeInstalled.mockResolvedValue(true)
        testMocks.existsSync.mockReturnValue(false)
        testMocks.inquirerPrompt
          .mockResolvedValueOnce({ lang: 'zh-CN' })
          .mockResolvedValueOnce({ shouldConfigureMcp: false })
        testMocks.resolveAiOutputLanguage.mockResolvedValue('chinese-simplified')
        testMocks.copyConfigFiles.mockResolvedValue(undefined)
        testMocks.applyAiLanguageDirective.mockResolvedValue(undefined)
        testMocks.selectAndInstallWorkflows.mockResolvedValue(undefined)
        testMocks.configureAiPersonality.mockResolvedValue(undefined)
        testMocks.updateZcfConfig.mockResolvedValue(undefined)

        await init({ skipBanner: true })

        expect(testMocks.selectScriptLanguage).toHaveBeenCalled()
        expect(testMocks.isClaudeCodeInstalled).toHaveBeenCalled()
        expect(testMocks.copyConfigFiles).toHaveBeenCalled()
        expect(testMocks.applyAiLanguageDirective).toHaveBeenCalled()
        expect(testMocks.updateZcfConfig).toHaveBeenCalled()
      }, 45000) // 45秒超时，给CI更多时间
    })

    describe('error handling', () => {
      it('should handle errors gracefully', async () => {
        const { init } = await import('../../../src/commands/init')

        const error = new Error('Test error')
        testMocks.selectScriptLanguage.mockRejectedValue(error)

        await init({ skipBanner: true })

        expect(console.error).toHaveBeenCalled()
      })
    })
  })
})
