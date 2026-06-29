import type { ClaudeCodeProfile } from '../../../../src/types/claude-code-config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CodeBuddyConfigManager } from '../../../../src/utils/code-tools/codebuddy-config-manager'

// Mock dependencies
vi.mock('../../../../src/constants', () => ({
  CODEBUDDY_SETTINGS_FILE: '/test/.codebuddy/settings.json',
  ZCF_CONFIG_FILE: '/test/.ufomiao/zcf/config.toml',
}))

vi.mock('../../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

vi.mock('../../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
}))

vi.mock('../../../../src/utils/config.model-keys', () => ({
  clearModelEnv: vi.fn((env: Record<string, string>) => {
    delete env.ANTHROPIC_API_KEY
    delete env.ANTHROPIC_AUTH_TOKEN
    delete env.ANTHROPIC_BASE_URL
    delete env.ANTHROPIC_MODEL
    delete env.ANTHROPIC_DEFAULT_HAIKU_MODEL
    delete env.ANTHROPIC_DEFAULT_SONNET_MODEL
    delete env.ANTHROPIC_DEFAULT_OPUS_MODEL
  }),
}))

vi.mock('../../../../src/utils/zcf-config', () => ({
  readDefaultTomlConfig: vi.fn(() => ({
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    general: { preferredLang: 'en', currentTool: 'codebuddy' },
    claudeCode: { enabled: false, outputStyles: [], installType: 'global', currentProfile: '', profiles: {} },
    codex: { enabled: false, systemPromptStyle: 'engineer-professional' },
    codebuddy: { enabled: true, currentProfile: 'test-profile', profiles: { 'test-profile': { name: 'Test', authType: 'api_key', apiKey: 'sk-test' } } },
  })),
  createDefaultTomlConfig: vi.fn(() => ({
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    general: { preferredLang: 'en', currentTool: 'claude-code' },
    claudeCode: { enabled: false, outputStyles: [], installType: 'global', currentProfile: '', profiles: {} },
    codex: { enabled: false, systemPromptStyle: 'engineer-professional' },
    codebuddy: { enabled: false, currentProfile: '', profiles: {} },
  })),
  writeTomlConfig: vi.fn(),
}))

const mockJsonConfig = vi.mocked(await import('../../../../src/utils/json-config'))

describe('codebuddy-config-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCurrentProfile', () => {
    it('should return current profile from TOML config', () => {
      const profile = CodeBuddyConfigManager.getCurrentProfile()
      expect(profile).not.toBeNull()
      expect(profile?.name).toBe('Test')
      expect(profile?.authType).toBe('api_key')
    })
  })

  describe('applyProfileSettings', () => {
    it('should write API key to settings.json env', async () => {
      mockJsonConfig.readJsonConfig.mockReturnValue({})
      const profile: ClaudeCodeProfile = {
        name: 'Test',
        authType: 'api_key',
        apiKey: 'sk-test',
      }

      await CodeBuddyConfigManager.applyProfileSettings(profile)
      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalled()

      const call = mockJsonConfig.writeJsonConfig.mock.calls[0] as [string, any]
      expect(call[0]).toBe('/test/.codebuddy/settings.json')
      expect(call[1].env.ANTHROPIC_API_KEY).toBe('sk-test')
    })

    it('should write auth token to settings.json env', async () => {
      mockJsonConfig.readJsonConfig.mockReturnValue({})
      const profile: ClaudeCodeProfile = {
        name: 'Test',
        authType: 'auth_token',
        apiKey: 'token-123',
      }

      await CodeBuddyConfigManager.applyProfileSettings(profile)
      expect((mockJsonConfig.writeJsonConfig.mock.calls[0] as [string, any])[1].env.ANTHROPIC_AUTH_TOKEN).toBe('token-123')
    })

    it('should clear env when profile is null', async () => {
      mockJsonConfig.readJsonConfig.mockReturnValue({ env: { ANTHROPIC_API_KEY: 'old-key' } })

      await CodeBuddyConfigManager.applyProfileSettings(null)
      const call = mockJsonConfig.writeJsonConfig.mock.calls[0] as [string, any]
      expect(call[1].env.ANTHROPIC_API_KEY).toBeUndefined()
    })
  })

  describe('generateProfileId', () => {
    it('should generate kebab-case id from name', () => {
      expect(CodeBuddyConfigManager.generateProfileId('My Profile')).toBe('my-profile')
    })

    it('should handle empty name', () => {
      expect(CodeBuddyConfigManager.generateProfileId('')).toBe('default')
    })
  })

  describe('sanitizeProfile', () => {
    it('should keep only known fields', () => {
      const profile: ClaudeCodeProfile = {
        name: 'Test',
        authType: 'api_key',
        apiKey: 'key',
        baseUrl: 'https://example.com',
        primaryModel: 'claude-sonnet-4-5',
      }

      const sanitized = CodeBuddyConfigManager.sanitizeProfile(profile)
      expect(sanitized.name).toBe('Test')
      expect(sanitized.authType).toBe('api_key')
      expect(sanitized.apiKey).toBe('key')
      expect(sanitized.baseUrl).toBe('https://example.com')
      expect(sanitized.primaryModel).toBe('claude-sonnet-4-5')
    })
  })
})
