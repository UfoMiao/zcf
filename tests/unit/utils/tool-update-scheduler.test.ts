import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToolUpdateScheduler } from '../../../src/utils/tool-update-scheduler'

vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/auto-updater', () => ({
  checkAndUpdateTools: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/code-tools/codex', () => ({
  runCodexUpdate: vi.fn().mockResolvedValue(true),
}))

vi.mock('../../../src/utils/code-tools/codebuddy', () => ({
  runCodebuddyUpdate: vi.fn().mockResolvedValue(undefined),
}))

describe('tool update scheduler', () => {
  let scheduler: ToolUpdateScheduler

  beforeEach(() => {
    vi.clearAllMocks()
    scheduler = new ToolUpdateScheduler()
  })

  it('should update Claude Code tools', async () => {
    const { checkAndUpdateTools } = await import('../../../src/utils/auto-updater')

    await scheduler.updateByCodeType('claude-code', true)

    expect(checkAndUpdateTools).toHaveBeenCalledWith(true)
  })

  it('should update Codex tools', async () => {
    const { runCodexUpdate } = await import('../../../src/utils/code-tools/codex')

    await scheduler.updateByCodeType('codex', false)

    expect(runCodexUpdate).toHaveBeenCalledWith(false, false)
  })

  it('should update CodeBuddy tools', async () => {
    const { runCodebuddyUpdate } = await import('../../../src/utils/code-tools/codebuddy')

    await scheduler.updateByCodeType('codebuddy', true)

    expect(runCodebuddyUpdate).toHaveBeenCalledWith(false, true)
  })

  it('should throw for unsupported code type', async () => {
    await expect(scheduler.updateByCodeType('unknown' as any, false)).rejects.toThrow('Unsupported code type: unknown')
  })
})
