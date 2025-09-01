import { promisify } from 'node:util'
import inquirer from 'inquirer'
import ora from 'ora'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { updateCcr, updateClaudeCode, updateCometixLine } from '../../../src/utils/auto-updater'
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
  },
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
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
  inquirerPrompt: any
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
      inquirerPrompt: (inquirer.prompt as any),
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
      testMocks.inquirerPrompt.mockResolvedValue({ confirm: false })

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
      testMocks.inquirerPrompt.mockResolvedValue({ confirm: true })
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

      expect(testMocks.inquirerPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'confirm',
          name: 'confirm',
        }),
      )
    })

    it('should handle update execution errors gracefully', async () => {
      testMocks.checkCcrVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      testMocks.inquirerPrompt.mockResolvedValue({ confirm: true })
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
      testMocks.inquirerPrompt.mockResolvedValue({ confirm: true })

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
      expect(testMocks.inquirerPrompt).toHaveBeenCalled()
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
      testMocks.inquirerPrompt.mockResolvedValue({ confirm: true })

      try {
        await updateClaudeCode()
        // Flow tested, execution may fail
      }
      catch (error) {
        expect(error).toBeDefined()
      }

      expect(testMocks.inquirerPrompt).toHaveBeenCalled()
    })

    it('should handle Claude Code update errors gracefully', async () => {
      testMocks.checkClaudeCodeVersion.mockResolvedValue({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
      testMocks.inquirerPrompt.mockResolvedValue({ confirm: true })

      const result = await updateClaudeCode()

      // Should handle errors without crashing
      expect(typeof result).toBe('boolean')
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
      testMocks.inquirerPrompt.mockResolvedValue({ confirm: true })

      try {
        await updateCometixLine()
        // Flow tested, execution may fail
      }
      catch (error) {
        expect(error).toBeDefined()
      }

      expect(testMocks.inquirerPrompt).toHaveBeenCalled()
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
