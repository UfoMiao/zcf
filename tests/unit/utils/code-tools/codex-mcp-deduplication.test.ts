import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureDir, exists, readFile, writeFile } from '../../../../src/utils/fs-operations'

vi.mock('../../../../src/i18n', () => ({
  i18n: { t: vi.fn((key: string) => key), isInitialized: true, language: 'en' },
  ensureI18nInitialized: vi.fn(),
  format: vi.fn((template: string, values: Record<string, any>) => {
    let result = template
    for (const [key, value] of Object.entries(values)) {
      result = result.replace(`{${key}}`, String(value))
    }
    return result
  }),
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../../src/utils/mcp-selector', () => ({
  selectMcpServices: vi.fn(),
}))

vi.mock('../../../../src/config/mcp-services', () => ({
  getMcpServices: vi.fn(() => [
    {
      id: 'context7',
      requiresApiKey: false,
      config: {
        command: 'npx',
        args: ['-y', 'context7'],
        env: {},
      },
    },
    {
      id: 'exa',
      requiresApiKey: true,
      apiKeyEnvVar: 'EXA_API_KEY',
      config: {
        command: 'npx',
        args: ['-y', 'exa-mcp-server'],
        env: {
          EXA_API_KEY: 'YOUR_EXA_API_KEY',
        },
      },
    },
    {
      id: 'filesystem',
      requiresApiKey: false,
      config: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
        env: {},
      },
    },
  ]),
  MCP_SERVICE_CONFIGS: [
    {
      id: 'context7',
      requiresApiKey: false,
      config: {
        command: 'npx',
        args: ['-y', 'context7'],
        env: {},
      },
    },
    {
      id: 'exa',
      requiresApiKey: true,
      apiKeyEnvVar: 'EXA_API_KEY',
      config: {
        command: 'npx',
        args: ['-y', 'exa-mcp-server'],
        env: {
          EXA_API_KEY: 'YOUR_EXA_API_KEY',
        },
      },
    },
    {
      id: 'filesystem',
      requiresApiKey: false,
      config: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
        env: {},
      },
    },
  ],
}))

vi.mock('node:os', () => ({
  homedir: () => '/home/test',
  platform: () => 'linux',
}))

vi.mock('../../../../src/utils/fs-operations', () => ({
  ensureDir: vi.fn(),
  exists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  copyDir: vi.fn(),
  copyFile: vi.fn(),
}))

vi.mock('../../../../src/utils/platform', () => ({
  getSystemRoot: vi.fn(() => null), // Mock to return null for non-Windows
  isWindows: vi.fn(() => false),
  getMcpCommand: vi.fn(() => ['npx']), // Mock command for non-Windows
  applyCodexPlatformCommand: vi.fn(config => config), // Mock identity function
  normalizeTomlPath: vi.fn((str: string) => str.replace(/\\+/g, '/').replace(/\/+/g, '/')), // Normalize Windows paths
}))

vi.mock('../../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(() => ({
    preferredLang: 'en',
    templateLang: 'en',
    aiOutputLang: 'en',
    version: '3.1.0',
    lastUpdated: '2024-01-01',
    codeToolType: 'claude-code',
    general: {
      preferredLang: 'en',
      templateLang: 'en',
      aiOutputLang: 'en',
    },
  })),
  updateZcfConfig: vi.fn(),
  readZcfConfigAsync: vi.fn().mockResolvedValue({
    preferredLang: 'en',
    templateLang: 'en',
    aiOutputLang: 'en',
    version: '3.1.0',
    lastUpdated: '2024-01-01',
    codeToolType: 'claude-code',
    general: {
      preferredLang: 'en',
      templateLang: 'en',
      aiOutputLang: 'en',
    },
  }),
}))

describe('codex MCP Deduplication Logic', () => {
  const mockConfigPath = '/home/test/.codex/config.toml'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(exists).mockReturnValue(true)
    vi.mocked(ensureDir).mockImplementation(() => {})
    vi.mocked(writeFile).mockImplementation(() => {})
  })

  describe('mCP Service Smart Merge Logic', () => {
    it('should preserve user custom MCP services while adding new ones', async () => {
      // Initial config with existing MCP services including user custom services

      vi.mocked(readFile).mockReturnValue(`
# --- model provider added by ZCF ---
model_provider = "openai"

[model_providers.openai]
name = "OpenAI"
base_url = "https://api.openai.com/v1"
wire_api = "responses"
env_key = "OPENAI_API_KEY"
requires_openai_auth = true

# --- MCP servers added by ZCF ---
[mcp_servers.context7]
command = "npx"
args = ["-y", "context7"]

[mcp_servers.exa]
command = "npx"
args = ["-y", "exa-mcp-server"]
env = {EXA_API_KEY = "old-key"}

# --- User custom MCP services ---
[mcp_servers.my-custom-tool]
command = "python"
args = ["-m", "my_custom_tool"]

[mcp_servers.another-custom]
command = "/usr/local/bin/another-tool"
args = ["--config", "/path/to/config"]
`)

      // Mock selectMcpServices to return context7 and exa (keep existing + add new)
      const { selectMcpServices } = await import('../../../../src/utils/mcp-selector')
      vi.mocked(selectMcpServices).mockResolvedValue(['context7', 'exa'])

      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex')

      // Mock inquirer for API key prompt
      const inquirer = await import('inquirer')
      vi.mocked(inquirer.default.prompt).mockResolvedValue({ apiKey: 'new-exa-key' })

      await configureCodexMcp()

      // Verify all services are preserved: existing, new selection, and custom
      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.context7]'),
      )

      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.exa]'),
      )

      // Verify user custom services are preserved
      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.my-custom-tool]'),
      )

      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.another-custom]'),
      )

      // Verify no duplicate services
      const content = vi.mocked(writeFile).mock.calls[0][1] as string
      const context7Matches = content.match(/\[mcp_servers\.context7\]/g)
      const exaMatches = content.match(/\[mcp_servers\.exa\]/g)
      expect(context7Matches).toHaveLength(1)
      expect(exaMatches).toHaveLength(1)
    })

    it('should preserve user custom services when no predefined services selected', async () => {
      // Initial config with existing MCP services including user custom services
      vi.mocked(readFile).mockReturnValue(`
# --- model provider added by ZCF ---
model_provider = "openai"

[model_providers.openai]
name = "OpenAI"
base_url = "https://api.openai.com/v1"
wire_api = "responses"
env_key = "OPENAI_API_KEY"
requires_openai_auth = true

# --- MCP servers added by ZCF ---
[mcp_servers.context7]
command = "npx"
args = ["-y", "context7"]

[mcp_servers.exa]
command = "npx"
args = ["-y", "exa-mcp-server"]
env = {EXA_API_KEY = "old-key"}

# --- User custom MCP services ---
[mcp_servers.my-custom-tool]
command = "python"
args = ["-m", "my_custom_tool"]

[mcp_servers.another-custom]
command = "/usr/local/bin/another-tool"
args = ["--config", "/path/to/config"]
`)

      // Mock selectMcpServices to return empty array (no predefined services selected)
      const { selectMcpServices } = await import('../../../../src/utils/mcp-selector')
      vi.mocked(selectMcpServices).mockResolvedValue([])

      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex')

      const inquirer = await import('inquirer')
      vi.mocked(inquirer.default.prompt).mockResolvedValue({})

      await configureCodexMcp()

      // Union-style merge: predefined services are preserved even when none selected
      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.context7]'),
      )

      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.exa]'),
      )

      // Verify user custom services are preserved
      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.my-custom-tool]'),
      )

      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.another-custom]'),
      )
    })

    it('should add SYSTEMROOT environment variable for Windows MCP services', async () => {
      // Mock Windows environment
      const { isWindows, getSystemRoot } = await import('../../../../src/utils/platform')
      vi.mocked(isWindows).mockReturnValue(true)
      vi.mocked(getSystemRoot).mockReturnValue('C:/Windows')

      // Initial config with user custom service
      vi.mocked(readFile).mockReturnValue(`
# --- model provider added by ZCF ---
model_provider = "openai"

[model_providers.openai]
name = "OpenAI"
base_url = "https://api.openai.com/v1"
wire_api = "responses"
env_key = "OPENAI_API_KEY"
requires_openai_auth = true

# --- User custom MCP services ---
[mcp_servers.my-custom-tool]
command = "python"
args = ["-m", "my_custom_tool"]
env = {CUSTOM_VAR = "value"}
`)

      // Mock selectMcpServices to return context7
      const { selectMcpServices } = await import('../../../../src/utils/mcp-selector')
      vi.mocked(selectMcpServices).mockResolvedValue(['context7'])

      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex')

      const inquirer = await import('inquirer')
      vi.mocked(inquirer.default.prompt).mockResolvedValue({})

      await configureCodexMcp()

      // Verify both predefined and custom services have SYSTEMROOT on Windows
      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.context7]'),
      )

      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.my-custom-tool]'),
      )

      // Check that SYSTEMROOT is added to both services
      const content = vi.mocked(writeFile).mock.calls[0][1] as string
      expect(content).toContain('SYSTEMROOT = \'C:/Windows\'')

      // Verify custom service preserves its original env vars and adds SYSTEMROOT
      expect(content).toContain('CUSTOM_VAR = \'value\'')
      expect(content).toContain('SYSTEMROOT = \'C:/Windows\'')
    })

    it('should handle service selection with mixed custom and predefined services', async () => {
      // Initial config with both custom and predefined services
      vi.mocked(readFile).mockReturnValue(`
# --- model provider added by ZCF ---
model_provider = "openai"

[model_providers.openai]
name = "OpenAI"
base_url = "https://api.openai.com/v1"
wire_api = "responses"
env_key = "OPENAI_API_KEY"
requires_openai_auth = true

# --- Existing predefined services ---
[mcp_servers.context7]
command = "npx"
args = ["-y", "context7"]

[mcp_servers.exa]
command = "npx"
args = ["-y", "exa-mcp-server"]
env = {EXA_API_KEY = "old-key"}

# --- User custom services ---
[mcp_servers.custom-tool-1]
command = "python"
args = ["-m", "custom_tool"]

[mcp_servers.custom-tool-2]
command = "/usr/local/bin/tool"
args = ["--mode", "production"]

[mcp_servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
`)

      // Mock selectMcpServices to return filesystem (new) and exa (keep existing), but not context7 (remove)
      const { selectMcpServices } = await import('../../../../src/utils/mcp-selector')
      vi.mocked(selectMcpServices).mockResolvedValue(['filesystem', 'exa'])

      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex')

      const inquirer = await import('inquirer')
      vi.mocked(inquirer.default.prompt).mockResolvedValue({ apiKey: 'updated-exa-key' })

      await configureCodexMcp()

      // Verify provider configuration is preserved
      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[model_providers.openai]'),
      )

      // Verify selected predefined services are present (exa with updated key, filesystem new)
      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.exa]'),
      )

      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.filesystem]'),
      )

      // Union-style merge: unselected predefined service is preserved (context7)
      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.context7]'),
      )

      // Verify all custom services are preserved
      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.custom-tool-1]'),
      )

      expect(writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('[mcp_servers.custom-tool-2]'),
      )

      // Verify exa service was updated with new API key
      const content = vi.mocked(writeFile).mock.calls[0][1] as string
      expect(content).toContain('EXA_API_KEY = \'updated-exa-key\'')
      expect(content).not.toContain('EXA_API_KEY = \'old-key\'')
    })
  })
})
