import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkAndUpdateTools, execWithSudoIfNeeded, updateCcsSelf, updateClaudeCode } from '../../../src/utils/auto-updater'
import { promptBoolean } from '../../../src/utils/toggle-prompt'
import { checkClaudeCodeVersion, getLatestVersion } from '../../../src/utils/version-checker'

// Mock package version so self-update comparisons are deterministic
vi.mock('../../../package.json', () => ({
  version: '1.0.0',
}))

// Mock tinyexec
const execMock = vi.hoisted(() => vi.fn())

vi.mock('tinyexec', () => ({
  exec: execMock,
}))

// Mock platform module for sudo detection
const shouldUseSudoMock = vi.hoisted(() => vi.fn(() => false))

vi.mock('../../../src/utils/platform', () => ({
  shouldUseSudoForGlobalInstall: shouldUseSudoMock,
}))

vi.mock('ansis', () => ({
  default: {
    yellow: vi.fn((text: string) => text),
    green: vi.fn((text: string) => text),
    cyan: vi.fn((text: string) => text),
    gray: vi.fn((text: string) => text),
    red: vi.fn((text: string) => text),
    bold: {
      cyan: vi.fn((text: string) => text),
    },
  },
}))

const oraMock = vi.hoisted(() => vi.fn(() => ({
  start: vi.fn().mockReturnThis(),
  stop: vi.fn(),
  succeed: vi.fn(),
  fail: vi.fn(),
})))

vi.mock('ora', () => ({
  default: oraMock,
}))

vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  format: vi.fn((template: string, params: Record<string, string>) => {
    return template.replace(/\{(\w+)\}/g, (_, key) => params[key] || `{${key}}`)
  }),
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

vi.mock('../../../src/utils/version-checker', () => ({
  checkClaudeCodeVersion: vi.fn(),
  getLatestVersion: vi.fn(),
  handleDuplicateInstallations: vi.fn().mockResolvedValue({
    hadDuplicates: false,
    resolved: true,
    action: 'no-duplicates',
  }),
}))

vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})

const mockedGetLatestVersion = vi.mocked(getLatestVersion)
const mockedCheckClaudeCodeVersion = vi.mocked(checkClaudeCodeVersion)
const mockedPromptBoolean = vi.mocked(promptBoolean)

describe('auto-updater', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    execMock.mockReset()
    execMock.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    shouldUseSudoMock.mockReset()
    shouldUseSudoMock.mockReturnValue(false)
    oraMock.mockReturnValue({
      start: vi.fn().mockReturnThis(),
      stop: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
    })
  })

  describe('execWithSudoIfNeeded', () => {
    it('should run the command directly when sudo is not needed', async () => {
      shouldUseSudoMock.mockReturnValue(false)

      const result = await execWithSudoIfNeeded('npm', ['install', '-g', 'foo'])

      expect(result.usedSudo).toBe(false)
      expect(execMock).toHaveBeenCalledWith('npm', ['install', '-g', 'foo'])
    })

    it('should prefix with sudo when needed', async () => {
      shouldUseSudoMock.mockReturnValue(true)

      const result = await execWithSudoIfNeeded('npm', ['install', '-g', 'foo'])

      expect(result.usedSudo).toBe(true)
      expect(execMock).toHaveBeenCalledWith('sudo', ['npm', 'install', '-g', 'foo'])
    })

    it('should throw when the command exits with a non-zero code', async () => {
      execMock.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'boom' })

      await expect(execWithSudoIfNeeded('npm', ['install'])).rejects.toThrow('boom')
    })
  })

  describe('updateCcsSelf', () => {
    it('should report up to date when versions match', async () => {
      mockedGetLatestVersion.mockResolvedValue('1.0.0')

      const result = await updateCcsSelf()

      expect(result).toBe(true)
      expect(execMock).not.toHaveBeenCalled()
    })

    it('should return false when latest version cannot be determined', async () => {
      mockedGetLatestVersion.mockResolvedValue(null)

      const result = await updateCcsSelf()

      expect(result).toBe(false)
    })

    it('should update when a newer version is available and confirmed', async () => {
      mockedGetLatestVersion.mockResolvedValue('2.0.0')
      mockedPromptBoolean.mockResolvedValue(true)

      const result = await updateCcsSelf()

      expect(result).toBe(true)
      expect(execMock).toHaveBeenCalledWith('npm', ['install', '-g', '@xwm111/ccs@latest'])
    })

    it('should skip the update when the user declines', async () => {
      mockedGetLatestVersion.mockResolvedValue('2.0.0')
      mockedPromptBoolean.mockResolvedValue(false)

      const result = await updateCcsSelf()

      expect(result).toBe(true)
      expect(execMock).not.toHaveBeenCalled()
    })

    it('should auto-update in skip-prompt mode', async () => {
      mockedGetLatestVersion.mockResolvedValue('2.0.0')

      const result = await updateCcsSelf(false, true)

      expect(result).toBe(true)
      expect(mockedPromptBoolean).not.toHaveBeenCalled()
      expect(execMock).toHaveBeenCalledWith('npm', ['install', '-g', '@xwm111/ccs@latest'])
    })

    it('should return false when the npm install fails', async () => {
      mockedGetLatestVersion.mockResolvedValue('2.0.0')
      execMock.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'install error' })

      const result = await updateCcsSelf(false, true)

      expect(result).toBe(false)
    })
  })

  describe('updateClaudeCode', () => {
    it('should return false when Claude Code is not installed', async () => {
      mockedCheckClaudeCodeVersion.mockResolvedValue({
        installed: false,
        currentVersion: null,
        latestVersion: null,
        needsUpdate: false,
        isHomebrew: false,
      } as any)

      const result = await updateClaudeCode()

      expect(result).toBe(false)
    })

    it('should report up to date when no update is needed', async () => {
      mockedCheckClaudeCodeVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        needsUpdate: false,
        isHomebrew: false,
      } as any)

      const result = await updateClaudeCode()

      expect(result).toBe(true)
    })

    it('should update via claude update when confirmed', async () => {
      mockedCheckClaudeCodeVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
        isHomebrew: false,
      } as any)
      mockedPromptBoolean.mockResolvedValue(true)

      const result = await updateClaudeCode()

      expect(result).toBe(true)
      expect(execMock).toHaveBeenCalledWith('claude', ['update'])
    })

    it('should use brew upgrade for Homebrew installations', async () => {
      mockedCheckClaudeCodeVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
        isHomebrew: true,
      } as any)

      const result = await updateClaudeCode(false, true)

      expect(result).toBe(true)
      expect(execMock).toHaveBeenCalledWith('brew', ['upgrade', '--cask', 'claude-code'])
    })
  })

  describe('checkAndUpdateTools', () => {
    it('should check ccs self and Claude Code', async () => {
      mockedGetLatestVersion.mockResolvedValue('1.0.0')
      mockedCheckClaudeCodeVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        needsUpdate: false,
        isHomebrew: false,
      } as any)

      await checkAndUpdateTools(true)

      expect(mockedGetLatestVersion).toHaveBeenCalledWith('@xwm111/ccs')
      expect(mockedCheckClaudeCodeVersion).toHaveBeenCalled()
    })

    it('should not throw when self-update check errors out', async () => {
      mockedGetLatestVersion.mockRejectedValue(new Error('network'))
      mockedCheckClaudeCodeVersion.mockResolvedValue({
        installed: false,
        currentVersion: null,
        latestVersion: null,
        needsUpdate: false,
        isHomebrew: false,
      } as any)

      await expect(checkAndUpdateTools(true)).resolves.not.toThrow()
    })
  })

  afterEach(() => {
    mockConsoleLog.mockClear()
    mockConsoleError.mockClear()
  })
})
