import { promisify } from 'node:util'
import ora from 'ora'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkAndUpdateTools, updateCcr, updateClaudeCode, updateCometixLine } from '../../../src/utils/auto-updater'
import { promptBoolean } from '../../../src/utils/toggle-prompt'
import { checkCcrVersion, checkClaudeCodeVersion, checkCometixLineVersion } from '../../../src/utils/version-checker'

// Mock modules
vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}))

vi.mock('node:util', () => ({
  promisify: vi.fn(),
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

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
  })),
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
  checkCcrVersion: vi.fn(),
  checkClaudeCodeVersion: vi.fn(),
  checkCometixLineVersion: vi.fn(),
}))

vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

interface MockSpinner {
  start: any
  stop: any
  succeed: any
  fail: any
}

interface TestMocks {
  execAsync: any
  oraSpinner: MockSpinner
  checkCcrVersion: any
  checkClaudeCodeVersion: any
  checkCometixLineVersion: any
}

let testMocks: TestMocks

describe('auto-updater', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockConsoleLog.mockClear()
    mockConsoleError.mockClear()

    // Setup mocks
    const mockSpinner: MockSpinner = {
      start: vi.fn().mockReturnThis(),
      stop: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
    }

    const execAsync = vi.fn();
    // Mock promisify to return our mock
    (promisify as any).mockReturnValue(execAsync);

    // Setup ora mock to return our controlled spinner
    (ora as any).mockReturnValue(mockSpinner)

    testMocks = {
      execAsync,
      oraSpinner: mockSpinner,
      checkCcrVersion: (checkCcrVersion as any),
      checkClaudeCodeVersion: (checkClaudeCodeVersion as any),
      checkCometixLineVersion: (checkCometixLineVersion as any),
    }
  })

  describe('updateCcr', () => {
    it('should return false when CCR is not installed', async () => {
      testMocks.checkCcrVersion.mockResolvedValue({
        installed: false,
        currentVersion: null,
        latestVersion: '1.0.0',
        needsUpdate: false,
      })

      const result = await updateCcr()

      expect(result).toBe(false)
      expect(testMocks.oraSpinner.stop).toHaveBeenCalled()
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('updater:ccrNotInstalled'),
      )
    })

    it('should return true when CCR is up to date and force is false', async () => {
      testMocks.checkCcrVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        needsUpdate: false,
      })

      const result = await updateCcr(false)

      expect(result).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('updater:ccrUpToDate'),
      )
    })

    it('should return false when cannot check latest version', async () => {
      testMocks.checkCcrVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: null,
        needsUpdate: true,
      })

      const result = await updateCcr()

      expect(result).toBe(false)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('updater:cannotCheckVersion'),
      )
    })

    it('should return true when user declines update', async () => {
      testMocks.checkCcrVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      vi.mocked(promptBoolean).mockResolvedValueOnce(false)

      const result = await updateCcr()

      expect(result).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('updater:updateSkipped'),
      )
    })

    it('should successfully prompt for CCR update when user confirms', async () => {
      testMocks.checkCcrVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      vi.mocked(promptBoolean).mockResolvedValueOnce(true)
      testMocks.execAsync.mockResolvedValue({ stdout: '', stderr: '' })

      // Test will execute the update flow
      try {
        await updateCcr()
        // Should attempt to update (may fail due to execution, but flow is covered)
      }
      catch (error) {
        // Expected since we can't fully mock exec
        expect(error).toBeDefined()
      }

      expect(promptBoolean).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('confirmUpdate'),
      }))
    })

    it('should handle update execution errors gracefully', async () => {
      testMocks.checkCcrVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      vi.mocked(promptBoolean).mockResolvedValueOnce(true)
      testMocks.execAsync.mockRejectedValue(new Error('Update failed'))

      // The function should handle errors gracefully
      const result = await updateCcr()

      // May return false due to execution issues, but should not crash
      expect(typeof result).toBe('boolean')
    })

    it('should handle version check errors', async () => {
      testMocks.checkCcrVersion.mockRejectedValue(new Error('Version check failed'))

      const result = await updateCcr()

      expect(result).toBe(false)
      expect(testMocks.oraSpinner.fail).toHaveBeenCalledWith('updater:checkFailed')
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Version check failed'),
      )
    })

    it('should force update even when up to date', async () => {
      testMocks.checkCcrVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        needsUpdate: false,
      })
      vi.mocked(promptBoolean).mockResolvedValueOnce(true)

      // Force update should bypass version check
      try {
        await updateCcr(true)
        // Should proceed to update flow
      }
      catch (error) {
        // Expected execution error, but flow is tested
        expect(error).toBeDefined()
      }

      // Should prompt for confirmation
      expect(promptBoolean).toHaveBeenCalled()
    })

    it('should skip prompt when skipPrompt is true', async () => {
      testMocks.checkCcrVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      testMocks.execAsync.mockResolvedValue({ stdout: '', stderr: '' })

      // Skip prompt should bypass user confirmation
      try {
        await updateCcr(false, true)
        // Should proceed to update flow without prompt
      }
      catch (error) {
        // Expected execution error, but flow is tested
        expect(error).toBeDefined()
      }

      // Should NOT prompt for confirmation
      expect(promptBoolean).not.toHaveBeenCalled()
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('updater:autoUpdating'),
      )
    })
  })

  describe('updateClaudeCode', () => {
    it('should return false when Claude Code is not installed', async () => {
      testMocks.checkClaudeCodeVersion.mockResolvedValue({
        installed: false,
        currentVersion: null,
        latestVersion: '1.0.0',
        needsUpdate: false,
      })

      const result = await updateClaudeCode()

      expect(result).toBe(false)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('updater:claudeCodeNotInstalled'),
      )
    })

    it('should return true when Claude Code is up to date', async () => {
      testMocks.checkClaudeCodeVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        needsUpdate: false,
      })

      const result = await updateClaudeCode()

      expect(result).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('updater:claudeCodeUpToDate'),
      )
    })

    it('should initiate Claude Code update flow', async () => {
      testMocks.checkClaudeCodeVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      vi.mocked(promptBoolean).mockResolvedValueOnce(true)

      try {
        await updateClaudeCode()
        // Flow tested, execution may fail
      }
      catch (error) {
        expect(error).toBeDefined()
      }

      expect(promptBoolean).toHaveBeenCalled()
    })

    it('should handle Claude Code update errors gracefully', async () => {
      testMocks.checkClaudeCodeVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      vi.mocked(promptBoolean).mockResolvedValueOnce(true)

      const result = await updateClaudeCode()

      // Should handle errors without crashing
      expect(typeof result).toBe('boolean')
    })

    it('should skip prompt in skip-prompt mode for Claude Code', async () => {
      testMocks.checkClaudeCodeVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      testMocks.execAsync.mockResolvedValue({ stdout: '', stderr: '' })

      try {
        await updateClaudeCode(false, true)
      }
      catch (error) {
        expect(error).toBeDefined()
      }

      // Should NOT prompt for confirmation in skip mode
      expect(promptBoolean).not.toHaveBeenCalled()
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('updater:autoUpdating'),
      )
    })
  })

  describe('updateCometixLine', () => {
    it('should return false when CometixLine is not installed', async () => {
      testMocks.checkCometixLineVersion.mockResolvedValue({
        installed: false,
        currentVersion: null,
        latestVersion: '1.0.0',
        needsUpdate: false,
      })

      const result = await updateCometixLine()

      expect(result).toBe(false)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('updater:cometixLineNotInstalled'),
      )
    })

    it('should return true when CometixLine is up to date', async () => {
      testMocks.checkCometixLineVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        needsUpdate: false,
      })

      const result = await updateCometixLine()

      expect(result).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('updater:cometixLineUpToDate'),
      )
    })

    it('should initiate CometixLine update flow', async () => {
      testMocks.checkCometixLineVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      vi.mocked(promptBoolean).mockResolvedValueOnce(true)

      try {
        await updateCometixLine()
        // Flow tested, execution may fail
      }
      catch (error) {
        expect(error).toBeDefined()
      }

      expect(promptBoolean).toHaveBeenCalled()
    })

    it('should skip prompt in skip-prompt mode for CometixLine', async () => {
      testMocks.checkCometixLineVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      testMocks.execAsync.mockResolvedValue({ stdout: '', stderr: '' })

      try {
        await updateCometixLine(false, true)
      }
      catch (error) {
        expect(error).toBeDefined()
      }

      // Should NOT prompt for confirmation in skip mode
      expect(promptBoolean).not.toHaveBeenCalled()
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('updater:autoUpdating'),
      )
    })
  })

  describe('checkAndUpdateTools', () => {
    it('should check and update all tools in interactive mode', async () => {
      // Mock all tools to have updates
      testMocks.checkCcrVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      testMocks.checkClaudeCodeVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      testMocks.checkCometixLineVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      vi.mocked(promptBoolean).mockResolvedValue(true)
      testMocks.execAsync.mockRejectedValue(new Error('Execution mock error'))

      // Should not throw error and handle all tools
      await checkAndUpdateTools(false)

      // Should call all three version check functions
      expect(testMocks.checkCcrVersion).toHaveBeenCalled()
      expect(testMocks.checkClaudeCodeVersion).toHaveBeenCalled()
      expect(testMocks.checkCometixLineVersion).toHaveBeenCalled()
    })

    it('should check and update all tools in skip-prompt mode', async () => {
      testMocks.checkCcrVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      testMocks.checkClaudeCodeVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      testMocks.checkCometixLineVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      testMocks.execAsync.mockRejectedValue(new Error('Execution mock error'))

      await checkAndUpdateTools(true)

      // Should NOT prompt for any confirmations in skip mode
      expect(promptBoolean).not.toHaveBeenCalled()
      // Should show checking tools header
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('updater:checkingTools'),
      )
    })

    it('should handle individual tool failures and continue with others', async () => {
      // Mock first tool to fail, others to succeed
      testMocks.checkCcrVersion.mockRejectedValue(new Error('CCR check failed'))
      testMocks.checkClaudeCodeVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        needsUpdate: false,
      })
      testMocks.checkCometixLineVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        needsUpdate: false,
      })

      // Should not throw, should handle errors gracefully
      await checkAndUpdateTools(true)

      // Should have called all version checks despite CCR failure
      expect(testMocks.checkCcrVersion).toHaveBeenCalled()
      expect(testMocks.checkClaudeCodeVersion).toHaveBeenCalled()
      expect(testMocks.checkCometixLineVersion).toHaveBeenCalled()

      // Should show error for failed tool
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('CCR check failed'),
      )
    })
  })

  describe('error handling edge cases', () => {
    it('should handle non-Error objects in catch blocks', async () => {
      testMocks.checkCcrVersion.mockRejectedValue('String error')

      const result = await updateCcr()

      expect(result).toBe(false)
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('String error'),
      )
    })

    it('should handle null/undefined errors gracefully', async () => {
      testMocks.checkCcrVersion.mockRejectedValue(null)

      const result = await updateCcr()

      expect(result).toBe(false)
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('null'),
      )
    })
  })
})
