import type { InitOptions } from '../../../src/commands/init'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validateSkipPromptOptions } from '../../../src/commands/init'

vi.mock('../../../src/i18n', () => ({
  i18n: {
    t: vi.fn((key: string, params?: Record<string, any>) => {
      // Mock specific translations for testing
      const translations: Record<string, string> = {
        'multi-config:conflictingParams': 'Cannot specify both --api-configs and --api-configs-file at the same time',
        'errors:invalidWorkflow': 'Invalid workflow selected',
        'api:keyRequired': 'API key is required for API key authentication',
        'api:authTokenRequired': 'Auth token is required for auth token authentication',
        'api:invalidType': 'Invalid API type',
        'workflow:invalidId': 'Invalid workflow ID: {{id}}',
        'mcp:invalidId': 'Invalid MCP service ID: {{id}}',
        'output:invalidStyle': 'Invalid output style: {{style}}',
        'errors:invalidApiModel': 'Invalid API model parameter: {{value}}',
        'errors:invalidApiFastModel': 'Invalid fast model parameter: {{value}}',
      }

      const translation = translations[key] || key

      if (!params) {
        return translation
      }

      return Object.entries(params).reduce<string>((acc, [param, value]) => {
        return acc.replace(`{${param}}`, String(value))
      }, translation)
    }),
  },
}))

vi.mock('../../../src/config/mcp-services', () => ({
  MCP_SERVICE_CONFIGS: [
    { id: 'service-a', requiresApiKey: false },
    { id: 'service-b', requiresApiKey: true },
    { id: 'service-c', requiresApiKey: false },
  ],
}))

vi.mock('../../../src/config/workflows', () => ({
  WORKFLOW_CONFIG_BASE: [
    { id: 'workflow-a' },
    { id: 'workflow-b' },
  ],
}))

describe('validateSkipPromptOptions', () => {
  let options: InitOptions

  beforeEach(() => {
    options = {}
  })

  it('should synchronise config and AI languages when allLang is core language', () => {
    options.allLang = 'zh-CN'

    validateSkipPromptOptions(options)

    expect(options.configLang).toBe('zh-CN')
    expect(options.aiOutputLang).toBe('zh-CN')
  })

  it('should default configLang to en when allLang is custom', () => {
    options.allLang = 'fr'

    validateSkipPromptOptions(options)

    expect(options.configLang).toBe('en')
    expect(options.aiOutputLang).toBe('fr')
  })

  it('should parse outputStyles string lists and defaults', () => {
    options.outputStyles = 'engineer-professional,default'

    validateSkipPromptOptions(options)

    expect(options.outputStyles).toEqual(['engineer-professional', 'default'])
    expect(options.defaultOutputStyle).toBe('engineer-professional')
  })

  it('should expand outputStyles \"all\" shortcut', () => {
    options.outputStyles = 'all'

    validateSkipPromptOptions(options)

    expect(options.outputStyles).toEqual(['engineer-professional', 'nekomata-engineer', 'laowang-engineer'])
  })

  it('should convert outputStyles "skip" to boolean false', () => {
    options.outputStyles = 'skip'

    validateSkipPromptOptions(options)

    expect(options.outputStyles).toBe(false)
  })

  it('should throw when configAction is invalid', () => {
    options.configAction = 'invalid' as any

    expect(() => validateSkipPromptOptions(options)).toThrow('errors:invalidConfigAction')
  })

  it('should throw when apiType is invalid', () => {
    options.apiType = 'wrong' as any

    expect(() => validateSkipPromptOptions(options)).toThrow('errors:invalidApiType')
  })

  it('should require apiKey when apiType is api_key', () => {
    options.apiType = 'api_key'

    expect(() => validateSkipPromptOptions(options)).toThrow('errors:apiKeyRequiredForApiKey')
  })

  it('should require apiKey when apiType is auth_token', () => {
    options.apiType = 'auth_token'

    expect(() => validateSkipPromptOptions(options)).toThrow('errors:apiKeyRequiredForAuthToken')
  })

  it('should convert mcpServices string lists and defaults', () => {
    options.mcpServices = 'service-a,service-c'

    validateSkipPromptOptions(options)

    expect(options.mcpServices).toEqual(['service-a', 'service-c'])
  })

  it('should treat mcpServices skip as false', () => {
    options.mcpServices = 'skip'

    validateSkipPromptOptions(options)

    expect(options.mcpServices).toBe(false)
  })

  it('should expand mcpServices all to available non-key services', () => {
    options.mcpServices = 'all'

    validateSkipPromptOptions(options)

    expect(options.mcpServices).toEqual(['service-a', 'service-c'])
  })

  it('should throw when mcpServices contains invalid id', () => {
    options.mcpServices = 'service-a,invalid'

    expect(() => validateSkipPromptOptions(options)).toThrow('errors:invalidMcpService')
  })

  it('should validate outputStyles array values', () => {
    options.outputStyles = ['engineer-professional', 'unknown']

    expect(() => validateSkipPromptOptions(options)).toThrow('errors:invalidOutputStyle')
  })

  it('should validate default output style', () => {
    options.defaultOutputStyle = 'unknown'

    expect(() => validateSkipPromptOptions(options)).toThrow('errors:invalidDefaultOutputStyle')
  })

  it('should convert workflows string to array and validate entries', () => {
    options.workflows = 'workflow-a,workflow-b'

    validateSkipPromptOptions(options)

    expect(options.workflows).toEqual(['workflow-a', 'workflow-b'])
  })

  it('should treat workflows skip as false', () => {
    options.workflows = 'skip'

    validateSkipPromptOptions(options)

    expect(options.workflows).toBe(false)
  })

  it('should expand workflows all to configured list', () => {
    options.workflows = 'all'

    validateSkipPromptOptions(options)

    expect(options.workflows).toEqual(['workflow-a', 'workflow-b'])
  })

  it('should throw when workflows contains invalid id', () => {
    options.workflows = 'workflow-a,invalid'

    expect(() => validateSkipPromptOptions(options)).toThrow('Invalid workflow selected')
  })

  it('should throw when both apiConfigs and apiConfigsFile provided', () => {
    options.apiConfigs = '[]'
    options.apiConfigsFile = 'config.json'

    expect(() => validateSkipPromptOptions(options)).toThrow('Cannot specify both --api-configs and --api-configs-file at the same time')
  })

  it('should set defaults for mcpServices, workflows and installCometixLine', () => {
    validateSkipPromptOptions(options)

    expect(options.mcpServices).toEqual(['service-a', 'service-c'])
    expect(options.workflows).toEqual(['workflow-a', 'workflow-b'])
    expect(options.installCometixLine).toBe(true)
  })

  it('should parse installCometixLine string boolean', () => {
    options.installCometixLine = 'false'

    validateSkipPromptOptions(options)

    expect(options.installCometixLine).toBe(false)
  })

  describe('aPI model validation', () => {
    it('should accept valid apiModel parameter', () => {
      options.apiType = 'api_key'
      options.apiKey = 'sk-test'
      options.apiModel = 'claude-sonnet-4-5'

      expect(() => validateSkipPromptOptions(options)).not.toThrow()
      expect(options.apiModel).toBe('claude-sonnet-4-5')
    })

    it('should accept valid apiFastModel parameter', () => {
      options.apiType = 'api_key'
      options.apiKey = 'sk-test'
      options.apiFastModel = 'claude-haiku-4-5'

      expect(() => validateSkipPromptOptions(options)).not.toThrow()
      expect(options.apiFastModel).toBe('claude-haiku-4-5')
    })

    it('should accept both apiModel and apiFastModel together', () => {
      options.apiType = 'api_key'
      options.apiKey = 'sk-test'
      options.apiModel = 'claude-sonnet-4-5'
      options.apiFastModel = 'claude-haiku-4-5'

      expect(() => validateSkipPromptOptions(options)).not.toThrow()
      expect(options.apiModel).toBe('claude-sonnet-4-5')
      expect(options.apiFastModel).toBe('claude-haiku-4-5')
    })

    it('should throw when apiModel is not a string', () => {
      options.apiType = 'api_key'
      options.apiKey = 'sk-test'
      options.apiModel = 123 as any

      expect(() => validateSkipPromptOptions(options)).toThrow('Invalid API model parameter')
    })

    it('should throw when apiFastModel is not a string', () => {
      options.apiType = 'api_key'
      options.apiKey = 'sk-test'
      options.apiFastModel = true as any

      expect(() => validateSkipPromptOptions(options)).toThrow('Invalid fast model parameter')
    })

    it('should allow model parameters without apiType in non-skip-prompt mode', () => {
      options.apiModel = 'claude-sonnet-4-5'

      // Should not throw - validation only applies in skip-prompt mode
      expect(() => validateSkipPromptOptions(options)).not.toThrow()
    })
  })
})
