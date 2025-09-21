import type {
  ZcfTomlConfig,
} from '../../../src/types/toml-config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CODE_TOOL_TYPE } from '../../../src/constants'

// Mock dependencies
vi.mock('../../../src/utils/fs-operations')
vi.mock('smol-toml')

const mockExists = vi.fn()
const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()
const mockEnsureDir = vi.fn()
const mockParse = vi.fn()
const mockStringify = vi.fn()

// Setup mocks
vi.mocked(await import('../../../src/utils/fs-operations')).exists = mockExists
vi.mocked(await import('../../../src/utils/fs-operations')).readFile = mockReadFile
vi.mocked(await import('../../../src/utils/fs-operations')).writeFile = mockWriteFile
vi.mocked(await import('../../../src/utils/fs-operations')).ensureDir = mockEnsureDir
vi.mocked(await import('smol-toml')).parse = mockParse
vi.mocked(await import('smol-toml')).stringify = mockStringify

describe('tOML Config Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const sampleTomlConfig: ZcfTomlConfig = {
    version: '1.0.0',
    lastUpdated: '2025-09-21T08:00:00.000Z',
    general: {
      preferredLang: 'zh-CN',
      aiOutputLang: 'zh-CN',
      currentTool: 'claude-code',
    },
    claudeCode: {
      enabled: true,
      outputStyles: ['engineer-professional', 'nekomata-engineer'],
      defaultOutputStyle: 'nekomata-engineer',
      installation: {
        type: 'global',
        path: '/usr/local/bin/claude-code',
        configDir: '/Users/test/.claude',
      },
    },
    codex: {
      enabled: false,
      systemPromptStyle: 'engineer-professional',
      installation: {
        type: 'global',
        path: '/usr/local/bin/codex',
        configDir: '/Users/test/.codex',
      },
    },
  }

  const sampleTomlString = `version = "1.0.0"
last_updated = "2025-09-21T08:00:00.000Z"

[general]
preferred_lang = "zh-CN"
ai_output_lang = "zh-CN"
current_tool = "claude-code"

[claude_code]
enabled = true
output_styles = ["engineer-professional", "nekomata-engineer"]
default_output_style = "nekomata-engineer"

[claude_code.installation]
type = "global"
path = "/usr/local/bin/claude-code"
config_dir = "/Users/test/.claude"

[codex]
enabled = false
system_prompt_style = "engineer-professional"

[codex.installation]
type = "global"
path = "/usr/local/bin/codex"
config_dir = "/Users/test/.codex"`

  describe('readTomlConfig', () => {
    it('should read and parse valid TOML config file', async () => {
      // Arrange
      const { readTomlConfig } = await import('../../../src/utils/toml-config')
      mockExists.mockReturnValue(true)
      mockReadFile.mockReturnValue(sampleTomlString)
      mockParse.mockReturnValue(sampleTomlConfig)

      // Act
      const result = readTomlConfig('/test/config.toml')

      // Assert
      expect(mockExists).toHaveBeenCalledWith('/test/config.toml')
      expect(mockReadFile).toHaveBeenCalledWith('/test/config.toml')
      expect(mockParse).toHaveBeenCalledWith(sampleTomlString)
      expect(result).toEqual(sampleTomlConfig)
    })

    it('should return null when config file does not exist', async () => {
      // Arrange
      const { readTomlConfig } = await import('../../../src/utils/toml-config')
      mockExists.mockReturnValue(false)

      // Act
      const result = readTomlConfig('/test/nonexistent.toml')

      // Assert
      expect(mockExists).toHaveBeenCalledWith('/test/nonexistent.toml')
      expect(mockReadFile).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should return null when TOML parsing fails', async () => {
      // Arrange
      const { readTomlConfig } = await import('../../../src/utils/toml-config')
      mockExists.mockReturnValue(true)
      mockReadFile.mockReturnValue('invalid toml content')
      mockParse.mockImplementation(() => {
        throw new Error('Invalid TOML')
      })

      // Act
      const result = readTomlConfig('/test/config.toml')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('writeTomlConfig', () => {
    it('should serialize and write TOML config to file', async () => {
      // Arrange
      const { writeTomlConfig } = await import('../../../src/utils/toml-config')
      mockStringify.mockReturnValue(sampleTomlString)
      mockEnsureDir.mockReturnValue(undefined)
      mockWriteFile.mockReturnValue(undefined)

      const configPath = '/test/config.toml'
      const configDir = '/test'

      // Act
      writeTomlConfig(configPath, sampleTomlConfig)

      // Assert
      expect(mockEnsureDir).toHaveBeenCalledWith(configDir)
      expect(mockStringify).toHaveBeenCalledWith(sampleTomlConfig)
      expect(mockWriteFile).toHaveBeenCalledWith(configPath, sampleTomlString)
    })

    it('should handle write errors gracefully', async () => {
      // Arrange
      const { writeTomlConfig } = await import('../../../src/utils/toml-config')
      mockStringify.mockReturnValue(sampleTomlString)
      mockEnsureDir.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      // Act & Assert
      expect(() => {
        writeTomlConfig('/test/config.toml', sampleTomlConfig)
      }).not.toThrow()
    })
  })

  describe('validateTomlConfig', () => {
    it('should validate complete and correct TOML config', async () => {
      // Arrange
      const { validateTomlConfig } = await import('../../../src/utils/toml-config')

      // Act
      const result = validateTomlConfig(sampleTomlConfig)

      // Assert
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should detect missing required fields', async () => {
      // Arrange
      const { validateTomlConfig } = await import('../../../src/utils/toml-config')
      const invalidConfig = {
        version: '1.0.0',
        // Missing required fields
      } as any

      // Act
      const result = validateTomlConfig(invalidConfig)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing required field: lastUpdated')
      expect(result.errors).toContain('Missing required field: general')
    })

    it('should detect invalid tool configuration', async () => {
      // Arrange
      const { validateTomlConfig } = await import('../../../src/utils/toml-config')
      const invalidConfig = {
        ...sampleTomlConfig,
        general: {
          ...sampleTomlConfig.general,
          currentTool: 'invalid-tool' as any,
        },
      }

      // Act
      const result = validateTomlConfig(invalidConfig)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid currentTool: invalid-tool')
    })
  })

  describe('createDefaultTomlConfig', () => {
    it('should create default configuration with correct structure', async () => {
      // Arrange
      const { createDefaultTomlConfig } = await import('../../../src/utils/toml-config')

      // Act
      const result = createDefaultTomlConfig()

      // Assert
      expect(result.version).toBe('1.0.0')
      expect(result.general.preferredLang).toBe('en')
      expect(result.general.currentTool).toBe(DEFAULT_CODE_TOOL_TYPE)
      expect(result.claudeCode.enabled).toBe(true)
      expect(result.codex.enabled).toBe(false)
      expect(result.claudeCode.outputStyles).toEqual(['engineer-professional'])
      expect(result.claudeCode.defaultOutputStyle).toBe('engineer-professional')
      expect(result.codex.systemPromptStyle).toBe('engineer-professional')
    })

    it('should create config with custom language preference', async () => {
      // Arrange
      const { createDefaultTomlConfig } = await import('../../../src/utils/toml-config')

      // Act
      const result = createDefaultTomlConfig('zh-CN')

      // Assert
      expect(result.general.preferredLang).toBe('zh-CN')
      expect(result.general.aiOutputLang).toBe('zh-CN')
    })
  })

  describe('migrateFromJsonConfig', () => {
    it('should migrate JSON config to TOML format', async () => {
      // Arrange
      const { migrateFromJsonConfig } = await import('../../../src/utils/toml-config')
      const jsonConfig = {
        version: '1.0.0',
        preferredLang: 'zh-CN',
        codeToolType: 'claude-code',
        claudeCodeInstallation: {
          type: 'global',
          path: '/usr/local/bin/claude-code',
          configDir: '/Users/test/.claude',
        },
        outputStyles: ['engineer-professional', 'nekomata-engineer'],
        defaultOutputStyle: 'nekomata-engineer',
        lastUpdated: '2025-09-21T08:00:00.000Z',
      }

      // Act
      const result = migrateFromJsonConfig(jsonConfig)

      // Assert
      expect(result.version).toBe('1.0.0')
      expect(result.general.preferredLang).toBe('zh-CN')
      expect(result.general.currentTool).toBe('claude-code')
      expect(result.claudeCode.enabled).toBe(true)
      expect(result.claudeCode.outputStyles).toEqual(['engineer-professional', 'nekomata-engineer'])
      expect(result.claudeCode.defaultOutputStyle).toBe('nekomata-engineer')
      expect(result.codex.enabled).toBe(false)
    })

    it('should handle partial JSON config migration', async () => {
      // Arrange
      const { migrateFromJsonConfig } = await import('../../../src/utils/toml-config')
      const partialJsonConfig = {
        version: '1.0.0',
        preferredLang: 'en',
        codeToolType: 'codex',
      }

      // Act
      const result = migrateFromJsonConfig(partialJsonConfig)

      // Assert
      expect(result.general.currentTool).toBe('codex')
      expect(result.claudeCode.enabled).toBe(false)
      expect(result.codex.enabled).toBe(true)
      expect(result.codex.systemPromptStyle).toBe('engineer-professional')
    })
  })
})
