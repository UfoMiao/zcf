import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/i18n', () => ({
  i18n: {
    t: (key: string) => key,
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

describe('tOML Parser Refactor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseCodexConfig with smol-toml', () => {
    it('should parse empty TOML correctly', async () => {
      const { parseCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      const emptyToml = ''
      const result = parseCodexConfig(emptyToml)

      expect(result).toEqual({
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [],
        managed: false,
        otherConfig: [],
        modelProviderCommented: undefined,
      })
    })

    it('should parse TOML with project sections correctly', async () => {
      const { parseCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      const complexToml = `[projects."/Users/miaoda/Documents/code/zcf"]
trust_level = "trusted"
local_model = "wenwen"

# --- model provider added by ZCF ---
model_provider = "gpt-4"

[model_providers.gpt-4]
name = "GPT-4"
base_url = "https://api.openai.com/v1"
wire_api = "responses"
env_key = "OPENAI_API_KEY"
requires_openai_auth = true`

      const result = parseCodexConfig(complexToml)

      // Should correctly identify the global model_provider, projects section should be preserved
      expect(result.modelProvider).toBe('gpt-4')
      expect(result.providers).toHaveLength(1)
      expect(result.providers[0]).toEqual({
        id: 'gpt-4',
        name: 'GPT-4',
        baseUrl: 'https://api.openai.com/v1',
        wireApi: 'responses',
        envKey: 'OPENAI_API_KEY',
        requiresOpenaiAuth: true,
      })
      expect(result.managed).toBe(true)

      // Should preserve project configuration in otherConfig
      expect(result.otherConfig).toBeDefined()
      expect(result.otherConfig!.some(line => line.includes('projects."/Users/miaoda/Documents/code/zcf"'))).toBe(true)
    })

    it('should parse MCP services correctly', async () => {
      const { parseCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      const mcpToml = `
model_provider = "claude"

[mcp_servers.context7]
command = "npx"
args = ["-y", "context7"]

[mcp_servers.exa]
command = "npx"
args = ["-y", "exa-mcp-server"]
env = {EXA_API_KEY = "test-key"}
startup_timeout_ms = 5000
`

      const result = parseCodexConfig(mcpToml)

      expect(result.modelProvider).toBe('claude')
      expect(result.mcpServices).toHaveLength(2)

      const context7Service = result.mcpServices.find(s => s.id === 'context7')
      expect(context7Service).toEqual({
        id: 'context7',
        command: 'npx',
        args: ['-y', 'context7'],
        env: undefined,
        startup_timeout_ms: undefined,
      })

      const exaService = result.mcpServices.find(s => s.id === 'exa')
      expect(exaService).toEqual({
        id: 'exa',
        command: 'npx',
        args: ['-y', 'exa-mcp-server'],
        env: { EXA_API_KEY: 'test-key' },
        startup_timeout_ms: 5000,
      })
    })

    it('should handle commented model_provider', async () => {
      const { parseCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      const commentedToml = `
# model_provider = "claude"

[model_providers.claude]
name = "Claude"
base_url = "https://api.anthropic.com"
`

      const result = parseCodexConfig(commentedToml)

      expect(result.modelProvider).toBe('claude') // Should detect from comment
      expect(result.modelProviderCommented).toBe(true)
      expect(result.providers).toHaveLength(1)
    })
  })

  describe('renderCodexConfig with smol-toml', () => {
    it('should render simple config correctly', async () => {
      const { renderCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      const configData = {
        model: null,
        modelProvider: 'gpt-4',
        providers: [{
          id: 'gpt-4',
          name: 'GPT-4',
          baseUrl: 'https://api.openai.com/v1',
          wireApi: 'responses',
          envKey: 'OPENAI_API_KEY',
          requiresOpenaiAuth: true,
        }],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      }

      const result = renderCodexConfig(configData)

      expect(result).toContain('model_provider = "gpt-4"')
      expect(result).toContain('[model_providers.gpt-4]')
      expect(result).toContain('name = "GPT-4"')
      expect(result).toContain('base_url = "https://api.openai.com/v1"')
    })

    it('should preserve other config sections', async () => {
      const { renderCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      const configData = {
        model: null,
        modelProvider: 'claude',
        providers: [],
        mcpServices: [],
        managed: true,
        otherConfig: [
          '[projects."/Users/test"]',
          'trust_level = "trusted"',
        ],
      }

      const result = renderCodexConfig(configData)

      expect(result).toContain('[projects."/Users/test"]')
      expect(result).toContain('trust_level = "trusted"')
      expect(result).toContain('model_provider = "claude"')
    })

    it('should place global model_provider BEFORE sections to avoid scope issues', async () => {
      const { renderCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      const configData = {
        model: null,
        modelProvider: 'wenwen',
        providers: [],
        mcpServices: [],
        managed: true,
        otherConfig: [
          '[projects."/Users/test/project1"]',
          'trust_level = "trusted"',
          '[projects."/Users/test/project2"]',
          'trust_level = "trusted"',
        ],
      }

      const result = renderCodexConfig(configData)

      // Check that model_provider comes before any sections
      const modelProviderIndex = result.indexOf('model_provider = "wenwen"')
      const firstSectionIndex = result.indexOf('[projects.')

      expect(modelProviderIndex).toBeGreaterThan(-1)
      expect(firstSectionIndex).toBeGreaterThan(-1)
      expect(modelProviderIndex).toBeLessThan(firstSectionIndex)

      // Verify the actual structure
      expect(result).toContain('# --- model provider added by ZCF ---')
      expect(result).toContain('model_provider = "wenwen"')
      expect(result).toContain('[projects."/Users/test/project1"]')
      expect(result).toContain('[projects."/Users/test/project2"]')
    })

    it('should handle commented model_provider correctly', async () => {
      const { renderCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      const configData = {
        model: null,
        modelProvider: 'claude',
        providers: [],
        mcpServices: [],
        managed: true,
        otherConfig: [],
        modelProviderCommented: true,
      }

      const result = renderCodexConfig(configData)

      expect(result).toContain('# model_provider = "claude"')
      expect(result).not.toMatch(/^model_provider = "claude"$/m)
    })
  })

  describe('config roundtrip consistency', () => {
    it('should maintain consistency through parse-render cycle', async () => {
      const { parseCodexConfig, renderCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      const originalToml = `
[projects."/Users/test"]
trust_level = "trusted"

model_provider = "gpt-4"

[model_providers.gpt-4]
name = "GPT-4"
base_url = "https://api.openai.com/v1"
wire_api = "responses"

[mcp_servers.context7]
command = "npx"
args = ["-y", "context7"]
`

      const parsed = parseCodexConfig(originalToml)
      const rendered = renderCodexConfig(parsed)
      const reparsed = parseCodexConfig(rendered)

      // Key fields should remain consistent
      expect(reparsed.modelProvider).toBe(parsed.modelProvider)
      expect(reparsed.providers).toEqual(parsed.providers)
      expect(reparsed.mcpServices).toEqual(parsed.mcpServices)
    })
  })
})
