import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import cac from 'cac'
import { dirname, join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupCommands } from '../../../src/cli-setup'
import { checkCcrVersion } from '../../../src/utils/version-checker'
import { applyIsolatedHome, ISOLATED_HOME_ENV_KEYS, restoreProcessEnv, snapshotProcessEnv } from '../../helpers/isolated-home'

const executedCommands = vi.hoisted(() => [] as string[])
const mockExecAsync = vi.hoisted(() => vi.fn(async (command: string) => {
  executedCommands.push(command)

  if (command.startsWith('npm view '))
    return { stdout: '3.0.21\n', stderr: '' }

  if (command.startsWith('ccr'))
    throw new Error('CCR CLI must not be executed during version detection')

  if (command === 'claude -v' || command === 'ccline -v')
    return { stdout: '3.0.21\n', stderr: '' }

  throw new Error(`Unexpected command: ${command}`)
}))
const mockFindCommandPath = vi.hoisted(() => vi.fn())

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}))

vi.mock('node:util', () => ({
  promisify: () => mockExecAsync,
}))

vi.mock('../../../src/utils/platform', () => ({
  commandExists: vi.fn(),
  findCommandPath: mockFindCommandPath,
  getHomebrewCommandPaths: vi.fn().mockResolvedValue([]),
  getPlatform: vi.fn(() => 'linux'),
  getTermuxPrefix: vi.fn(),
  isTermux: vi.fn(() => false),
  isWSL: vi.fn(() => false),
  shouldUseSudoForGlobalInstall: vi.fn(() => false),
  wrapCommandWithSudo: vi.fn((command: string, args: string[]) => ({ command, args, usedSudo: false })),
}))

const environmentKeys = [...ISOLATED_HOME_ENV_KEYS, 'PATH'] as const
let environmentSnapshot: ReadonlyMap<string, string | undefined>
let testRoot: string
let testHome: string

function createCcrPackage(packageRoot: string): void {
  mkdirSync(join(packageRoot, 'dist', 'main'), { recursive: true })
  writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({
    name: '@musistudio/claude-code-router',
    version: '3.0.21',
  }))
  writeFileSync(join(packageRoot, 'dist', 'main', 'cli.js'), '')
}

function createUnixCcrInstallation(): string {
  const prefix = join(testRoot, 'fnm', 'node-versions', 'v24.6.0', 'installation')
  const commandPath = join(prefix, 'bin', 'ccr')
  const packageRoot = join(prefix, 'lib', 'node_modules', '@musistudio', 'claude-code-router')

  createCcrPackage(packageRoot)
  mkdirSync(dirname(commandPath), { recursive: true })
  symlinkSync(join('..', 'lib', 'node_modules', '@musistudio', 'claude-code-router', 'dist', 'main', 'cli.js'), commandPath)

  return commandPath
}

function createWindowsCcrInstallation(): string {
  const prefix = join(testRoot, 'npm-prefix')
  const commandPath = join(prefix, 'ccr.cmd')
  const packageRoot = join(prefix, 'node_modules', '@musistudio', 'claude-code-router')

  createCcrPackage(packageRoot)
  writeFileSync(commandPath, '@ECHO off\r\nnode "%~dp0\\node_modules\\@musistudio\\claude-code-router\\dist\\main\\cli.js" %*\r\n')

  return commandPath
}

beforeEach(() => {
  environmentSnapshot = snapshotProcessEnv(environmentKeys)
  testRoot = mkdtempSync(join(tmpdir(), 'zcf-ccr-version-'))
  testHome = join(testRoot, 'home')
  applyIsolatedHome(testHome)
  executedCommands.length = 0
  mockExecAsync.mockClear()
  mockFindCommandPath.mockReset()
})

afterEach(() => {
  restoreProcessEnv(environmentSnapshot)
  rmSync(testRoot, { recursive: true, force: true })
})

describe('ccr version detection', () => {
  it('reads CCR 3.x version from an fnm-style package without running the CLI', async () => {
    const commandPath = createUnixCcrInstallation()
    mockFindCommandPath.mockImplementation(async (command: string) => command === 'ccr' ? commandPath : null)

    const result = await checkCcrVersion()

    expect(result).toEqual({
      installed: true,
      currentVersion: '3.0.21',
      latestVersion: '3.0.21',
      needsUpdate: false,
    })
    expect(executedCommands).not.toContain('ccr -v')
    expect(executedCommands).not.toContain('ccr --version')
    expect(executedCommands.every(command => !command.startsWith('ccr'))).toBe(true)
  })

  it('reads CCR 3.x version from a Windows npm shim without running the CLI', async () => {
    const commandPath = createWindowsCcrInstallation()
    mockFindCommandPath.mockImplementation(async (command: string) => command === 'ccr' ? commandPath : null)

    const result = await checkCcrVersion()

    expect(result.installed).toBe(true)
    expect(result.currentVersion).toBe('3.0.21')
    expect(executedCommands.every(command => !command.startsWith('ccr'))).toBe(true)
  })

  it('keeps zcf check -s -T cc in an isolated HOME and reports installed CCR', async () => {
    const commandPath = createUnixCcrInstallation()
    mockFindCommandPath.mockImplementation(async (command: string) => command === 'ccr' ? commandPath : null)
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    const cli = cac('zcf')
    await setupCommands(cli)
    cli.parse(['node', 'zcf', 'check', '-s', '-T', 'cc'], { run: false })
    await cli.runMatchedCommand()

    const output = consoleLog.mock.calls.flat().join('\n')
    expect(output).toContain('CCR is up to date (v3.0.21)')
    expect(output).not.toContain('CCR is not installed')
    expect(executedCommands.every(command => !command.startsWith('ccr'))).toBe(true)
    expect(existsSync(join(testHome, '.codex', 'config.toml'))).toBe(false)
    expect(existsSync(join(testHome, '.codex', 'config.toml.ccr-original'))).toBe(false)
    expect(existsSync(join(testHome, '.codex', 'ccr-model-catalog.json'))).toBe(false)

    consoleLog.mockRestore()
  })
})
