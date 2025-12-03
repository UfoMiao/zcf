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

    it('should return false when config has both env_key and temp_env_key', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue(`
[model_providers.test]
name = "Test Provider"
env_key = "OLD_KEY"
temp_env_key = "NEW_KEY"
`)

      const { needsEnvKeyMigration } = await import('../../../../src/utils/code-tools/codex')
      const result = needsEnvKeyMigration()

      expect(result).toBe(false)
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
    it('writeCodexConfig should trigger migration before writing', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue(`
[model_providers.old]
env_key = "OLD_API_KEY"
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

      const { writeCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      const newConfig = {
        model: null,
        modelProvider: 'new',
        providers: [{
          id: 'new',
          name: 'New Provider',
          baseUrl: 'https://new.com',
          wireApi: 'responses',
          tempEnvKey: 'NEW_API_KEY',
          requiresOpenaiAuth: true,
        }],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      }

      writeCodexConfig(newConfig)

      // Migration should have been triggered (updateTomlConfig called with envKeyMigrated)
      expect(zcfConfig.updateTomlConfig).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          codex: expect.objectContaining({
            envKeyMigrated: true,
          }),
        }),
      )
    })

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
})
