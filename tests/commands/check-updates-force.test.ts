import type { CheckUpdatesOptions } from '../../src/commands/check-updates'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checkUpdates } from '../../src/commands/check-updates'

// Mock the dependencies
vi.mock('../../src/utils/code-type-resolver', () => ({
  resolveCodeType: vi.fn().mockResolvedValue('claude-code'),
}))

vi.mock('../../src/utils/tool-update-scheduler', () => ({
  ToolUpdateScheduler: vi.fn().mockImplementation(() => ({
    updateByCodeType: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn().mockResolvedValue(undefined),
  i18n: {
    t: vi.fn().mockImplementation((key: string) => key),
  },
}))

describe('check-updates command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle force option correctly', async () => {
    const options: CheckUpdatesOptions = {
      force: true,
    }

    await checkUpdates(options)

    const { resolveCodeType } = await import('../../src/utils/code-type-resolver')
    const { ToolUpdateScheduler } = await import('../../src/utils/tool-update-scheduler')

    expect(resolveCodeType).toHaveBeenCalledWith(undefined)
    expect(ToolUpdateScheduler).toHaveBeenCalled()
    expect(vi.mocked(ToolUpdateScheduler).mock.results[0].value.updateByCodeType).toHaveBeenCalledWith('claude-code', true)
  })

  it('should handle skip-prompt option correctly', async () => {
    const options: CheckUpdatesOptions = {
      skipPrompt: true,
    }

    await checkUpdates(options)

    const { resolveCodeType } = await import('../../src/utils/code-type-resolver')
    const { ToolUpdateScheduler } = await import('../../src/utils/tool-update-scheduler')

    expect(resolveCodeType).toHaveBeenCalledWith(undefined)
    expect(ToolUpdateScheduler).toHaveBeenCalled()
    expect(vi.mocked(ToolUpdateScheduler).mock.results[0].value.updateByCodeType).toHaveBeenCalledWith('claude-code', true)
  })

  it('should prioritize force over skip-prompt when both are provided', async () => {
    const options: CheckUpdatesOptions = {
      force: true,
      skipPrompt: false,
    }

    await checkUpdates(options)

    const { resolveCodeType } = await import('../../src/utils/code-type-resolver')
    const { ToolUpdateScheduler } = await import('../../src/utils/tool-update-scheduler')

    expect(resolveCodeType).toHaveBeenCalledWith(undefined)
    expect(ToolUpdateScheduler).toHaveBeenCalled()
    expect(vi.mocked(ToolUpdateScheduler).mock.results[0].value.updateByCodeType).toHaveBeenCalledWith('claude-code', true)
  })

  it('should default to interactive mode when neither force nor skip-prompt is provided', async () => {
    const options: CheckUpdatesOptions = {}

    await checkUpdates(options)

    const { resolveCodeType } = await import('../../src/utils/code-type-resolver')
    const { ToolUpdateScheduler } = await import('../../src/utils/tool-update-scheduler')

    expect(resolveCodeType).toHaveBeenCalledWith(undefined)
    expect(ToolUpdateScheduler).toHaveBeenCalled()
    expect(vi.mocked(ToolUpdateScheduler).mock.results[0].value.updateByCodeType).toHaveBeenCalledWith('claude-code', false)
  })

  it('should handle code-type option correctly', async () => {
    const options: CheckUpdatesOptions = {
      force: true,
      codeType: 'codex',
    }

    const { resolveCodeType } = await import('../../src/utils/code-type-resolver')
    vi.mocked(resolveCodeType).mockResolvedValue('codex')

    await checkUpdates(options)

    expect(resolveCodeType).toHaveBeenCalledWith('codex')
    const { ToolUpdateScheduler } = await import('../../src/utils/tool-update-scheduler')
    expect(ToolUpdateScheduler).toHaveBeenCalled()
    expect(vi.mocked(ToolUpdateScheduler).mock.results[0].value.updateByCodeType).toHaveBeenCalledWith('codex', true)
  })

  it('should handle errors gracefully', async () => {
    const options: CheckUpdatesOptions = {
      force: true,
    }

    const { resolveCodeType } = await import('../../src/utils/code-type-resolver')
    vi.mocked(resolveCodeType).mockRejectedValue(new Error('Invalid code type'))

    // Should handle error gracefully and default to 'claude-code' instead of throwing
    await checkUpdates(options)

    // Verify it fell back to default behavior
    expect(resolveCodeType).toHaveBeenCalledWith(undefined)
    const { ToolUpdateScheduler } = await import('../../src/utils/tool-update-scheduler')
    expect(ToolUpdateScheduler).toHaveBeenCalled()
    expect(vi.mocked(ToolUpdateScheduler).mock.results[0].value.updateByCodeType).toHaveBeenCalledWith('claude-code', true)
  })
})
