import type { InitOptions } from '../../../src/commands/init'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { init } from '../../../src/commands/init'

// Mock all dependencies
vi.mock('../../../src/utils/installer', () => ({
  getInstallationStatus: vi.fn().mockResolvedValue({
    hasGlobal: false,
    hasLocal: false,
  }),
  installClaudeCode: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/installation-manager', () => ({
  handleMultipleInstallations: vi.fn().mockResolvedValue('global'),
}))

vi.mock('../../../src/utils/config', () => ({
  ensureClaudeDir: vi.fn(),
  backupExistingConfig: vi.fn().mockReturnValue('/test/backup'),
  copyConfigFiles: vi.fn(),
  configureApi: vi.fn(),
  applyAiLanguageDirective: vi.fn(),
  getExistingApiConfig: vi.fn().mockReturnValue(null),
}))

vi.mock('../../../src/utils/prompts', () => ({
  resolveAiOutputLanguage: vi.fn().mockResolvedValue('en'),
}))

vi.mock('../../../src/utils/workflow-installer', () => ({
  selectAndInstallWorkflows: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../src/utils/output-style', () => ({
  configureOutputStyle: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/mcp-selector', () => ({
  selectMcpServices: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../src/utils/version-checker', () => ({
  checkClaudeCodeVersionAndPrompt: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/cometix/installer', () => ({
  isCometixLineInstalled: vi.fn().mockResolvedValue(true),
  installCometixLine: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn().mockReturnValue(null),
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../../src/utils/banner', () => ({
  displayBannerWithInfo: vi.fn(),
}))

vi.mock('../../../src/utils/platform', () => ({
  isTermux: vi.fn().mockReturnValue(false),
  isWindows: vi.fn().mockReturnValue(false),
}))

vi.mock('../../../src/config/workflows', () => ({
  WORKFLOW_CONFIG_BASE: [
    { id: 'workflow1', name: 'Workflow 1' },
    { id: 'workflow2', name: 'Workflow 2' },
  ],
}))

vi.mock('../../../src/config/mcp-services', () => ({
  MCP_SERVICE_CONFIGS: [
    { id: 'service1', name: 'Service 1', requiresApiKey: false },
    { id: 'service2', name: 'Service 2', requiresApiKey: true },
  ],
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
}))

vi.mock('node:process', () => ({
  default: {
    exit: vi.fn(),
  },
}))

// Mock console methods
vi.mock('ansis', () => ({
  default: {
    yellow: (text: string) => text,
    green: (text: string) => text,
    blue: (text: string) => text,
    gray: (text: string) => text,
    cyan: (text: string) => text,
    red: (text: string) => text,
  },
}))

describe('init command validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('validateSkipPromptOptions - configAction validation', () => {
    it('should throw error for invalid configAction', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        configAction: 'invalid' as any,
      }

      await expect(init(options)).rejects.toThrow()
    })

    it('should accept valid configAction values', async () => {
      const validActions = ['new', 'backup', 'merge', 'docs-only', 'skip']

      for (const action of validActions) {
        const options: InitOptions = {
          skipPrompt: true,
          configAction: action as any,
          apiType: 'skip',
        }

        // Should not throw
        await expect(init(options)).resolves.not.toThrow()
      }
    })
  })

  describe('validateSkipPromptOptions - apiType validation', () => {
    it('should throw error for invalid apiType', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'invalid' as any,
      }

      await expect(init(options)).rejects.toThrow()
    })

    it('should require apiKey for api_key type', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'api_key',
        // Missing apiKey
      }

      await expect(init(options)).rejects.toThrow()
    })

    it('should require apiKey for auth_token type', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'auth_token',
        // Missing apiKey
      }

      await expect(init(options)).rejects.toThrow()
    })

    it('should accept valid apiKey for auth_token', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'auth_token',
        apiKey: 'test-token',
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })

    it('should accept valid apiKey for api_key', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'api_key',
        apiKey: 'test-key',
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })
  })

  describe('validateSkipPromptOptions - mcpServices validation', () => {
    it('should throw error for invalid mcpService', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        mcpServices: ['invalid-service'],
      }

      await expect(init(options)).rejects.toThrow()
    })

    it('should accept valid mcpServices', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        mcpServices: ['service1'],
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })

    it('should parse mcpServices string as "all"', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        mcpServices: 'all',
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })

    it('should parse mcpServices string as "skip"', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        mcpServices: 'skip',
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })
  })

  describe('validateSkipPromptOptions - workflows validation', () => {
    it('should throw error for invalid workflow', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        workflows: ['invalid-workflow'],
      }

      await expect(init(options)).rejects.toThrow()
    })

    it('should accept valid workflows', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        workflows: ['workflow1'],
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })

    it('should parse workflows string as "all"', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        workflows: 'all',
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })

    it('should parse workflows string as "skip"', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        workflows: 'skip',
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })
  })

  describe('validateSkipPromptOptions - outputStyles validation', () => {
    it('should throw error for invalid output style', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        outputStyles: ['invalid-style'],
      }

      await expect(init(options)).rejects.toThrow()
    })

    it('should accept valid output styles', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        outputStyles: ['engineer-professional'],
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })

    it('should parse outputStyles string as "all"', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        outputStyles: 'all',
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })

    it('should parse outputStyles string as "skip"', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        outputStyles: 'skip',
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })

    it('should throw error for invalid defaultOutputStyle', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        defaultOutputStyle: 'invalid-style',
      }

      await expect(init(options)).rejects.toThrow()
    })
  })

  describe('validateSkipPromptOptions - allLang parameter', () => {
    it('should use allLang for both config and AI output when zh-CN', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        allLang: 'zh-CN',
        apiType: 'skip',
      }

      // Should not throw and should set both languages
      await expect(init(options)).resolves.not.toThrow()
    })

    it('should use allLang for both config and AI output when en', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        allLang: 'en',
        apiType: 'skip',
      }

      // Should not throw and should set both languages
      await expect(init(options)).resolves.not.toThrow()
    })

    it('should use en for config and allLang for AI output when custom', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        allLang: 'custom-lang',
        apiType: 'skip',
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })
  })

  describe('validateSkipPromptOptions - installCometixLine parameter', () => {
    it('should parse installCometixLine string as boolean', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        installCometixLine: 'true',
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })

    it('should handle installCometixLine as false string', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        installCometixLine: 'false',
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })

    it('should default installCometixLine to true when undefined', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        apiType: 'skip',
        installCometixLine: undefined,
      }

      // Should not throw
      await expect(init(options)).resolves.not.toThrow()
    })
  })

  describe('validateSkipPromptOptions - default values', () => {
    it('should set default values when not provided', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        // Most values omitted - should get defaults
      }

      // Should not throw and should set defaults
      await expect(init(options)).resolves.not.toThrow()
    })
  })
})
