import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import cac from 'cac'
import { join } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupCommands } from '../../src/cli-setup'
import { CODEX_AGENTS_FILE, CODEX_CONFIG_FILE, CODEX_DIR } from '../../src/constants'

vi.mock('../../src/code-tools/package-manager', () => ({
  detectCodeTool: vi.fn().mockResolvedValue(true),
  updateCodeToolPackage: vi.fn(),
}))

vi.mock('../../src/utils/installer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/installer')>()
  return {
    ...actual,
    uninstallCodeTool: vi.fn().mockResolvedValue(true),
    executeInstallMethod: vi.fn().mockResolvedValue(true),
    selectInstallMethod: vi.fn(),
  }
})

vi.mock('../../src/utils/banner', () => ({
  showBanner: vi.fn(),
  displayBannerWithInfo: vi.fn(),
}))

vi.mock('tinyexec', () => ({
  x: vi.fn(async (command: string, args: string[] = []) => {
    if (command === 'npm' && args[0] === 'list')
      return { exitCode: 0, stdout: '@openai/codex@1.0.0', stderr: '' }
    if (command === 'npm' && args[0] === 'view') {
      return {
        exitCode: 0,
        stdout: JSON.stringify({ 'dist-tags': { latest: '1.0.0' } }),
        stderr: '',
      }
    }
    return { exitCode: 0, stdout: '', stderr: '' }
  }),
  exec: vi.fn(async () => ({ exitCode: 0, stdout: '', stderr: '' })),
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(async () => {
      throw new Error('Codex skip-prompt init must not open an interactive prompt')
    }),
  },
}))

const ORIGINAL_PROVIDER_TOML = `model = "gpt-5.2"
model_provider = "original-provider"

[model_providers.original-provider]
name = "Original Provider"
base_url = "https://original.example.test/v1"
wire_api = "responses"
`

function latestBackupConfig(): string {
  const backupRoot = join(CODEX_DIR, 'backup')
  expect(existsSync(backupRoot)).toBe(true)

  const snapshots = readdirSync(backupRoot)
    .filter(name => name.startsWith('backup_'))
    .sort()
    .map(name => join(backupRoot, name, 'config.toml'))
    .filter(path => existsSync(path))

  expect(snapshots.length).toBeGreaterThan(0)
  return readFileSync(snapshots.at(-1)!, 'utf8')
}

describe('codex skip-prompt backup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rmSync(CODEX_DIR, { recursive: true, force: true })
  })

  async function runCli(args: string[]): Promise<void> {
    const cli = cac('zcf')
    await setupCommands(cli)
    cli.parse(['node', 'zcf', ...args], { run: false })
    await cli.runMatchedCommand()
  }

  it('keeps the pre-init provider snapshot after skip-prompt API and MCP stages', async () => {
    mkdirSync(CODEX_DIR, { recursive: true })
    writeFileSync(CODEX_CONFIG_FILE, ORIGINAL_PROVIDER_TOML)
    writeFileSync(CODEX_AGENTS_FILE, '# existing Codex agents\n')

    await runCli([
      'init',
      '--skip-prompt',
      '--code-type',
      'codex',
      '--all-lang',
      'en',
      '--api-type',
      'api_key',
      '--api-key',
      'sk-test-original-snapshot',
      '--api-url',
      'https://api.example.test/v1',
      '--workflows',
      'skip',
      '--output-styles',
      'skip',
      '--mcp-services',
      'context7',
      '--install-cometix-line',
      'false',
    ])

    const liveConfig = readFileSync(CODEX_CONFIG_FILE, 'utf8')
    expect(liveConfig).toContain('custom-api-key')
    expect(liveConfig).toContain('context7')

    const backupConfig = latestBackupConfig()
    expect(backupConfig).toContain('model_provider = "original-provider"')
    expect(backupConfig).not.toContain('custom-api-key')
    expect(backupConfig).not.toContain('context7')
  })
})
