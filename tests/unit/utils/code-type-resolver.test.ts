import { describe, expect, it, vi } from 'vitest'
import { resolveCodeType } from '../../../src/utils/code-type-resolver'

// Mock readZcfConfigAsync (codeToolType is now always claude-code)
vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfigAsync: vi.fn().mockResolvedValue({
    codeToolType: 'claude-code',
  }),
}))

// Mock i18n
vi.mock('../../../src/i18n', () => ({
  i18n: {
    t: vi.fn((key, variables) => {
      if (key === 'errors:invalidCodeType') {
        const template = 'Invalid code type: "{value}". Valid options are: {validOptions}. Using default: {defaultValue}.'
        return template.replace(/\{(\w+)\}/g, (match: string, varName: string) => variables?.[varName] || match)
      }
      return key
    }),
  },
}))

describe('resolveCodeType', () => {
  it('should resolve cc abbreviation to claude-code', async () => {
    const result = await resolveCodeType('cc')
    expect(result).toBe('claude-code')
  })

  it('should accept full code type names', async () => {
    const result = await resolveCodeType('claude-code')
    expect(result).toBe('claude-code')
  })

  it('should be case insensitive', async () => {
    const result = await resolveCodeType('CC')
    expect(result).toBe('claude-code')
  })

  it('should throw error for invalid code type (codex no longer supported)', async () => {
    await expect(resolveCodeType('codex')).rejects.toThrow(
      'Invalid code type: "codex". Valid options are: cc, claude-code. Using default: claude-code.',
    )
  })

  it('should throw error for invalid code type', async () => {
    await expect(resolveCodeType('invalid')).rejects.toThrow(
      'Invalid code type: "invalid". Valid options are: cc, claude-code. Using default: claude-code.',
    )
  })

  it('should return default when no parameter provided', async () => {
    const result = await resolveCodeType()
    expect(result).toBe('claude-code')
  })

  it('should use DEFAULT_CODE_TOOL_TYPE when config read fails in error path', async () => {
    const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

    // Mock config read to fail
    vi.mocked(readZcfConfigAsync).mockRejectedValueOnce(new Error('Config read failed'))

    await expect(resolveCodeType('invalid')).rejects.toThrow(
      'Invalid code type: "invalid". Valid options are: cc, claude-code. Using default: claude-code.',
    )
  })

  it('should handle invalid config value in error path', async () => {
    const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

    // Mock config read to return invalid code type
    vi.mocked(readZcfConfigAsync).mockResolvedValueOnce({
      codeToolType: 'invalid-type',
    } as any)

    await expect(resolveCodeType('wrong')).rejects.toThrow(
      'Invalid code type: "wrong". Valid options are: cc, claude-code. Using default: claude-code.',
    )
  })
})
