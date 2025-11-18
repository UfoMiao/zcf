import type { SupportedLang } from '../../../src/constants'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanupLegacyPersonalityFiles,
  configureOutputStyle,
  copyOutputStyles,
  getAvailableOutputStyles,
  hasLegacyPersonalityFiles,
  setGlobalDefaultOutputStyle,
} from '../../../src/utils/output-style'
import { promptBoolean } from '../../../src/utils/toggle-prompt'

// Mock dependencies
vi.mock('../../../src/utils/fs-operations', () => ({
  ensureDir: vi.fn(),
  copyFile: vi.fn(),
  exists: vi.fn(),
  removeFile: vi.fn(),
}))
vi.mock('../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
}))
vi.mock('../../../src/utils/zcf-config', () => ({
  updateZcfConfig: vi.fn(),
}))
vi.mock('../../../src/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/constants')>()
  return {
    ...actual,
    CLAUDE_DIR: '/test/claude',
    SETTINGS_FILE: '/test/claude/settings.json',
  }
})
// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    // Only mock initialization functions to avoid setup issues in tests
    ensureI18nInitialized: vi.fn(),
  }
})
vi.mock('inquirer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('inquirer')>()
  return {
    ...actual,
    default: {
      prompt: vi.fn(),
    },
  }
})

vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

// Declare mock types
let mockFsOperations: any
let mockJsonConfig: any
let mockZcfConfig: any
let mockInquirer: any

describe('output-style', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // Initialize mocked modules
    mockFsOperations = vi.mocked(await import('../../../src/utils/fs-operations'))
    mockJsonConfig = vi.mocked(await import('../../../src/utils/json-config'))
    mockZcfConfig = vi.mocked(await import('../../../src/utils/zcf-config'))
    mockInquirer = vi.mocked(await import('inquirer'))

    // Initialize real i18n for test environment
    const { initI18n } = await import('../../../src/i18n')
    await initI18n('zh-CN')
  })

  describe('getAvailableOutputStyles', () => {
    it('should return all available output styles', () => {
      const styles = getAvailableOutputStyles()

      expect(styles).toHaveLength(7)
      expect(styles.map(s => s.id)).toEqual([
        'engineer-professional',
        'nekomata-engineer',
        'laowang-engineer',
        'ojousama-engineer',
        'default',
        'explanatory',
        'learning',
      ])
    })

    it('should have correct custom styles with file paths', () => {
      const styles = getAvailableOutputStyles()
      const customStyles = styles.filter(s => s.isCustom)

      expect(customStyles).toHaveLength(4)
      customStyles.forEach((style) => {
        expect(style.filePath).toBeDefined()
        expect(style.filePath).toContain('.md')
      })
    })

    it('should have correct built-in styles without file paths', () => {
      const styles = getAvailableOutputStyles()
      const builtinStyles = styles.filter(s => !s.isCustom)

      expect(builtinStyles).toHaveLength(3)
      builtinStyles.forEach((style) => {
        expect(style.filePath).toBeUndefined()
      })
    })
  })

  describe('copyOutputStyles', () => {
    it('should copy selected styles to claude directory', async () => {
      const selectedStyles = ['engineer-professional', 'nekomata-engineer']
      const lang: SupportedLang = 'zh-CN'

      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockFsOperations.exists.mockImplementation(() => true)

      await copyOutputStyles(selectedStyles, lang)

      expect(mockFsOperations.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('output-styles'),
      )
      expect(mockFsOperations.copyFile).toHaveBeenCalledTimes(2)
    })

    it('should skip non-existent template files', async () => {
      const selectedStyles = ['engineer-professional']
      const lang: SupportedLang = 'zh-CN'

      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockFsOperations.exists.mockImplementation(() => false) // Template doesn't exist

      await copyOutputStyles(selectedStyles, lang)

      expect(mockFsOperations.copyFile).not.toHaveBeenCalled()
    })

    it('should only copy custom styles (built-in styles have no files)', async () => {
      const selectedStyles = ['engineer-professional', 'default', 'explanatory']
      const lang: SupportedLang = 'zh-CN'

      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockFsOperations.exists.mockImplementation(() => true)

      await copyOutputStyles(selectedStyles, lang)

      // Only engineer-professional should be copied (custom style)
      expect(mockFsOperations.copyFile).toHaveBeenCalledTimes(1)
    })
  })

  describe('setGlobalDefaultOutputStyle', () => {
    it('should set default output style in settings.json', () => {
      const existingSettings = { env: {} }
      mockJsonConfig.readJsonConfig.mockImplementation(() => existingSettings)
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})

      setGlobalDefaultOutputStyle('engineer-professional')

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.stringContaining('settings.json'),
        expect.objectContaining({
          outputStyle: 'engineer-professional',
        }),
      )
    })

    it('should preserve existing settings when setting default style', () => {
      const existingSettings = {
        env: { ANTHROPIC_API_KEY: 'test-key' },
        model: 'opus',
      }
      mockJsonConfig.readJsonConfig.mockImplementation(() => existingSettings)
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})

      setGlobalDefaultOutputStyle('nekomata-engineer')

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.stringContaining('settings.json'),
        expect.objectContaining({
          env: { ANTHROPIC_API_KEY: 'test-key' },
          model: 'opus',
          outputStyle: 'nekomata-engineer',
        }),
      )
    })
  })

  describe('hasLegacyPersonalityFiles', () => {
    it('should detect legacy personality files', () => {
      mockFsOperations.exists = vi.fn((path) => {
        return path.includes('personality.md')
          || path.includes('rules.md')
          || path.includes('technical-guides.md')
          || path.includes('mcp.md')
          || path.includes('language.md')
      })

      const hasLegacy = hasLegacyPersonalityFiles()
      expect(hasLegacy).toBe(true)
    })

    it('should return false when no legacy files exist', () => {
      mockFsOperations.exists.mockImplementation(() => false)

      const hasLegacy = hasLegacyPersonalityFiles()
      expect(hasLegacy).toBe(false)
    })
  })

  describe('cleanupLegacyPersonalityFiles', () => {
    it('should remove legacy personality files', () => {
      mockFsOperations.exists.mockImplementation(() => true)
      mockFsOperations.removeFile.mockImplementation(() => {})

      cleanupLegacyPersonalityFiles()

      expect(mockFsOperations.removeFile).toHaveBeenCalledWith(
        expect.stringContaining('personality.md'),
      )
      expect(mockFsOperations.removeFile).toHaveBeenCalledWith(
        expect.stringContaining('rules.md'),
      )
      expect(mockFsOperations.removeFile).toHaveBeenCalledWith(
        expect.stringContaining('technical-guides.md'),
      )
      expect(mockFsOperations.removeFile).toHaveBeenCalledWith(
        expect.stringContaining('mcp.md'),
      )
      expect(mockFsOperations.removeFile).toHaveBeenCalledWith(
        expect.stringContaining('language.md'),
      )
    })

    it('should only remove files that exist', () => {
      mockFsOperations.exists = vi.fn(path => path.includes('personality.md'))
      mockFsOperations.removeFile = vi.fn()

      cleanupLegacyPersonalityFiles()

      expect(mockFsOperations.removeFile).toHaveBeenCalledTimes(1)
      expect(mockFsOperations.removeFile).toHaveBeenCalledWith(
        expect.stringContaining('personality.md'),
      )
    })
  })

  describe('configureOutputStyle', () => {
    it('should configure output styles in interactive mode', async () => {
      // Mock no legacy files to avoid complex legacy handling
      mockFsOperations.exists = vi.fn((path) => {
        // Only return true for output-styles directory check, false for legacy files
        return path.includes('output-styles')
      })

      mockInquirer.default.prompt = vi.fn()
        .mockResolvedValueOnce({ selectedStyles: ['engineer-professional', 'nekomata-engineer'] })
        .mockResolvedValueOnce({ defaultStyle: 'engineer-professional' })
      Object.assign(mockInquirer.default, {
        prompt: mockInquirer.default.prompt,
        prompts: {},
        registerPrompt: vi.fn(),
        restoreDefaultPrompts: vi.fn(),
      })

      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockJsonConfig.readJsonConfig.mockReturnValue({})
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})
      mockZcfConfig.updateZcfConfig.mockImplementation(() => {})

      await configureOutputStyle()

      expect(mockInquirer.default.prompt).toHaveBeenCalledTimes(2)
      expect(mockFsOperations.copyFile).toHaveBeenCalledTimes(2)
      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalled()
      expect(mockZcfConfig.updateZcfConfig).toHaveBeenCalled()
    })

    it('should handle non-interactive mode with preselected styles', async () => {
      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockFsOperations.exists.mockImplementation(() => true)
      mockJsonConfig.readJsonConfig.mockImplementation(() => ({}))
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})
      mockZcfConfig.updateZcfConfig.mockImplementation(() => {})

      await configureOutputStyle(
        ['engineer-professional', 'default'], // preselectedStyles
        'engineer-professional', // preselectedDefault
      )

      expect(mockInquirer.default.prompt).not.toHaveBeenCalled()
      expect(mockFsOperations.copyFile).toHaveBeenCalledTimes(1) // Only custom styles
      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalled()
      expect(mockZcfConfig.updateZcfConfig).toHaveBeenCalled()
    })

    it('should detect and handle legacy files', async () => {
      mockFsOperations.exists = vi.fn((path) => {
        if (path.includes('personality.md'))
          return true
        return path.includes('output-styles')
      })
      mockFsOperations.removeFile.mockImplementation(() => {})
      mockInquirer.default.prompt = vi.fn()
        .mockResolvedValueOnce({ selectedStyles: ['engineer-professional'] })
        .mockResolvedValueOnce({ defaultStyle: 'engineer-professional' })
      Object.assign(mockInquirer.default, {
        prompt: mockInquirer.default.prompt,
        prompts: {},
        registerPrompt: vi.fn(),
        restoreDefaultPrompts: vi.fn(),
      })
      vi.mocked(promptBoolean).mockResolvedValueOnce(true)

      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockJsonConfig.readJsonConfig.mockImplementation(() => ({}))
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})
      mockZcfConfig.updateZcfConfig.mockImplementation(() => {})

      await configureOutputStyle()

      expect(mockFsOperations.removeFile).toHaveBeenCalled()
      // Use i18n to get the translated message instead of hardcoding
      const { i18n } = await import('../../../src/i18n')
      expect(promptBoolean).toHaveBeenCalledWith(expect.objectContaining({
        message: i18n.t('configuration:cleanupLegacyFiles'),
        defaultValue: true,
      }))
    })

    it('should skip legacy cleanup if user declines', async () => {
      mockFsOperations.exists = vi.fn((path) => {
        if (path.includes('personality.md'))
          return true
        return path.includes('output-styles')
      })
      mockFsOperations.removeFile.mockImplementation(() => {})
      mockInquirer.default.prompt = vi.fn()
        .mockResolvedValueOnce({ selectedStyles: ['engineer-professional'] })
        .mockResolvedValueOnce({ defaultStyle: 'engineer-professional' })
      Object.assign(mockInquirer.default, {
        prompt: mockInquirer.default.prompt,
        prompts: {},
        registerPrompt: vi.fn(),
        restoreDefaultPrompts: vi.fn(),
      })
      vi.mocked(promptBoolean).mockResolvedValueOnce(false)

      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockJsonConfig.readJsonConfig.mockImplementation(() => ({}))
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})
      mockZcfConfig.updateZcfConfig.mockImplementation(() => {})

      await configureOutputStyle()

      expect(mockFsOperations.removeFile).not.toHaveBeenCalled()
      expect(promptBoolean).toHaveBeenCalled()
    })
  })
})
