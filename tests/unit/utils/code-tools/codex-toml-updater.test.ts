// Usage: Define and run unit-test lifecycle and assertion helpers.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/utils/fs-operations', () => ({
  ensureDir: vi.fn(),
  exists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

const { exists, readFile, writeFile } = await import('../../../../src/utils/fs-operations')
const { hashConfigValue } = await import('../../../../src/utils/config-ownership')
const {
  updateCodexApiFields,
  upsertCodexMcpService,
  upsertCodexProvider,
} = await import('../../../../src/utils/code-tools/codex-toml-updater')

const mockExists = vi.mocked(exists)
const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)

describe('upsertCodexProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExists.mockReturnValue(true)
  })

  it('marks a newly created provider as ZCF-managed', () => {
    mockExists.mockReturnValue(false)
    mockReadFile.mockReturnValue('')

    upsertCodexProvider('custom-provider', {
      id: 'custom-provider',
      name: 'Custom Provider',
      baseUrl: 'https://example.com/v1',
      wireApi: 'responses',
      tempEnvKey: 'CUSTOM_PROVIDER_API_KEY',
      requiresOpenaiAuth: false,
    })

    const writtenContent = mockWriteFile.mock.calls.at(-1)?.[1] as string
    expect(writtenContent).toContain('[model_providers.custom-provider]')
    expect(writtenContent).toContain('# ZCF managed provider: custom-provider')
    expect(writtenContent).toMatch(/# ZCF managed provider snapshot: custom-provider [a-f0-9]{64}/)
  })

  it('fingerprints top-level model fields written by ZCF', () => {
    mockReadFile.mockReturnValue('')

    updateCodexApiFields({ model: 'gpt-5.2', modelProvider: 'zcf-provider' })

    const writtenContent = mockWriteFile.mock.calls.at(-1)?.[1] as string
    expect(writtenContent).toContain(`# ZCF managed top-level: model ${hashConfigValue('gpt-5.2')}`)
    expect(writtenContent).toContain(`# ZCF managed top-level: model_provider ${hashConfigValue('zcf-provider')}`)
  })

  it('does not claim an existing unmarked provider', () => {
    mockReadFile.mockReturnValue(`[model_providers.personal-provider]
name = "Personal Provider"
base_url = "https://personal.example.com/v1"
wire_api = "responses"
temp_env_key = "PERSONAL_API_KEY"
`)

    upsertCodexProvider('personal-provider', {
      id: 'personal-provider',
      name: 'Updated Personal Provider',
      baseUrl: 'https://personal.example.com/v1',
      wireApi: 'responses',
      tempEnvKey: 'PERSONAL_API_KEY',
      requiresOpenaiAuth: false,
    })

    const writtenContent = mockWriteFile.mock.calls.at(-1)?.[1] as string
    expect(writtenContent).not.toContain('# ZCF managed provider: personal-provider')
  })

  it('fingerprints credentials for newly created providers', () => {
    mockExists.mockReturnValue(false)
    mockReadFile.mockReturnValue('')

    upsertCodexProvider('custom-provider', {
      id: 'custom-provider',
      name: 'Custom Provider',
      baseUrl: 'https://example.com/v1',
      wireApi: 'responses',
      tempEnvKey: 'CUSTOM_PROVIDER_API_KEY',
      requiresOpenaiAuth: false,
    }, 'provider-secret')

    const writtenContent = mockWriteFile.mock.calls.at(-1)?.[1] as string
    expect(writtenContent).toContain(`# ZCF managed provider: custom-provider ${hashConfigValue('provider-secret')}`)
  })

  it('updates an existing provider marker when its managed credential changes', () => {
    mockReadFile.mockReturnValue(`[model_providers.custom-provider]
# ZCF managed provider: custom-provider ${hashConfigValue('old-secret')}
name = "Custom Provider"
`)

    upsertCodexProvider('custom-provider', {
      id: 'custom-provider',
      name: 'Custom Provider',
      baseUrl: 'https://example.com/v1',
      wireApi: 'responses',
      tempEnvKey: 'CUSTOM_PROVIDER_API_KEY',
      requiresOpenaiAuth: false,
    }, 'new-secret')

    const writtenContent = mockWriteFile.mock.calls.at(-1)?.[1] as string
    expect(writtenContent).toContain(`# ZCF managed provider: custom-provider ${hashConfigValue('new-secret')}`)
  })

  it('refreshes an existing Exa MCP ownership marker', () => {
    mockReadFile.mockReturnValue(`[mcp_servers.exa]
# ZCF managed MCP: exa ${hashConfigValue('old-key')}
command = "npx"
`)

    upsertCodexMcpService('exa', {
      id: 'exa',
      command: 'npx',
      args: ['-y', 'exa-mcp-server@latest'],
      env: { EXA_API_KEY: 'new-key' },
    })

    const writtenContent = mockWriteFile.mock.calls.at(-1)?.[1] as string
    expect(writtenContent).toContain(`# ZCF managed MCP: exa ${hashConfigValue('new-key')}`)
  })

  it('does not claim an existing unmarked MCP service', () => {
    mockReadFile.mockReturnValue(`[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp@latest"]
`)

    upsertCodexMcpService('context7', {
      id: 'context7',
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp@latest'],
    })

    const writtenContent = mockWriteFile.mock.calls.at(-1)?.[1] as string
    expect(writtenContent).not.toContain('# ZCF managed MCP: context7')
  })
})
