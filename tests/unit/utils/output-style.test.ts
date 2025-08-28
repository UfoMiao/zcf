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
  const actual = await importOriginal()
  return {
    ...actual,
    CLAUDE_DIR: '/test/claude',
    SETTINGS_FILE: '/test/claude/settings.json',
  }
})
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getTranslation: vi.fn(),
  }
})
vi.mock('inquirer', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: {
      prompt: vi.fn(),
    },
  }
})

const mockFsOperations = vi.mocked(await import('../../../src/utils/fs-operations'))
const mockJsonConfig = vi.mocked(await import('../../../src/utils/json-config'))
const mockZcfConfig = vi.mocked(await import('../../../src/utils/zcf-config'))
const mockI18n = vi.mocked(await import('../../../src/i18n'))
const mockInquirer = vi.mocked(await import('inquirer'))

describe('output-style', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up common mocks
    mockI18n.getTranslation.mockReturnValue({
      configuration: {
        selectOutputStyles: 'Select output styles to install',
        selectDefaultOutputStyle: 'Select default output style',
        outputStyleInstalled: 'Output styles installed successfully',
        selectedStyles: 'Selected styles',
        defaultStyle: 'Default style',
        selectAtLeastOne: 'Please select at least one output style',
        legacyFilesDetected: 'Legacy personality files detected',
        cleanupLegacyFiles: 'Clean up legacy files?',
        legacyFilesRemoved: 'Legacy files removed successfully',
        outputStyles: {
          'engineer-professional': {
            name: 'Engineer Professional',
            description: 'Professional software engineer following SOLID, KISS, DRY, YAGNI principles',
          },
          'nekomata-engineer': {
            name: 'Nekomata Engineer',
            description: 'Professional catgirl engineer UFO Nya, combining rigorous engineering with cute catgirl traits',
          },
          'laowang-engineer': {
            name: 'Laowang Grumpy Tech',
            description: 'Laowang grumpy tech style, never tolerates code errors and non-standard code',
          },
          'default': {
            name: 'Default',
            description: 'Claude completes coding tasks efficiently and provides concise responses (Claude Code built-in)',
          },
          'explanatory': {
            name: 'Explanatory',
            description: 'Claude explains its implementation choices and codebase patterns (Claude Code built-in)',
          },
          'learning': {
            name: 'Learning',
            description: 'Learn-by-doing mode where Claude pauses and asks you to write small pieces of code for hands-on practice (Claude Code built-in)',
          },
        },
      },
      common: {
        cancelled: 'Operation cancelled',
        multiSelectHint: ' (multiple selection)',
      },
    })
  })

  describe('getAvailableOutputStyles', () => {
    it('should return all available output styles', () => {
      const styles = getAvailableOutputStyles()

      expect(styles).toHaveLength(6)
      expect(styles.map(s => s.id)).toEqual([
        'engineer-professional',
        'nekomata-engineer',
        'laowang-engineer',
        'default',
        'explanatory',
        'learning',
      ])
    })

    it('should have correct custom styles with file paths', () => {
      const styles = getAvailableOutputStyles()
      const customStyles = styles.filter(s => s.isCustom)

      expect(customStyles).toHaveLength(3)
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

      mockFsOperations.ensureDir = vi.fn()
      mockFsOperations.copyFile = vi.fn()
      mockFsOperations.exists = vi.fn(() => true)

      await copyOutputStyles(selectedStyles, lang)

      expect(mockFsOperations.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('output-styles'),
      )
      expect(mockFsOperations.copyFile).toHaveBeenCalledTimes(2)
    })

    it('should skip non-existent template files', async () => {
      const selectedStyles = ['engineer-professional']
      const lang: SupportedLang = 'zh-CN'

      mockFsOperations.ensureDir = vi.fn()
      mockFsOperations.copyFile = vi.fn()
      mockFsOperations.exists = vi.fn(() => false) // Template doesn't exist

      await copyOutputStyles(selectedStyles, lang)

      expect(mockFsOperations.copyFile).not.toHaveBeenCalled()
    })

    it('should only copy custom styles (built-in styles have no files)', async () => {
      const selectedStyles = ['engineer-professional', 'default', 'explanatory']
      const lang: SupportedLang = 'zh-CN'

      mockFsOperations.ensureDir = vi.fn()
      mockFsOperations.copyFile = vi.fn()
      mockFsOperations.exists = vi.fn(() => true)

      await copyOutputStyles(selectedStyles, lang)

      // Only engineer-professional should be copied (custom style)
      expect(mockFsOperations.copyFile).toHaveBeenCalledTimes(1)
    })
  })

  describe('setGlobalDefaultOutputStyle', () => {
    it('should set default output style in settings.json', () => {
      const existingSettings = { env: {} }
      mockJsonConfig.readJsonConfig = vi.fn(() => existingSettings)
      mockJsonConfig.writeJsonConfig = vi.fn()

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
      mockJsonConfig.readJsonConfig = vi.fn(() => existingSettings)
      mockJsonConfig.writeJsonConfig = vi.fn()

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
      mockFsOperations.exists = vi.fn(() => false)

      const hasLegacy = hasLegacyPersonalityFiles()
      expect(hasLegacy).toBe(false)
    })
  })

  describe('cleanupLegacyPersonalityFiles', () => {
    it('should remove legacy personality files', () => {
      mockFsOperations.exists = vi.fn(() => true)
      mockFsOperations.removeFile = vi.fn()

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

      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockJsonConfig.readJsonConfig.mockReturnValue({})
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})
      mockZcfConfig.updateZcfConfig.mockImplementation(() => {})

      await configureOutputStyle('zh-CN', 'zh-CN')

      expect(mockInquirer.default.prompt).toHaveBeenCalledTimes(2)
      expect(mockFsOperations.copyFile).toHaveBeenCalledTimes(2)
      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalled()
      expect(mockZcfConfig.updateZcfConfig).toHaveBeenCalled()
    })

    it('should handle non-interactive mode with preselected styles', async () => {
      mockFsOperations.ensureDir = vi.fn()
      mockFsOperations.copyFile = vi.fn()
      mockFsOperations.exists = vi.fn(() => true)
      mockJsonConfig.readJsonConfig = vi.fn(() => ({}))
      mockJsonConfig.writeJsonConfig = vi.fn()
      mockZcfConfig.updateZcfConfig = vi.fn()

      await configureOutputStyle(
        'zh-CN', // displayLang
        'zh-CN', // configLang
        ['engineer-professional', 'default'],
        'engineer-professional',
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
      mockFsOperations.removeFile = vi.fn()
      mockInquirer.default.prompt = vi.fn()
        .mockResolvedValueOnce({ cleanupLegacy: true })
        .mockResolvedValueOnce({ selectedStyles: ['engineer-professional'] })
        .mockResolvedValueOnce({ defaultStyle: 'engineer-professional' })

      mockFsOperations.ensureDir = vi.fn()
      mockFsOperations.copyFile = vi.fn()
      mockJsonConfig.readJsonConfig = vi.fn(() => ({}))
      mockJsonConfig.writeJsonConfig = vi.fn()
      mockZcfConfig.updateZcfConfig = vi.fn()

      await configureOutputStyle('zh-CN', 'zh-CN')

      expect(mockFsOperations.removeFile).toHaveBeenCalled()
      expect(mockInquirer.default.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'cleanupLegacy',
          type: 'confirm',
        }),
      )
    })

    it('should skip legacy cleanup if user declines', async () => {
      mockFsOperations.exists = vi.fn((path) => {
        if (path.includes('personality.md'))
          return true
        return path.includes('output-styles')
      })
      mockFsOperations.removeFile = vi.fn()
      mockInquirer.default.prompt = vi.fn()
        .mockResolvedValueOnce({ cleanupLegacy: false })
        .mockResolvedValueOnce({ selectedStyles: ['engineer-professional'] })
        .mockResolvedValueOnce({ defaultStyle: 'engineer-professional' })

      mockFsOperations.ensureDir = vi.fn()
      mockFsOperations.copyFile = vi.fn()
      mockJsonConfig.readJsonConfig = vi.fn(() => ({}))
      mockJsonConfig.writeJsonConfig = vi.fn()
      mockZcfConfig.updateZcfConfig = vi.fn()

      await configureOutputStyle('zh-CN', 'zh-CN')

      expect(mockFsOperations.removeFile).not.toHaveBeenCalled()
    })
  })
})
