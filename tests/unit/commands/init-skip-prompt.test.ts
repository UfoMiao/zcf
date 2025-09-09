import type { InitOptions } from '../../../src/commands/init'
import type { CcrRouter } from '../../../src/types/ccr'
import { existsSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { init } from '../../../src/commands/init'
import { backupCcrConfig, configureCcrProxy, readCcrConfig, writeCcrConfig } from '../../../src/utils/ccr/config'
import { installCcr, isCcrInstalled } from '../../../src/utils/ccr/installer'
import { installCometixLine, isCometixLineInstalled } from '../../../src/utils/cometix/installer'
import { applyAiLanguageDirective, backupExistingConfig, configureApi, copyConfigFiles } from '../../../src/utils/config'
import { getInstallationStatus, installClaudeCode } from '../../../src/utils/installer'
import { readMcpConfig, writeMcpConfig } from '../../../src/utils/mcp'
import { configureOutputStyle } from '../../../src/utils/output-style'
import { selectAndInstallWorkflows } from '../../../src/utils/workflow-installer'

// Mock all dependencies
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
  selectScriptLanguage: vi.fn(),
  resolveAiOutputLanguage: vi.fn(),
}))

vi.mock('../../../src/utils/output-style', () => ({
  configureOutputStyle: vi.fn(),
}))

vi.mock('../../../src/utils/mcp', () => ({
  addCompletedOnboarding: vi.fn(),
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

vi.mock('../../../src/utils/workflow-installer', () => ({
  selectAndInstallWorkflows: vi.fn(),
}))

vi.mock('../../../src/config/workflows', () => ({
  WORKFLOW_CONFIG_BASE: [
    { id: 'commonTools', defaultSelected: true, order: 1 },
    { id: 'sixStepsWorkflow', defaultSelected: true, order: 2 },
    { id: 'featPlanUx', defaultSelected: true, order: 3 },
    { id: 'gitWorkflow', defaultSelected: true, order: 4 },
    { id: 'bmadWorkflow', defaultSelected: true, order: 5 },
  ],
}))

vi.mock('../../../src/config/mcp-services', () => ({
  MCP_SERVICE_CONFIGS: [
    { id: 'context7', requiresApiKey: false },
    { id: 'mcp-deepwiki', requiresApiKey: false },
    { id: 'exa', requiresApiKey: true },
  ],
  getMcpServices: vi.fn(() => Promise.resolve([
    { id: 'context7', name: 'Context7', requiresApiKey: false, config: {}, description: '' },
    { id: 'mcp-deepwiki', name: 'DeepWiki', requiresApiKey: false, config: {}, description: '' },
    { id: 'exa', name: 'Exa', requiresApiKey: true, config: {}, description: '' },
  ])),
}))

vi.mock('../../../src/constants', () => ({
  CLAUDE_DIR: '/test/.claude',
  SETTINGS_FILE: '/test/.claude/settings.json',
  I18N: {
    en: {
      installation: { alreadyInstalled: 'Already installed' },
      common: { skip: 'Skip', cancelled: 'Cancelled', complete: 'Complete' },
      configuration: { configSuccess: 'Config success' },
    },
  },
  LANG_LABELS: { 'en': 'English', 'zh-CN': '中文' },
  SUPPORTED_LANGS: ['en', 'zh-CN'],
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn().mockReturnValue({}),
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../../src/utils/banner', () => ({
  displayBannerWithInfo: vi.fn(),
}))

vi.mock('../../../src/utils/platform', () => ({
  isWindows: vi.fn().mockReturnValue(false),
  isTermux: vi.fn().mockReturnValue(false),
}))

vi.mock('../../../src/utils/ccr/installer', () => ({
  isCcrInstalled: vi.fn(),
  installCcr: vi.fn(),
}))

vi.mock('../../../src/utils/ccr/config', () => ({
  setupCcrConfiguration: vi.fn(),
  backupCcrConfig: vi.fn(),
  configureCcrProxy: vi.fn(),
  readCcrConfig: vi.fn(),
  writeCcrConfig: vi.fn(),
  createDefaultCcrConfig: vi.fn(() => ({
    LOG: false,
    CLAUDE_PATH: '',
    HOST: '127.0.0.1',
    PORT: 3456,
    APIKEY: 'sk-zcf-x-ccr',
    API_TIMEOUT_MS: '600000',
    PROXY_URL: '',
    transformers: [],
    Providers: [],
    Router: {} as CcrRouter,
  })),
}))

vi.mock('../../../src/utils/cometix/installer', () => ({
  isCometixLineInstalled: vi.fn(),
  installCometixLine: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))

// Mock i18n system
vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  initI18n: vi.fn(),
  i18n: {
    t: vi.fn((key: string, params?: any) => {
      // Mock translation function to return expected error messages
      switch (key) {
        case 'errors:invalidApiType':
          return `Invalid apiType value: ${params?.value}. Must be 'auth_token', 'api_key', 'ccr_proxy', or 'skip'`
        case 'errors:invalidMcpService':
          return `Invalid MCP service: ${params?.service}. Available services: ${params?.validServices}`
        case 'errors:invalidWorkflow':
          return `Invalid workflow: ${params?.workflow}. Available workflows: ${params?.validWorkflows}`
        case 'errors:apiKeyRequiredForApiKey':
          return 'API key is required when apiType is "api_key"'
        case 'errors:apiKeyRequiredForAuthToken':
          return 'API key is required when apiType is "auth_token"'
        default:
          return key
      }
    }),
  },
}))

describe('init command with simplified parameters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('simplified parameter structure', () => {
    it('should work with only --api-key (no --auth-token needed)', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })

      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'api_key',
        apiKey: 'sk-ant-test-key',
        skipBanner: true,
        configLang: 'en',
      }

      await init(options)

      expect(configureApi).toHaveBeenCalledWith({
        authType: 'api_key',
        key: 'sk-ant-test-key',
        url: 'https://api.anthropic.com',
      })
    })

    it('should work with auth token using same --api-key parameter', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })

      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'auth_token',
        apiKey: 'test-auth-token', // Use apiKey for auth token too
        skipBanner: true,
      }

      await init(options)

      expect(configureApi).toHaveBeenCalledWith({
        authType: 'auth_token',
        key: 'test-auth-token',
        url: 'https://api.anthropic.com',
      })
    })

    it('should use default configAction=backup when not specified', async () => {
      vi.mocked(existsSync).mockReturnValue(true) // Existing config
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })

      const options: InitOptions = {
        skipPrompt: true,
        // No configAction specified - should default to 'backup'
        skipBanner: true,
      }

      await init(options)

      expect(backupExistingConfig).toHaveBeenCalled()
    })

    it('should auto-install Claude Code by default (no --install-claude needed)', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: false,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      }) // Not installed

      const options: InitOptions = {
        skipPrompt: true,
        // No installClaude specified - should auto-install
        skipBanner: true,
      }

      await init(options)

      expect(installClaudeCode).toHaveBeenCalledWith() // No lang parameter needed with global i18n
    })

    it('should not install MCP services requiring API keys by default', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })
      vi.mocked(readMcpConfig).mockReturnValue({ mcpServers: {} })

      const options: InitOptions = {
        skipPrompt: true,
        // No mcpServices specified - should only install services that don't require keys
        skipBanner: true,
      }

      await init(options)

      // Should configure MCP with default services (non-key services only)
      expect(writeMcpConfig).toHaveBeenCalled()
    })

    it('should select all services and workflows by default when not specified', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })

      const options: InitOptions = {
        skipPrompt: true,
        skipBanner: true,
      }

      await init(options)

      // Should install all default workflows
      expect(selectAndInstallWorkflows).toHaveBeenCalledWith(
        'en',
        ['commonTools', 'sixStepsWorkflow', 'featPlanUx', 'gitWorkflow', 'bmadWorkflow'], // All workflows
      )
    })

    it('should use default output styles when not specified', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })

      const options: InitOptions = {
        skipPrompt: true,
        skipBanner: true,
      }

      await init(options)

      expect(configureOutputStyle).toHaveBeenCalledWith(
        ['engineer-professional', 'nekomata-engineer', 'laowang-engineer'], // default output styles
        'engineer-professional', // default output style
      )
    })
  })

  describe('--all-lang parameter', () => {
    it('should use --all-lang for all three language parameters when en', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })

      const options: InitOptions = {
        skipPrompt: true,
        allLang: 'en',
        skipBanner: true,
      }

      await init(options)

      expect(copyConfigFiles).toHaveBeenCalledWith(false)
      expect(applyAiLanguageDirective).toHaveBeenCalledWith('en')
    })

    it('should use en for lang/config-lang and custom value for ai-output-lang when not zh-CN/en', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })

      const options: InitOptions = {
        skipPrompt: true,
        allLang: 'fr', // French - not supported config language
        skipBanner: true,
      }

      await init(options)

      // lang and config-lang should be en, ai-output-lang should be fr
      expect(copyConfigFiles).toHaveBeenCalledWith(false)
      expect(applyAiLanguageDirective).toHaveBeenCalledWith('fr')
    })
  })

  describe('install-CCometixLine parameter', () => {
    it('should install CCometixLine by default when install-CCometixLine is true', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })
      vi.mocked(isCometixLineInstalled).mockResolvedValue(false)

      const options: InitOptions = {
        skipPrompt: true,
        installCometixLine: true,
        skipBanner: true,
      }

      await init(options)

      expect(installCometixLine).toHaveBeenCalledWith()
    })

    it('should install CCometixLine by default when install-CCometixLine is not specified', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })
      vi.mocked(isCometixLineInstalled).mockResolvedValue(false)

      const options: InitOptions = {
        skipPrompt: true,
        // installCometixLine not specified - should default to true
        skipBanner: true,
      }

      await init(options)

      expect(installCometixLine).toHaveBeenCalledWith()
    })

    it('should not install CCometixLine when install-CCometixLine is false', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })
      vi.mocked(isCometixLineInstalled).mockResolvedValue(false)

      const options: InitOptions = {
        skipPrompt: true,
        installCometixLine: false,
        skipBanner: true,
      }

      await init(options)

      expect(installCometixLine).not.toHaveBeenCalled()
    })

    it('should handle string "false" for install-CCometixLine parameter', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })
      vi.mocked(isCometixLineInstalled).mockResolvedValue(false)

      const options: InitOptions = {
        skipPrompt: true,
        installCometixLine: 'false',
        skipBanner: true,
      }

      await init(options)

      expect(installCometixLine).not.toHaveBeenCalled()
    })

    it('should handle string "true" for install-CCometixLine parameter', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })
      vi.mocked(isCometixLineInstalled).mockResolvedValue(false)

      const options: InitOptions = {
        skipPrompt: true,
        installCometixLine: 'true',
        skipBanner: true,
      }

      await init(options)

      expect(installCometixLine).toHaveBeenCalledWith()
    })
  })

  describe('mcp and workflow skip values', () => {
    it('should skip all MCP services when mcp-services is "skip"', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })

      const options: InitOptions = {
        skipPrompt: true,
        mcpServices: 'skip',
        skipBanner: true,
      }

      await init(options)

      expect(writeMcpConfig).not.toHaveBeenCalled()
    })

    it('should skip all MCP services when mcp-services is false boolean', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })

      const options: InitOptions = {
        skipPrompt: true,
        mcpServices: false as any,
        skipBanner: true,
      }

      await init(options)

      expect(writeMcpConfig).not.toHaveBeenCalled()
    })

    it('should skip all workflows when workflows is "skip"', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })

      const options: InitOptions = {
        skipPrompt: true,
        workflows: 'skip',
        skipBanner: true,
      }

      await init(options)

      expect(selectAndInstallWorkflows).not.toHaveBeenCalled()
    })

    it('should skip all workflows when workflows is false boolean', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })

      const options: InitOptions = {
        skipPrompt: true,
        workflows: false as any,
        skipBanner: true,
      }

      await init(options)

      expect(selectAndInstallWorkflows).not.toHaveBeenCalled()
    })
  })

  describe('parameter validation (simplified)', () => {
    it('should require apiKey when apiType is api_key', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'api_key',
        // Missing apiKey
        skipBanner: true,
      }

      await expect(init(options)).rejects.toThrow('API key is required when apiType is "api_key"')
    })

    it('should require apiKey when apiType is auth_token', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'auth_token',
        // Missing apiKey (now used for auth token too)
        skipBanner: true,
      }

      await expect(init(options)).rejects.toThrow('API key is required when apiType is "auth_token"')
    })

    it('should validate apiType values', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'invalid' as any,
        skipBanner: true,
      }

      await expect(init(options)).rejects.toThrow('Invalid apiType value: invalid')
    })

    it('should validate MCP services including false value', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        mcpServices: 'context7,invalid-service',
        skipBanner: true,
      }

      await expect(init(options)).rejects.toThrow('Invalid MCP service: invalid-service')
    })

    it('should validate workflows including false value', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        workflows: 'sixStepsWorkflow,invalid-workflow',
        skipBanner: true,
      }

      await expect(init(options)).rejects.toThrow('Invalid workflow: invalid-workflow')
    })

    it('should handle "all" value for mcp-services', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })

      const options: InitOptions = {
        skipPrompt: true,
        mcpServices: 'all',
        skipBanner: true,
      }

      await init(options)

      // Should configure MCP with all non-key services
      expect(writeMcpConfig).toHaveBeenCalled()
    })

    it('should handle "all" value for workflows', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })

      const options: InitOptions = {
        skipPrompt: true,
        workflows: 'all',
        skipBanner: true,
      }

      await init(options)

      // Should install all workflows
      expect(selectAndInstallWorkflows).toHaveBeenCalledWith(
        'en',
        ['commonTools', 'sixStepsWorkflow', 'featPlanUx', 'gitWorkflow', 'bmadWorkflow'],
      )
    })
  })

  describe('ccr_proxy configuration in skip-prompt mode', () => {
    it('should handle ccr_proxy without prompting for user interaction', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })
      vi.mocked(isCcrInstalled).mockResolvedValue({ isInstalled: false, hasCorrectPackage: false })
      vi.mocked(installCcr).mockResolvedValue()

      // Mock the new functions we'll create
      vi.mocked(backupCcrConfig).mockResolvedValue('/backup/path')
      vi.mocked(configureCcrProxy).mockResolvedValue()

      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'ccr_proxy',
        skipBanner: true,
        configLang: 'en',
      }

      await init(options)

      // Should install CCR if not present
      expect(installCcr).toHaveBeenCalledWith()

      // Should NOT call setupCcrConfiguration (which has prompts)
      // Instead should call our new skip-prompt logic
    })

    it('should backup existing CCR config when using ccr_proxy in skip-prompt mode', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })
      vi.mocked(isCcrInstalled).mockResolvedValue({ isInstalled: true, hasCorrectPackage: true })

      // Mock existing CCR config
      vi.mocked(readCcrConfig).mockReturnValue({
        LOG: true,
        CLAUDE_PATH: '',
        HOST: '127.0.0.1',
        PORT: 3456,
        APIKEY: 'old-key',
        API_TIMEOUT_MS: '600000',
        PROXY_URL: '',
        transformers: [],
        Providers: [],
        Router: {} as CcrRouter,
      })

      vi.mocked(backupCcrConfig).mockResolvedValue('/backup/ccr-config')
      vi.mocked(configureCcrProxy).mockResolvedValue()

      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'ccr_proxy',
        skipBanner: true,
      }

      await init(options)

      // Should backup existing config
      expect(backupCcrConfig).toHaveBeenCalledWith()
    })

    it('should create default skip configuration for ccr_proxy in skip-prompt mode', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      })
      vi.mocked(isCcrInstalled).mockResolvedValue({ isInstalled: true, hasCorrectPackage: true })
      vi.mocked(readCcrConfig).mockReturnValue(null) // No existing config
      vi.mocked(configureCcrProxy).mockResolvedValue()

      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'ccr_proxy',
        skipBanner: true,
      }

      await init(options)

      // Should write default skip configuration
      expect(writeCcrConfig).toHaveBeenCalledWith({
        LOG: false,
        CLAUDE_PATH: '',
        HOST: '127.0.0.1',
        PORT: 3456,
        APIKEY: 'sk-zcf-x-ccr',
        API_TIMEOUT_MS: '600000',
        PROXY_URL: '',
        transformers: [],
        Providers: [], // Empty providers - user configures in UI
        Router: {} as CcrRouter, // Empty router - user configures in UI
      })

      // Should configure proxy in settings.json
      expect(configureCcrProxy).toHaveBeenCalled()
    })
  })
})
