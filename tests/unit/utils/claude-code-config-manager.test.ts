import type { ClaudeCodeProfile } from '../../../src/types/claude-code-config'
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const testConfigDir = mkdtempSync(join(tmpdir(), 'zcf-config-manager-test-'))
const testConfigFile = join(testConfigDir, 'config.toml')

vi.mock('../../../src/constants', async () => {
  const actual = await vi.importActual<typeof import('../../../src/constants')>('../../../src/constants')
  return {
    ...actual,
    ZCF_CONFIG_DIR: testConfigDir,
    ZCF_CONFIG_FILE: testConfigFile,
  }
})

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

describe('claudeCodeConfigManager', () => {
  beforeEach(() => {
    cleanConfigDir()
    vi.clearAllMocks()
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
      // Mock CCR配置读取失败
      mockReadCcrConfig.mockImplementation(() => {
        throw new Error('Failed to read CCR config')
      })

      const result = await ClaudeCodeConfigManager.switchToCcr()

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
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
      // Mock CCR配置读取失败
      mockReadCcrConfig.mockImplementation(() => {
        throw new Error('Sync failed')
      })

      // 应该不抛出错误，而是静默处理
      await expect(ClaudeCodeConfigManager.syncCcrProfile()).resolves.toBeUndefined()
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
