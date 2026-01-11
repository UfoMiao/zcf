import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/i18n', () => ({
  i18n: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'codex:backupSuccess': '✔ Backup created at {{path}}',
        'codex:envKeyMigrationComplete': '✔ env_key to temp_env_key migration completed',
      }
      return translations[key] || key
    },
    isInitialized: true,
    language: 'en',
  },
  ensureI18nInitialized: vi.fn(),
}))

vi.mock('../../../../src/utils/fs-operations', () => ({
  ensureDir: vi.fn(),
  copyDir: vi.fn(),
  copyFile: vi.fn(),
  exists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

vi.mock('../../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
}))

vi.mock('../../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
  updateTomlConfig: vi.fn(),
  readDefaultTomlConfig: vi.fn(),
}))

vi.mock('node:os', () => ({
  homedir: () => '/home/test',
  platform: () => 'linux',
}))

describe('codex env_key to temp_env_key migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('needsEnvKeyMigration', () => {
    it('should return false when config file does not exist', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const { needsEnvKeyMigration } = await import('../../../../src/utils/code-tools/codex')
      const result = needsEnvKeyMigration()

      expect(result).toBe(false)
    })

    it('should return true when config has old env_key but no temp_env_key', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue(`
[model_providers.test]
name = "Test Provider"
base_url = "https://test.com"
wire_api = "responses"
env_key = "TEST_API_KEY"
requires_openai_auth = true
`)

      const { needsEnvKeyMigration } = await import('../../../../src/utils/code-tools/codex')
      const result = needsEnvKeyMigration()

      expect(result).toBe(true)
    })

    it('should return false when config already has temp_env_key', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue(`
[model_providers.test]
name = "Test Provider"
base_url = "https://test.com"
wire_api = "responses"
temp_env_key = "TEST_API_KEY"
requires_openai_auth = true
`)

      const { needsEnvKeyMigration } = await import('../../../../src/utils/code-tools/codex')
      const result = needsEnvKeyMigration()

      expect(result).toBe(false)
    })

    it('should return true when config has both env_key and temp_env_key (mixed state needs migration)', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue(`
[model_providers.test]
name = "Test Provider"
env_key = "OLD_KEY"
temp_env_key = "NEW_KEY"

[model_providers.another]
name = "Another Provider"
env_key = "ANOTHER_OLD_KEY"
`)

      const { needsEnvKeyMigration } = await import('../../../../src/utils/code-tools/codex')
      const result = needsEnvKeyMigration()

      // Should return true because there are still env_key entries that need migration
      expect(result).toBe(true)
    })

    it('should handle file read errors gracefully', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockImplementation(() => {
        throw new Error('File read error')
      })

      const { needsEnvKeyMigration } = await import('../../../../src/utils/code-tools/codex')
      const result = needsEnvKeyMigration()

      expect(result).toBe(false)
    })
  })

  describe('migrateEnvKeyToTempEnvKey', () => {
    it('should return false when config file does not exist', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const { migrateEnvKeyToTempEnvKey } = await import('../../../../src/utils/code-tools/codex')
      const result = migrateEnvKeyToTempEnvKey()

      expect(result).toBe(false)
    })

    it('should return false when migration is not needed', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue(`
[model_providers.test]
temp_env_key = "TEST_API_KEY"
`)

      const { migrateEnvKeyToTempEnvKey } = await import('../../../../src/utils/code-tools/codex')
      const result = migrateEnvKeyToTempEnvKey()

      expect(result).toBe(false)
    })

    it('should migrate env_key to temp_env_key successfully', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue(`
[model_providers.test]
name = "Test Provider"
base_url = "https://test.com"
wire_api = "responses"
env_key = "TEST_API_KEY"
requires_openai_auth = true
`)
      vi.mocked(fsOps.copyFile).mockImplementation(() => {})
      vi.mocked(fsOps.ensureDir).mockImplementation(() => {})

      const writeFileMock = vi.mocked(fsOps.writeFile)
      writeFileMock.mockImplementation(() => {})

      const zcfConfig = await import('../../../../src/utils/zcf-config')
      vi.mocked(zcfConfig.updateTomlConfig).mockImplementation(() => ({} as any))

      const { migrateEnvKeyToTempEnvKey } = await import('../../../../src/utils/code-tools/codex')
      const result = migrateEnvKeyToTempEnvKey()

      expect(result).toBe(true)

      // Verify the file was written with temp_env_key
      expect(writeFileMock).toHaveBeenCalled()
      const writtenContent = writeFileMock.mock.calls[0][1] as string
      expect(writtenContent).toContain('temp_env_key = "TEST_API_KEY"')
      expect(writtenContent).not.toMatch(/^env_key\s*=/m)

      // Verify ZCF config was updated to mark migration complete
      expect(zcfConfig.updateTomlConfig).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          codex: expect.objectContaining({
            envKeyMigrated: true,
          }),
        }),
      )
    })

    it('should create backup before migration', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue(`
[model_providers.test]
env_key = "TEST_API_KEY"
`)
      vi.mocked(fsOps.ensureDir).mockImplementation(() => {})

      const copyFileMock = vi.mocked(fsOps.copyFile)
      copyFileMock.mockImplementation(() => {})
      vi.mocked(fsOps.writeFile).mockImplementation(() => {})

      const zcfConfig = await import('../../../../src/utils/zcf-config')
      vi.mocked(zcfConfig.updateTomlConfig).mockImplementation(() => ({} as any))

      const { migrateEnvKeyToTempEnvKey } = await import('../../../../src/utils/code-tools/codex')
      migrateEnvKeyToTempEnvKey()

      // Verify backup was created
      expect(copyFileMock).toHaveBeenCalled()
    })

    it('should handle multiple providers in the config', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue(`
[model_providers.provider1]
name = "Provider 1"
env_key = "PROVIDER1_API_KEY"

[model_providers.provider2]
name = "Provider 2"
env_key = "PROVIDER2_API_KEY"

[model_providers.provider3]
name = "Provider 3"
env_key = "PROVIDER3_API_KEY"
`)
      vi.mocked(fsOps.ensureDir).mockImplementation(() => {})
      vi.mocked(fsOps.copyFile).mockImplementation(() => {})

      const writeFileMock = vi.mocked(fsOps.writeFile)
      writeFileMock.mockImplementation(() => {})

      const zcfConfig = await import('../../../../src/utils/zcf-config')
      vi.mocked(zcfConfig.updateTomlConfig).mockImplementation(() => ({} as any))

      const { migrateEnvKeyToTempEnvKey } = await import('../../../../src/utils/code-tools/codex')
      const result = migrateEnvKeyToTempEnvKey()

      expect(result).toBe(true)

      // Verify all env_key fields were migrated
      const writtenContent = writeFileMock.mock.calls[0][1] as string
      expect(writtenContent).toContain('temp_env_key = "PROVIDER1_API_KEY"')
      expect(writtenContent).toContain('temp_env_key = "PROVIDER2_API_KEY"')
      expect(writtenContent).toContain('temp_env_key = "PROVIDER3_API_KEY"')
      expect(writtenContent).not.toMatch(/^env_key\s*=/m)
    })

    it('should migrate all env_key entries even when some providers already use temp_env_key', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue(`
[model_providers.migrated]
name = "Migrated Provider"
temp_env_key = "MIGRATED_API_KEY"

[model_providers.old1]
name = "Old Provider 1"
env_key = "OLD1_API_KEY"

[model_providers.old2]
name = "Old Provider 2"
env_key = "OLD2_API_KEY"
`)
      vi.mocked(fsOps.ensureDir).mockImplementation(() => {})
      vi.mocked(fsOps.copyFile).mockImplementation(() => {})

      const writeFileMock = vi.mocked(fsOps.writeFile)
      writeFileMock.mockImplementation(() => {})

      const zcfConfig = await import('../../../../src/utils/zcf-config')
      vi.mocked(zcfConfig.updateTomlConfig).mockImplementation(() => ({} as any))

      const { migrateEnvKeyToTempEnvKey } = await import('../../../../src/utils/code-tools/codex')
      const result = migrateEnvKeyToTempEnvKey()

      expect(result).toBe(true)

      // Verify all env_key fields were migrated to temp_env_key
      const writtenContent = writeFileMock.mock.calls[0][1] as string
      expect(writtenContent).toContain('temp_env_key = "MIGRATED_API_KEY"') // Already migrated, should remain
      expect(writtenContent).toContain('temp_env_key = "OLD1_API_KEY"') // Should be migrated
      expect(writtenContent).toContain('temp_env_key = "OLD2_API_KEY"') // Should be migrated
      // Verify no env_key entries remain
      expect(writtenContent).not.toMatch(/^env_key\s*=/m)
    })

    it('should remove env_key without creating duplicate when provider already has temp_env_key (mixed state)', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      // This simulates a manually edited config with both old and new keys in the same section
      vi.mocked(fsOps.readFile).mockReturnValue(`
[model_providers.mixed]
name = "Mixed Provider"
env_key = "OLD_KEY"
temp_env_key = "NEW_KEY"

[model_providers.old_only]
name = "Old Only Provider"
env_key = "OLD_ONLY_KEY"

[model_providers.new_only]
name = "New Only Provider"
temp_env_key = "NEW_ONLY_KEY"
`)
      vi.mocked(fsOps.ensureDir).mockImplementation(() => {})
      vi.mocked(fsOps.copyFile).mockImplementation(() => {})

      const writeFileMock = vi.mocked(fsOps.writeFile)
      writeFileMock.mockImplementation(() => {})

      const zcfConfig = await import('../../../../src/utils/zcf-config')
      vi.mocked(zcfConfig.updateTomlConfig).mockImplementation(() => ({} as any))

      const { migrateEnvKeyToTempEnvKey } = await import('../../../../src/utils/code-tools/codex')
      const result = migrateEnvKeyToTempEnvKey()

      expect(result).toBe(true)

      const writtenContent = writeFileMock.mock.calls[0][1] as string

      // Mixed provider: env_key should be removed, temp_env_key should remain (no duplicates)
      expect(writtenContent).toContain('temp_env_key = "NEW_KEY"')
      // Ensure there's only ONE temp_env_key in the mixed section (no duplicate from env_key conversion)
      const mixedSectionMatch = writtenContent.match(/\[model_providers\.mixed\][\s\S]*?(?=\[|$)/)
      expect(mixedSectionMatch).not.toBeNull()
      const mixedSection = mixedSectionMatch![0]
      const tempEnvKeyCount = (mixedSection.match(/temp_env_key/g) || []).length
      expect(tempEnvKeyCount).toBe(1) // Only one temp_env_key, not two

      // Old only provider: env_key should be converted to temp_env_key
      expect(writtenContent).toContain('temp_env_key = "OLD_ONLY_KEY"')

      // New only provider: should remain unchanged
      expect(writtenContent).toContain('temp_env_key = "NEW_ONLY_KEY"')

      // Verify no env_key entries remain anywhere
      expect(writtenContent).not.toMatch(/^\s*env_key\s*=/m)
    })
  })

  describe('migrateEnvKeyInContent', () => {
    it('should handle empty content', async () => {
      const { migrateEnvKeyInContent } = await import('../../../../src/utils/code-tools/codex')
      const result = migrateEnvKeyInContent('')
      expect(result).toBe('')
    })

    it('should handle content without any env_key', async () => {
      const { migrateEnvKeyInContent } = await import('../../../../src/utils/code-tools/codex')
      const content = `
[model_providers.test]
name = "Test"
temp_env_key = "TEST_KEY"
`
      const result = migrateEnvKeyInContent(content)
      expect(result).toBe(content)
    })

    it('should convert env_key to temp_env_key when no temp_env_key exists', async () => {
      const { migrateEnvKeyInContent } = await import('../../../../src/utils/code-tools/codex')
      const content = `
[model_providers.test]
name = "Test"
env_key = "TEST_KEY"
`
      const result = migrateEnvKeyInContent(content)
      expect(result).toContain('temp_env_key = "TEST_KEY"')
      expect(result).not.toMatch(/^\s*env_key\s*=/m)
    })

    it('should remove env_key line when temp_env_key already exists in same section', async () => {
      const { migrateEnvKeyInContent } = await import('../../../../src/utils/code-tools/codex')
      const content = `
[model_providers.test]
name = "Test"
env_key = "OLD_KEY"
temp_env_key = "NEW_KEY"
`
      const result = migrateEnvKeyInContent(content)
      // Should have only one temp_env_key line, the existing one
      expect(result).toContain('temp_env_key = "NEW_KEY"')
      expect(result).not.toContain('env_key = "OLD_KEY"')
      const tempEnvKeyCount = (result.match(/temp_env_key/g) || []).length
      expect(tempEnvKeyCount).toBe(1)
    })

    it('should handle multiple sections with different states', async () => {
      const { migrateEnvKeyInContent } = await import('../../../../src/utils/code-tools/codex')
      const content = `
[model_providers.section1]
name = "Section 1"
env_key = "OLD1"
temp_env_key = "NEW1"

[model_providers.section2]
name = "Section 2"
env_key = "OLD2"

[model_providers.section3]
name = "Section 3"
temp_env_key = "NEW3"
`
      const result = migrateEnvKeyInContent(content)

      // Section 1: env_key removed, temp_env_key preserved
      expect(result).toContain('temp_env_key = "NEW1"')
      expect(result).not.toContain('env_key = "OLD1"')

      // Section 2: env_key converted to temp_env_key
      expect(result).toContain('temp_env_key = "OLD2"')

      // Section 3: unchanged
      expect(result).toContain('temp_env_key = "NEW3"')

      // No env_key should remain
      expect(result).not.toMatch(/^\s*env_key\s*=/m)
    })

    it('should preserve indentation when converting env_key', async () => {
      const { migrateEnvKeyInContent } = await import('../../../../src/utils/code-tools/codex')
      const content = `
[model_providers.test]
name = "Test"
  env_key = "TEST_KEY"
`
      const result = migrateEnvKeyInContent(content)
      expect(result).toContain('  temp_env_key = "TEST_KEY"')
    })
  })

  describe('ensureEnvKeyMigration', () => {
    it('should skip migration when already migrated', async () => {
      const zcfConfig = await import('../../../../src/utils/zcf-config')
      vi.mocked(zcfConfig.readDefaultTomlConfig).mockReturnValue({
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        general: {
          preferredLang: 'en',
          currentTool: 'codex',
        },
        claudeCode: {
          enabled: false,
          outputStyles: [],
          installType: 'global',
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'engineer-professional',
          envKeyMigrated: true, // Already migrated
        },
      })

      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue(`
[model_providers.test]
env_key = "TEST_API_KEY"
`)

      const { ensureEnvKeyMigration } = await import('../../../../src/utils/code-tools/codex')
      ensureEnvKeyMigration()

      // Should not attempt to write file since already migrated
      expect(fsOps.writeFile).not.toHaveBeenCalled()
    })

    it('should perform migration when not yet migrated', async () => {
      const zcfConfig = await import('../../../../src/utils/zcf-config')
      vi.mocked(zcfConfig.readDefaultTomlConfig).mockReturnValue({
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        general: {
          preferredLang: 'en',
          currentTool: 'codex',
        },
        claudeCode: {
          enabled: false,
          outputStyles: [],
          installType: 'global',
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'engineer-professional',
          // envKeyMigrated not set
        },
      })
      vi.mocked(zcfConfig.updateTomlConfig).mockImplementation(() => ({} as any))

      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue(`
[model_providers.test]
env_key = "TEST_API_KEY"
`)
      vi.mocked(fsOps.ensureDir).mockImplementation(() => {})
      vi.mocked(fsOps.copyFile).mockImplementation(() => {})
      vi.mocked(fsOps.writeFile).mockImplementation(() => {})

      const { ensureEnvKeyMigration } = await import('../../../../src/utils/code-tools/codex')
      ensureEnvKeyMigration()

      // Should write migrated content
      expect(fsOps.writeFile).toHaveBeenCalled()
    })

    it('should skip migration when no config file exists', async () => {
      const zcfConfig = await import('../../../../src/utils/zcf-config')
      vi.mocked(zcfConfig.readDefaultTomlConfig).mockReturnValue(null)

      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const { ensureEnvKeyMigration } = await import('../../../../src/utils/code-tools/codex')
      ensureEnvKeyMigration()

      // Should not attempt any file operations
      expect(fsOps.writeFile).not.toHaveBeenCalled()
    })
  })

  describe('parseCodexConfig with temp_env_key', () => {
    it('should parse temp_env_key field correctly', async () => {
      const { parseCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      const configWithTempEnvKey = `
[model_providers.test]
name = "Test Provider"
base_url = "https://test.com"
wire_api = "responses"
temp_env_key = "TEST_API_KEY"
requires_openai_auth = true
`
      const result = parseCodexConfig(configWithTempEnvKey)

      expect(result.providers).toHaveLength(1)
      expect(result.providers[0].tempEnvKey).toBe('TEST_API_KEY')
    })

    it('should default tempEnvKey to OPENAI_API_KEY when not specified', async () => {
      const { parseCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      const configWithoutEnvKey = `
[model_providers.test]
name = "Test Provider"
base_url = "https://test.com"
wire_api = "responses"
requires_openai_auth = true
`
      const result = parseCodexConfig(configWithoutEnvKey)

      expect(result.providers).toHaveLength(1)
      expect(result.providers[0].tempEnvKey).toBe('OPENAI_API_KEY')
    })
  })

  describe('renderCodexConfig with temp_env_key', () => {
    it('should render temp_env_key field correctly', async () => {
      const { renderCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      const config = {
        model: null,
        modelProvider: 'test',
        providers: [{
          id: 'test',
          name: 'Test Provider',
          baseUrl: 'https://test.com',
          wireApi: 'responses',
          tempEnvKey: 'TEST_API_KEY',
          requiresOpenaiAuth: true,
        }],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      }

      const result = renderCodexConfig(config)

      expect(result).toContain('temp_env_key = "TEST_API_KEY"')
      // Verify no standalone 'env_key' (without 'temp_' prefix) exists
      expect(result).not.toMatch(/\benv_key\s*=/)
    })
  })

  describe('integration with config operations', () => {
    it('readCodexConfig should trigger migration before reading', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue(`
[model_providers.test]
env_key = "TEST_API_KEY"
`)
      vi.mocked(fsOps.ensureDir).mockImplementation(() => {})
      vi.mocked(fsOps.copyFile).mockImplementation(() => {})
      vi.mocked(fsOps.writeFile).mockImplementation(() => {})

      const zcfConfig = await import('../../../../src/utils/zcf-config')
      vi.mocked(zcfConfig.readDefaultTomlConfig).mockReturnValue({
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        general: {
          preferredLang: 'en',
          currentTool: 'codex',
        },
        claudeCode: {
          enabled: false,
          outputStyles: [],
          installType: 'global',
        },
        codex: {
          enabled: true,
          systemPromptStyle: 'engineer-professional',
          // Not migrated yet
        },
      })
      vi.mocked(zcfConfig.updateTomlConfig).mockImplementation(() => ({} as any))

      const { readCodexConfig } = await import('../../../../src/utils/code-tools/codex')
      readCodexConfig()

      // Migration should have been triggered
      expect(zcfConfig.updateTomlConfig).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          codex: expect.objectContaining({
            envKeyMigrated: true,
          }),
        }),
      )
    })
  })

  describe('getBackupMessage', () => {
    it('should return fallback message when i18n is not initialized', async () => {
      // Clear module cache to re-import with new mock
      vi.resetModules()

      // Mock i18n as not initialized
      vi.doMock('../../../../src/i18n', () => ({
        i18n: {
          t: (key: string) => key,
          isInitialized: false,
          language: 'en',
        },
        ensureI18nInitialized: vi.fn(),
      }))

      vi.doMock('../../../../src/utils/fs-operations', () => ({
        ensureDir: vi.fn(),
        copyDir: vi.fn(),
        copyFile: vi.fn(),
        exists: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
      }))

      vi.doMock('../../../../src/utils/json-config', () => ({
        readJsonConfig: vi.fn(),
        writeJsonConfig: vi.fn(),
      }))

      vi.doMock('../../../../src/utils/zcf-config', () => ({
        readZcfConfig: vi.fn(),
        updateZcfConfig: vi.fn(),
        updateTomlConfig: vi.fn(),
        readDefaultTomlConfig: vi.fn(),
      }))

      vi.doMock('node:os', () => ({
        homedir: () => '/home/test',
        platform: () => 'linux',
      }))

      const { getBackupMessage } = await import('../../../../src/utils/code-tools/codex')

      const result = getBackupMessage('/test/backup/path')

      // Should return fallback message without throwing
      expect(result).toBe('Backup created: /test/backup/path')
    })

    it('should return empty string for null path regardless of i18n state', async () => {
      const { getBackupMessage } = await import('../../../../src/utils/code-tools/codex')

      const result = getBackupMessage(null)

      expect(result).toBe('')
    })

    it('should return translated message when i18n is initialized', async () => {
      // Clear module cache to re-import with new mock
      vi.resetModules()

      // Mock i18n as initialized
      vi.doMock('../../../../src/i18n', () => ({
        i18n: {
          t: (key: string, params?: Record<string, string>) => {
            if (key === 'codex:backupSuccess' && params?.path) {
              return `✔ Backup created at ${params.path}`
            }
            return key
          },
          isInitialized: true,
          language: 'en',
        },
        ensureI18nInitialized: vi.fn(),
      }))

      vi.doMock('../../../../src/utils/fs-operations', () => ({
        ensureDir: vi.fn(),
        copyDir: vi.fn(),
        copyFile: vi.fn(),
        exists: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
      }))

      vi.doMock('../../../../src/utils/json-config', () => ({
        readJsonConfig: vi.fn(),
        writeJsonConfig: vi.fn(),
      }))

      vi.doMock('../../../../src/utils/zcf-config', () => ({
        readZcfConfig: vi.fn(),
        updateZcfConfig: vi.fn(),
        updateTomlConfig: vi.fn(),
        readDefaultTomlConfig: vi.fn(),
      }))

      vi.doMock('node:os', () => ({
        homedir: () => '/home/test',
        platform: () => 'linux',
      }))

      const { getBackupMessage } = await import('../../../../src/utils/code-tools/codex')

      const result = getBackupMessage('/test/backup/path')

      // Should return translated message
      expect(result).toBe('✔ Backup created at /test/backup/path')
    })
  })
})
