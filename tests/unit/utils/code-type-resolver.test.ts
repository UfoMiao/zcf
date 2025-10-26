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
      'Invalid code type: "invalid". Valid options are: cc, cx, claude-code, codex. Using default: codex.',
    )
  })

  it('should return default when no parameter provided', async () => {
    const result = await resolveCodeType()
    expect(result).toBe('codex') // from mocked config
  })

  it('should use DEFAULT_CODE_TOOL_TYPE when config read fails in error path', async () => {
    const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

    // Mock config read to fail
    vi.mocked(readZcfConfigAsync).mockRejectedValueOnce(new Error('Config read failed'))

    await expect(resolveCodeType('invalid')).rejects.toThrow(
      'Invalid code type: "invalid". Valid options are: cc, cx, claude-code, codex. Using default: claude-code.',
    )
  })

  it('should use config value as default when available in error path', async () => {
    const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

    // Mock config read to succeed with custom value
    vi.mocked(readZcfConfigAsync).mockResolvedValueOnce({
      codeToolType: 'codex',
    } as any)

    await expect(resolveCodeType('invalid')).rejects.toThrow(
      'Invalid code type: "invalid". Valid options are: cc, cx, claude-code, codex. Using default: codex.',
    )
  })

  it('should handle invalid config value in error path', async () => {
    const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

    // Mock config read to return invalid code type
    vi.mocked(readZcfConfigAsync).mockResolvedValueOnce({
      codeToolType: 'invalid-type',
    } as any)

    await expect(resolveCodeType('wrong')).rejects.toThrow(
      'Invalid code type: "wrong". Valid options are: cc, cx, claude-code, codex. Using default: claude-code.',
    )
  })
})
