import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleMultiConfigurations } from '../../../src/code-tools/multi-config'
import { readProviderDefinitions, validateProviderDefinitions } from '../../../src/code-tools/provider-profiles'
import { getCodeToolRegistry } from '../../../src/code-tools/register-builtins'

vi.mock('../../../src/code-tools/provider-profiles', () => ({
  readProviderDefinitions: vi.fn(),
  validateProviderDefinitions: vi.fn(),
}))

vi.mock('../../../src/i18n', () => ({
  i18n: {
    language: 'en',
    t: vi.fn((key: string) => key),
  },
}))

vi.mock('ansis', () => ({
  default: {
    green: (value: string) => value,
    red: (value: string) => value,
  },
}))

describe('handleMultiConfigurations', () => {
  const importDefinitions = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(getCodeToolRegistry(), 'get').mockReturnValue({
      definition: { displayNameKey: 'common:codex' },
      providers: { importDefinitions },
    } as any)
    vi.mocked(readProviderDefinitions).mockReturnValue([{ name: 'one' }] as any)
    vi.mocked(validateProviderDefinitions).mockResolvedValue(undefined)
    importDefinitions.mockResolvedValue(undefined)
  })

  it('prints the same success notice as main after a provider import', async () => {
    await handleMultiConfigurations({ apiConfigs: '[]' }, 'codex')

    expect(importDefinitions).toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('multi-config:configsAddedSuccessfully'))
  })

  it('keeps the failed reason after the shared configsFailed label', async () => {
    importDefinitions.mockRejectedValue(new Error('provider exploded'))

    await expect(handleMultiConfigurations({ apiConfigs: '[]' }, 'codex')).rejects.toThrow('provider exploded')
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('provider exploded'))
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('multi-config:configsFailed'))
  })
})
