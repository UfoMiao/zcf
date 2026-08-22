import { exec } from 'tinyexec'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCodeToolDefinition } from '../../../src/code-tools'
import { updateCodeToolPackage } from '../../../src/code-tools/package-manager'

vi.mock('tinyexec', () => ({
  exec: vi.fn(),
}))
vi.mock('../../../src/utils/platform', () => ({
  commandExists: vi.fn(),
}))

describe('updateCodeToolPackage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses Homebrew when it owns the configured cask', async () => {
    vi.mocked(exec)
      .mockResolvedValueOnce({ exitCode: 0 } as any)
      .mockResolvedValueOnce({ exitCode: 0 } as any)

    await updateCodeToolPackage(getCodeToolDefinition('codex'))

    expect(exec).toHaveBeenNthCalledWith(1, 'brew', ['list', '--cask', 'codex'])
    expect(exec).toHaveBeenNthCalledWith(2, 'brew', ['upgrade', '--cask', 'codex'])
  })

  it('falls back to npm when Homebrew does not own the package', async () => {
    vi.mocked(exec)
      .mockResolvedValueOnce({ exitCode: 1 } as any)
      .mockResolvedValueOnce({ exitCode: 0 } as any)

    await updateCodeToolPackage(getCodeToolDefinition('codex'))

    expect(exec).toHaveBeenLastCalledWith('npm', [
      'install',
      '-g',
      '@openai/codex@latest',
    ])
  })

  it('fails fast when Homebrew upgrade returns a non-zero exit code', async () => {
    vi.mocked(exec)
      .mockResolvedValueOnce({ exitCode: 0 } as any)
      .mockResolvedValueOnce({ exitCode: 42 } as any)

    await expect(updateCodeToolPackage(getCodeToolDefinition('codex'))).rejects.toThrow(
      /homebrew|42/,
    )
    expect(exec).toHaveBeenCalledTimes(2)
    expect(exec).not.toHaveBeenCalledWith('npm', expect.anything())
  })

  it('fails fast when npm install returns a non-zero exit code', async () => {
    vi.mocked(exec)
      .mockResolvedValueOnce({ exitCode: 1 } as any)
      .mockResolvedValueOnce({ exitCode: 42 } as any)

    await expect(updateCodeToolPackage(getCodeToolDefinition('codex'))).rejects.toThrow(
      /npm|42/,
    )
  })
})
