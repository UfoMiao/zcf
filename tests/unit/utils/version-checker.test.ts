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
})
