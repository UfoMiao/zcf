import type { ClaudeCodeProfile } from '../../../src/types/claude-code-config'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const testConfigDir = mkdtempSync(join(tmpdir(), 'zcf-config-manager-test-'))
const testConfigFile = join(testConfigDir, 'config.toml')
const testSettingsFile = join(testConfigDir, 'settings.json')

vi.mock('../../../src/constants', async () => {
  const actual = await vi.importActual<typeof import('../../../src/constants')>('../../../src/constants')
  return {
    ...actual,
    ZCF_CONFIG_DIR: testConfigDir,
    ZCF_CONFIG_FILE: testConfigFile,
    SETTINGS_FILE: testSettingsFile,
  }
})

const mockEnsureI18nInitialized = vi.fn()
const mockI18nT = vi.fn((key: string, params?: Record<string, any>) => {
  if (!params) {
    return key
  }
  return Object.keys(params).reduce<string>((acc, paramKey) => {
    return acc.replace(`{${paramKey}}`, String(params[paramKey]))
  }, key)
})

vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: mockEnsureI18nInitialized,
  i18n: {
    t: mockI18nT,
  },
}))

const mockSwitchToOfficialLogin = vi.fn()

vi.mock('../../../src/utils/config', () => ({
  switchToOfficialLogin: mockSwitchToOfficialLogin,
}))

const mockReadJsonConfig = vi.fn()
const mockWriteJsonConfig = vi.fn()

vi.mock('../../../src/utils/json-config', async () => {
  const actual = await vi.importActual<typeof import('../../../src/utils/json-config')>('../../../src/utils/json-config')
  if (!mockReadJsonConfig.getMockImplementation()) {
    mockReadJsonConfig.mockImplementation(actual.readJsonConfig)
  }
  if (!mockWriteJsonConfig.getMockImplementation()) {
    mockWriteJsonConfig.mockImplementation(actual.writeJsonConfig)
  }
  return {
    ...actual,
    readJsonConfig: mockReadJsonConfig,
    writeJsonConfig: mockWriteJsonConfig,
  }
})

const mockSetPrimaryApiKey = vi.fn()
const mockAddCompletedOnboarding = vi.fn()

vi.mock('../../../src/utils/claude-config', () => ({
  setPrimaryApiKey: mockSetPrimaryApiKey,
  addCompletedOnboarding: mockAddCompletedOnboarding,
}))

const mockRunCcrRestart = vi.fn()

const { ClaudeCodeConfigManager } = await import('../../../src/utils/claude-code-config-manager')

function cleanConfigDir(): void {
  if (!existsSync(testConfigDir)) {
    return
  }

  for (const entry of readdirSync(testConfigDir)) {
    rmSync(join(testConfigDir, entry), { force: true, recursive: true })
  }
}

afterAll(() => {
  cleanConfigDir()
  rmSync(testConfigDir, { force: true, recursive: true })
})

// Mock dependencies
const mockReadCcrConfig = vi.fn()
vi.mock('../../../src/utils/ccr/config', () => ({
  readCcrConfig: mockReadCcrConfig,
}))

vi.mock('../../../src/utils/ccr/commands', () => ({
  runCcrRestart: mockRunCcrRestart,
}))

describe('claudeCodeConfigManager', () => {
  beforeEach(() => {
    cleanConfigDir()
    vi.clearAllMocks()
    mockReadJsonConfig.mockImplementation((path: string) => {
      if (!existsSync(path)) {
        return null
      }
      const content = readFileSync(path, 'utf8')
      try {
        return JSON.parse(content)
      }
      catch {
        return null
      }
    })
    mockWriteJsonConfig.mockImplementation((path: string, data: any) => {
      writeFileSync(path, JSON.stringify(data, null, 2))
    })
    mockReadCcrConfig.mockReturnValue(null)
  })

  afterEach(() => {
    cleanConfigDir()
  })

  describe('基础操作', () => {
    it('应该创建默认配置', () => {
      const config = ClaudeCodeConfigManager.createEmptyConfig()

      expect(config).toEqual({
        currentProfileId: '',
        profiles: {},
      })
    })

    it('应该读取不存在的配置返回null', () => {
      const config = ClaudeCodeConfigManager.readConfig()
      expect(config).toBeNull()
    })

    it('应该写入和读取配置', () => {
      const testConfig = {
        currentProfileId: 'test-profile',
        profiles: {
          'test-profile': {
            name: 'Test Profile',
            authType: 'api_key' as const,
            apiKey: 'test-key',
          },
        },
      }

      ClaudeCodeConfigManager.writeConfig(testConfig)
      const readConfig = ClaudeCodeConfigManager.readConfig()

      expect(readConfig).toEqual({
        currentProfileId: 'test-profile',
        profiles: {
          'test-profile': {
            name: 'Test Profile',
            authType: 'api_key',
            apiKey: 'test-key',
            id: 'test-profile',
          },
        },
      })
    })

    it('应该备份配置', () => {
      const testConfig = ClaudeCodeConfigManager.createEmptyConfig()
      testConfig.profiles.test = {
        id: 'test',
        name: 'Test',
        authType: 'api_key',
        apiKey: 'test-key',
      }

      ClaudeCodeConfigManager.writeConfig(testConfig)
      const backupPath = ClaudeCodeConfigManager.backupConfig()

      expect(backupPath).toBeTruthy()
      expect(backupPath).toContain('config.backup.')
      expect(existsSync(backupPath!)).toBe(true)
    })
  })

  describe('legacy migration', () => {
    it('应该从旧版JSON配置迁移并保持唯一ID', () => {
      const legacyPath = join(testConfigDir, 'claude-code-configs.json')
      const legacyData = {
        currentProfileId: 'Primary Profile',
        profiles: {
          legacy1: {
            name: 'Primary Profile',
            authType: 'api_key',
            apiKey: 'sk-primary',
          },
          legacy2: {
            name: 'Primary Profile',
            authType: 'auth_token',
            apiKey: 'token-primary',
          },
        },
      }
      writeFileSync(legacyPath, JSON.stringify(legacyData, null, 2))

      const migrated = (ClaudeCodeConfigManager as any).migrateFromLegacyConfig() as any

      expect(migrated).toBeTruthy()
      const migratedProfiles = Object.values(migrated!.profiles) as ClaudeCodeProfile[]
      expect(migratedProfiles).toHaveLength(2)
      expect(new Set(migratedProfiles.map(profile => profile.id)).size).toBe(2)
      expect(migratedProfiles.every(profile => profile.name === 'Primary Profile')).toBe(true)

      const persisted = ClaudeCodeConfigManager.readConfig()
      expect(persisted?.profiles).toBeTruthy()
      expect(persisted?.profiles['primary-profile']).toBeTruthy()
      expect(persisted?.profiles['primary-profile']?.name).toBe('Primary Profile')
    })

    it('应该在迁移失败时返回null', () => {
      const legacyPath = join(testConfigDir, 'claude-code-configs.json')
      writeFileSync(legacyPath, 'invalid-json')
      mockReadJsonConfig.mockImplementation(() => {
        throw new Error('bad legacy file')
      })
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const migrated = (ClaudeCodeConfigManager as any).migrateFromLegacyConfig()

      expect(migrated).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to migrate legacy Claude Code config:',
        expect.any(Error),
      )

      consoleErrorSpy.mockRestore()
      mockReadJsonConfig.mockImplementation((path: string) => {
        if (!existsSync(path)) {
          return null
        }
        const content = readFileSync(path, 'utf8')
        return JSON.parse(content)
      })
    })
  })

  describe('writeConfig', () => {
    it('应该在写入失败时抛出明确错误', () => {
      // Mock console.error to suppress error output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const loadSpy = vi.spyOn(ClaudeCodeConfigManager as any, 'loadTomlConfig').mockImplementation(() => {
        throw new Error('load failed')
      })

      expect(() => ClaudeCodeConfigManager.writeConfig(ClaudeCodeConfigManager.createEmptyConfig()))
        .toThrow('Failed to write config: load failed')

      loadSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('applyProfileSettings', () => {
    it('配置为空时应该切换到官方登录', async () => {
      await ClaudeCodeConfigManager.applyProfileSettings(null)

      expect(mockEnsureI18nInitialized).toHaveBeenCalled()
      expect(mockSwitchToOfficialLogin).toHaveBeenCalled()
    })

    it('api_key 模式应该写入API Key并清理旧Token', async () => {
      const settings = { env: { ANTHROPIC_AUTH_TOKEN: 'old-token', ANTHROPIC_BASE_URL: 'https://old.example.com' } }
      mockReadJsonConfig.mockImplementationOnce(() => settings)
      let writtenSettings: any
      mockWriteJsonConfig.mockImplementationOnce((_path, data) => {
        writtenSettings = data
      })

      await ClaudeCodeConfigManager.applyProfileSettings({
        id: 'test',
        name: 'Test',
        authType: 'api_key',
        apiKey: 'sk-new',
      })

      expect(writtenSettings.env.ANTHROPIC_API_KEY).toBe('sk-new')
      expect(writtenSettings.env.ANTHROPIC_AUTH_TOKEN).toBeUndefined()
      expect(writtenSettings.env.ANTHROPIC_BASE_URL).toBeUndefined()
      expect(mockSetPrimaryApiKey).toHaveBeenCalled()
      expect(mockAddCompletedOnboarding).toHaveBeenCalled()
      expect(mockRunCcrRestart).not.toHaveBeenCalled()
    })

    it('auth_token 模式应该写入Token并清理API Key', async () => {
      const settings = { env: { ANTHROPIC_API_KEY: 'old-key', ANTHROPIC_BASE_URL: 'https://custom.example.com' } }
      mockReadJsonConfig.mockImplementationOnce(() => settings)
      let writtenSettings: any
      mockWriteJsonConfig.mockImplementationOnce((_path, data) => {
        writtenSettings = data
      })

      await ClaudeCodeConfigManager.applyProfileSettings({
        id: 'token-profile',
        name: 'Token profile',
        authType: 'auth_token',
        apiKey: 'token-xyz',
        baseUrl: 'https://api.anthropic.com',
      })

      expect(writtenSettings.env.ANTHROPIC_AUTH_TOKEN).toBe('token-xyz')
      expect(writtenSettings.env.ANTHROPIC_API_KEY).toBeUndefined()
      expect(writtenSettings.env.ANTHROPIC_BASE_URL).toBe('https://api.anthropic.com')
      expect(mockSetPrimaryApiKey).toHaveBeenCalled()
      expect(mockAddCompletedOnboarding).toHaveBeenCalled()
      expect(mockRunCcrRestart).not.toHaveBeenCalled()
    })

    it('ccr_proxy 模式应该读取CCR配置并触发重启', async () => {
      mockReadCcrConfig.mockReturnValue({
        HOST: '10.0.0.2',
        PORT: 7000,
        APIKEY: 'sk-ccr',
      })
      mockReadJsonConfig.mockImplementationOnce(() => ({ env: {} }))
      let writtenSettings: any
      mockWriteJsonConfig.mockImplementationOnce((_path, data) => {
        writtenSettings = data
      })

      await ClaudeCodeConfigManager.applyProfileSettings({
        id: 'ccr',
        name: 'CCR',
        authType: 'ccr_proxy',
      })

      expect(writtenSettings.env.ANTHROPIC_BASE_URL).toBe('http://10.0.0.2:7000')
      expect(writtenSettings.env.ANTHROPIC_API_KEY).toBe('sk-ccr')
      expect(mockSetPrimaryApiKey).toHaveBeenCalled()
      expect(mockAddCompletedOnboarding).toHaveBeenCalled()
      expect(mockRunCcrRestart).toHaveBeenCalled()
    })

    it('ccr_proxy 模式缺少配置时应该抛出错误', async () => {
      mockReadCcrConfig.mockReturnValue(null)

      await expect(ClaudeCodeConfigManager.applyProfileSettings({
        id: 'ccr',
        name: 'CCR',
        authType: 'ccr_proxy',
      })).rejects.toThrow('multi-config:failedToApplySettings: ccr:ccrNotConfigured')
    })

    it('写入设置失败时应该抛出包装错误', async () => {
      mockReadJsonConfig.mockImplementationOnce(() => ({ env: {} }))
      mockWriteJsonConfig.mockImplementationOnce(() => {
        throw new Error('write failed')
      })

      await expect(ClaudeCodeConfigManager.applyProfileSettings({
        id: 'test',
        name: 'Test',
        authType: 'api_key',
        apiKey: 'sk-error',
      })).rejects.toThrow('multi-config:failedToApplySettings: write failed')
    })
  })

  describe('addProfile', () => {
    it('应该成功添加新配置并返回新增配置', async () => {
      const profile: ClaudeCodeProfile = {
        name: 'Test Profile',
        authType: 'api_key',
        apiKey: 'test-api-key',
        baseUrl: 'https://api.anthropic.com',
      }

      const result = await ClaudeCodeConfigManager.addProfile(profile)

      expect(result.success).toBe(true)
      expect(result.addedProfile).toMatchObject({
        name: 'Test Profile',
        authType: 'api_key',
        id: 'test-profile',
      })

      const config = ClaudeCodeConfigManager.readConfig()
      expect(config?.profiles['test-profile']).toEqual({
        name: 'Test Profile',
        authType: 'api_key',
        apiKey: 'test-api-key',
        baseUrl: 'https://api.anthropic.com',
        id: 'test-profile',
      })
      expect(config?.currentProfileId).toBe('test-profile')
      expect(config?.profiles['test-profile']).not.toHaveProperty('description')
    })

    it('应该处理重复名称', async () => {
      const profile1: ClaudeCodeProfile = {
        name: 'Profile 1',
        authType: 'api_key',
        apiKey: 'key1',
      }

      const profile2: ClaudeCodeProfile = {
        name: 'Profile 1',
        authType: 'auth_token',
        apiKey: 'key2',
      }

      // 添加第一个配置
      await ClaudeCodeConfigManager.addProfile(profile1)

      // 尝试添加重复ID的配置
      const result = await ClaudeCodeConfigManager.addProfile(profile2)

      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })

    it('应该验证必填字段', async () => {
      const invalidProfile = {
        name: '',
        authType: 'invalid_type' as any,
      }

      const result = await ClaudeCodeConfigManager.addProfile(invalidProfile)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation failed')
    })

    it('应该阻止手动指定的重复ID', async () => {
      const baseProfile: ClaudeCodeProfile = {
        id: 'manual-id',
        name: 'Manual',
        authType: 'api_key',
        apiKey: 'first-key',
      }

      await ClaudeCodeConfigManager.addProfile(baseProfile)
      const secondAttempt = await ClaudeCodeConfigManager.addProfile({
        ...baseProfile,
        apiKey: 'second-key',
      })

      expect(secondAttempt.success).toBe(false)
      expect(secondAttempt.error).toContain('already exists')
    })

    it('写入失败时应该返回错误信息', async () => {
      const writeSpy = vi.spyOn(ClaudeCodeConfigManager as any, 'writeConfig').mockImplementation(() => {
        throw new Error('persist failed')
      })

      const result = await ClaudeCodeConfigManager.addProfile({
        name: 'Failure Profile',
        authType: 'api_key',
        apiKey: 'sk-fail',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('persist failed')

      writeSpy.mockRestore()
    })
  })

  describe('updateProfile', () => {
    beforeEach(async () => {
      // 添加一个测试配置
      const profile: ClaudeCodeProfile = {
        id: 'test-profile',
        name: 'Test Profile',
        authType: 'api_key',
        apiKey: 'test-key',
      }
      await ClaudeCodeConfigManager.addProfile(profile)
    })

    it('应该更新现有配置并返回更新后的配置', async () => {
      // 等待一毫秒确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 1))

      const updateData = {
        name: 'Updated Profile',
        baseUrl: 'https://updated.api.com',
      }

      const result = await ClaudeCodeConfigManager.updateProfile('test-profile', updateData)

      expect(result.success).toBe(true)
      expect(result.updatedProfile).toMatchObject({
        id: 'updated-profile',
        name: 'Updated Profile',
        baseUrl: 'https://updated.api.com',
      })
      expect(result.updatedProfile).not.toHaveProperty('description')

      const config = ClaudeCodeConfigManager.readConfig()
      const updatedProfile = config?.profiles['updated-profile']

      expect(updatedProfile?.name).toBe('Updated Profile')
      expect(updatedProfile?.baseUrl).toBe('https://updated.api.com')
      expect(updatedProfile?.id).toBe('updated-profile')
      expect(updatedProfile).not.toHaveProperty('description')
    })

    it('应该处理不存在的配置', async () => {
      const result = await ClaudeCodeConfigManager.updateProfile('non-existent', {
        name: 'Updated',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('应该防止更新ID', async () => {
      const result = await ClaudeCodeConfigManager.updateProfile('test-profile', {
        id: 'new-id',
      })

      expect(result.success).toBe(true)

      const config = ClaudeCodeConfigManager.readConfig()
      const profile = config?.profiles['test-profile']

      expect(profile?.id).toBe('test-profile') // ID不应该改变
    })

    it('应该在验证失败时返回错误信息', async () => {
      const result = await ClaudeCodeConfigManager.updateProfile('test-profile', {
        authType: 'invalid' as any,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation failed')
    })

    it('应该阻止名称冲突', async () => {
      await ClaudeCodeConfigManager.addProfile({
        name: 'Existing',
        authType: 'api_key',
        apiKey: 'sk-existing',
      })

      const result = await ClaudeCodeConfigManager.updateProfile('test-profile', {
        name: 'Existing',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })

    it('写入失败时应该返回错误信息', async () => {
      const writeSpy = vi.spyOn(ClaudeCodeConfigManager as any, 'writeConfig').mockImplementation(() => {
        throw new Error('update failed')
      })

      const result = await ClaudeCodeConfigManager.updateProfile('test-profile', {
        name: 'Still Test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('update failed')

      writeSpy.mockRestore()
    })
  })

  describe('deleteProfile', () => {
    beforeEach(async () => {
      // 添加两个测试配置
      const profile1: ClaudeCodeProfile = {
        name: 'profile1',
        authType: 'api_key',
        apiKey: 'key1',
      }

      const profile2: ClaudeCodeProfile = {
        name: 'profile2',
        authType: 'auth_token',
        apiKey: 'key2',
      }

      await ClaudeCodeConfigManager.addProfile(profile1)
      await ClaudeCodeConfigManager.addProfile(profile2)
    })

    it('应该删除配置', async () => {
      const result = await ClaudeCodeConfigManager.deleteProfile('profile1')

      expect(result.success).toBe(true)

      const config = ClaudeCodeConfigManager.readConfig()
      expect(config?.profiles.profile1).toBeUndefined()
      expect(config?.profiles.profile2).toBeDefined()
    })

    it('应该处理不存在的配置', async () => {
      const result = await ClaudeCodeConfigManager.deleteProfile('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('应该防止删除最后一个配置', async () => {
      // 先删除一个配置
      await ClaudeCodeConfigManager.deleteProfile('profile1')

      // 尝试删除最后一个配置
      const result = await ClaudeCodeConfigManager.deleteProfile('profile2')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot delete the last profile')
    })

    it('应该更新当前配置ID（如果删除的是当前配置）', async () => {
      // 确保profile1是当前配置
      await ClaudeCodeConfigManager.switchProfile('profile1')

      // 删除当前配置
      const result = await ClaudeCodeConfigManager.deleteProfile('profile1')

      expect(result.success).toBe(true)

      const config = ClaudeCodeConfigManager.readConfig()
      expect(config?.currentProfileId).toBe('profile2')
    })

    it('写入失败时应该返回错误信息', async () => {
      const writeSpy = vi.spyOn(ClaudeCodeConfigManager as any, 'writeConfig').mockImplementation(() => {
        throw new Error('delete failed')
      })

      const result = await ClaudeCodeConfigManager.deleteProfile('profile1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('delete failed')

      writeSpy.mockRestore()
    })

    it('应该在无配置时返回错误', async () => {
      cleanConfigDir()

      const result = await ClaudeCodeConfigManager.deleteProfiles(['profile1'])

      expect(result.success).toBe(false)
      expect(result.error).toBe('No configuration found')
    })

    it('批量删除写入失败时应该返回错误信息', async () => {
      const writeSpy = vi.spyOn(ClaudeCodeConfigManager as any, 'writeConfig').mockImplementation(() => {
        throw new Error('batch delete failed')
      })

      const result = await ClaudeCodeConfigManager.deleteProfiles(['profile1'])

      expect(result.success).toBe(false)
      expect(result.error).toBe('batch delete failed')

      writeSpy.mockRestore()
    })
  })

  describe('switchProfile', () => {
    beforeEach(async () => {
      const profile1: ClaudeCodeProfile = {
        name: 'profile1',
        authType: 'api_key',
        apiKey: 'key1',
      }

      const profile2: ClaudeCodeProfile = {
        name: 'profile2',
        authType: 'auth_token',
        apiKey: 'key2',
      }

      await ClaudeCodeConfigManager.addProfile(profile1)
      await ClaudeCodeConfigManager.addProfile(profile2)
    })

    it('应该切换到指定配置', async () => {
      const result = await ClaudeCodeConfigManager.switchProfile('profile2')

      expect(result.success).toBe(true)

      const config = ClaudeCodeConfigManager.readConfig()
      expect(config?.currentProfileId).toBe('profile2')
    })

    it('应该处理不存在的配置', async () => {
      const result = await ClaudeCodeConfigManager.switchProfile('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('应该处理已经是当前配置的情况', async () => {
      await ClaudeCodeConfigManager.switchProfile('profile1')

      const result = await ClaudeCodeConfigManager.switchProfile('profile1')

      expect(result.success).toBe(true)
    })

    it('写入失败时应该返回错误信息', async () => {
      const writeSpy = vi.spyOn(ClaudeCodeConfigManager as any, 'writeConfig').mockImplementation(() => {
        throw new Error('switch failed')
      })

      const result = await ClaudeCodeConfigManager.switchProfile('profile2')

      expect(result.success).toBe(false)
      expect(result.error).toBe('switch failed')

      writeSpy.mockRestore()
    })
  })

  describe('listProfiles', () => {
    it('应该返回空数组（无配置）', () => {
      const profiles = ClaudeCodeConfigManager.listProfiles()
      expect(profiles).toEqual([])
    })

    it('应该返回所有配置', async () => {
      const profile1: ClaudeCodeProfile = {
        name: 'profile1',
        authType: 'api_key',
        apiKey: 'key1',
      }

      const profile2: ClaudeCodeProfile = {
        name: 'profile2',
        authType: 'auth_token',
        apiKey: 'key2',
      }

      await ClaudeCodeConfigManager.addProfile(profile1)
      await ClaudeCodeConfigManager.addProfile(profile2)

      const profiles = ClaudeCodeConfigManager.listProfiles()
      expect(profiles).toHaveLength(2)
      expect(profiles.map(p => p.id)).toContain('profile1')
      expect(profiles.map(p => p.id)).toContain('profile2')
    })
  })

  describe('getCurrentProfile', () => {
    it('应该返回null（无配置）', () => {
      const current = ClaudeCodeConfigManager.getCurrentProfile()
      expect(current).toBeNull()
    })

    it('应该返回当前配置', async () => {
      const profile: ClaudeCodeProfile = {
        id: 'test-profile',
        name: 'Test Profile',
        authType: 'api_key',
        apiKey: 'test-key',
      }

      await ClaudeCodeConfigManager.addProfile(profile)

      const current = ClaudeCodeConfigManager.getCurrentProfile()
      expect(current?.id).toBe('test-profile')
      expect(current?.name).toBe('Test Profile')
    })
  })

  describe('getProfileById', () => {
    beforeEach(async () => {
      const profile: ClaudeCodeProfile = {
        id: 'test-profile',
        name: 'Test Profile',
        authType: 'api_key',
        apiKey: 'test-key',
      }
      await ClaudeCodeConfigManager.addProfile(profile)
    })

    it('应该返回存在的配置', () => {
      const profile = ClaudeCodeConfigManager.getProfileById('test-profile')
      expect(profile?.id).toBe('test-profile')
      expect(profile?.name).toBe('Test Profile')
    })

    it('应该返回null（不存在的配置）', () => {
      const profile = ClaudeCodeConfigManager.getProfileById('non-existent')
      expect(profile).toBeNull()
    })
  })

  describe('getProfileByName', () => {
    beforeEach(async () => {
      const profile: ClaudeCodeProfile = {
        id: 'test-profile',
        name: 'Test Profile',
        authType: 'api_key',
        apiKey: 'test-key',
      }
      await ClaudeCodeConfigManager.addProfile(profile)
    })

    it('应该返回存在的配置', () => {
      const profile = ClaudeCodeConfigManager.getProfileByName('Test Profile')
      expect(profile?.id).toBe('test-profile')
      expect(profile?.name).toBe('Test Profile')
    })

    it('应该返回null（不存在的配置）', () => {
      const profile = ClaudeCodeConfigManager.getProfileByName('Non-existent')
      expect(profile).toBeNull()
    })
  })

  describe('switchToOfficial', () => {
    beforeEach(async () => {
      const profile: ClaudeCodeProfile = {
        id: 'test-profile',
        name: 'Test Profile',
        authType: 'api_key',
        apiKey: 'test-key',
      }
      await ClaudeCodeConfigManager.addProfile(profile)
    })

    it('应该切换到官方登录', async () => {
      const result = await ClaudeCodeConfigManager.switchToOfficial()

      expect(result.success).toBe(true)

      const config = ClaudeCodeConfigManager.readConfig()
      expect(config?.currentProfileId).toBe('')
    })

    it('应该处理无配置的情况', async () => {
      // 清空配置
      cleanConfigDir()

      const result = await ClaudeCodeConfigManager.switchToOfficial()
      expect(result.success).toBe(true)
    })
  })

  describe('validateProfile', () => {
    it('应该验证有效配置', () => {
      const validProfile: ClaudeCodeProfile = {
        id: 'test-id',
        name: 'Test Name',
        authType: 'api_key',
        apiKey: 'test-key',
        baseUrl: 'https://api.example.com',
      }

      const errors = ClaudeCodeConfigManager.validateProfile(validProfile)
      expect(errors).toHaveLength(0)
    })

    it('应该检测无效字段', () => {
      const invalidProfile = {
        id: '',
        name: '',
        authType: 'invalid_type' as any,
        apiKey: '',
        baseUrl: 'invalid-url',
      }

      const errors = ClaudeCodeConfigManager.validateProfile(invalidProfile)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.includes('Profile name is required'))).toBe(true)
      expect(errors.some(e => e.includes('Invalid auth type'))).toBe(true)
    })

    it('应该要求API密钥（对于api_key和auth_token类型）', () => {
      const profileWithoutKey = {
        id: 'test-id',
        name: 'Test',
        authType: 'api_key' as const,
      }

      const errors = ClaudeCodeConfigManager.validateProfile(profileWithoutKey)
      expect(errors.some(e => e.includes('API key is required'))).toBe(true)
    })

    it('应该验证URL格式', () => {
      const profileWithInvalidUrl = {
        id: 'test-id',
        name: 'Test',
        authType: 'api_key' as const,
        apiKey: 'test-key',
        baseUrl: 'not-a-valid-url',
      }

      const errors = ClaudeCodeConfigManager.validateProfile(profileWithInvalidUrl)
      expect(errors.some(e => e.includes('Invalid base URL format'))).toBe(true)
    })
  })

  describe('generateProfileId', () => {
    it('应该生成稳定的标识', () => {
      const id1 = ClaudeCodeConfigManager.generateProfileId('Test Profile')
      const id2 = ClaudeCodeConfigManager.generateProfileId('Test Profile')

      expect(id1).toBe('test-profile')
      expect(id2).toBe('test-profile')
    })

    it('应该处理特殊字符', () => {
      const id = ClaudeCodeConfigManager.generateProfileId('Test@#$%^&*Profile')
      expect(id).toBe('test-profile')
    })
  })

  describe('deleteProfiles', () => {
    beforeEach(async () => {
      // 添加三个测试配置
      const profile1: ClaudeCodeProfile = {
        name: 'profile1',
        authType: 'api_key',
        apiKey: 'key1',
      }

      const profile2: ClaudeCodeProfile = {
        name: 'profile2',
        authType: 'auth_token',
        apiKey: 'key2',
      }

      const profile3: ClaudeCodeProfile = {
        name: 'profile3',
        authType: 'ccr_proxy',
      }

      await ClaudeCodeConfigManager.addProfile(profile1)
      await ClaudeCodeConfigManager.addProfile(profile2)
      await ClaudeCodeConfigManager.addProfile(profile3)
    })

    it('应该批量删除配置', async () => {
      const result = await ClaudeCodeConfigManager.deleteProfiles(['profile1', 'profile3'])

      expect(result.success).toBe(true)
      expect(result.deletedProfiles).toEqual(['profile1', 'profile3'])
      expect(result.remainingProfiles).toEqual([
        expect.objectContaining({ id: 'profile2' }),
      ])

      const config = ClaudeCodeConfigManager.readConfig()
      expect(config?.profiles.profile1).toBeUndefined()
      expect(config?.profiles.profile2).toBeDefined()
      expect(config?.profiles.profile3).toBeUndefined()
    })

    it('应该处理不存在的配置', async () => {
      const result = await ClaudeCodeConfigManager.deleteProfiles(['non-existent'])

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('应该防止删除所有配置', async () => {
      const result = await ClaudeCodeConfigManager.deleteProfiles(['profile1', 'profile2', 'profile3'])

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot delete all profiles')
      expect(result.deletedProfiles).toBeUndefined()
      expect(result.remainingProfiles).toBeUndefined()
    })

    it('应该更新当前配置ID（如果删除的是当前配置）', async () => {
      // 确保profile1是当前配置
      await ClaudeCodeConfigManager.switchProfile('profile1')

      // 删除当前配置
      const result = await ClaudeCodeConfigManager.deleteProfiles(['profile1'])

      expect(result.success).toBe(true)
      expect(result.newCurrentProfileId).toBeTruthy()

      const config = ClaudeCodeConfigManager.readConfig()
      expect(config?.currentProfileId).toBe(result.newCurrentProfileId)
    })
  })

  describe('switchToCcr', () => {
    beforeEach(async () => {
      // 添加一个测试配置
      const profile: ClaudeCodeProfile = {
        id: 'test-profile',
        name: 'Test Profile',
        authType: 'api_key',
        apiKey: 'test-key',
      }
      await ClaudeCodeConfigManager.addProfile(profile)
      vi.clearAllMocks()
    })

    it('应该切换到CCR代理', async () => {
      // Mock CCR配置存在
      mockReadCcrConfig.mockReturnValue({
        HOST: 'localhost',
        PORT: 8080,
        APIKEY: 'sk-test',
      } as any)

      const result = await ClaudeCodeConfigManager.switchToCcr()

      expect(result.success).toBe(true)

      const config = ClaudeCodeConfigManager.readConfig()
      expect(config?.currentProfileId).toBe('ccr-proxy')
      expect(config?.profiles['ccr-proxy']).toBeTruthy()
    })

    it('应该处理CCR未配置的情况', async () => {
      // Mock CCR配置不存在
      mockReadCcrConfig.mockReturnValue(null)

      const result = await ClaudeCodeConfigManager.switchToCcr()

      expect(result.success).toBe(false)
      expect(result.error).toContain('CCR proxy configuration not found')
    })

    it('应该处理读取CCR配置失败', async () => {
      // Mock console.error to suppress error output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock CCR配置读取失败
      mockReadCcrConfig.mockImplementation(() => {
        throw new Error('Failed to read CCR config')
      })

      const result = await ClaudeCodeConfigManager.switchToCcr()

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('cCR profile同步', () => {
    it('syncCcrProfile应该在缺少配置时清理CCR profile', async () => {
      await ClaudeCodeConfigManager.addProfile({
        name: 'Placeholder',
        authType: 'api_key',
        apiKey: 'sk-placeholder',
      })
      // 添加CCR profile
      await (ClaudeCodeConfigManager as any).ensureCcrProfileExists({
        HOST: '127.0.0.1',
        PORT: 3456,
        APIKEY: 'sk-zcf',
      })

      mockReadCcrConfig.mockReturnValue(null)
      const ensureSpy = vi.spyOn(ClaudeCodeConfigManager as any, 'ensureCcrProfileExists')

      await ClaudeCodeConfigManager.syncCcrProfile()

      expect(ensureSpy).toHaveBeenCalledWith(null)
      const config = ClaudeCodeConfigManager.readConfig()
      expect(config?.profiles['ccr-proxy']).toBeUndefined()
      ensureSpy.mockRestore()
    })

    it('ensureCcrProfileExists应该基于CCR配置创建profile', async () => {
      cleanConfigDir()
      ClaudeCodeConfigManager.writeConfig(ClaudeCodeConfigManager.createEmptyConfig())

      await (ClaudeCodeConfigManager as any).ensureCcrProfileExists({
        HOST: '10.0.0.5',
        PORT: 4567,
        APIKEY: 'sk-ensure',
      })

      const config = ClaudeCodeConfigManager.readConfig()
      const profile = config?.profiles['ccr-proxy']
      expect(profile).toMatchObject({
        id: 'ccr-proxy',
        name: 'CCR Proxy',
        authType: 'ccr_proxy',
        baseUrl: 'http://10.0.0.5:4567',
        apiKey: 'sk-ensure',
      })
      expect(config?.currentProfileId).toBe('ccr-proxy')
    })

    it('ensureCcrProfileExists应该删除当前CCR profile并切换', async () => {
      await ClaudeCodeConfigManager.addProfile({
        name: 'Main',
        authType: 'api_key',
        apiKey: 'sk-main',
      })
      await (ClaudeCodeConfigManager as any).ensureCcrProfileExists({
        HOST: '127.0.0.1',
        PORT: 3456,
        APIKEY: 'sk-ccr',
      })

      await (ClaudeCodeConfigManager as any).ensureCcrProfileExists(null)

      const config = ClaudeCodeConfigManager.readConfig()
      expect(config?.profiles['ccr-proxy']).toBeUndefined()
      expect(config?.currentProfileId).toBeTruthy()
      expect(config?.currentProfileId).not.toBe('ccr-proxy')
    })

    it('switchToOfficial写入失败时应该返回错误', async () => {
      await ClaudeCodeConfigManager.addProfile({
        name: 'Official Test',
        authType: 'api_key',
        apiKey: 'sk-official',
      })
      const writeSpy = vi.spyOn(ClaudeCodeConfigManager as any, 'writeConfig').mockImplementation(() => {
        throw new Error('official failed')
      })

      const result = await ClaudeCodeConfigManager.switchToOfficial()

      expect(result.success).toBe(false)
      expect(result.error).toBe('official failed')

      writeSpy.mockRestore()
    })

    it('switchToCcr在切换失败时应该返回错误', async () => {
      await ClaudeCodeConfigManager.addProfile({
        name: 'CCREntry',
        authType: 'api_key',
        apiKey: 'sk-entry',
      })
      mockReadCcrConfig.mockReturnValue({
        HOST: '127.0.0.1',
        PORT: 3456,
        APIKEY: 'sk-ccr',
      })

      const switchSpy = vi.spyOn(ClaudeCodeConfigManager as any, 'switchProfile').mockImplementation(() => {
        throw new Error('switch fail')
      })

      const result = await ClaudeCodeConfigManager.switchToCcr()

      expect(result.success).toBe(false)
      expect(result.error).toBe('switch fail')

      switchSpy.mockRestore()
    })
  })

  describe('syncCcrProfile', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('应该同步存在的CCR配置', async () => {
      // Mock CCR配置存在
      mockReadCcrConfig.mockReturnValue({
        HOST: 'localhost',
        PORT: 8080,
        APIKEY: 'sk-test',
      } as any)

      await ClaudeCodeConfigManager.syncCcrProfile()

      const config = ClaudeCodeConfigManager.readConfig()
      expect(config?.profiles['ccr-proxy']).toBeTruthy()
      expect(config?.profiles['ccr-proxy']?.name).toBe('CCR Proxy')
      expect(config?.profiles['ccr-proxy']?.authType).toBe('ccr_proxy')
      expect(config?.profiles['ccr-proxy']?.baseUrl).toBe('http://localhost:8080')
      expect(config?.profiles['ccr-proxy']?.apiKey).toBe('sk-test')
    })

    it('应该删除不存在的CCR配置', async () => {
      // 先创建CCR配置
      mockReadCcrConfig.mockReturnValue({
        HOST: 'localhost',
        PORT: 8080,
        APIKEY: 'sk-test',
      } as any)
      await ClaudeCodeConfigManager.syncCcrProfile()

      // 然后Mock CCR配置不存在
      mockReadCcrConfig.mockReturnValue(null)
      await ClaudeCodeConfigManager.syncCcrProfile()

      const config = ClaudeCodeConfigManager.readConfig()
      expect(config?.profiles['ccr-proxy']).toBeUndefined()
    })

    it('应该处理同步错误', async () => {
      // Mock console.error to suppress error output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock CCR配置读取失败
      mockReadCcrConfig.mockImplementation(() => {
        throw new Error('Sync failed')
      })

      // 应该不抛出错误，而是静默处理
      await expect(ClaudeCodeConfigManager.syncCcrProfile()).resolves.toBeUndefined()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('isLastProfile', () => {
    it('应该检测最后一个配置', async () => {
      const profile: ClaudeCodeProfile = {
        name: 'only-profile',
        authType: 'api_key',
        apiKey: 'test-key',
      }

      await ClaudeCodeConfigManager.addProfile(profile)

      expect(ClaudeCodeConfigManager.isLastProfile('only-profile')).toBe(true)
    })

    it('应该检测不是最后一个配置', async () => {
      const profile1: ClaudeCodeProfile = {
        name: 'profile1',
        authType: 'api_key',
        apiKey: 'key1',
      }

      const profile2: ClaudeCodeProfile = {
        name: 'profile2',
        authType: 'auth_token',
        apiKey: 'key2',
      }

      await ClaudeCodeConfigManager.addProfile(profile1)
      await ClaudeCodeConfigManager.addProfile(profile2)

      expect(ClaudeCodeConfigManager.isLastProfile('profile1')).toBe(false)
    })

    it('应该处理不存在的配置', () => {
      expect(ClaudeCodeConfigManager.isLastProfile('non-existent')).toBe(false)
    })
  })
})
