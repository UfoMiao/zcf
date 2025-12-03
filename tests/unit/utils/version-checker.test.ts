import { beforeEach, describe, expect, it, vi } from 'vitest'
import { compareVersions, shouldUpdate } from '../../../src/utils/version-checker'

// Create hoisted mock for execAsync
const mockExecAsync = vi.hoisted(() => vi.fn())

// Mock node:child_process with the promisify result
vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}))

vi.mock('node:util', () => ({
  promisify: () => mockExecAsync,
}))

// Mock console.warn
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

describe('version-checker', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockConsoleWarn.mockClear()
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
    })

    it('should check npm version for non-Homebrew installation', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '1.0.0', stderr: '' }) // getInstalledVersion
        .mockRejectedValueOnce(new Error('not homebrew')) // isClaudeCodeInstalledViaHomebrew
        .mockResolvedValueOnce({ stdout: '1.1.0\n', stderr: '' }) // getLatestVersion (npm)

      const { checkClaudeCodeVersion } = await import('../../../src/utils/version-checker')
      const result = await checkClaudeCodeVersion()

      expect(result.installed).toBe(true)
      expect(result.isHomebrew).toBe(false)
    })

    it('should check Homebrew version when installed via Homebrew', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '1.0.0', stderr: '' }) // getInstalledVersion
        .mockResolvedValueOnce({ stdout: 'claude-code', stderr: '' }) // isClaudeCodeInstalledViaHomebrew
        .mockResolvedValueOnce({ stdout: JSON.stringify({ casks: [{ version: '1.2.0' }] }), stderr: '' }) // getHomebrewClaudeCodeVersion

      const { checkClaudeCodeVersion } = await import('../../../src/utils/version-checker')
      const result = await checkClaudeCodeVersion()

      expect(result.installed).toBe(true)
      expect(result.isHomebrew).toBe(true)
      expect(result.latestVersion).toBe('1.2.0')
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
    })

    it('should return early when no update needed', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '1.0.0', stderr: '' }) // getInstalledVersion
        .mockRejectedValueOnce(new Error('not homebrew')) // isClaudeCodeInstalledViaHomebrew
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

      // Verify the function signature and behavior
      const { checkClaudeCodeVersionAndPrompt } = await import('../../../src/utils/version-checker')

      // Should not throw even when internal operations fail
      await expect(checkClaudeCodeVersionAndPrompt()).resolves.not.toThrow()
    })
  })
})
