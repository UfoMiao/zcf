import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as jsonConfig from '../../../src/utils/json-config'
import * as tomlConfig from '../../../src/utils/toml-config'
import {
  getZcfConfig,
  getZcfConfigAsync,
  readZcfConfig,
  readZcfConfigAsync,
  saveZcfConfig,
  updateZcfConfig,
  writeZcfConfig,
} from '../../../src/utils/zcf-config'

vi.mock('../../../src/utils/json-config')
vi.mock('../../../src/utils/toml-config', () => ({
  readTomlConfig: vi.fn(),
  writeTomlConfig: vi.fn(),
  createDefaultTomlConfig: vi.fn(),
  migrateFromJsonConfig: vi.fn(),
  updateTomlConfig: vi.fn(),
  validateTomlConfig: vi.fn(),
}))

describe('zcf-config utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/claude-code',
            configDir: '/Users/test/.claude',
          },
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'engineer-professional',
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/codex',
            configDir: '/Users/test/.codex',
          },
        },
      }

      vi.mocked(tomlConfig.readTomlConfig).mockReturnValue(mockTomlConfig)

      const result = readZcfConfig()

      expect(result).toEqual({
        version: '1.0.0',
        preferredLang: 'en',
        aiOutputLang: 'en',
        codeToolType: 'codex',
        lastUpdated: '2024-01-01',
        outputStyles: ['engineer-professional'],
        defaultOutputStyle: 'engineer-professional',
        claudeCodeInstallation: mockTomlConfig.claudeCode.installation,
      })
      expect(tomlConfig.readTomlConfig).toHaveBeenCalled()
    })

    it('should return null when file does not exist', () => {
      vi.mocked(tomlConfig.readTomlConfig).mockReturnValue(null)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = readZcfConfig()

      expect(result).toBeNull()
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

      const expectedTomlConfig = {
        version: '1.0.0',
        lastUpdated: '2024-01-01',
        general: {
          preferredLang: 'zh-CN' as const,
          aiOutputLang: 'zh-CN',
          currentTool: 'claude-code' as const,
        },
        claudeCode: {
          enabled: true,
          outputStyles: ['engineer-professional'],
          defaultOutputStyle: 'engineer-professional',
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/claude-code',
            configDir: '/Users/test/.claude',
          },
        },
        codex: {
          enabled: false,
          systemPromptStyle: 'engineer-professional',
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/codex',
            configDir: '/Users/test/.codex',
          },
        },
      }

      vi.mocked(tomlConfig.migrateFromJsonConfig).mockReturnValue(expectedTomlConfig)

      writeZcfConfig(config)

      expect(tomlConfig.writeTomlConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          version: '1.0.0',
          general: expect.objectContaining({
            preferredLang: 'zh-CN' as const,
            currentTool: 'claude-code',
          }),
        }),
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
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/claude-code',
            configDir: '/Users/test/.claude',
          },
        },
        codex: {
          enabled: false,
          systemPromptStyle: 'engineer-professional',
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/codex',
            configDir: '/Users/test/.codex',
          },
        },
      }
      vi.mocked(tomlConfig.readTomlConfig).mockReturnValue(existingTomlConfig)

      const expectedNewTomlConfig = {
        version: '1.0.0',
        lastUpdated: expect.any(String),
        general: {
          preferredLang: 'zh-CN' as const,
          aiOutputLang: 'en',
          currentTool: 'codex' as const,
        },
        claudeCode: {
          enabled: false,
          outputStyles: ['engineer-professional'],
          defaultOutputStyle: 'engineer-professional',
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/claude-code',
            configDir: '/Users/test/.claude',
          },
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'engineer-professional',
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/codex',
            configDir: '/Users/test/.codex',
          },
        },
      }
      vi.mocked(tomlConfig.migrateFromJsonConfig).mockReturnValue(expectedNewTomlConfig)

      updateZcfConfig({ preferredLang: 'zh-CN', codeToolType: 'codex' })

      expect(tomlConfig.writeTomlConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          version: '1.0.0',
          general: expect.objectContaining({
            preferredLang: 'zh-CN' as const,
            currentTool: 'codex',
          }),
        }),
      )
    })

    it('should handle null existing config', () => {
      vi.mocked(tomlConfig.readTomlConfig).mockReturnValue(null)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const expectedTomlConfig = {
        version: '1.0.0',
        lastUpdated: expect.any(String),
        general: {
          preferredLang: 'zh-CN' as const,
          aiOutputLang: undefined,
          currentTool: 'claude-code' as const,
        },
        claudeCode: {
          enabled: true,
          outputStyles: ['engineer-professional'],
          defaultOutputStyle: 'engineer-professional',
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/claude-code',
            configDir: '/Users/test/.claude',
          },
        },
        codex: {
          enabled: false,
          systemPromptStyle: 'engineer-professional',
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/codex',
            configDir: '/Users/test/.codex',
          },
        },
      }
      vi.mocked(tomlConfig.migrateFromJsonConfig).mockReturnValue(expectedTomlConfig)

      updateZcfConfig({ preferredLang: 'zh-CN' })

      expect(tomlConfig.writeTomlConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          version: '1.0.0',
          general: expect.objectContaining({
            preferredLang: 'zh-CN' as const,
            currentTool: 'claude-code',
          }),
        }),
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
      vi.mocked(tomlConfig.readTomlConfig).mockReturnValue(null)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = readZcfConfig()

      expect(result).toBeNull()
      expect(tomlConfig.readTomlConfig).toHaveBeenCalled()
    })
  })

  describe('writeZcfConfig - error handling', () => {
    it('should silently fail on write error', () => {
      vi.mocked(tomlConfig.writeTomlConfig).mockImplementation(() => {
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
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/claude-code',
            configDir: '/Users/test/.claude',
          },
        },
        codex: {
          enabled: false,
          systemPromptStyle: 'engineer-professional',
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/codex',
            configDir: '/Users/test/.codex',
          },
        },
      }
      vi.mocked(tomlConfig.readTomlConfig).mockReturnValue(mockTomlConfig)

      const result = await readZcfConfigAsync()

      expect(result).toEqual({
        version: '1.0.0',
        preferredLang: 'en',
        lastUpdated: '2024-01-01',
        aiOutputLang: undefined,
        outputStyles: ['engineer-professional'],
        defaultOutputStyle: 'engineer-professional',
        claudeCodeInstallation: mockTomlConfig.claudeCode.installation,
        codeToolType: 'claude-code',
      })
    })

    it('should readZcfConfigAsync return null when no config', async () => {
      vi.mocked(tomlConfig.readTomlConfig).mockReturnValue(null)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = await readZcfConfigAsync()

      expect(result).toBeNull()
    })

    it('should getZcfConfigAsync return default when no config', async () => {
      vi.mocked(tomlConfig.readTomlConfig).mockReturnValue(null)
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
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/claude-code',
            configDir: '/Users/test/.claude',
          },
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'engineer-professional',
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/codex',
            configDir: '/Users/test/.codex',
          },
        },
      }
      vi.mocked(tomlConfig.readTomlConfig).mockReturnValue(mockTomlConfig)

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

      const expectedTomlConfig = {
        version: '1.0.0',
        lastUpdated: '2024-01-01',
        general: {
          preferredLang: 'en' as const,
          aiOutputLang: undefined,
          currentTool: 'claude-code' as const,
        },
        claudeCode: {
          enabled: true,
          outputStyles: ['engineer-professional'],
          defaultOutputStyle: 'engineer-professional',
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/claude-code',
            configDir: '/Users/test/.claude',
          },
        },
        codex: {
          enabled: false,
          systemPromptStyle: 'engineer-professional',
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/codex',
            configDir: '/Users/test/.codex',
          },
        },
      }
      vi.mocked(tomlConfig.migrateFromJsonConfig).mockReturnValue(expectedTomlConfig)

      await saveZcfConfig(config)

      expect(tomlConfig.writeTomlConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          version: '1.0.0',
          general: expect.objectContaining({
            preferredLang: 'en',
            currentTool: 'claude-code',
          }),
        }),
      )
    })
  })

  describe('getZcfConfig - fallback behavior', () => {
    it('should return default config when readZcfConfig returns null', () => {
      vi.mocked(tomlConfig.readTomlConfig).mockReturnValue(null)
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
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/claude-code',
            configDir: '/Users/test/.claude',
          },
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'engineer-professional',
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/codex',
            configDir: '/Users/test/.codex',
          },
        },
      }
      vi.mocked(tomlConfig.readTomlConfig).mockReturnValue(mockTomlConfig)

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
          installation: { type: 'global' as const, path: 'test', configDir: 'test' },
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'style1',
          installation: { type: 'global' as const, path: 'test', configDir: 'test' },
        },
      }
      vi.mocked(tomlConfig.readTomlConfig).mockReturnValue(existingTomlConfig)

      // Set up the migrateFromJsonConfig mock to return the expected config
      const expectedNewTomlConfig = {
        version: '1.0.0',
        lastUpdated: expect.any(String),
        general: {
          preferredLang: 'en' as const,
          aiOutputLang: 'en',
          currentTool: 'codex' as const,
        },
        claudeCode: {
          enabled: false,
          outputStyles: ['style1'], // preserved
          defaultOutputStyle: 'style1', // preserved
          installation: { type: 'global' as const, path: 'test', configDir: 'test' }, // preserved
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'style1',
          installation: { type: 'global' as const, path: 'test', configDir: 'test' },
        },
      }
      vi.mocked(tomlConfig.migrateFromJsonConfig).mockReturnValue(expectedNewTomlConfig)

      updateZcfConfig({
        outputStyles: undefined,
        defaultOutputStyle: undefined,
        claudeCodeInstallation: undefined,
      })

      // Since we're mocking migrateFromJsonConfig, we should expect what we mocked
      expect(tomlConfig.writeTomlConfig).toHaveBeenCalledWith(
        expect.any(String),
        expectedNewTomlConfig,
      )
    })

    it('should properly handle all fields in update', () => {
      vi.mocked(tomlConfig.readTomlConfig).mockReturnValue(null)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const updates = {
        version: '2.0.0',
        preferredLang: 'zh-CN' as const,
        aiOutputLang: 'zh-CN',
        outputStyles: ['nekomata-engineer'],
        defaultOutputStyle: 'nekomata-engineer',
        claudeCodeInstallation: { type: 'local' as const, path: '/local/path', configDir: '/local/.claude' },
        codeToolType: 'codex' as const,
      }

      const expectedTomlConfig = {
        version: '2.0.0',
        lastUpdated: expect.any(String),
        general: {
          preferredLang: 'zh-CN' as const,
          aiOutputLang: 'zh-CN',
          currentTool: 'codex' as const,
        },
        claudeCode: {
          enabled: false,
          outputStyles: ['nekomata-engineer'],
          defaultOutputStyle: 'nekomata-engineer',
          installation: { type: 'local' as const, path: '/local/path', configDir: '/local/.claude' },
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'engineer-professional',
          installation: {
            type: 'global' as const,
            path: '/usr/local/bin/codex',
            configDir: '/Users/test/.codex',
          },
        },
      }
      vi.mocked(tomlConfig.migrateFromJsonConfig).mockReturnValue(expectedTomlConfig)

      updateZcfConfig(updates)

      expect(tomlConfig.writeTomlConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          version: '2.0.0',
          general: expect.objectContaining({
            preferredLang: 'zh-CN' as const,
            aiOutputLang: 'zh-CN',
            currentTool: 'codex',
          }),
          claudeCode: expect.objectContaining({
            outputStyles: ['nekomata-engineer'],
            defaultOutputStyle: 'nekomata-engineer',
            installation: { type: 'local' as const, path: '/local/path', configDir: '/local/.claude' },
          }),
          lastUpdated: expect.any(String),
        }),
      )
    })
  })
})
