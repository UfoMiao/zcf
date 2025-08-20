import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock setupCommands before importing cli
vi.mock('../../src/cli-setup', () => ({
  setupCommands: vi.fn(),
}))

// Mock cac
vi.mock('cac', () => ({
  default: vi.fn(() => ({
    parse: vi.fn(),
  })),
}))

describe('cli main entry', () => {
  let originalArgv: string[]

  beforeEach(() => {
    originalArgv = process.argv
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.argv = originalArgv
    vi.restoreAllMocks()
  })

  it('should create cli instance and setup commands', async () => {
    process.argv = ['node', 'zcf']

    const cac = (await import('cac')).default as any
    const { setupCommands } = await import('../../src/cli-setup')

    // Import cli to trigger execution
    await import('../../src/cli')

    // Check cac was called with correct name
    expect(cac).toHaveBeenCalledWith('zcf')

    // Check setupCommands was called
    expect(setupCommands).toHaveBeenCalled()
  })

  it('should parse command line arguments', async () => {
    process.argv = ['node', 'zcf', 'init', '--force']

    const parseMock = vi.fn()
    const cliMock = {
      parse: parseMock,
    }

    const cac = (await import('cac')).default as any
    cac.mockReturnValue(cliMock)

    // Re-import to trigger with new mock
    vi.resetModules()
    await import('../../src/cli')

    // Check parse was called
    expect(parseMock).toHaveBeenCalled()
  })
})
