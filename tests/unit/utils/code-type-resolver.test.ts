import { describe, expect, it, vi } from 'vitest'
import { resolveCodeType } from '../../../src/utils/code-type-resolver'

// Mock readZcfConfigAsync
vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfigAsync: vi.fn().mockResolvedValue({
    codeToolType: 'codex',
  }),
}))

// Mock i18n
vi.mock('../../../src/i18n', () => ({
  i18n: {
    t: vi.fn((key, fallback, variables) => {
      if (key === 'errors:invalidCodeType') {
        return fallback.replace(/\{(\w+)\}/g, (match: string, varName: string) => variables?.[varName] || match)
      }
      return fallback
    }),
  },
}))

describe('resolveCodeType', () => {
  it('should resolve cc abbreviation to claude-code', async () => {
    const result = await resolveCodeType('cc')
    expect(result).toBe('claude-code')
  })

  it('should resolve cx abbreviation to codex', async () => {
    const result = await resolveCodeType('cx')
    expect(result).toBe('codex')
  })

  it('should accept full code type names', async () => {
    const result1 = await resolveCodeType('claude-code')
    expect(result1).toBe('claude-code')

    const result2 = await resolveCodeType('codex')
    expect(result2).toBe('codex')
  })

  it('should be case insensitive', async () => {
    const result1 = await resolveCodeType('CC')
    expect(result1).toBe('claude-code')

    const result2 = await resolveCodeType('CX')
    expect(result2).toBe('codex')
  })

  it('should throw error for invalid code type', async () => {
    await expect(resolveCodeType('invalid')).rejects.toThrow(
      'Invalid code type: "invalid". Valid options are: cc, cx, claude-code, codex.',
    )
  })

  it('should return default when no parameter provided', async () => {
    const result = await resolveCodeType()
    expect(result).toBe('codex') // from mocked config
  })
})
