import type { CheckUpdatesOptions } from '../../src/commands/check-updates'
import { describe, expect, it, vi } from 'vitest'
import { checkUpdates } from '../../src/commands/check-updates'

// Mock dependencies
vi.mock('../../src/utils/code-type-resolver', () => ({
  resolveCodeType: vi.fn(),
}))

vi.mock('../../src/utils/tool-update-scheduler', () => ({
  ToolUpdateScheduler: vi.fn().mockImplementation(() => ({
    updateByCodeType: vi.fn(),
  })) as any,
}))

describe('check updates command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkUpdates', () => {
    it('should resolve code type and call scheduler update', async () => {
      const { resolveCodeType } = await import('../../src/utils/code-type-resolver')
      const { ToolUpdateScheduler } = await import('../../src/utils/tool-update-scheduler')

      vi.mocked(resolveCodeType).mockResolvedValue('claude-code')
      const mockUpdate = vi.fn()
      vi.mocked(ToolUpdateScheduler).mockImplementation(() => ({
        updateByCodeType: mockUpdate,
      }) as any)

      const options: CheckUpdatesOptions = {
        codeType: 'cc',
        skipPrompt: false,
      }

      await checkUpdates(options)

      expect(resolveCodeType).toHaveBeenCalledWith('cc')
      expect(mockUpdate).toHaveBeenCalledWith('claude-code', false)
    })

    it('should use skipPrompt option correctly', async () => {
      const { resolveCodeType } = await import('../../src/utils/code-type-resolver')
      const { ToolUpdateScheduler } = await import('../../src/utils/tool-update-scheduler')

      vi.mocked(resolveCodeType).mockResolvedValue('codex')
      const mockUpdate = vi.fn()
      vi.mocked(ToolUpdateScheduler).mockImplementation(() => ({
        updateByCodeType: mockUpdate,
      }) as any)

      const options: CheckUpdatesOptions = {
        codeType: 'cx',
        skipPrompt: true,
      }

      await checkUpdates(options)

      expect(mockUpdate).toHaveBeenCalledWith('codex', true)
    })

    it('should use default code type when none provided', async () => {
      const { resolveCodeType } = await import('../../src/utils/code-type-resolver')
      const { ToolUpdateScheduler } = await import('../../src/utils/tool-update-scheduler')

      vi.mocked(resolveCodeType).mockResolvedValue('claude-code')
      const mockUpdate = vi.fn()
      vi.mocked(ToolUpdateScheduler).mockImplementation(() => ({
        updateByCodeType: mockUpdate,
      }) as any)

      const options: CheckUpdatesOptions = {}

      await checkUpdates(options)

      expect(resolveCodeType).toHaveBeenCalledWith(undefined)
      expect(mockUpdate).toHaveBeenCalledWith('claude-code', false)
    })

    it('should handle scheduler errors correctly', async () => {
      const { resolveCodeType } = await import('../../src/utils/code-type-resolver')
      const { ToolUpdateScheduler } = await import('../../src/utils/tool-update-scheduler')

      vi.mocked(resolveCodeType).mockResolvedValue('claude-code')
      const mockError = new Error('Update failed')
      const mockUpdate = vi.fn().mockRejectedValue(mockError)
      vi.mocked(ToolUpdateScheduler).mockImplementation(() => ({
        updateByCodeType: mockUpdate,
      }) as any)

      // Mock process.exit to prevent test termination
      const mockExit = vi.fn(() => {
        throw new Error('process.exit called')
      })
      const originalExit = process.exit
      process.exit = mockExit

      const options: CheckUpdatesOptions = {
        codeType: 'cc',
      }

      try {
        await checkUpdates(options)
      }
      catch {
        // Expected error from process.exit mock
      }

      expect(mockExit).toHaveBeenCalledWith(1)

      // Restore original process.exit
      process.exit = originalExit
    })

    it('should handle code type resolution errors correctly', async () => {
      const { resolveCodeType } = await import('../../src/utils/code-type-resolver')

      const mockError = new Error('Invalid code type')
      vi.mocked(resolveCodeType).mockRejectedValue(mockError)

      // Mock process.exit to prevent test termination
      const mockExit = vi.fn(() => {
        throw new Error('process.exit called')
      })
      const originalExit = process.exit
      process.exit = mockExit

      const options: CheckUpdatesOptions = {
        codeType: 'invalid',
      }

      try {
        await checkUpdates(options)
      }
      catch {
        // Expected error from process.exit mock
      }

      expect(mockExit).toHaveBeenCalledWith(1)

      // Restore original process.exit
      process.exit = originalExit
    })

    it('should maintain backward compatibility with existing interface', async () => {
      const { resolveCodeType } = await import('../../src/utils/code-type-resolver')
      const { ToolUpdateScheduler } = await import('../../src/utils/tool-update-scheduler')

      vi.mocked(resolveCodeType).mockResolvedValue('claude-code')
      const mockUpdate = vi.fn()
      vi.mocked(ToolUpdateScheduler).mockImplementation(() => ({
        updateByCodeType: mockUpdate,
      }) as any)

      // Call with no options (existing interface)
      await checkUpdates()

      expect(resolveCodeType).toHaveBeenCalledWith(undefined)
      expect(mockUpdate).toHaveBeenCalledWith('claude-code', false)
    })
  })
})
