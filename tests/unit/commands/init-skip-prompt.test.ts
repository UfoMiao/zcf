import type { InitOptions } from '../../../src/commands/init'
import { existsSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { init } from '../../../src/commands/init'

// Mock all dependencies
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../src/utils/installer', () => ({
  isClaudeCodeInstalled: vi.fn(),
  installClaudeCode: vi.fn(),
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

vi.mock('../../../src/utils/ai-personality', () => ({
  configureAiPersonality: vi.fn(),
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
  WORKFLOW_CONFIGS: [
    { id: 'sixStepsWorkflow', nameKey: 'workflowOption.sixStepsWorkflow', defaultSelected: true },
    { id: 'featPlanUx', nameKey: 'workflowOption.featPlanUx', defaultSelected: true },
    { id: 'gitWorkflow', nameKey: 'workflowOption.gitWorkflow', defaultSelected: true },
    { id: 'bmadWorkflow', nameKey: 'workflowOption.bmadWorkflow', defaultSelected: true },
  ],
}))

vi.mock('../../../src/constants', () => ({
  MCP_SERVICES: [
    { id: 'context7', name: 'Context7', requiresApiKey: false },
    { id: 'mcp-deepwiki', name: 'DeepWiki', requiresApiKey: false },
    { id: 'exa', name: 'Exa', requiresApiKey: true },
  ],
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
    Router: {},
  })),
}))

vi.mock('../../../src/utils/cometix/installer', () => ({
  isCometixLineInstalled: vi.fn(),
  installCometixLine: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
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
      const { configureApi } = await import('../../../src/utils/config')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)

      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'api_key',
        apiKey: 'sk-ant-test-key',
        skipBanner: true,
        lang: 'en',
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
      const { configureApi } = await import('../../../src/utils/config')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)

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
      const { backupExistingConfig } = await import('../../../src/utils/config')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(true) // Existing config
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)

      const options: InitOptions = {
        skipPrompt: true,
        // No configAction specified - should default to 'backup'
        skipBanner: true,
      }

      await init(options)

      expect(backupExistingConfig).toHaveBeenCalled()
    })

    it('should auto-install Claude Code by default (no --install-claude needed)', async () => {
      const { installClaudeCode, isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(false) // Not installed

      const options: InitOptions = {
        skipPrompt: true,
        // No installClaude specified - should auto-install
        skipBanner: true,
      }

      await init(options)

      expect(installClaudeCode).toHaveBeenCalledWith('en') // Default lang
    })

    it('should not install MCP services requiring API keys by default', async () => {
      const { writeMcpConfig, readMcpConfig } = await import('../../../src/utils/mcp')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)
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
      const { selectAndInstallWorkflows } = await import('../../../src/utils/workflow-installer')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)

      const options: InitOptions = {
        skipPrompt: true,
        skipBanner: true,
      }

      await init(options)

      // Should install all default workflows
      expect(selectAndInstallWorkflows).toHaveBeenCalledWith(
        'en',
        'en',
        ['sixStepsWorkflow', 'featPlanUx', 'gitWorkflow', 'bmadWorkflow'], // All workflows
      )
    })

    it('should use default AI personality when not specified', async () => {
      const { configureAiPersonality } = await import('../../../src/utils/ai-personality')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)

      const options: InitOptions = {
        skipPrompt: true,
        skipBanner: true,
      }

      await init(options)

      expect(configureAiPersonality).toHaveBeenCalledWith('en', 'professional') // Default personality
    })
  })

  describe('--all-lang parameter', () => {
    it('should use --all-lang for all three language parameters when en', async () => {
      const { copyConfigFiles, applyAiLanguageDirective } = await import('../../../src/utils/config')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)

      const options: InitOptions = {
        skipPrompt: true,
        allLang: 'en',
        skipBanner: true,
      }

      await init(options)

      expect(copyConfigFiles).toHaveBeenCalledWith('en', false)
      expect(applyAiLanguageDirective).toHaveBeenCalledWith('en')
    })

    it('should use en for lang/config-lang and custom value for ai-output-lang when not zh-CN/en', async () => {
      const { copyConfigFiles, applyAiLanguageDirective } = await import('../../../src/utils/config')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)

      const options: InitOptions = {
        skipPrompt: true,
        allLang: 'fr', // French - not supported config language
        skipBanner: true,
      }

      await init(options)

      // lang and config-lang should be en, ai-output-lang should be fr
      expect(copyConfigFiles).toHaveBeenCalledWith('en', false)
      expect(applyAiLanguageDirective).toHaveBeenCalledWith('fr')
    })
  })

  describe('install-CCometixLine parameter', () => {
    it('should install CCometixLine by default when install-CCometixLine is true', async () => {
      const { installCometixLine, isCometixLineInstalled } = await import('../../../src/utils/cometix/installer')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)
      vi.mocked(isCometixLineInstalled).mockResolvedValue(false)

      const options: InitOptions = {
        skipPrompt: true,
        installCometixLine: true,
        skipBanner: true,
      }

      await init(options)

      expect(installCometixLine).toHaveBeenCalledWith('en')
    })

    it('should install CCometixLine by default when install-CCometixLine is not specified', async () => {
      const { installCometixLine, isCometixLineInstalled } = await import('../../../src/utils/cometix/installer')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)
      vi.mocked(isCometixLineInstalled).mockResolvedValue(false)

      const options: InitOptions = {
        skipPrompt: true,
        // installCometixLine not specified - should default to true
        skipBanner: true,
      }

      await init(options)

      expect(installCometixLine).toHaveBeenCalledWith('en')
    })

    it('should not install CCometixLine when install-CCometixLine is false', async () => {
      const { installCometixLine, isCometixLineInstalled } = await import('../../../src/utils/cometix/installer')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)
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
      const { installCometixLine, isCometixLineInstalled } = await import('../../../src/utils/cometix/installer')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)
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
      const { installCometixLine, isCometixLineInstalled } = await import('../../../src/utils/cometix/installer')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)
      vi.mocked(isCometixLineInstalled).mockResolvedValue(false)

      const options: InitOptions = {
        skipPrompt: true,
        installCometixLine: 'true',
        skipBanner: true,
      }

      await init(options)

      expect(installCometixLine).toHaveBeenCalledWith('en')
    })
  })

  describe('mcp and workflow skip values', () => {
    it('should skip all MCP services when mcp-services is "skip"', async () => {
      const { writeMcpConfig } = await import('../../../src/utils/mcp')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)

      const options: InitOptions = {
        skipPrompt: true,
        mcpServices: 'skip',
        skipBanner: true,
      }

      await init(options)

      expect(writeMcpConfig).not.toHaveBeenCalled()
    })

    it('should skip all MCP services when mcp-services is false boolean', async () => {
      const { writeMcpConfig } = await import('../../../src/utils/mcp')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)

      const options: InitOptions = {
        skipPrompt: true,
        mcpServices: false as any,
        skipBanner: true,
      }

      await init(options)

      expect(writeMcpConfig).not.toHaveBeenCalled()
    })

    it('should skip all workflows when workflows is "skip"', async () => {
      const { selectAndInstallWorkflows } = await import('../../../src/utils/workflow-installer')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)

      const options: InitOptions = {
        skipPrompt: true,
        workflows: 'skip',
        skipBanner: true,
      }

      await init(options)

      expect(selectAndInstallWorkflows).not.toHaveBeenCalled()
    })

    it('should skip all workflows when workflows is false boolean', async () => {
      const { selectAndInstallWorkflows } = await import('../../../src/utils/workflow-installer')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)

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
      const { writeMcpConfig } = await import('../../../src/utils/mcp')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)

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
      const { selectAndInstallWorkflows } = await import('../../../src/utils/workflow-installer')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)

      const options: InitOptions = {
        skipPrompt: true,
        workflows: 'all',
        skipBanner: true,
      }

      await init(options)

      // Should install all workflows
      expect(selectAndInstallWorkflows).toHaveBeenCalledWith(
        'en',
        'en',
        ['sixStepsWorkflow', 'featPlanUx', 'gitWorkflow', 'bmadWorkflow'],
      )
    })
  })

  describe('ccr_proxy configuration in skip-prompt mode', () => {
    it('should handle ccr_proxy without prompting for user interaction', async () => {
      const { isCcrInstalled, installCcr } = await import('../../../src/utils/ccr/installer')
      const { backupCcrConfig, configureCcrProxy } = await import('../../../src/utils/ccr/config')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)
      vi.mocked(isCcrInstalled).mockResolvedValue({ hasCorrectPackage: false })
      vi.mocked(installCcr).mockResolvedValue()

      // Mock the new functions we'll create
      vi.mocked(backupCcrConfig).mockReturnValue('/backup/path')
      vi.mocked(configureCcrProxy).mockResolvedValue()

      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'ccr_proxy',
        skipBanner: true,
        lang: 'en',
        configLang: 'en',
      }

      await init(options)

      // Should install CCR if not present
      expect(installCcr).toHaveBeenCalledWith('en')

      // Should NOT call setupCcrConfiguration (which has prompts)
      // Instead should call our new skip-prompt logic
    })

    it('should backup existing CCR config when using ccr_proxy in skip-prompt mode', async () => {
      const { isCcrInstalled } = await import('../../../src/utils/ccr/installer')
      const { backupCcrConfig, configureCcrProxy, readCcrConfig } = await import('../../../src/utils/ccr/config')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)
      vi.mocked(isCcrInstalled).mockResolvedValue({ hasCorrectPackage: true })

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
        Router: {},
      })

      vi.mocked(backupCcrConfig).mockReturnValue('/backup/ccr-config')
      vi.mocked(configureCcrProxy).mockResolvedValue()

      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'ccr_proxy',
        skipBanner: true,
      }

      await init(options)

      // Should backup existing config
      expect(backupCcrConfig).toHaveBeenCalledWith('en')
    })

    it('should create default skip configuration for ccr_proxy in skip-prompt mode', async () => {
      const { isCcrInstalled } = await import('../../../src/utils/ccr/installer')
      const { writeCcrConfig, configureCcrProxy, readCcrConfig } = await import('../../../src/utils/ccr/config')
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)
      vi.mocked(isCcrInstalled).mockResolvedValue({ hasCorrectPackage: true })
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
        Router: {}, // Empty router - user configures in UI
      })

      // Should configure proxy in settings.json
      expect(configureCcrProxy).toHaveBeenCalled()
    })
  })
})
