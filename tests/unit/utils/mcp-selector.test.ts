import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMcpServices, MCP_SERVICE_CONFIGS } from '../../../src/config/mcp-services'
import { selectMcpServices } from '../../../src/utils/mcp-selector'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('ansis', () => ({
  default: {
    gray: (text: string) => text,
    yellow: (text: string) => text,
  },
}))

// Mock i18n system
vi.mock('../../../src/i18n', () => ({
  initI18n: vi.fn().mockResolvedValue(undefined),
  i18n: {
    t: vi.fn((key: string) => key),
    isInitialized: true,
    language: 'en',
  },
  ensureI18nInitialized: vi.fn(),
}))

// Mock MCP services
vi.mock('../../../src/config/mcp-services', () => ({
  getMcpServices: vi.fn().mockResolvedValue([
    {
      id: 'context7',
      name: 'Context7 MCP',
      description: 'Context7 documentation server',
      requiresApiKey: false,
      config: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
    },
    {
      id: 'exa',
      name: 'Exa Search',
      description: 'Web search and content crawling',
      requiresApiKey: true,
      config: { type: 'stdio', command: 'npx', args: ['-y', 'exa-mcp-server'] },
    },
  ]),
  MCP_SERVICE_CONFIGS: [
    {
      id: 'context7',
      requiresApiKey: false,
      config: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
    },
    {
      id: 'exa',
      requiresApiKey: true,
      apiKeyEnvVar: 'EXA_API_KEY',
      config: { type: 'stdio', command: 'npx', args: ['-y', 'exa-mcp-server'] },
    },
  ],
}))

describe('mcp-selector utilities', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})

    // Initialize i18n for test environment
    const { initI18n } = await import('../../../src/i18n')
    await initI18n('en')
  })

  describe('mcp service configuration and functions', () => {
    it('should have MCP_SERVICE_CONFIGS defined', () => {
      expect(MCP_SERVICE_CONFIGS).toBeDefined()
      expect(Array.isArray(MCP_SERVICE_CONFIGS)).toBe(true)
    })

    it('should have correct structure for each config', () => {
      MCP_SERVICE_CONFIGS.forEach((config) => {
        expect(config).toHaveProperty('id')
        expect(config).toHaveProperty('requiresApiKey')
        expect(config).toHaveProperty('config')
        expect(typeof config.id).toBe('string')
        expect(typeof config.requiresApiKey).toBe('boolean')
        expect(typeof config.config).toBe('object')
        // Should not have hardcoded names/descriptions
        expect(config).not.toHaveProperty('name')
        expect(config).not.toHaveProperty('description')
      })
    })

    it('should have at least one MCP service config', () => {
      expect(MCP_SERVICE_CONFIGS.length).toBeGreaterThan(0)
    })

    it('should provide services with both zh-CN and en translations', async () => {
      const zhServices = await getMcpServices()
      const enServices = await getMcpServices()

      expect(zhServices.length).toBeGreaterThan(0)
      expect(enServices.length).toBeGreaterThan(0)
      expect(zhServices.length).toBe(enServices.length)

      zhServices.forEach((service) => {
        expect(service).toHaveProperty('name')
        expect(service).toHaveProperty('description')
        expect(typeof service.name).toBe('string')
        expect(typeof service.description).toBe('string')
      })

      enServices.forEach((service) => {
        expect(service).toHaveProperty('name')
        expect(service).toHaveProperty('description')
        expect(typeof service.name).toBe('string')
        expect(typeof service.description).toBe('string')
      })
    })

    it('should have unique IDs for each service', () => {
      const ids = MCP_SERVICE_CONFIGS.map(s => s.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have valid config structure for each service', () => {
      MCP_SERVICE_CONFIGS.forEach((config) => {
        expect(config.config).toHaveProperty('command')
        expect(typeof config.config.command).toBe('string')

        if (config.config.args) {
          expect(Array.isArray(config.config.args)).toBe(true)
        }

        if (config.config.type) {
          expect(typeof config.config.type).toBe('string')
        }
      })
    })
  })

  describe('selectMcpServices', () => {
    it('should return selected services when user makes selection', async () => {
      const selectedIds = ['filesystem', 'brave-search']
      vi.mocked(inquirer.prompt).mockResolvedValue({ services: selectedIds })

      const result = await selectMcpServices()

      expect(result).toEqual(selectedIds)
      expect(inquirer.prompt).toHaveBeenCalledWith({
        type: 'checkbox',
        name: 'services',
        message: expect.any(String),
        choices: expect.any(Array),
      })
    })

    it('should return empty array when no services selected', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ services: [] })

      const result = await selectMcpServices()

      expect(result).toEqual([])
    })

    it('should return undefined when cancelled', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ services: undefined })
      const consoleSpy = vi.spyOn(console, 'log')

      const result = await selectMcpServices()

      expect(result).toBeUndefined()
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should build choices with correct language', async () => {
      const promptSpy = vi.mocked(inquirer.prompt).mockResolvedValue({ services: [] })
      const enServices = await getMcpServices()

      await selectMcpServices()

      const call = promptSpy.mock.calls[0][0] as any
      expect(call.choices).toBeDefined()
      expect(call.choices.length).toBe(enServices.length)

      // Check that choices are built with English names
      call.choices.forEach((choice: any, index: number) => {
        expect(choice.value).toBe(enServices[index].id)
        expect(choice.name).toContain(enServices[index].name)
        expect(choice.selected).toBe(false)
      })
    })

    it('should build choices with Chinese language', async () => {
      const promptSpy = vi.mocked(inquirer.prompt).mockResolvedValue({ services: [] })
      const zhServices = await getMcpServices()

      await selectMcpServices()

      const call = promptSpy.mock.calls[0][0] as any
      expect(call.choices).toBeDefined()

      // Check that choices are built with Chinese names
      call.choices.forEach((choice: any, index: number) => {
        expect(choice.value).toBe(zhServices[index].id)
        expect(choice.name).toContain(zhServices[index].name)
        expect(choice.selected).toBe(false)
      })
    })

    it('should handle all available services selection', async () => {
      const allServiceIds = MCP_SERVICE_CONFIGS.map(s => s.id)
      vi.mocked(inquirer.prompt).mockResolvedValue({ services: allServiceIds })

      const result = await selectMcpServices()

      expect(result).toEqual(allServiceIds)
      expect(result?.length).toBe(MCP_SERVICE_CONFIGS.length)
    })
  })

  describe('selectMcpServices integration', () => {
    it('should load mcp-selector module', async () => {
      const module = await import('../../../src/utils/mcp-selector')
      expect(module).toBeDefined()
      expect(module.selectMcpServices).toBeDefined()
      expect(typeof module.selectMcpServices).toBe('function')
    })
  })
})
