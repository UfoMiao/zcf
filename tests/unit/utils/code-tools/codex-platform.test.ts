import { describe, expect, it, vi } from 'vitest'

const mockSelectMcpServices = vi.fn()
const mockGetMcpServices = vi.fn()

vi.mock('../../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: { t: vi.fn((key: string) => key) },
}))

vi.mock('../../../../src/config/mcp-services', () => ({
  MCP_SERVICE_CONFIGS: [
    {
      id: 'SERVICE',
      requiresApiKey: false,
      config: {
        command: 'npx',
        args: [],
        env: {},
      },
    },
    {
      id: 'serena',
      requiresApiKey: false,
      config: {
        command: 'uvx',
        args: ['--from', 'git+https://github.com/oraios/serena', 'serena', 'start-mcp-server'],
        env: {},
      },
    },
  ],
  getMcpServices: mockGetMcpServices,
}))

vi.mock('../../../../src/utils/mcp-selector', () => ({
  selectMcpServices: mockSelectMcpServices,
}))

vi.mock('../../../../src/utils/prompts', () => ({
  selectScriptLanguage: vi.fn(),
}))

vi.mock('../../../../src/utils/code-tools/codex-config-detector', () => ({
  detectConfigManagementMode: vi.fn(),
}))

const mockUpdateZcfConfig = vi.fn()
vi.mock('../../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(() => null),
  updateZcfConfig: mockUpdateZcfConfig,
}))

vi.mock('../../../../src/utils/platform', () => ({
  isWindows: vi.fn(() => true),
  getMcpCommand: vi.fn((cmd: string) => {
    if (cmd === 'uvx')
      return ['cmd', '/c', 'uvx']
    return ['cmd', '/c', 'npx']
  }),
  getSystemRoot: vi.fn(() => 'C:/Windows'),
  normalizeTomlPath: vi.fn((str: string) => str.replace(/\\+/g, '/').replace(/\/+/g, '/')),
}))

vi.mock('../../../../src/utils/fs-operations', () => ({
  copyDir: vi.fn(),
  copyFile: vi.fn(),
  ensureDir: vi.fn(),
  exists: vi.fn(() => true),
  readFile: vi.fn(() => ''),
  writeFile: vi.fn(),
}))

const codexModule = await import('../../../../src/utils/code-tools/codex')
const { configureCodexMcp } = codexModule
const { writeFile } = await import('../../../../src/utils/fs-operations')

describe('applyCodexPlatformCommand integration', () => {
  it('should rewrite npx commands using platform-specific MCP command', async () => {
    mockSelectMcpServices.mockResolvedValue(['SERVICE'])
    mockGetMcpServices.mockResolvedValue([
      { id: 'SERVICE', name: 'Service', description: 'desc' },
    ])

    vi.spyOn(codexModule, 'readCodexConfig').mockReturnValue({
      providers: [],
      mcpServices: [],
      managed: false,
    } as any)
    vi.spyOn(codexModule, 'backupCodexComplete').mockReturnValue(null)

    await configureCodexMcp()

    expect(mockUpdateZcfConfig).toHaveBeenCalledWith({ codeToolType: 'codex' })
    // New implementation uses batchUpdateCodexMcpServices which calls writeFile
    expect(writeFile).toHaveBeenCalled()
    const writeFileMock = vi.mocked(writeFile)
    const configCalls = writeFileMock.mock.calls.filter(call => call[0].includes('config.toml'))
    expect(configCalls.length).toBeGreaterThan(0)
    // Verify the content contains the rewritten command
    const lastConfigContent = configCalls[configCalls.length - 1][1] as string
    expect(lastConfigContent).toContain('[mcp_servers.service]')
    expect(lastConfigContent).toContain('command = "cmd"')
  })

  it('should rewrite uvx commands using platform-specific MCP command on Windows', async () => {
    mockSelectMcpServices.mockResolvedValue(['serena'])
    mockGetMcpServices.mockResolvedValue([
      { id: 'serena', name: 'Serena', description: 'Serena MCP service' },
    ])

    vi.spyOn(codexModule, 'readCodexConfig').mockReturnValue({
      providers: [],
      mcpServices: [],
      managed: false,
    } as any)
    vi.spyOn(codexModule, 'backupCodexComplete').mockReturnValue(null)

    await configureCodexMcp()

    expect(mockUpdateZcfConfig).toHaveBeenCalledWith({ codeToolType: 'codex' })
    // New implementation uses batchUpdateCodexMcpServices which calls writeFile
    expect(writeFile).toHaveBeenCalled()
    const writeFileMock = vi.mocked(writeFile)
    const configCalls = writeFileMock.mock.calls.filter(call => call[0].includes('config.toml'))
    expect(configCalls.length).toBeGreaterThan(0)
    // Verify the content contains the rewritten command
    const lastConfigContent = configCalls[configCalls.length - 1][1] as string
    expect(lastConfigContent).toContain('[mcp_servers.serena]')
    expect(lastConfigContent).toContain('command = "cmd"')
  })
})
