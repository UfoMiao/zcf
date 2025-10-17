import type { InitOptions } from '../../../src/commands/init'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validateSkipPromptOptions } from '../../../src/commands/init'

vi.mock('../../../src/i18n', () => ({
  i18n: {
    t: vi.fn((key: string, params?: Record<string, any>) => {
      if (!params) {
        return key
      }
      return Object.entries(params).reduce<string>((acc, [param, value]) => {
        return acc.replace(`{${param}}`, String(value))
      }, key)
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

    expect(() => validateSkipPromptOptions(options)).toThrow('errors:invalidWorkflow')
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
})
