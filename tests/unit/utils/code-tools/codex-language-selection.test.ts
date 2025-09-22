import inquirer from 'inquirer'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runCodexWorkflowImportWithLanguageSelection } from '../../../../src/utils/code-tools/codex'
import { applyAiLanguageDirective } from '../../../../src/utils/config'
import { exists, readFile } from '../../../../src/utils/fs-operations'
import { resolveAiOutputLanguage } from '../../../../src/utils/prompts'
import { readZcfConfig, updateZcfConfig } from '../../../../src/utils/zcf-config'

// Mock i18n
vi.mock('../../../../src/i18n', () => ({
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
      }
      return translations[key] || key
    },
    language: 'zh-CN',
  },
  ensureI18nInitialized: vi.fn(),
}))

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
  prompt: vi.fn(),
}))

// Mock prompts utilities
vi.mock('../../../../src/utils/prompts', () => ({
  resolveAiOutputLanguage: vi.fn(),
  selectConfigLanguage: vi.fn(),
}))

// Mock zcf-config
vi.mock('../../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
  updateTomlConfig: vi.fn(),
}))

// Mock config operations
vi.mock('../../../../src/utils/config', () => ({
  applyAiLanguageDirective: vi.fn(),
}))

// Mock fs operations
vi.mock('../../../../src/utils/fs-operations', () => ({
  exists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  ensureDir: vi.fn(),
  copyFile: vi.fn(),
  copyDir: vi.fn(),
}))

// Mock platform
vi.mock('../../../../src/utils/platform', () => ({
  isWindows: vi.fn(() => false),
}))

// Mock prompt helpers
vi.mock('../../../../src/utils/prompt-helpers', () => ({
  addNumbersToChoices: vi.fn(choices => choices),
}))

describe('codex Language Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('runCodexWorkflowImportWithLanguageSelection', () => {
    it('should select AI output language before system prompt selection', async () => {
      // Arrange
      const mockZcfConfig = {
        preferredLang: 'zh-CN' as const,
        version: '2.12.13',
        codeToolType: 'codex' as const,
        lastUpdated: '2025-01-15',
      }
      const mockAiOutputLang = 'zh-CN'

      vi.mocked(readZcfConfig).mockReturnValue(mockZcfConfig)
      vi.mocked(resolveAiOutputLanguage).mockResolvedValue(mockAiOutputLang)
      vi.mocked(exists).mockReturnValue(true)
      vi.mocked(readFile).mockReturnValue('# System prompt content')
      vi.mocked(inquirer.prompt).mockResolvedValue({ systemPrompt: 'engineer-professional' })

      // Act
      await runCodexWorkflowImportWithLanguageSelection()

      // Assert
      expect(resolveAiOutputLanguage).toHaveBeenCalledWith(
        'zh-CN',
        undefined,
        mockZcfConfig,
      )
      expect(updateZcfConfig).toHaveBeenCalledWith({ aiOutputLang: mockAiOutputLang })
      expect(applyAiLanguageDirective).toHaveBeenCalledWith(mockAiOutputLang)
    })

    it('should use saved AI output language from config if available', async () => {
      // Arrange
      const mockZcfConfig = {
        preferredLang: 'en' as const,
        aiOutputLang: 'en',
        version: '2.12.13',
        codeToolType: 'codex' as const,
        lastUpdated: '2025-01-15',
      }

      vi.mocked(readZcfConfig).mockReturnValue(mockZcfConfig)
      vi.mocked(resolveAiOutputLanguage).mockResolvedValue('en') // Should return saved config
      vi.mocked(exists).mockReturnValue(true)
      vi.mocked(readFile).mockReturnValue('# System prompt content')
      vi.mocked(inquirer.prompt).mockResolvedValue({ systemPrompt: 'engineer-professional' })

      // Act
      await runCodexWorkflowImportWithLanguageSelection()

      // Assert
      expect(resolveAiOutputLanguage).toHaveBeenCalledWith(
        'zh-CN', // Mock i18n.language is 'zh-CN'
        undefined,
        mockZcfConfig,
      )
      // Should not prompt for AI language again since it's saved
    })

    it('should use correct template language directory based on preferredLang', async () => {
      // Arrange
      const mockZcfConfig = {
        preferredLang: 'en' as const,
        version: '2.12.13',
        codeToolType: 'codex' as const,
        lastUpdated: '2025-01-15',
      }

      vi.mocked(readZcfConfig).mockReturnValue(mockZcfConfig)
      vi.mocked(resolveAiOutputLanguage).mockResolvedValue('en')
      vi.mocked(exists).mockImplementation((path: string) => {
        return path.includes('/en/') || path.includes('system-prompt') || path.includes('workflow') // English template exists
      })
      vi.mocked(readFile).mockReturnValue('# System prompt content')
      vi.mocked(inquirer.prompt).mockResolvedValue({ systemPrompt: 'engineer-professional' })

      // Act
      await runCodexWorkflowImportWithLanguageSelection()

      // Assert
      // Check that English template directory was checked
      expect(exists).toHaveBeenCalledWith(expect.stringContaining('/codex/en'))
    })

    it('should fallback to zh-CN template if preferred language template does not exist', async () => {
      // Arrange
      const mockZcfConfig = {
        preferredLang: 'en' as const,
        version: '2.12.13',
        codeToolType: 'codex' as const,
        lastUpdated: '2025-01-15',
      }

      vi.mocked(readZcfConfig).mockReturnValue(mockZcfConfig)
      vi.mocked(resolveAiOutputLanguage).mockResolvedValue('en')
      vi.mocked(exists).mockImplementation((path: string) => {
        if (path.includes('/codex/en') && !path.includes('system-prompt') && !path.includes('workflow'))
          return false // English template directory doesn't exist
        if (path.includes('/zh-CN/') || path.includes('system-prompt') || path.includes('workflow'))
          return true // Fallback to Chinese or specific files exist
        return false
      })
      vi.mocked(readFile).mockReturnValue('# System prompt content')
      vi.mocked(inquirer.prompt).mockResolvedValue({ systemPrompt: 'engineer-professional' })

      // Act
      await runCodexWorkflowImportWithLanguageSelection()

      // Assert
      expect(exists).toHaveBeenCalledWith(expect.stringContaining('/codex/en'))
      expect(exists).toHaveBeenCalledWith(expect.stringContaining('/zh-CN/'))
    })

    it('should handle error when AI output language selection fails', async () => {
      // Arrange
      const mockZcfConfig = {
        preferredLang: 'zh-CN' as const,
        version: '2.12.13',
        codeToolType: 'codex' as const,
        lastUpdated: '2025-01-15',
      }

      vi.mocked(readZcfConfig).mockReturnValue(mockZcfConfig)
      vi.mocked(resolveAiOutputLanguage).mockRejectedValue(new Error('Language selection failed'))

      // Act & Assert
      await expect(runCodexWorkflowImportWithLanguageSelection()).rejects.toThrow('Language selection failed')
    })
  })
})
