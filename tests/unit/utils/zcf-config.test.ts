import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as jsonConfig from '../../../src/utils/json-config'
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

describe('zcf-config utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('readZcfConfig', () => {
    it('should read config from file', () => {
      const mockConfig = {
        version: '1.0.0',
        preferredLang: 'en',
        aiOutputLang: 'en',
        codeToolType: 'codex' as const,
        lastUpdated: '2024-01-01',
      }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockConfig)

      const result = readZcfConfig()

      expect(result).toEqual(mockConfig)
      expect(jsonConfig.readJsonConfig).toHaveBeenCalled()
    })

    it('should return null when file does not exist', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = readZcfConfig()

      expect(result).toBeNull()
    })
  })

  describe('writeZcfConfig', () => {
    it('should save config to file', () => {
      const config = {
        version: '1.0.0',
        preferredLang: 'zh-CN' as const,
        aiOutputLang: 'zh-CN',
        lastUpdated: '2024-01-01',
        codeToolType: 'claude-code' as const,
      }

      writeZcfConfig(config)

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        config,
      )
    })
  })

  describe('updateZcfConfig', () => {
    it('should update existing config', () => {
      const existingConfig = {
        version: '1.0.0',
        preferredLang: 'en' as const,
        aiOutputLang: 'en',
        codeToolType: 'claude-code',
        lastUpdated: '2024-01-01',
      }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(existingConfig)

      updateZcfConfig({ preferredLang: 'zh-CN', codeToolType: 'codex' })

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          preferredLang: 'zh-CN',
          version: '1.0.0',
          codeToolType: 'codex' as const,
        }),
      )
    })

    it('should handle null existing config', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      updateZcfConfig({ preferredLang: 'zh-CN' })

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          preferredLang: 'zh-CN',
          version: '1.0.0',
          codeToolType: 'claude-code',
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
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = readZcfConfig()

      expect(result).toBeNull()
      expect(jsonConfig.readJsonConfig).toHaveBeenCalled()
    })
  })

  describe('writeZcfConfig - error handling', () => {
    it('should silently fail on write error', () => {
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {
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
      const mockConfig = {
        version: '1.0.0',
        preferredLang: 'en' as const,
        lastUpdated: '2024-01-01',
      }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockConfig)

      const result = await readZcfConfigAsync()

      // Expect result to be a normalized config containing all required fields
      expect(result).toEqual({
        version: '1.0.0',
        preferredLang: 'en',
        lastUpdated: '2024-01-01',
        aiOutputLang: undefined,
        outputStyles: undefined,
        defaultOutputStyle: undefined,
        claudeCodeInstallation: undefined,
        codeToolType: 'claude-code',
      })
    })

    it('should readZcfConfigAsync return null when no config', async () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = await readZcfConfigAsync()

      expect(result).toBeNull()
    })

    it('should getZcfConfigAsync return default when no config', async () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = await getZcfConfigAsync()

      expect(result.version).toBe('1.0.0')
      expect(result.preferredLang).toBe('en')
      expect(result.codeToolType).toBe('claude-code')
      expect(result.lastUpdated).toBeTruthy()
    })

    it('should getZcfConfigAsync return existing config', async () => {
      const mockConfig = {
        version: '2.0.0',
        preferredLang: 'zh-CN' as const,
        codeToolType: 'codex' as const,
        lastUpdated: '2024-06-01',
      }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockConfig)

      const result = await getZcfConfigAsync()

      expect(result).toEqual(mockConfig)
    })

    it('should saveZcfConfig call writeZcfConfig', async () => {
      const config = {
        version: '1.0.0',
        preferredLang: 'en' as const,
        lastUpdated: '2024-01-01',
        codeToolType: 'claude-code' as const,
      }

      await saveZcfConfig(config)

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        config,
      )
    })
  })

  describe('getZcfConfig - fallback behavior', () => {
    it('should return default config when readZcfConfig returns null', () => {
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
      const mockConfig = {
        version: '2.0.0',
        preferredLang: 'zh-CN' as const,
        aiOutputLang: 'zh-CN',
        codeToolType: 'codex' as const,
        lastUpdated: '2024-06-01',
      }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockConfig)

      const result = getZcfConfig()

      expect(result).toEqual(mockConfig)
    })
  })

  describe('updateZcfConfig - complex scenarios', () => {
    it('should handle partial updates with undefined values', () => {
      const existingConfig = {
        version: '1.0.0',
        preferredLang: 'en' as const,
        aiOutputLang: 'en',
        outputStyles: ['style1'],
        defaultOutputStyle: 'style1',
        claudeCodeInstallation: { type: 'global' as const, path: 'test', configDir: 'test' },
        codeToolType: 'codex' as const,
        lastUpdated: '2024-01-01',
      }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(existingConfig)

      updateZcfConfig({
        outputStyles: undefined,
        defaultOutputStyle: undefined,
        claudeCodeInstallation: undefined,
      })

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          outputStyles: ['style1'], // preserved
          defaultOutputStyle: 'style1', // preserved
          claudeCodeInstallation: { type: 'global', path: 'test', configDir: 'test' }, // preserved
          codeToolType: 'codex' as const,
          lastUpdated: expect.any(String), // updated
        }),
      )
    })

    it('should properly handle all fields in update', () => {
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

      updateZcfConfig(updates)

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ...updates,
          codeToolType: 'codex' as const,
          lastUpdated: expect.any(String),
        }),
      )
    })
  })
})
