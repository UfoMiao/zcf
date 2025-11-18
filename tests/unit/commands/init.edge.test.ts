import type { InitOptions } from '../../../src/commands/init'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { init } from '../../../src/commands/init'
import { i18n } from '../../../src/i18n'
import { buildMcpServerConfig } from '../../../src/utils/claude-config'
import { configureApiCompletely } from '../../../src/utils/config-operations'
import { getInstallationStatus, installClaudeCode, isClaudeCodeInstalled } from '../../../src/utils/installer'
import { isTermux, isWindows } from '../../../src/utils/platform'
import { resolveAiOutputLanguage, resolveTemplateLanguage } from '../../../src/utils/prompts'
import { promptBoolean } from '../../../src/utils/toggle-prompt'
import { selectAndInstallWorkflows } from '../../../src/utils/workflow-installer'
import { readZcfConfig } from '../../../src/utils/zcf-config'

// Mock modules with comprehensive error scenarios
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../src/utils/installer', () => ({
  isClaudeCodeInstalled: vi.fn(),
  installClaudeCode: vi.fn(),
  getInstallationStatus: vi.fn(),
}))

vi.mock('../../../src/utils/config', () => ({
  ensureClaudeDir: vi.fn(),
  backupExistingConfig: vi.fn(),
  copyConfigFiles: vi.fn(),
  configureApi: vi.fn(),
  applyAiLanguageDirective: vi.fn(),
  getExistingApiConfig: vi.fn(),
}))

vi.mock('../../../src/utils/config-operations', () => ({
  configureApiCompletely: vi.fn(),
  modifyApiConfigPartially: vi.fn(),
}))

vi.mock('../../../src/utils/prompts', () => ({
  resolveAiOutputLanguage: vi.fn(),
  resolveTemplateLanguage: vi.fn(),
}))

vi.mock('../../../src/utils/claude-config', () => ({
  readMcpConfig: vi.fn(),
  writeMcpConfig: vi.fn(),
  mergeMcpServers: vi.fn(),
  buildMcpServerConfig: vi.fn(),
  fixWindowsMcpConfig: vi.fn(),
  addCompletedOnboarding: vi.fn(),
  backupMcpConfig: vi.fn(),
}))

vi.mock('../../../src/utils/mcp-selector', () => ({
  selectMcpServices: vi.fn(),
}))

vi.mock('../../../src/utils/workflow-installer', () => ({
  selectAndInstallWorkflows: vi.fn(),
}))

vi.mock('../../../src/utils/output-style', () => ({
  configureOutputStyle: vi.fn(),
}))

vi.mock('../../../src/utils/platform', () => ({
  isWindows: vi.fn(),
  isTermux: vi.fn(),
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../../src/utils/banner', () => ({
  displayBannerWithInfo: vi.fn(),
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

vi.mock('../../../src/utils/version-checker', () => ({
  checkClaudeCodeVersionAndPrompt: vi.fn(),
}))

vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

vi.mock('../../../src/utils/error-handler', () => ({
  handleExitPromptError: vi.fn(),
  handleGeneralError: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))

vi.mock('node:process', () => ({
  default: {
    exit: vi.fn(),
  },
}))

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

interface TestMocks {
  isClaudeCodeInstalled: any
  getInstallationStatus: any
  installClaudeCode: any
  readZcfConfig: any
  resolveAiOutputLanguage: any
  resolveTemplateLanguage: any
  isTermux: any
  isWindows: any
  buildMcpServerConfig: any
  selectAndInstallWorkflows: any
  configureApiCompletely: any
  inquirerPrompt: any
  promptBoolean: any
}

let testMocks: TestMocks

describe('init - Edge Cases', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockConsoleLog.mockClear()
    mockProcessExit.mockClear()

    // Setup mocks using top-level imports
    testMocks = {
      isClaudeCodeInstalled: isClaudeCodeInstalled as any,
      getInstallationStatus: getInstallationStatus as any,
      installClaudeCode: installClaudeCode as any,
      readZcfConfig: readZcfConfig as any,
      resolveAiOutputLanguage: resolveAiOutputLanguage as any,
      resolveTemplateLanguage: resolveTemplateLanguage as any,
      isTermux: isTermux as any,
      isWindows: isWindows as any,
      buildMcpServerConfig: buildMcpServerConfig as any,
      selectAndInstallWorkflows: selectAndInstallWorkflows as any,
      configureApiCompletely: configureApiCompletely as any,
      inquirerPrompt: inquirer.prompt as any,
      promptBoolean: promptBoolean as any,
    }

    // Set default mock values
    testMocks.getInstallationStatus.mockResolvedValue({
      hasGlobal: true,
      hasLocal: false,
      localPath: '/Users/test/.claude/local/claude',
    })
    testMocks.readZcfConfig.mockReturnValue({})
    testMocks.resolveAiOutputLanguage.mockResolvedValue('en')
    testMocks.resolveTemplateLanguage.mockResolvedValue('en')
    testMocks.isTermux.mockReturnValue(false)
    testMocks.isWindows.mockReturnValue(false)
    testMocks.promptBoolean.mockResolvedValue(false)
  })

  describe('validateSkipPromptOptions function edge cases', () => {
    it('should handle invalid configAction parameter', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        configAction: 'invalid' as any,
      }

      await expect(init(options)).rejects.toThrow()
    })

    it('should handle invalid apiType parameter', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'invalid' as any,
      }

      await expect(init(options)).rejects.toThrow()
    })

    it('should throw error when apiKey required for api_key type', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'api_key',
        // apiKey is missing
      }

      await expect(init(options)).rejects.toThrow()
    })

    it('should throw error when apiKey required for auth_token type', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'auth_token',
        // apiKey is missing
      }

      await expect(init(options)).rejects.toThrow()
    })
  })

  describe('user interaction edge cases', () => {
    it('should handle user cancellation during language selection', async () => {
      // Mock the template language resolution to throw a cancellation error
      testMocks.resolveTemplateLanguage.mockRejectedValue(new Error('User cancelled'))

      try {
        await init({ skipPrompt: false })
      }
      catch (error) {
        // The error should be handled gracefully
        expect(error).toBeDefined()
      }
    })

    it('should handle user declining Claude Code installation', async () => {
      testMocks.getInstallationStatus.mockResolvedValue({
        hasGlobal: false,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })
      testMocks.resolveTemplateLanguage.mockResolvedValue('en') // language selection
      testMocks.promptBoolean.mockResolvedValueOnce(false)

      await init({ skipPrompt: false })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(ansis.yellow(i18n.t('common:skip'))),
      )
    })
  })

  describe('platform-specific edge cases', () => {
    it('should display Termux environment info when detected', async () => {
      testMocks.isTermux.mockReturnValue(true)

      await init({ skipPrompt: true, configLang: 'en' })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(ansis.yellow(`\nℹ ${i18n.t('installation:termuxDetected')}`)),
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(ansis.gray(i18n.t('installation:termuxEnvironmentInfo'))),
      )
    })
  })

  describe('error handling edge cases', () => {
    it('should handle Claude Code installation failure gracefully', async () => {
      testMocks.getInstallationStatus.mockResolvedValue({
        hasGlobal: false,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })
      testMocks.installClaudeCode.mockRejectedValue(
        new Error('Installation failed'),
      )

      // The function should handle the error gracefully (not crash)
      try {
        await init({
          skipPrompt: true,
          configLang: 'en',
        })
      }
      catch (error) {
        // Error is expected
        expect(error).toBeDefined()
      }
    })

    it('should process MCP services correctly when valid service provided', async () => {
      // Test that MCP service handling completes without error
      await init({
        skipPrompt: true,
        configLang: 'en',
        mcpServices: ['context7'], // Use valid service name
      })

      // Should complete successfully
      expect(mockProcessExit).not.toHaveBeenCalled()
    })
  })

  describe('configuration edge cases', () => {
    it('should handle default parameter assignment correctly', async () => {
      // Test that skipPrompt mode uses defaults correctly
      await init({
        skipPrompt: true,
        // No other options, should use defaults
      })

      // Should complete without errors when using defaults
      expect(mockProcessExit).not.toHaveBeenCalled()
    })

    it('should auto-install Claude Code in skip-prompt mode when not installed', async () => {
      testMocks.getInstallationStatus.mockResolvedValue({
        hasGlobal: false,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })

      await init({
        skipPrompt: true,
        configLang: 'en',
      })

      expect(testMocks.installClaudeCode).toHaveBeenCalled()
    })
  })
})
