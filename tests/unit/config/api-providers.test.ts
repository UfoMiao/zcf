import type { ApiProviderPreset } from '../../../src/config/api-providers'
import { describe, expect, it } from 'vitest'
import { API_PROVIDER_PRESETS, getApiProviders } from '../../../src/config/api-providers'

describe('aPI Provider Configuration', () => {
  describe('aPI_PROVIDER_PRESETS', () => {
    it('should be an array', () => {
      expect(Array.isArray(API_PROVIDER_PRESETS)).toBe(true)
    })

    it('should contain at least one provider (302.ai)', () => {
      expect(API_PROVIDER_PRESETS.length).toBeGreaterThanOrEqual(1)
      const provider302 = API_PROVIDER_PRESETS.find(p => p.id === '302ai')
      expect(provider302).toBeDefined()
    })

    it('should have valid provider structure', () => {
      API_PROVIDER_PRESETS.forEach((provider) => {
        expect(provider).toHaveProperty('id')
        expect(provider).toHaveProperty('name')
        expect(provider).toHaveProperty('supportedCodeTools')
        expect(typeof provider.id).toBe('string')
        expect(typeof provider.name).toBe('string')
        expect(Array.isArray(provider.supportedCodeTools)).toBe(true)
        expect(provider.supportedCodeTools.length).toBeGreaterThan(0)
      })
    })

    it('should have valid supportedCodeTools values', () => {
      API_PROVIDER_PRESETS.forEach((provider) => {
        provider.supportedCodeTools.forEach((tool) => {
          expect(['claude-code', 'codex']).toContain(tool)
        })
      })
    })

    it('302.ai provider should have correct configuration', () => {
      const provider302 = API_PROVIDER_PRESETS.find(p => p.id === '302ai')
      expect(provider302).toBeDefined()
      expect(provider302!.name).toBe('302.AI')
      expect(provider302!.supportedCodeTools).toContain('claude-code')
      expect(provider302!.supportedCodeTools).toContain('codex')
    })

    it('302.ai should have Claude Code configuration', () => {
      const provider302 = API_PROVIDER_PRESETS.find(p => p.id === '302ai')
      expect(provider302!.claudeCode).toBeDefined()
      expect(provider302!.claudeCode!.baseUrl).toBe('https://api.302.ai/cc')
      expect(provider302!.claudeCode!.authType).toBe('api_key')
    })

    it('302.ai should have Codex configuration', () => {
      const provider302 = API_PROVIDER_PRESETS.find(p => p.id === '302ai')
      expect(provider302!.codex).toBeDefined()
      expect(provider302!.codex!.baseUrl).toBe('https://api.302.ai/v1')
      expect(provider302!.codex!.wireApi).toBe('responses')
    })

    it('providers with claudeCode config should have valid authType', () => {
      API_PROVIDER_PRESETS.forEach((provider) => {
        if (provider.claudeCode) {
          expect(['api_key', 'auth_token']).toContain(provider.claudeCode.authType)
        }
      })
    })

    it('providers should have either claudeCode or codex config based on supportedCodeTools', () => {
      API_PROVIDER_PRESETS.forEach((provider) => {
        if (provider.supportedCodeTools.includes('claude-code')) {
          expect(provider.claudeCode).toBeDefined()
          expect(provider.claudeCode!.baseUrl).toBeTruthy()
        }
        if (provider.supportedCodeTools.includes('codex')) {
          expect(provider.codex).toBeDefined()
          expect(provider.codex!.baseUrl).toBeTruthy()
          expect(provider.codex!.wireApi).toBeDefined()
          expect(['responses', 'chat']).toContain(provider.codex!.wireApi)
        }
      })
    })
  })

  describe('getApiProviders', () => {
    it('should return providers for claude-code', () => {
      const providers = getApiProviders('claude-code')
      expect(Array.isArray(providers)).toBe(true)
      providers.forEach((provider) => {
        expect(provider.supportedCodeTools).toContain('claude-code')
        expect(provider.claudeCode).toBeDefined()
      })
    })

    it('should return providers for codex', () => {
      const providers = getApiProviders('codex')
      expect(Array.isArray(providers)).toBe(true)
      providers.forEach((provider) => {
        expect(provider.supportedCodeTools).toContain('codex')
        expect(provider.codex).toBeDefined()
      })
    })

    it('should return 302.ai for claude-code', () => {
      const providers = getApiProviders('claude-code')
      const provider302 = providers.find(p => p.id === '302ai')
      expect(provider302).toBeDefined()
    })

    it('should return 302.ai for codex', () => {
      const providers = getApiProviders('codex')
      const provider302 = providers.find(p => p.id === '302ai')
      expect(provider302).toBeDefined()
    })

    it('should return empty array for unsupported code tool type', () => {
      const providers = getApiProviders('unsupported' as any)
      expect(providers).toEqual([])
    })

    it('should not return providers that do not support the specified tool', () => {
      // If we add a provider that only supports claude-code
      const claudeCodeProviders = getApiProviders('claude-code')
      const codexProviders = getApiProviders('codex')

      claudeCodeProviders.forEach((provider) => {
        expect(provider.supportedCodeTools).toContain('claude-code')
      })

      codexProviders.forEach((provider) => {
        expect(provider.supportedCodeTools).toContain('codex')
      })
    })

    it('should return providers in consistent order', () => {
      const providers1 = getApiProviders('claude-code')
      const providers2 = getApiProviders('claude-code')
      expect(providers1).toEqual(providers2)
    })
  })

  describe('type Safety', () => {
    it('should enforce correct types for ApiProviderPreset', () => {
      const validProvider: ApiProviderPreset = {
        id: 'test',
        name: 'Test Provider',
        supportedCodeTools: ['claude-code'],
        claudeCode: {
          baseUrl: 'https://test.com',
          authType: 'api_key',
        },
      }
      expect(validProvider).toBeDefined()
    })

    it('should allow optional fields', () => {
      const minimalProvider: ApiProviderPreset = {
        id: 'minimal',
        name: 'Minimal Provider',
        supportedCodeTools: ['codex'],
        codex: {
          baseUrl: 'https://minimal.com',
          wireApi: 'chat',
        },
      }
      expect(minimalProvider).toBeDefined()
      expect(minimalProvider.description).toBeUndefined()
      expect(minimalProvider.claudeCode).toBeUndefined()
    })

    it('should allow both claudeCode and codex configs', () => {
      const dualProvider: ApiProviderPreset = {
        id: 'dual',
        name: 'Dual Provider',
        supportedCodeTools: ['claude-code', 'codex'],
        claudeCode: {
          baseUrl: 'https://dual.com/cc',
          authType: 'api_key',
        },
        codex: {
          baseUrl: 'https://dual.com/v1',
          wireApi: 'chat',
        },
      }
      expect(dualProvider).toBeDefined()
    })
  })

  describe('edge Cases', () => {
    it('should handle empty supportedCodeTools gracefully', () => {
      const providers = getApiProviders('claude-code')
      // Should not crash and should return valid results
      expect(Array.isArray(providers)).toBe(true)
    })

    it('should handle providers with defaultModels', () => {
      const providersWithModels = API_PROVIDER_PRESETS.filter(
        p => p.claudeCode?.defaultModels && p.claudeCode.defaultModels.length > 0,
      )
      providersWithModels.forEach((provider) => {
        expect(Array.isArray(provider.claudeCode!.defaultModels)).toBe(true)
      })
    })

    it('should handle providers with defaultModel for codex', () => {
      const providersWithModel = API_PROVIDER_PRESETS.filter(
        p => p.codex?.defaultModel,
      )
      providersWithModel.forEach((provider) => {
        expect(typeof provider.codex!.defaultModel).toBe('string')
      })
    })
  })
})
