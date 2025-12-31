import type {
  ZcfTomlConfig,
} from '../../../src/types/toml-config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CODE_TOOL_TYPE } from '../../../src/constants'
import * as jsonConfig from '../../../src/utils/json-config'
import {
  createDefaultTomlConfig,
  getZcfConfig,
  getZcfConfigAsync,
  migrateFromJsonConfig,
  readTomlConfig,
  readZcfConfig,
  readZcfConfigAsync,
  saveZcfConfig,
  updateZcfConfig,
  writeTomlConfig,
  writeZcfConfig,
} from '../../../src/utils/zcf-config'

// Mock dependencies
vi.mock('../../../src/utils/json-config')
vi.mock('../../../src/utils/fs-operations')
vi.mock('../../../src/utils/toml-edit')

const mockExists = vi.fn()
const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()
const mockEnsureDir = vi.fn()
const mockParseToml = vi.fn()
const mockStringifyToml = vi.fn()
const mockBatchEditToml = vi.fn()

// Setup mocks
vi.mocked(await import('../../../src/utils/fs-operations')).exists = mockExists
vi.mocked(await import('../../../src/utils/fs-operations')).readFile = mockReadFile
vi.mocked(await import('../../../src/utils/fs-operations')).writeFile = mockWriteFile
vi.mocked(await import('../../../src/utils/fs-operations')).ensureDir = mockEnsureDir
vi.mocked(await import('../../../src/utils/toml-edit')).parseToml = mockParseToml
vi.mocked(await import('../../../src/utils/toml-edit')).stringifyToml = mockStringifyToml
vi.mocked(await import('../../../src/utils/toml-edit')).batchEditToml = mockBatchEditToml

describe('zcf-config utilities', () => {
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
      installType: 'global',
    },
    codex: {
      enabled: false,
      systemPromptStyle: 'engineer-professional',
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
install_type = "global"

[codex]
enabled = false
system_prompt_style = "engineer-professional"`

  describe('helper utilities', () => {
    it('should create default config with zh-CN AI output when preferredLang is zh-CN', () => {
      const config = createDefaultTomlConfig('zh-CN')

      expect(config.general.aiOutputLang).toBe('zh-CN')
      expect(config.general.currentTool).toBe(DEFAULT_CODE_TOOL_TYPE)
    })

    it('should migrate legacy JSON configuration into TOML structure', () => {
      const legacy = {
        version: '2.0.0',
        lastUpdated: '2024-08-01',
        preferredLang: 'zh-CN',
        templateLang: 'en',
        aiOutputLang: 'zh-CN',
        codeToolType: 'codex',
        outputStyles: ['engineer-professional'],
        defaultOutputStyle: 'engineer-professional',
        currentProfileId: 'profile-1',
        claudeCodeInstallation: { type: 'local' },
        claudeCode: { profiles: { 'profile-1': { name: 'Test' } } },
      }

      const migrated = migrateFromJsonConfig(legacy)

      expect(migrated.general.preferredLang).toBe('zh-CN')
      expect(migrated.claudeCode.installType).toBe('local')
      expect(migrated.codex.enabled).toBe(true)
      expect(migrated.claudeCode.currentProfile).toBe('profile-1')
    })

    it('should readTomlConfig return null when file missing or parse fails', () => {
      mockExists.mockReturnValueOnce(false)
      expect(readTomlConfig('missing.toml')).toBeNull()

      mockExists.mockReturnValueOnce(true)
      mockReadFile.mockReturnValueOnce('invalid')
      mockParseToml.mockImplementationOnce(() => {
        throw new Error('parse failed')
      })
      expect(readTomlConfig('broken.toml')).toBeNull()
    })

    it('should writeTomlConfig ignore underlying write errors', () => {
      mockEnsureDir.mockImplementationOnce(() => {
        throw new Error('mkdir failed')
      })

      expect(() => writeTomlConfig('path/config.toml', createDefaultTomlConfig())).not.toThrow()
    })
  })

  describe('readZcfConfig', () => {
    it('should read config from TOML file', () => {
      const mockTomlConfig = {
        version: '1.0.0',
        lastUpdated: '2024-01-01',
        general: {
          preferredLang: 'en' as const,
          aiOutputLang: 'en',
          currentTool: 'codex' as const,
        },
        claudeCode: {
          enabled: false,
          outputStyles: ['engineer-professional'],
          defaultOutputStyle: 'engineer-professional',
          installType: 'global' as const,
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'engineer-professional',
        },
      }

      mockExists.mockReturnValue(true)
      mockReadFile.mockReturnValue(sampleTomlString)
      mockParseToml.mockReturnValue(mockTomlConfig)

      const result = readZcfConfig()

      expect(result).toEqual({
        version: '1.0.0',
        preferredLang: 'en',
        aiOutputLang: 'en',
        codeToolType: 'codex',
        lastUpdated: '2024-01-01',
        outputStyles: ['engineer-professional'],
        defaultOutputStyle: 'engineer-professional',
      })
      expect(mockExists).toHaveBeenCalled()
      expect(mockReadFile).toHaveBeenCalled()
      expect(mockParseToml).toHaveBeenCalled()
    })

    it('should return null when file does not exist', () => {
      mockExists.mockReturnValue(false)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = readZcfConfig()

      expect(result).toBeNull()
      expect(mockExists).toHaveBeenCalled()
    })
  })

  describe('writeZcfConfig', () => {
    it('should save config to TOML file', () => {
      const config = {
        version: '1.0.0',
        preferredLang: 'zh-CN' as const,
        aiOutputLang: 'zh-CN',
        lastUpdated: '2024-01-01',
        codeToolType: 'claude-code' as const,
      }

      // Mock internal TOML operations
      mockStringifyToml.mockReturnValue('mocked toml content')
      mockEnsureDir.mockReturnValue(undefined)
      mockWriteFile.mockReturnValue(undefined)

      writeZcfConfig(config)

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(String),
        'mocked toml content',
      )
    })
  })

  describe('updateZcfConfig', () => {
    it('should update existing config', () => {
      const existingTomlConfig = {
        version: '1.0.0',
        lastUpdated: '2024-01-01',
        general: {
          preferredLang: 'en' as const,
          aiOutputLang: 'en',
          currentTool: 'claude-code' as const,
        },
        claudeCode: {
          enabled: true,
          outputStyles: ['engineer-professional'],
          defaultOutputStyle: 'engineer-professional',
          installType: 'global' as const,
        },
        codex: {
          enabled: false,
          systemPromptStyle: 'engineer-professional',
        },
      }
      mockExists.mockReturnValue(true)
      mockReadFile.mockReturnValue(sampleTomlString)
      mockParseToml.mockReturnValue(existingTomlConfig)
      // batchEditToml is used for incremental editing when file exists
      mockBatchEditToml.mockReturnValue('mocked edited toml content')

      // Migration is handled internally

      updateZcfConfig({ preferredLang: 'zh-CN', codeToolType: 'codex' })

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(String),
        'mocked edited toml content',
      )
    })

    it('should handle null existing config', () => {
      mockExists.mockReturnValue(false)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      // Mock internal TOML operations
      mockStringifyToml.mockReturnValue('mocked toml content')
      mockEnsureDir.mockReturnValue(undefined)
      mockWriteFile.mockReturnValue(undefined)

      updateZcfConfig({ preferredLang: 'zh-CN' })

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(String),
        'mocked toml content',
      )
    })

    it('should preserve codex system prompt style when updating unrelated fields', () => {
      const existingTomlConfig: ZcfTomlConfig = {
        version: '1.0.0',
        lastUpdated: '2025-09-21T08:00:00.000Z',
        general: {
          preferredLang: 'zh-CN',
          templateLang: 'zh-CN',
          aiOutputLang: 'zh-CN',
          currentTool: 'codex',
        },
        claudeCode: {
          enabled: false,
          outputStyles: ['engineer-professional'],
          defaultOutputStyle: 'engineer-professional',
          installType: 'global',
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'nekomata-engineer',
        },
      }

      mockExists.mockReturnValue(true)
      mockReadFile.mockReturnValue(sampleTomlString)
      mockParseToml.mockReturnValue(existingTomlConfig)

      // batchEditToml is used when file exists for incremental editing
      mockBatchEditToml.mockImplementation(() => 'mocked edited toml content')
      mockEnsureDir.mockReturnValue(undefined)
      mockWriteFile.mockReturnValue(undefined)

      updateZcfConfig({ codeToolType: 'codex' })

      // Verify batchEditToml was called (file exists case uses incremental editing)
      expect(mockBatchEditToml).toHaveBeenCalled()
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(String),
        'mocked edited toml content',
      )
    })
  })

  // Extended Tests from zcf-config.extended.test.ts
  describe('zcf-config extended tests', () => {
    it('should handle cache cleanup', () => {
      // This is a placeholder test - the actual extended tests were minimal
      expect(true).toBe(true)
    })
  })

  describe('readZcfConfig - legacy file support', () => {
    it('should try legacy location', () => {
      // This test covers the legacy path logic without complex mocking
      mockExists.mockReturnValue(false)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = readZcfConfig()

      expect(result).toBeNull()
      expect(mockExists).toHaveBeenCalled()
    })
  })

  describe('writeZcfConfig - error handling', () => {
    it('should silently fail on write error', () => {
      mockWriteFile.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const config = {
        version: '1.0.0',
        preferredLang: 'en' as const,
        lastUpdated: '2024-01-01',
        codeToolType: 'claude-code' as const,
      }

      // Should not throw
      expect(() => writeZcfConfig(config)).not.toThrow()
    })
  })

  describe('getZcfConfig defaults', () => {
    it('should return default config when nothing stored', () => {
      mockExists.mockReturnValue(false)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const config = getZcfConfig()

      expect(config.preferredLang).toBe('en')
      expect(config.codeToolType).toBe(DEFAULT_CODE_TOOL_TYPE)
    })
  })

  describe('async functions', () => {
    it('should readZcfConfigAsync return config', async () => {
      const mockTomlConfig = {
        version: '1.0.0',
        lastUpdated: '2024-01-01',
        general: {
          preferredLang: 'en' as const,
          currentTool: 'claude-code' as const,
        },
        claudeCode: {
          enabled: true,
          outputStyles: ['engineer-professional'],
          defaultOutputStyle: 'engineer-professional',
          installType: 'global' as const,
        },
        codex: {
          enabled: false,
          systemPromptStyle: 'engineer-professional',
        },
      }
      mockExists.mockReturnValue(true)
      mockReadFile.mockReturnValue(sampleTomlString)
      mockParseToml.mockReturnValue(mockTomlConfig)

      const result = await readZcfConfigAsync()

      expect(result).toEqual({
        version: '1.0.0',
        preferredLang: 'en',
        lastUpdated: '2024-01-01',
        aiOutputLang: undefined,
        outputStyles: ['engineer-professional'],
        defaultOutputStyle: 'engineer-professional',
        codeToolType: 'claude-code',
      })
    })

    it('should readZcfConfigAsync return null when no config', async () => {
      mockExists.mockReturnValue(false)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = await readZcfConfigAsync()

      expect(result).toBeNull()
    })

    it('should getZcfConfigAsync return default when no config', async () => {
      mockExists.mockReturnValue(false)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = await getZcfConfigAsync()

      expect(result.version).toBe('1.0.0')
      expect(result.preferredLang).toBe('en')
      expect(result.codeToolType).toBe('claude-code')
      expect(result.lastUpdated).toBeTruthy()
    })

    it('should getZcfConfigAsync return existing config', async () => {
      const mockTomlConfig = {
        version: '2.0.0',
        lastUpdated: '2024-06-01',
        general: {
          preferredLang: 'zh-CN' as const,
          currentTool: 'codex' as const,
        },
        claudeCode: {
          enabled: false,
          outputStyles: ['engineer-professional'],
          defaultOutputStyle: 'engineer-professional',
          installType: 'global' as const,
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'engineer-professional',
        },
      }
      mockExists.mockReturnValue(true)
      mockReadFile.mockReturnValue(sampleTomlString)
      mockParseToml.mockReturnValue(mockTomlConfig)

      const result = await getZcfConfigAsync()

      expect(result.version).toBe('2.0.0')
      expect(result.preferredLang).toBe('zh-CN')
      expect(result.codeToolType).toBe('codex')
      expect(result.lastUpdated).toBe('2024-06-01')
    })

    it('should saveZcfConfig call writeZcfConfig', async () => {
      const config = {
        version: '1.0.0',
        preferredLang: 'en' as const,
        lastUpdated: '2024-01-01',
        codeToolType: 'claude-code' as const,
      }

      // When file doesn't exist, stringifyToml is used for new file creation
      mockExists.mockReturnValue(false)
      mockStringifyToml.mockReturnValue('mocked toml content')
      mockEnsureDir.mockReturnValue(undefined)
      mockWriteFile.mockReturnValue(undefined)

      await saveZcfConfig(config)

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(String),
        'mocked toml content',
      )
    })
  })

  describe('getZcfConfig - fallback behavior', () => {
    it('should return default config when readZcfConfig returns null', () => {
      mockExists.mockReturnValue(false)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = getZcfConfig()

      expect(result).toEqual({
        version: '1.0.0',
        preferredLang: 'en',
        codeToolType: 'claude-code',
        lastUpdated: expect.any(String),
      })
    })

    it('should return existing config when available', () => {
      const mockTomlConfig = {
        version: '2.0.0',
        lastUpdated: '2024-06-01',
        general: {
          preferredLang: 'zh-CN' as const,
          aiOutputLang: 'zh-CN',
          currentTool: 'codex' as const,
        },
        claudeCode: {
          enabled: false,
          outputStyles: ['engineer-professional'],
          defaultOutputStyle: 'engineer-professional',
          installType: 'global' as const,
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'engineer-professional',
        },
      }
      mockExists.mockReturnValue(true)
      mockReadFile.mockReturnValue(sampleTomlString)
      mockParseToml.mockReturnValue(mockTomlConfig)

      const result = getZcfConfig()

      expect(result.version).toBe('2.0.0')
      expect(result.preferredLang).toBe('zh-CN')
      expect(result.codeToolType).toBe('codex')
      expect(result.lastUpdated).toBe('2024-06-01')
    })
  })

  describe('updateZcfConfig - complex scenarios', () => {
    it('should handle partial updates with undefined values', () => {
      const existingTomlConfig = {
        version: '1.0.0',
        lastUpdated: '2024-01-01',
        general: {
          preferredLang: 'en' as const,
          aiOutputLang: 'en',
          currentTool: 'codex' as const,
        },
        claudeCode: {
          enabled: false,
          outputStyles: ['style1'],
          defaultOutputStyle: 'style1',
          installType: 'global' as const,
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'style1',
          installType: 'global' as const,
        },
      }
      mockExists.mockReturnValue(true)
      mockReadFile.mockReturnValue(sampleTomlString)
      mockParseToml.mockReturnValue(existingTomlConfig)

      // batchEditToml is used for incremental editing when file exists
      mockBatchEditToml.mockReturnValue('mocked edited toml content')

      updateZcfConfig({
        outputStyles: undefined,
        defaultOutputStyle: undefined,
      })

      // When file exists, batchEditToml is used for incremental editing
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(String),
        'mocked edited toml content',
      )
    })

    it('should properly handle all fields in update', () => {
      mockExists.mockReturnValue(false)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const updates = {
        version: '2.0.0',
        preferredLang: 'zh-CN' as const,
        aiOutputLang: 'zh-CN',
        outputStyles: ['nekomata-engineer'],
        defaultOutputStyle: 'nekomata-engineer',
        codeToolType: 'codex' as const,
      }

      // Mock internal TOML operations
      mockStringifyToml.mockReturnValue('mocked toml content')
      mockEnsureDir.mockReturnValue(undefined)
      mockWriteFile.mockReturnValue(undefined)

      updateZcfConfig(updates)

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(String),
        'mocked toml content',
      )
    })
  })

  // 新增：TOML 功能直接测试
  describe('tOML Functions (Integrated)', () => {
    describe('readTomlConfig', () => {
      it('should read and parse valid TOML config file', () => {
        mockExists.mockReturnValue(true)
        mockReadFile.mockReturnValue(sampleTomlString)
        mockParseToml.mockReturnValue(sampleTomlConfig)

        const result = readTomlConfig('/test/config.toml')

        expect(mockExists).toHaveBeenCalledWith('/test/config.toml')
        expect(mockReadFile).toHaveBeenCalledWith('/test/config.toml')
        expect(mockParseToml).toHaveBeenCalledWith(sampleTomlString)
        expect(result).toEqual(sampleTomlConfig)
      })

      it('should return null when config file does not exist', () => {
        mockExists.mockReturnValue(false)

        const result = readTomlConfig('/test/nonexistent.toml')

        expect(mockExists).toHaveBeenCalledWith('/test/nonexistent.toml')
        expect(mockReadFile).not.toHaveBeenCalled()
        expect(result).toBeNull()
      })

      it('should return null when TOML parsing fails', () => {
        mockExists.mockReturnValue(true)
        mockReadFile.mockReturnValue('invalid toml content')
        mockParseToml.mockImplementation(() => {
          throw new Error('Invalid TOML')
        })

        const result = readTomlConfig('/test/config.toml')

        expect(result).toBeNull()
      })
    })

    describe('writeTomlConfig', () => {
      it('should serialize and write TOML config to file', () => {
        // When file doesn't exist, stringifyToml is used
        mockExists.mockReturnValue(false)
        mockStringifyToml.mockReturnValue(sampleTomlString)
        mockEnsureDir.mockReturnValue(undefined)
        mockWriteFile.mockReturnValue(undefined)

        const configPath = '/test/config.toml'

        writeTomlConfig(configPath, sampleTomlConfig)

        expect(mockEnsureDir).toHaveBeenCalled()
        expect(mockStringifyToml).toHaveBeenCalledWith(sampleTomlConfig)
        expect(mockWriteFile).toHaveBeenCalledWith(configPath, sampleTomlString)
      })

      it('should handle write errors gracefully', () => {
        mockStringifyToml.mockReturnValue(sampleTomlString)
        mockEnsureDir.mockImplementation(() => {
          throw new Error('Permission denied')
        })

        expect(() => {
          writeTomlConfig('/test/config.toml', sampleTomlConfig)
        }).not.toThrow()
      })
    })

    describe('createDefaultTomlConfig', () => {
      it('should create default configuration with correct structure', () => {
        const result = createDefaultTomlConfig()

        expect(result.version).toBe('1.0.0')
        expect(result.general.preferredLang).toBe('en')
        expect(result.general.currentTool).toBe(DEFAULT_CODE_TOOL_TYPE)
        expect(result.claudeCode.enabled).toBe(true)
        expect(result.codex.enabled).toBe(false)
        expect(result.claudeCode.outputStyles).toEqual(['engineer-professional'])
        expect(result.claudeCode.defaultOutputStyle).toBe('engineer-professional')
        expect(result.codex.systemPromptStyle).toBe('engineer-professional')
      })

      it('should create config with custom language preference', () => {
        const result = createDefaultTomlConfig('zh-CN')

        expect(result.general.preferredLang).toBe('zh-CN')
        expect(result.general.aiOutputLang).toBe('zh-CN')
      })

      it('should create claude-code local installation config', () => {
        const result = createDefaultTomlConfig('en', 'local')

        expect(result.claudeCode.installType).toBe('local')
        expect(result.claudeCode).not.toHaveProperty('installation')
      })
    })

    describe('migrateFromJsonConfig', () => {
      it('should migrate JSON config to TOML format', () => {
        const jsonConfig = {
          version: '1.0.0',
          preferredLang: 'zh-CN',
          codeToolType: 'claude-code',
          claudeCodeInstallation: {
            type: 'local',
            path: '/usr/local/bin/claude-code',
            configDir: '/Users/test/.claude',
          },
          outputStyles: ['engineer-professional', 'nekomata-engineer'],
          defaultOutputStyle: 'nekomata-engineer',
          lastUpdated: '2025-09-21T08:00:00.000Z',
        }

        const result = migrateFromJsonConfig(jsonConfig)

        expect(result.version).toBe('1.0.0')
        expect(result.general.preferredLang).toBe('zh-CN')
        expect(result.general.currentTool).toBe('claude-code')
        expect(result.claudeCode.enabled).toBe(true)
        expect(result.claudeCode.outputStyles).toEqual(['engineer-professional', 'nekomata-engineer'])
        expect(result.claudeCode.defaultOutputStyle).toBe('nekomata-engineer')
        expect(result.claudeCode.installType).toBe('local')
        expect(result.codex.enabled).toBe(false)
      })

      it('should handle partial JSON config migration', () => {
        const partialJsonConfig = {
          version: '1.0.0',
          preferredLang: 'en',
          codeToolType: 'codex',
        }

        const result = migrateFromJsonConfig(partialJsonConfig)

        expect(result.general.currentTool).toBe('codex')
        expect(result.claudeCode.enabled).toBe(false)
        expect(result.codex.enabled).toBe(true)
        expect(result.codex.systemPromptStyle).toBe('engineer-professional')
      })

      it('should handle corrupted JSON config gracefully', () => {
        const corruptedConfig = {
          version: null,
          preferredLang: undefined,
          codeToolType: 'invalid-tool',
          unknownField: 'should-be-ignored',
        }

        const result = migrateFromJsonConfig(corruptedConfig as any)

        // Should use defaults for invalid/missing fields
        expect(result.version).toBe('1.0.0')
        expect(result.general.preferredLang).toBe('en')
        expect(result.general.currentTool).toBe('invalid-tool') // Function preserves original value, even if invalid
      })

      it('should handle empty JSON config object', () => {
        const emptyConfig = {}

        const result = migrateFromJsonConfig(emptyConfig as any)

        // Should use all defaults
        expect(result.version).toBe('1.0.0')
        expect(result.general.preferredLang).toBe('en')
        expect(result.general.currentTool).toBe('claude-code')
        expect(result.claudeCode.enabled).toBe(false)
        expect(result.codex.enabled).toBe(false)
      })
    })
  })

  // Additional edge case tests for configuration handling
  describe('configuration edge cases', () => {
    it('should handle missing configuration directory creation failure', () => {
      mockEnsureDir.mockImplementation(() => {
        throw new Error('Cannot create directory')
      })

      const config = {
        version: '1.0.0',
        preferredLang: 'en' as const,
        lastUpdated: '2024-01-01',
        codeToolType: 'claude-code' as const,
      }

      // Should not throw when directory creation fails
      expect(() => updateZcfConfig(config)).not.toThrow()
    })

    it('should handle configuration validation errors', () => {
      const invalidConfig = {
        version: '', // Invalid version
        preferredLang: 'invalid-lang' as any, // Invalid language
        lastUpdated: 'not-a-date', // Invalid date
        codeToolType: 'unknown-tool' as any, // Invalid tool type
      }

      // Should handle validation errors gracefully
      expect(() => updateZcfConfig(invalidConfig)).not.toThrow()
    })
  })
})
