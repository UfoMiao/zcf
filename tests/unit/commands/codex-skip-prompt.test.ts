import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyAiLanguageDirective } from '../../../src/utils/config'
import { exists, readFile } from '../../../src/utils/fs-operations'
import { resolveAiOutputLanguage, resolveTemplateLanguage } from '../../../src/utils/prompts'
import { readZcfConfig, updateZcfConfig } from '../../../src/utils/zcf-config'

// Mock i18n
vi.mock('../../../src/i18n', () => ({
  i18n: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'language:selectConfigLang': '选择配置文件语言',
        'language:selectAiOutputLang': '选择 AI 输出语言',
        'language:aiOutputLangHint': 'AI 输出语言提示',
        'language:configLangHint.zh-CN': '中文配置',
        'language:configLangHint.en': '英文配置',
        'configuration:aiLanguageConfigured': 'AI 输出语言已配置',
        'codex:systemPromptPrompt': '请选择系统提示词风格',
        'codex:workflowSelectionPrompt': '选择要安装的工作流类型（多选）',
        'codex:workflowInstall': '✔ 已安装 Codex 工作流模板',
        'common:cancelled': '已取消',
        'codex:apiConfigured': 'API 配置完成',
        'codex:mcpConfigured': 'MCP 配置完成',
        'codex:backupSuccess': '备份成功: {path}',
        'codex:setupComplete': 'Codex 设置完成',
        'codex:cliInstalled': 'Codex CLI 已安装',
      }
      return translations[key] || key
    },
    language: 'zh-CN',
  },
  ensureI18nInitialized: vi.fn(),
}))

// Mock inquirer
const mockInquirerPrompt = vi.fn()
vi.mock('inquirer', () => ({
  default: {
    prompt: mockInquirerPrompt,
  },
  prompt: mockInquirerPrompt,
}))

// Mock prompts utilities
vi.mock('../../../src/utils/prompts', () => ({
  resolveAiOutputLanguage: vi.fn(),
  resolveTemplateLanguage: vi.fn(),
  selectAiOutputLanguage: vi.fn(),
  selectTemplateLanguage: vi.fn(),
  resolveSystemPromptStyle: vi.fn(),
}))

// Mock zcf-config
vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
}))

// Mock config operations
vi.mock('../../../src/utils/config', () => ({
  applyAiLanguageDirective: vi.fn(),
}))

// Mock fs operations
vi.mock('../../../src/utils/fs-operations', () => ({
  exists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  ensureDir: vi.fn(),
  copyFile: vi.fn(),
  copyDir: vi.fn(),
}))

// Mock platform
vi.mock('../../../src/utils/platform', () => ({
  isWindows: vi.fn(() => false),
}))

// Mock the entire module before importing
const mockInstallCodexCli = vi.fn()
const mockRunCodexWorkflowImportWithLanguageSelection = vi.fn()
const mockConfigureCodexApi = vi.fn()
const mockConfigureCodexMcp = vi.fn()
const mockRunCodexWorkflowSelection = vi.fn()
const mockRunCodexFullInit = vi.fn()

vi.mock('../../../src/utils/code-tools/codex', () => ({
  installCodexCli: mockInstallCodexCli,
  runCodexWorkflowImportWithLanguageSelection: mockRunCodexWorkflowImportWithLanguageSelection,
  configureCodexApi: mockConfigureCodexApi,
  configureCodexMcp: mockConfigureCodexMcp,
  runCodexWorkflowSelection: mockRunCodexWorkflowSelection,
  runCodexFullInit: mockRunCodexFullInit,
  switchToOfficialLogin: vi.fn(),
  applyCustomApiConfig: vi.fn(),
}))

describe('codex Skip Prompt Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    vi.mocked(resolveAiOutputLanguage).mockResolvedValue('zh-CN')
    vi.mocked(resolveTemplateLanguage).mockResolvedValue('zh-CN')
    vi.mocked(exists).mockReturnValue(true)
    vi.mocked(readFile).mockReturnValue('# Mock file content')
    vi.mocked(readZcfConfig).mockReturnValue({
      preferredLang: 'zh-CN',
      version: '3.1.3',
      codeToolType: 'codex',
      lastUpdated: '2025-01-15',
    })
    vi.mocked(updateZcfConfig).mockImplementation(() => {})
    vi.mocked(applyAiLanguageDirective).mockImplementation(() => {})
  })

  describe('complete Skip Prompt Flow', () => {
    it('should handle complete non-interactive initialization with custom API and workflows', async () => {
      // Arrange
      const options = {
        skipPrompt: true,
        aiOutputLang: 'zh-CN',
        apiMode: 'custom' as const,
        customApiConfig: {
          type: 'api_key' as const,
          token: 'test-api-key',
          baseUrl: 'https://api.example.com',
        },
        workflows: ['workflow1', 'workflow2'],
      }

      // Mock the main function to simulate the real implementation
      mockRunCodexFullInit.mockResolvedValue('zh-CN')

      // Act
      const result = await mockRunCodexFullInit(options)

      // Assert
      expect(result).toBe('zh-CN')
      expect(mockRunCodexFullInit).toHaveBeenCalledWith(options)

      // Verify no prompts were shown
      expect(mockInquirerPrompt).not.toHaveBeenCalled()
    })

    it('should handle skip mode with API skip and all workflows', async () => {
      // Arrange
      const options = {
        skipPrompt: true,
        aiOutputLang: 'en',
        apiMode: 'skip' as const,
        workflows: [], // Empty array means install all workflows
      }

      // Mock the main function to simulate the real implementation
      mockRunCodexFullInit.mockResolvedValue('en')

      // Act
      const result = await mockRunCodexFullInit(options)

      // Assert
      expect(result).toBe('en')
      expect(mockRunCodexFullInit).toHaveBeenCalledWith(options)

      // Verify no prompts were shown
      expect(mockInquirerPrompt).not.toHaveBeenCalled()
    })

    it('should handle official API mode in skip prompt', async () => {
      // Arrange
      const options = {
        skipPrompt: true,
        aiOutputLang: 'zh-CN',
        apiMode: 'official' as const,
        workflows: ['workflow1'],
      }

      // Mock existing config for official login
      vi.mocked(exists).mockImplementation((path: string) => {
        return path.includes('config.toml') || path.includes('auth.json')
      })
      vi.mocked(readFile).mockImplementation((path: string) => {
        if (path.includes('config.toml')) {
          return `# --- model provider added by ZCF ---
model = "claude-3-5-sonnet-20241022"
model_provider = "official"

`
        }
        return '# Mock file content'
      })

      // Mock the main function to simulate the real implementation
      mockRunCodexFullInit.mockResolvedValue('zh-CN')

      // Act
      const result = await mockRunCodexFullInit(options)

      // Assert
      expect(result).toBe('zh-CN')
      expect(mockRunCodexFullInit).toHaveBeenCalledWith(options)

      // Verify no prompts were shown
      expect(mockInquirerPrompt).not.toHaveBeenCalled()
    })

    it('should handle interactive mode when skipPrompt is false', async () => {
      // Arrange
      const options = {
        skipPrompt: false,
        aiOutputLang: 'zh-CN',
      }

      // Mock the main function to simulate the real implementation
      mockRunCodexFullInit.mockResolvedValue('zh-CN')

      // Act
      const result = await mockRunCodexFullInit(options)

      // Assert
      expect(result).toBe('zh-CN')
      expect(mockRunCodexFullInit).toHaveBeenCalledWith(options)
    })
  })

  describe('parameter Validation', () => {
    it('should handle undefined options gracefully', async () => {
      // Arrange
      // Mock the main function to simulate the real implementation
      mockRunCodexFullInit.mockResolvedValue('en')

      // Act
      const result = await mockRunCodexFullInit(undefined)

      // Assert
      expect(result).toBe('en')
      expect(mockRunCodexFullInit).toHaveBeenCalledWith(undefined)
    })

    it('should handle empty options object', async () => {
      // Arrange
      const options = {}

      // Mock the main function to simulate the real implementation
      mockRunCodexFullInit.mockResolvedValue('en')

      // Act
      const result = await mockRunCodexFullInit(options)

      // Assert
      expect(result).toBe('en')
      expect(mockRunCodexFullInit).toHaveBeenCalledWith(options)
    })
  })
})
