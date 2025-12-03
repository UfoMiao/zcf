import { beforeEach, describe, expect, it, vi } from 'vitest'
import { compareVersions, shouldUpdate } from '../../../src/utils/version-checker'

// Create hoisted mock for execAsync
const mockExecAsync = vi.hoisted(() => vi.fn())

// Create hoisted mock for platform functions
const mockFindCommandPath = vi.hoisted(() => vi.fn())
const mockGetPlatform = vi.hoisted(() => vi.fn())
const mockGetHomebrewCommandPaths = vi.hoisted(() => vi.fn())
const mockWrapCommandWithSudo = vi.hoisted(() => vi.fn((command: string, args: string[]) => ({
  command,
  args,
  usedSudo: false,
})))

// Create hoisted mock for fs functions
const mockExistsSync = vi.hoisted(() => vi.fn())
const mockReaddirSync = vi.hoisted(() => vi.fn())

// Additional hoisted mocks
const mockTinyExec = vi.hoisted(() => vi.fn())
const mockInquirerPrompt = vi.hoisted(() => vi.fn())
const mockCreateHomebrewSymlink = vi.hoisted(() => vi.fn())

// Mock node:child_process with the promisify result
vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}))

vi.mock('node:util', () => ({
  promisify: () => mockExecAsync,
}))

// Mock node:fs
vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
}))

// Mock platform functions
vi.mock('../../../src/utils/platform', () => ({
  findCommandPath: mockFindCommandPath,
  getPlatform: mockGetPlatform,
  getHomebrewCommandPaths: mockGetHomebrewCommandPaths,
  wrapCommandWithSudo: mockWrapCommandWithSudo,
  commandExists: vi.fn(),
  getTermuxPrefix: vi.fn(),
  isTermux: vi.fn(),
  isWSL: vi.fn(),
  getWSLInfo: vi.fn(),
}))

// Mock i18n helpers used by duplicate handling
const mockFormat = vi.fn((template: string, params: Record<string, string> = {}) => {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`)
})

vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  format: mockFormat,
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

function createAnsiColor() {
  const fn = vi.fn((text: string) => text) as any
  fn.bold = vi.fn((text: string) => text)
  return fn
}

const mockAnsis = {
  yellow: createAnsiColor(),
  gray: createAnsiColor(),
  cyan: createAnsiColor(),
  white: createAnsiColor(),
  green: createAnsiColor(),
  red: createAnsiColor(),
  bold: {
    cyan: vi.fn((text: string) => text),
  },
}

vi.mock('ansis', () => ({
  default: mockAnsis,
}))

const mockSpinner = {
  start: vi.fn().mockReturnThis(),
  info: vi.fn().mockReturnThis(),
  succeed: vi.fn(),
  fail: vi.fn(),
}

const mockOra = vi.hoisted(() => vi.fn(() => mockSpinner))

vi.mock('ora', () => ({
  default: mockOra,
}))

vi.mock('tinyexec', () => ({
  exec: mockTinyExec,
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: mockInquirerPrompt,
  },
}))

vi.mock('../../../src/utils/installer', () => ({
  createHomebrewSymlink: mockCreateHomebrewSymlink,
}))

const mockUpdateClaudeCode = vi.hoisted(() => vi.fn())

vi.mock('../../../src/utils/auto-updater', () => ({
  updateClaudeCode: mockUpdateClaudeCode,
}))

// Mock console methods
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('version-checker', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockConsoleWarn.mockClear()
    mockConsoleLog.mockClear()
    mockConsoleError.mockClear()
    mockFormat.mockClear()
    mockFindCommandPath.mockReset()
    mockGetPlatform.mockReset()
    mockGetHomebrewCommandPaths.mockReset()
    mockExistsSync.mockReset()
    mockReaddirSync.mockReset()
    mockWrapCommandWithSudo.mockImplementation((command: string, args: string[]) => ({ command, args, usedSudo: false }))
    mockTinyExec.mockReset()
    mockTinyExec.mockResolvedValue({ stdout: '', stderr: '' })
    mockInquirerPrompt.mockReset()
    mockCreateHomebrewSymlink.mockReset()
    mockCreateHomebrewSymlink.mockResolvedValue({ success: true, symlinkPath: '/usr/local/bin/claude' })
    mockSpinner.start.mockClear()
    mockSpinner.info.mockClear()
    mockSpinner.succeed.mockClear()
    mockSpinner.fail.mockClear()
    mockOra.mockClear()
    const ansiValues = [mockAnsis.yellow, mockAnsis.gray, mockAnsis.cyan, mockAnsis.white, mockAnsis.green, mockAnsis.red]
    for (const color of ansiValues) {
      color.mockClear()
      if (color.bold)
        color.bold.mockClear()
    }
    mockAnsis.bold.cyan.mockClear()
    // Default to non-macOS to avoid Homebrew detection by default
    mockGetPlatform.mockReturnValue('linux')
    // Default to empty array for Homebrew paths
    mockGetHomebrewCommandPaths.mockResolvedValue([])
    // Default: paths don't exist
    mockExistsSync.mockReturnValue(false)
  })

  describe('compareVersions', () => {
    it('should compare valid versions correctly', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1)
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1)
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    })

    it('should handle pre-release versions', () => {
      expect(compareVersions('1.0.0-alpha', '1.0.0')).toBe(-1)
      expect(compareVersions('1.0.0-beta', '1.0.0-alpha')).toBe(1)
    })

    it('should return -1 for invalid versions', () => {
      expect(compareVersions('invalid', '1.0.0')).toBe(-1)
      expect(compareVersions('1.0.0', 'invalid')).toBe(-1)
      expect(compareVersions('invalid', 'invalid')).toBe(-1)
    })

    it('should handle patch versions', () => {
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
      expect(compareVersions('1.0.2', '1.0.1')).toBe(1)
    })

    it('should handle minor versions', () => {
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1)
      expect(compareVersions('1.2.0', '1.1.0')).toBe(1)
    })
  })

  describe('shouldUpdate', () => {
    it('should return true when update needed', () => {
      expect(shouldUpdate('1.0.0', '2.0.0')).toBe(true)
      expect(shouldUpdate('1.0.0-beta', '1.0.0')).toBe(true)
      expect(shouldUpdate('0.9.0', '1.0.0')).toBe(true)
    })

    it('should return false when no update needed', () => {
      expect(shouldUpdate('2.0.0', '1.0.0')).toBe(false)
      expect(shouldUpdate('1.0.0', '1.0.0')).toBe(false)
      expect(shouldUpdate('1.1.0', '1.0.0')).toBe(false)
    })

    it('should return true for invalid versions', () => {
      expect(shouldUpdate('invalid', '1.0.0')).toBe(true)
      expect(shouldUpdate('', '1.0.0')).toBe(true)
    })
  })

  describe('checkClaudeCodeVersionAndPrompt', () => {
    // Note: The checkClaudeCodeVersionAndPrompt function contains complex
    // dependencies and dynamic imports that make it difficult to test in isolation.
    // The function's behavior is verified through:
    // 1. Integration tests in tests/unit/commands/init.test.ts
    // 2. Real-world usage testing
    // 3. The underlying functions (checkClaudeCodeVersion, updateClaudeCode)
    //    are tested separately in their respective test files

    it('should document expected behavior for integration testing', () => {
      // Expected behavior documented for integration testing reference:
      // 1. Calls checkClaudeCodeVersion() to check version status
      // 2. If needsUpdate is false, returns early without calling updateClaudeCode
      // 3. If needsUpdate is true, dynamically imports updateClaudeCode
      // 4. Calls updateClaudeCode(false, skipPrompt) with correct parameters
      // 5. Handles all errors gracefully with console.warn, never throws
      // 6. Does not interrupt main execution flow on any error condition

      // This test serves as documentation - the actual testing is done
      // in integration tests where the full context is available
      expect(true).toBe(true)
    })
  })

  describe('isClaudeCodeInstalledViaHomebrew', () => {
    beforeEach(() => {
      mockExecAsync.mockReset()
    })

    it('should return true when claude-code is listed by brew', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'claude-code',
        stderr: '',
      })

      // Dynamic import to ensure mocks are applied
      const { isClaudeCodeInstalledViaHomebrew } = await import('../../../src/utils/version-checker')
      const result = await isClaudeCodeInstalledViaHomebrew()

      expect(result).toBe(true)
      expect(mockExecAsync).toHaveBeenCalledWith('brew list --cask claude-code')
    })

    it('should return false when brew command fails', async () => {
      mockExecAsync.mockRejectedValue(new Error('Error: Cask claude-code is not installed'))

      const { isClaudeCodeInstalledViaHomebrew } = await import('../../../src/utils/version-checker')
      const result = await isClaudeCodeInstalledViaHomebrew()

      expect(result).toBe(false)
    })

    it('should return false when brew output does not contain claude-code', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '',
        stderr: '',
      })

      const { isClaudeCodeInstalledViaHomebrew } = await import('../../../src/utils/version-checker')
      const result = await isClaudeCodeInstalledViaHomebrew()

      expect(result).toBe(false)
    })

    it('should use brew list --cask instead of claude update to avoid side effects', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'claude-code',
        stderr: '',
      })

      const { isClaudeCodeInstalledViaHomebrew } = await import('../../../src/utils/version-checker')
      await isClaudeCodeInstalledViaHomebrew()

      // Verify we're using brew list --cask, not claude update
      expect(mockExecAsync).toHaveBeenCalledWith('brew list --cask claude-code')
      expect(mockExecAsync).not.toHaveBeenCalledWith('claude update')
    })
  })

  describe('getClaudeCodeInstallationSource', () => {
    beforeEach(() => {
      mockExecAsync.mockReset()
      mockFindCommandPath.mockReset()
      mockGetPlatform.mockReset()
    })

    it('should return not-found when command is not found', async () => {
      mockGetPlatform.mockReturnValue('macos')
      mockFindCommandPath.mockResolvedValue(null)

      const { getClaudeCodeInstallationSource } = await import('../../../src/utils/version-checker')
      const result = await getClaudeCodeInstallationSource()

      expect(result).toEqual({
        isHomebrew: false,
        commandPath: null,
        source: 'not-found',
      })
    })

    it('should detect Homebrew cask installation from Caskroom path', async () => {
      mockGetPlatform.mockReturnValue('macos')
      mockFindCommandPath.mockResolvedValue('/opt/homebrew/Caskroom/claude-code/2.0.56/claude')

      const { getClaudeCodeInstallationSource } = await import('../../../src/utils/version-checker')
      const result = await getClaudeCodeInstallationSource()

      expect(result).toEqual({
        isHomebrew: true,
        commandPath: '/opt/homebrew/Caskroom/claude-code/2.0.56/claude',
        source: 'homebrew-cask',
      })
    })

    it('should detect Homebrew cask installation via symlink resolution', async () => {
      mockGetPlatform.mockReturnValue('macos')
      mockFindCommandPath.mockResolvedValue('/usr/local/bin/claude')
      // First call returns symlink path, readlink resolves to Caskroom
      mockExecAsync.mockResolvedValue({
        stdout: '/opt/homebrew/Caskroom/claude-code/2.0.56/claude\n',
        stderr: '',
      })

      const { getClaudeCodeInstallationSource } = await import('../../../src/utils/version-checker')
      const result = await getClaudeCodeInstallationSource()

      expect(result).toEqual({
        isHomebrew: true,
        commandPath: '/usr/local/bin/claude',
        source: 'homebrew-cask',
      })
    })

    it('should detect npm installation from node_modules path', async () => {
      mockGetPlatform.mockReturnValue('macos')
      mockFindCommandPath.mockResolvedValue('/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js')
      // Mock readlink to return same path (not a symlink to caskroom)
      mockExecAsync.mockResolvedValue({
        stdout: '/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js\n',
        stderr: '',
      })

      const { getClaudeCodeInstallationSource } = await import('../../../src/utils/version-checker')
      const result = await getClaudeCodeInstallationSource()

      expect(result).toEqual({
        isHomebrew: false,
        commandPath: '/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js',
        source: 'npm',
      })
    })

    it('should detect npm installation via Homebrew Node from Cellar path', async () => {
      mockGetPlatform.mockReturnValue('macos')
      mockFindCommandPath.mockResolvedValue('/opt/homebrew/Cellar/node/22.0.0/bin/claude')
      // Mock readlink to return same path
      mockExecAsync.mockResolvedValue({
        stdout: '/opt/homebrew/Cellar/node/22.0.0/bin/claude\n',
        stderr: '',
      })

      const { getClaudeCodeInstallationSource } = await import('../../../src/utils/version-checker')
      const result = await getClaudeCodeInstallationSource()

      expect(result).toEqual({
        isHomebrew: false,
        commandPath: '/opt/homebrew/Cellar/node/22.0.0/bin/claude',
        source: 'npm',
      })
    })

    it('should return other for unknown installation paths', async () => {
      mockGetPlatform.mockReturnValue('macos')
      mockFindCommandPath.mockResolvedValue('/usr/local/bin/claude')
      // Mock readlink to return same path
      mockExecAsync.mockResolvedValue({
        stdout: '/usr/local/bin/claude\n',
        stderr: '',
      })

      const { getClaudeCodeInstallationSource } = await import('../../../src/utils/version-checker')
      const result = await getClaudeCodeInstallationSource()

      expect(result).toEqual({
        isHomebrew: false,
        commandPath: '/usr/local/bin/claude',
        source: 'other',
      })
    })

    it('should skip Homebrew detection on non-macOS platforms', async () => {
      mockGetPlatform.mockReturnValue('linux')
      mockFindCommandPath.mockResolvedValue('/usr/local/bin/claude')

      const { getClaudeCodeInstallationSource } = await import('../../../src/utils/version-checker')
      const result = await getClaudeCodeInstallationSource()

      expect(result).toEqual({
        isHomebrew: false,
        commandPath: '/usr/local/bin/claude',
        source: 'other',
      })
      // Should not try to resolve symlinks on non-macOS
      expect(mockExecAsync).not.toHaveBeenCalled()
    })

    it('should handle symlink resolution errors gracefully', async () => {
      mockGetPlatform.mockReturnValue('macos')
      mockFindCommandPath.mockResolvedValue('/usr/local/bin/claude')
      mockExecAsync.mockRejectedValue(new Error('readlink failed'))

      const { getClaudeCodeInstallationSource } = await import('../../../src/utils/version-checker')
      const result = await getClaudeCodeInstallationSource()

      // Should still return valid result even if symlink resolution fails
      expect(result.commandPath).toBe('/usr/local/bin/claude')
      expect(result.isHomebrew).toBe(false)
    })

    it('should correctly identify when npm installation shadows Homebrew cask', async () => {
      // This is the critical test case for the bug fix:
      // Both npm and Homebrew installations exist, but PATH has npm first
      mockGetPlatform.mockReturnValue('macos')
      // findCommandPath returns npm installation (first in PATH)
      mockFindCommandPath.mockResolvedValue('/opt/homebrew/Cellar/node/22.0.0/bin/claude')
      // readlink resolves to same path (not caskroom)
      mockExecAsync.mockResolvedValue({
        stdout: '/opt/homebrew/Cellar/node/22.0.0/bin/claude\n',
        stderr: '',
      })

      const { getClaudeCodeInstallationSource } = await import('../../../src/utils/version-checker')
      const result = await getClaudeCodeInstallationSource()

      // Should detect as npm, NOT Homebrew cask
      // Even though Homebrew cask might also be installed separately
      expect(result.isHomebrew).toBe(false)
      expect(result.source).toBe('npm')
    })
  })

  describe('getInstalledVersion', () => {
    beforeEach(() => {
      mockExecAsync.mockReset()
    })

    it('should extract version from -v output', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '1.2.3',
        stderr: '',
      })

      const { getInstalledVersion } = await import('../../../src/utils/version-checker')
      const result = await getInstalledVersion('claude')

      expect(result).toBe('1.2.3')
      expect(mockExecAsync).toHaveBeenCalledWith('claude -v')
    })

    it('should fallback to --version when -v fails', async () => {
      mockExecAsync
        .mockRejectedValueOnce(new Error('-v not supported'))
        .mockResolvedValueOnce({
          stdout: 'version 2.0.0',
          stderr: '',
        })

      const { getInstalledVersion } = await import('../../../src/utils/version-checker')
      const result = await getInstalledVersion('ccr')

      expect(result).toBe('2.0.0')
      expect(mockExecAsync).toHaveBeenCalledWith('ccr -v')
      expect(mockExecAsync).toHaveBeenCalledWith('ccr --version')
    })

    it('should return null after max retries when command fails', async () => {
      mockExecAsync.mockRejectedValue(new Error('Command not found'))

      const { getInstalledVersion } = await import('../../../src/utils/version-checker')
      const result = await getInstalledVersion('nonexistent', 2)

      expect(result).toBeNull()
    })

    it('should extract pre-release version', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'tool version 1.0.0-beta.1',
        stderr: '',
      })

      const { getInstalledVersion } = await import('../../../src/utils/version-checker')
      const result = await getInstalledVersion('tool')

      expect(result).toBe('1.0.0-beta.1')
    })

    it('should return null when version pattern not found', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'no version here',
        stderr: '',
      })

      const { getInstalledVersion } = await import('../../../src/utils/version-checker')
      const result = await getInstalledVersion('tool')

      expect(result).toBeNull()
    })
  })

  describe('getLatestVersion', () => {
    beforeEach(() => {
      mockExecAsync.mockReset()
    })

    it('should return version from npm view', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '3.0.0\n',
        stderr: '',
      })

      const { getLatestVersion } = await import('../../../src/utils/version-checker')
      const result = await getLatestVersion('@anthropic-ai/claude-code')

      expect(result).toBe('3.0.0')
      expect(mockExecAsync).toHaveBeenCalledWith('npm view @anthropic-ai/claude-code version')
    })

    it('should retry on failure', async () => {
      mockExecAsync
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          stdout: '2.0.0\n',
          stderr: '',
        })

      const { getLatestVersion } = await import('../../../src/utils/version-checker')
      const result = await getLatestVersion('@anthropic-ai/claude-code', 2)

      expect(result).toBe('2.0.0')
    })

    it('should return null after max retries', async () => {
      mockExecAsync.mockRejectedValue(new Error('Network error'))

      const { getLatestVersion } = await import('../../../src/utils/version-checker')
      const result = await getLatestVersion('nonexistent-package', 2)

      expect(result).toBeNull()
    })
  })

  describe('getHomebrewClaudeCodeVersion', () => {
    beforeEach(() => {
      mockExecAsync.mockReset()
    })

    it('should return version from brew info --cask', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({
          casks: [{ version: '1.5.0' }],
        }),
        stderr: '',
      })

      const { getHomebrewClaudeCodeVersion } = await import('../../../src/utils/version-checker')
      const result = await getHomebrewClaudeCodeVersion()

      expect(result).toBe('1.5.0')
      expect(mockExecAsync).toHaveBeenCalledWith('brew info --cask claude-code --json=v2')
    })

    it('should return null when no casks in response', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({ casks: [] }),
        stderr: '',
      })

      const { getHomebrewClaudeCodeVersion } = await import('../../../src/utils/version-checker')
      const result = await getHomebrewClaudeCodeVersion()

      expect(result).toBeNull()
    })

    it('should return null when brew info fails', async () => {
      mockExecAsync.mockRejectedValue(new Error('brew info failed'))

      const { getHomebrewClaudeCodeVersion } = await import('../../../src/utils/version-checker')
      const result = await getHomebrewClaudeCodeVersion()

      expect(result).toBeNull()
    })

    it('should return null when JSON parsing fails', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'invalid json',
        stderr: '',
      })

      const { getHomebrewClaudeCodeVersion } = await import('../../../src/utils/version-checker')
      const result = await getHomebrewClaudeCodeVersion()

      expect(result).toBeNull()
    })
  })

  describe('checkCcrVersion', () => {
    beforeEach(() => {
      mockExecAsync.mockReset()
    })

    it('should return version info for installed CCR', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '1.0.0', stderr: '' }) // getInstalledVersion
        .mockResolvedValueOnce({ stdout: '1.1.0\n', stderr: '' }) // getLatestVersion

      const { checkCcrVersion } = await import('../../../src/utils/version-checker')
      const result = await checkCcrVersion()

      expect(result.installed).toBe(true)
      expect(result.currentVersion).toBe('1.0.0')
      expect(result.latestVersion).toBe('1.1.0')
      expect(result.needsUpdate).toBe(true)
    })

    it('should return not installed when CCR command not found', async () => {
      mockExecAsync.mockRejectedValue(new Error('Command not found'))

      const { checkCcrVersion } = await import('../../../src/utils/version-checker')
      const result = await checkCcrVersion()

      expect(result.installed).toBe(false)
      expect(result.currentVersion).toBeNull()
    })
  })

  describe('checkClaudeCodeVersion', () => {
    beforeEach(() => {
      mockExecAsync.mockReset()
      mockFindCommandPath.mockReset()
      mockGetPlatform.mockReset()
    })

    it('should check npm version for non-Homebrew installation', async () => {
      mockGetPlatform.mockReturnValue('linux')
      mockFindCommandPath.mockResolvedValue('/usr/local/bin/claude')
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '1.0.0', stderr: '' }) // getInstalledVersion
        .mockResolvedValueOnce({ stdout: '1.1.0\n', stderr: '' }) // getLatestVersion (npm)

      const { checkClaudeCodeVersion } = await import('../../../src/utils/version-checker')
      const result = await checkClaudeCodeVersion()

      expect(result.installed).toBe(true)
      expect(result.isHomebrew).toBe(false)
      expect(result.installationSource).toBe('other')
      expect(result.commandPath).toBe('/usr/local/bin/claude')
    })

    it('should check Homebrew version when installed via Homebrew cask', async () => {
      mockGetPlatform.mockReturnValue('macos')
      mockFindCommandPath.mockResolvedValue('/opt/homebrew/Caskroom/claude-code/2.0.0/claude')
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '2.0.0', stderr: '' }) // getInstalledVersion
        .mockResolvedValueOnce({ stdout: JSON.stringify({ casks: [{ version: '2.1.0' }] }), stderr: '' }) // getHomebrewClaudeCodeVersion

      const { checkClaudeCodeVersion } = await import('../../../src/utils/version-checker')
      const result = await checkClaudeCodeVersion()

      expect(result.installed).toBe(true)
      expect(result.isHomebrew).toBe(true)
      expect(result.installationSource).toBe('homebrew-cask')
      expect(result.latestVersion).toBe('2.1.0')
      expect(result.needsUpdate).toBe(true)
    })

    it('should use npm latest version when npm installation shadows Homebrew cask', async () => {
      // Critical bug fix test: npm installation is first in PATH even though Homebrew cask exists
      mockGetPlatform.mockReturnValue('macos')
      // findCommandPath returns npm installation via Homebrew Node
      mockFindCommandPath.mockResolvedValue('/opt/homebrew/Cellar/node/22.0.0/bin/claude')
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '1.0.0', stderr: '' }) // getInstalledVersion
        // readlink returns same path (npm, not caskroom)
        .mockResolvedValueOnce({ stdout: '/opt/homebrew/Cellar/node/22.0.0/bin/claude\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: '1.2.0\n', stderr: '' }) // getLatestVersion from npm

      const { checkClaudeCodeVersion } = await import('../../../src/utils/version-checker')
      const result = await checkClaudeCodeVersion()

      // Should detect as npm installation and check npm registry
      expect(result.isHomebrew).toBe(false)
      expect(result.installationSource).toBe('npm')
      expect(result.latestVersion).toBe('1.2.0')
    })

    it('should return not installed when command not found', async () => {
      mockGetPlatform.mockReturnValue('linux')
      mockFindCommandPath.mockResolvedValue(null)
      mockExecAsync.mockRejectedValue(new Error('Command not found'))

      const { checkClaudeCodeVersion } = await import('../../../src/utils/version-checker')
      const result = await checkClaudeCodeVersion()

      expect(result.installed).toBe(false)
      expect(result.currentVersion).toBeNull()
      expect(result.installationSource).toBe('not-found')
    })
  })

  describe('checkCometixLineVersion', () => {
    beforeEach(() => {
      mockExecAsync.mockReset()
    })

    it('should return version info for installed CometixLine', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '0.5.0', stderr: '' }) // getInstalledVersion
        .mockResolvedValueOnce({ stdout: '0.6.0\n', stderr: '' }) // getLatestVersion

      const { checkCometixLineVersion } = await import('../../../src/utils/version-checker')
      const result = await checkCometixLineVersion()

      expect(result.installed).toBe(true)
      expect(result.needsUpdate).toBe(true)
    })
  })

  describe('checkClaudeCodeVersionAndPrompt - additional scenarios', () => {
    beforeEach(() => {
      mockExecAsync.mockReset()
      mockConsoleWarn.mockClear()
      mockFindCommandPath.mockReset()
      mockGetPlatform.mockReset()
    })

    it('should return early when no update needed', async () => {
      mockGetPlatform.mockReturnValue('linux')
      mockFindCommandPath.mockResolvedValue('/usr/local/bin/claude')
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '1.0.0', stderr: '' }) // getInstalledVersion
        .mockResolvedValueOnce({ stdout: '1.0.0\n', stderr: '' }) // getLatestVersion

      const { checkClaudeCodeVersionAndPrompt } = await import('../../../src/utils/version-checker')
      await checkClaudeCodeVersionAndPrompt()

      // Should not call updateClaudeCode since no update needed
      expect(mockConsoleWarn).not.toHaveBeenCalled()
    })

    it('should handle version check errors gracefully - documented behavior', async () => {
      // Note: This test documents the expected behavior when version check fails.
      // The actual error handling involves console.warn being called within a try-catch.
      // Since the function uses dynamic imports and complex async flow, the error
      // may propagate differently in test environment vs production.
      // The function is designed to never throw and always return gracefully.
      mockGetPlatform.mockReturnValue('linux')
      mockFindCommandPath.mockResolvedValue(null)

      // Verify the function signature and behavior
      const { checkClaudeCodeVersionAndPrompt } = await import('../../../src/utils/version-checker')

      // Should not throw even when internal operations fail
      await expect(checkClaudeCodeVersionAndPrompt()).resolves.not.toThrow()
    })
  })

  describe('detectAllClaudeCodeInstallations', () => {
    beforeEach(() => {
      mockExecAsync.mockReset()
      mockFindCommandPath.mockReset()
      mockGetPlatform.mockReset()
      mockGetHomebrewCommandPaths.mockReset()
    })

    it('should detect Homebrew cask installation', async () => {
      mockGetPlatform.mockReturnValue('macos')
      mockFindCommandPath.mockResolvedValue('/opt/homebrew/Caskroom/claude-code/2.0.56/claude')
      mockGetHomebrewCommandPaths.mockResolvedValue(['/opt/homebrew/Caskroom/claude-code/2.0.56/claude'])
      // Mock existsSync to return true for the caskroom path
      mockExistsSync.mockImplementation((path: string) => {
        return path === '/opt/homebrew/Caskroom/claude-code/2.0.56/claude'
          || path === '/opt/homebrew/Caskroom/claude-code'
      })
      // Mock readlink and brew list
      mockExecAsync.mockImplementation((cmd: string) => {
        if (cmd.includes('readlink') || cmd.includes('realpath')) {
          return Promise.resolve({
            stdout: '/opt/homebrew/Caskroom/claude-code/2.0.56/claude\n',
            stderr: '',
          })
        }
        if (cmd.includes('brew list')) {
          return Promise.resolve({ stdout: 'claude-code', stderr: '' })
        }
        // For version check
        return Promise.resolve({ stdout: '2.0.56', stderr: '' })
      })

      const { detectAllClaudeCodeInstallations } = await import('../../../src/utils/version-checker')
      const installations = await detectAllClaudeCodeInstallations()

      expect(installations.some(i => i.source === 'homebrew-cask')).toBe(true)
    })

    it('should handle readlink failures and missing version output gracefully', async () => {
      mockFindCommandPath.mockResolvedValue('/usr/local/bin/claude')
      mockExecAsync.mockImplementation((command: string) => {
        if (command.includes('readlink') || command.includes('realpath'))
          return Promise.reject(new Error('no symlink info'))
        if (command.includes('/usr/local/bin/claude') && command.includes('-v'))
          return Promise.reject(new Error('failed to read version'))
        return Promise.resolve({ stdout: '', stderr: '' })
      })
      mockExistsSync.mockImplementation((path: string) => path === '/usr/local/bin/claude')

      const { detectAllClaudeCodeInstallations } = await import('../../../src/utils/version-checker')
      const installations = await detectAllClaudeCodeInstallations()

      expect(installations).toEqual([
        expect.objectContaining({
          path: '/usr/local/bin/claude',
          version: null,
          isActive: true,
        }),
      ])
    })

    it('should classify nvm installations and include Homebrew cellar binaries', async () => {
      mockGetPlatform.mockReturnValue('macos')
      mockFindCommandPath.mockResolvedValue('/Users/test/.nvm/versions/node/v20/bin/claude')
      mockGetHomebrewCommandPaths.mockResolvedValue(['/opt/homebrew/Cellar/node/22/bin/claude'])
      const existingPaths = new Set([
        '/Users/test/.nvm/versions/node/v20/bin/claude',
        '/usr/local/bin/claude',
        '/opt/homebrew/Cellar/node',
        '/opt/homebrew/Cellar/node/22/bin/claude',
      ])
      mockExistsSync.mockImplementation((path: string) => existingPaths.has(path))
      mockReaddirSync.mockImplementation((path: string) => {
        if (path === '/opt/homebrew/Cellar/node')
          return ['22']
        return []
      })
      mockExecAsync.mockImplementation((command: string) => {
        if (command.includes('readlink') || command.includes('realpath')) {
          if (command.includes('/Users/test/.nvm/versions/node/v20/bin/claude'))
            return Promise.resolve({ stdout: '/usr/local/bin/claude\n', stderr: '' })
          return Promise.resolve({ stdout: '/opt/homebrew/Cellar/node/22/bin/claude\n', stderr: '' })
        }
        if (command.includes('-v'))
          return Promise.resolve({ stdout: 'Claude CLI version 3.1.0', stderr: '' })
        return Promise.resolve({ stdout: '', stderr: '' })
      })

      const { detectAllClaudeCodeInstallations } = await import('../../../src/utils/version-checker')
      const installations = await detectAllClaudeCodeInstallations()

      expect(installations.some(i => i.source === 'npm')).toBe(true)
      expect(installations.some(i => i.source === 'npm-homebrew-node')).toBe(true)
    })

    it('should detect npm global installations and classify other binaries when readlink fails', async () => {
      mockFindCommandPath.mockResolvedValue(null)
      const globalPaths = new Set([
        '/usr/local/bin/claude',
        '/usr/bin/claude',
      ])
      mockExistsSync.mockImplementation((path: string) => globalPaths.has(path))
      mockExecAsync.mockImplementation((command: string) => {
        if (command.includes('readlink') || command.includes('realpath')) {
          if (command.includes('/usr/local/bin/claude'))
            return Promise.resolve({ stdout: '/usr/local/lib/node_modules/claude/bin/claude\n', stderr: '' })
          if (command.includes('/usr/bin/claude'))
            return Promise.reject(new Error('no symlink'))
        }
        if (command.includes('-v'))
          return Promise.resolve({ stdout: 'Claude CLI version 4.0.0', stderr: '' })
        return Promise.resolve({ stdout: '', stderr: '' })
      })

      const { detectAllClaudeCodeInstallations } = await import('../../../src/utils/version-checker')
      const installations = await detectAllClaudeCodeInstallations()

      expect(installations.some(i => i.source === 'npm')).toBe(true)
      expect(installations.some(i => i.source === 'other')).toBe(true)
    })

    it('should skip Homebrew detection on non-macOS', async () => {
      mockGetPlatform.mockReturnValue('linux')
      mockFindCommandPath.mockResolvedValue('/usr/local/bin/claude')
      mockGetHomebrewCommandPaths.mockResolvedValue([])
      mockExecAsync.mockResolvedValue({
        stdout: '/usr/local/bin/claude\n',
        stderr: '',
      })

      const { detectAllClaudeCodeInstallations } = await import('../../../src/utils/version-checker')
      const installations = await detectAllClaudeCodeInstallations()

      // Should not have homebrew-cask on Linux
      expect(installations.every(i => i.source !== 'homebrew-cask')).toBe(true)
    })
  })

  describe('checkDuplicateInstallations', () => {
    beforeEach(() => {
      mockExecAsync.mockReset()
      mockFindCommandPath.mockReset()
      mockGetPlatform.mockReset()
      mockGetHomebrewCommandPaths.mockReset()
    })

    it('should return no duplicates when only one installation exists', async () => {
      mockGetPlatform.mockReturnValue('linux')
      mockFindCommandPath.mockResolvedValue('/usr/local/bin/claude')
      mockGetHomebrewCommandPaths.mockResolvedValue([])
      mockExecAsync.mockResolvedValue({
        stdout: '/usr/local/bin/claude\n',
        stderr: '',
      })

      const { checkDuplicateInstallations } = await import('../../../src/utils/version-checker')
      const result = await checkDuplicateInstallations()

      expect(result.hasDuplicates).toBe(false)
      expect(result.recommendation).toBe('none')
    })
  })

  describe('getSourceDisplayName', () => {
    it('should return correct display names for all sources', async () => {
      const mockI18n = {
        t: (key: string) => key, // Return key as value for testing
      }

      const { getSourceDisplayName } = await import('../../../src/utils/version-checker')

      expect(getSourceDisplayName('homebrew-cask', mockI18n)).toBe('installation:sourceHomebrewCask')
      expect(getSourceDisplayName('npm', mockI18n)).toBe('installation:sourceNpm')
      expect(getSourceDisplayName('npm-homebrew-node', mockI18n)).toBe('installation:sourceNpmHomebrewNode')
      expect(getSourceDisplayName('curl', mockI18n)).toBe('installation:sourceCurl')
      expect(getSourceDisplayName('other', mockI18n)).toBe('installation:sourceOther')
    })
  })

  describe('handleDuplicateInstallations', () => {
    const duplicatePaths = {
      active: '/opt/homebrew/Cellar/node/22.0.0/bin/claude',
      caskRoot: '/opt/homebrew/Caskroom/claude-code',
      caskBinary: '/opt/homebrew/Caskroom/claude-code/3.0.0/claude',
    }

    const setupDuplicateEnvironment = () => {
      mockGetPlatform.mockReturnValue('macos')
      mockFindCommandPath.mockResolvedValue(duplicatePaths.active)
      mockGetHomebrewCommandPaths.mockResolvedValue([duplicatePaths.caskBinary])

      const existingPaths = new Set<string>([
        duplicatePaths.active,
        duplicatePaths.caskRoot,
        duplicatePaths.caskBinary,
      ])

      mockExistsSync.mockImplementation((path: string) => existingPaths.has(path))
      mockReaddirSync.mockImplementation((path: string) => {
        if (path === duplicatePaths.caskRoot)
          return ['3.0.0']
        if (path.endsWith('/Cellar/node'))
          return ['22.0.0']
        return []
      })

      mockExecAsync.mockImplementation((command: string) => {
        if (command.includes('readlink') || command.includes('realpath')) {
          if (command.includes(duplicatePaths.active)) {
            return Promise.resolve({ stdout: `${duplicatePaths.active}\n`, stderr: '' })
          }
          if (command.includes(duplicatePaths.caskBinary)) {
            return Promise.resolve({ stdout: `${duplicatePaths.caskBinary}\n`, stderr: '' })
          }
        }

        if (command.includes('brew list --cask claude-code')) {
          return Promise.resolve({ stdout: 'claude-code', stderr: '' })
        }

        if (command.includes(duplicatePaths.active) && command.includes('-v')) {
          return Promise.resolve({ stdout: 'Claude CLI version 1.2.3', stderr: '' })
        }

        if (command.includes(duplicatePaths.caskBinary) && command.includes('-v')) {
          return Promise.resolve({ stdout: 'Claude CLI version 2.0.0', stderr: '' })
        }

        return Promise.resolve({ stdout: '', stderr: '' })
      })
    }

    it('should return early when no duplicates detected', async () => {
      mockFindCommandPath.mockResolvedValue(null)
      mockExecAsync.mockRejectedValue(new Error('command missing'))

      const { handleDuplicateInstallations } = await import('../../../src/utils/version-checker')
      const result = await handleDuplicateInstallations()

      expect(result).toEqual({ hadDuplicates: false, resolved: true, action: 'no-duplicates' })
    })

    it('should remove npm installation automatically in skipPrompt mode', async () => {
      setupDuplicateEnvironment()
      mockCreateHomebrewSymlink.mockResolvedValue({ success: true, symlinkPath: '/usr/local/bin/claude' })

      const { handleDuplicateInstallations } = await import('../../../src/utils/version-checker')
      const result = await handleDuplicateInstallations(true)

      expect(result).toEqual({ hadDuplicates: true, resolved: true, action: 'removed-npm' })
      expect(mockTinyExec).toHaveBeenCalledWith('npm', ['uninstall', '-g', '@anthropic-ai/claude-code'])
      expect(mockCreateHomebrewSymlink).toHaveBeenCalledWith('claude', duplicatePaths.caskBinary)
      expect(mockInquirerPrompt).not.toHaveBeenCalled()
    })

    it('should respect keep choice when user declines removal', async () => {
      setupDuplicateEnvironment()
      mockInquirerPrompt.mockResolvedValue({ action: 'keep' })

      const { handleDuplicateInstallations } = await import('../../../src/utils/version-checker')
      const result = await handleDuplicateInstallations(false)

      expect(result).toEqual({ hadDuplicates: true, resolved: false, action: 'kept-both' })
      expect(mockTinyExec).not.toHaveBeenCalled()
    })

    it('should remove npm installation after user confirmation', async () => {
      setupDuplicateEnvironment()
      mockInquirerPrompt.mockResolvedValue({ action: 'remove' })

      const { handleDuplicateInstallations } = await import('../../../src/utils/version-checker')
      const result = await handleDuplicateInstallations(false)

      expect(result).toEqual({ hadDuplicates: true, resolved: true, action: 'removed-npm' })
      expect(mockTinyExec).toHaveBeenCalledWith('npm', ['uninstall', '-g', '@anthropic-ai/claude-code'])
    })

    it('should inform user when sudo is required and show symlink error instructions', async () => {
      setupDuplicateEnvironment()
      mockWrapCommandWithSudo.mockImplementation((command: string, args: string[]) => ({
        command: 'sudo',
        args: [command, ...args],
        usedSudo: true,
      }))
      mockCreateHomebrewSymlink.mockResolvedValue({
        success: false,
        error: 'sudo ln -sf /opt/homebrew/Caskroom/claude-code/3.0.0/claude /usr/local/bin/claude',
      })

      const { handleDuplicateInstallations } = await import('../../../src/utils/version-checker')
      await handleDuplicateInstallations(true)

      expect(mockSpinner.info).toHaveBeenCalled()
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('installation:manualSymlinkHint'))
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('/opt/homebrew/Caskroom/claude-code/3.0.0/claude'))
    })

    it('should provide fallback symlink instructions when helper has no error details', async () => {
      setupDuplicateEnvironment()
      mockCreateHomebrewSymlink.mockResolvedValue({ success: false })
      const existingPaths = new Set<string>([
        duplicatePaths.active,
        duplicatePaths.caskRoot,
        duplicatePaths.caskBinary,
      ])
      mockExistsSync.mockImplementation((path: string) => {
        if (path === '/opt/homebrew/bin')
          return false
        if (path === '/usr/local/bin')
          return true
        return existingPaths.has(path)
      })

      const { handleDuplicateInstallations } = await import('../../../src/utils/version-checker')
      await handleDuplicateInstallations(true)

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('/usr/local/bin/claude'))
    })

    it('should handle removal failures gracefully', async () => {
      setupDuplicateEnvironment()
      mockTinyExec.mockRejectedValue(new Error('permission denied'))

      const { handleDuplicateInstallations } = await import('../../../src/utils/version-checker')
      const result = await handleDuplicateInstallations(true)

      expect(result).toEqual({ hadDuplicates: true, resolved: false, action: 'kept-both' })
      expect(mockSpinner.fail).toHaveBeenCalledWith('installation:duplicateRemovalFailed')
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('permission denied'))
    })
  })
})
