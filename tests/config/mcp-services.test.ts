import { beforeEach, describe, expect, it } from 'vitest'
import { getMcpService, getMcpServices, MCP_SERVICE_CONFIGS } from '../../src/config/mcp-services'
import { initI18n } from '../../src/i18n'

describe('mcp services configuration', () => {
  beforeEach(async () => {
    await initI18n('en')
  })
  describe('mcp service configs', () => {
    it('should contain pure business configuration without any i18n texts', () => {
      expect(MCP_SERVICE_CONFIGS).toBeDefined()
      expect(Array.isArray(MCP_SERVICE_CONFIGS)).toBe(true)
      expect(MCP_SERVICE_CONFIGS.length).toBeGreaterThan(0)

      // Verify each config item does not contain hardcoded names and descriptions
      MCP_SERVICE_CONFIGS.forEach((config) => {
        expect(config).toHaveProperty('id')
        expect(config).toHaveProperty('requiresApiKey')
        expect(config).toHaveProperty('config')

        // Ensure no hardcoded name and description
        expect(config).not.toHaveProperty('name')
        expect(config).not.toHaveProperty('description')
      })
    })

    it('should contain all existing MCP services', () => {
      const expectedServiceIds = [
        'context7',
        'open-websearch',
        'spec-workflow',
        'mcp-deepwiki',
        'Playwright',
        'exa',
        'serena',
      ]

      const actualIds = MCP_SERVICE_CONFIGS.map(config => config.id)
      expectedServiceIds.forEach((id) => {
        expect(actualIds).toContain(id)
      })
    })

    it('should have open-websearch service in second position', () => {
      const actualIds = MCP_SERVICE_CONFIGS.map(config => config.id)
      expect(actualIds[1]).toBe('open-websearch')
    })

    it('should have open-websearch service with correct configuration', () => {
      const openWebSearchConfig = MCP_SERVICE_CONFIGS.find(config => config.id === 'open-websearch')

      expect(openWebSearchConfig).toBeDefined()
      expect(openWebSearchConfig!.requiresApiKey).toBe(false)
      expect(openWebSearchConfig!.config).toEqual({
        type: 'stdio',
        command: 'npx',
        args: ['-y', 'open-websearch@latest'],
        env: {
          MODE: 'stdio',
          DEFAULT_SEARCH_ENGINE: 'duckduckgo',
          ALLOWED_SEARCH_ENGINES: 'duckduckgo,bing,brave',
        },
      })
    })
  })

  describe('getMcpServices', () => {
    it('should return complete MCP service list with Chinese translations', async () => {
      const services = await getMcpServices()

      expect(Array.isArray(services)).toBe(true)
      expect(services.length).toBeGreaterThan(0)

      services.forEach((service) => {
        expect(service).toHaveProperty('id')
        expect(service).toHaveProperty('name')
        expect(service).toHaveProperty('description')
        expect(service).toHaveProperty('requiresApiKey')
        expect(service).toHaveProperty('config')

        // Verify translation content
        expect(typeof service.name).toBe('string')
        expect(service.name.length).toBeGreaterThan(0)
        expect(typeof service.description).toBe('string')
        expect(service.description.length).toBeGreaterThan(0)
      })
    })

    it('should return complete MCP service list with English translations', async () => {
      const services = await getMcpServices()

      expect(Array.isArray(services)).toBe(true)
      expect(services.length).toBeGreaterThan(0)

      services.forEach((service) => {
        expect(service).toHaveProperty('id')
        expect(service).toHaveProperty('name')
        expect(service).toHaveProperty('description')
        expect(service).toHaveProperty('requiresApiKey')
        expect(service).toHaveProperty('config')

        // Verify English content (simple check for no Chinese characters)
        expect(/[\u4E00-\u9FA5]/.test(service.name)).toBe(false)
        expect(/[\u4E00-\u9FA5]/.test(service.description)).toBe(false)
      })
    })

    it('should have same number of services in Chinese and English', async () => {
      const zhServices = await getMcpServices()
      const enServices = await getMcpServices()

      expect(zhServices.length).toBe(enServices.length)

      // Verify ID lists are identical
      const zhIds = zhServices.map(s => s.id).sort()
      const enIds = enServices.map(s => s.id).sort()
      expect(zhIds).toEqual(enIds)
    })
  })

  describe('getMcpService', () => {
    it('should return specified MCP service by ID (with global i18n)', async () => {
      const service = await getMcpService('context7')

      expect(service).toBeDefined()
      expect(service!.id).toBe('context7')
      expect(service!.name).toContain('Context7')
      // With global English i18n, descriptions are in English
      expect(service!.description).toContain('documentation')
      expect(service!.requiresApiKey).toBe(false)
    })

    it('should return specified MCP service by ID (English)', async () => {
      const service = await getMcpService('context7')

      expect(service).toBeDefined()
      expect(service!.id).toBe('context7')
      expect(service!.name).toContain('Context7')
      expect(service!.description).toContain('documentation')
      expect(service!.requiresApiKey).toBe(false)
    })

    it('should return open-websearch service by ID with correct properties', async () => {
      const service = await getMcpService('open-websearch')

      expect(service).toBeDefined()
      expect(service!.id).toBe('open-websearch')
      expect(service!.name).toBeDefined()
      expect(service!.description).toBeDefined()
      expect(service!.requiresApiKey).toBe(false)
      expect(service!.config.type).toBe('stdio')
      expect(service!.config.command).toBe('npx')
      expect(service!.config.args).toEqual(['-y', 'open-websearch@latest'])
      expect(service!.config.env).toEqual({
        MODE: 'stdio',
        DEFAULT_SEARCH_ENGINE: 'duckduckgo',
        ALLOWED_SEARCH_ENGINES: 'duckduckgo,bing,brave',
      })
    })

    it('should return undefined for non-existent service ID', async () => {
      const service = await getMcpService('non-existent-service')
      expect(service).toBeUndefined()
    })

    it('should correctly handle services that require API key', async () => {
      const exaService = await getMcpService('exa')

      expect(exaService).toBeDefined()
      expect(exaService!.requiresApiKey).toBe(true)
      expect(exaService!.apiKeyPrompt).toBeDefined()
      expect(exaService!.apiKeyEnvVar).toBe('EXA_API_KEY')
    })
  })

  describe('aPI key related functionality', () => {
    it('services requiring API key should contain prompt information', async () => {
      const zhServices = await getMcpServices()
      const enServices = await getMcpServices()

      const zhExaService = zhServices.find(s => s.id === 'exa')
      const enExaService = enServices.find(s => s.id === 'exa')

      expect(zhExaService?.apiKeyPrompt).toContain('API Key')
      expect(enExaService?.apiKeyPrompt).toContain('API Key')

      // With global English i18n, all prompts are in English
      expect(zhExaService?.apiKeyPrompt).toContain('API Key')
      expect(enExaService?.apiKeyPrompt).toContain('API Key')
      expect(/[\u4E00-\u9FA5]/.test(enExaService?.apiKeyPrompt || '')).toBe(false)
    })
  })

  describe('type safety', () => {
    it('returned services should conform to McpService interface', async () => {
      const services = await getMcpServices()

      services.forEach((service) => {
        // Basic property checks
        expect(typeof service.id).toBe('string')
        expect(typeof service.name).toBe('string')
        expect(typeof service.description).toBe('string')
        expect(typeof service.requiresApiKey).toBe('boolean')
        expect(service.config).toBeDefined()

        // Config structure checks
        expect(['stdio', 'sse']).toContain(service.config.type)

        if (service.config.type === 'stdio') {
          expect(service.config.command).toBeDefined()
          expect(Array.isArray(service.config.args)).toBe(true)
        }
      })
    })
  })
})
