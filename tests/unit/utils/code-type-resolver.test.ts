import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isValidCodeType, resolveCodeType } from '../../../src/utils/code-type-resolver'

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

const VALID_OPTIONS = 'cc, claude, claude-code, codex, cx, openai-codex'

describe('resolveCodeType', () => {
  beforeEach(() => {
    vi.resetModules()
  })

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

  it('should resolve via the agent registry', async () => {
    const result = await resolveCodeType('claude')
    expect(result).toBe('claude-code')
  })

  it('should throw error for invalid code type', async () => {
    await expect(resolveCodeType('invalid')).rejects.toThrow(
      `Invalid code type: "invalid". Valid options are: ${VALID_OPTIONS}. Using default: codex.`,
    )
  })

  it('should reject non-legacy agents such as opencode', async () => {
    await expect(resolveCodeType('opencode')).rejects.toThrow(
      `Invalid code type: "opencode". Valid options are: ${VALID_OPTIONS}. Using default: codex.`,
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
      `Invalid code type: "invalid". Valid options are: ${VALID_OPTIONS}. Using default: claude-code.`,
    )
  })

  it('should use config value as default when available in error path', async () => {
    const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

    // Mock config read to succeed with custom value
    vi.mocked(readZcfConfigAsync).mockResolvedValueOnce({
      codeToolType: 'codex',
    } as any)

    await expect(resolveCodeType('invalid')).rejects.toThrow(
      `Invalid code type: "invalid". Valid options are: ${VALID_OPTIONS}. Using default: codex.`,
    )
  })

  it('should handle invalid config value in error path', async () => {
    const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

    // Mock config read to return invalid code type
    vi.mocked(readZcfConfigAsync).mockResolvedValueOnce({
      codeToolType: 'invalid-type',
    } as any)

    await expect(resolveCodeType('wrong')).rejects.toThrow(
      `Invalid code type: "wrong". Valid options are: ${VALID_OPTIONS}. Using default: claude-code.`,
    )
  })
})

describe('isValidCodeType', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should accept legacy agent ids and aliases', async () => {
    expect(await isValidCodeType('claude-code')).toBe(true)
    expect(await isValidCodeType('cc')).toBe(true)
    expect(await isValidCodeType('codex')).toBe(true)
    expect(await isValidCodeType('cx')).toBe(true)
  })

  it('should reject non-legacy agents', async () => {
    expect(await isValidCodeType('opencode')).toBe(false)
    expect(await isValidCodeType('oc')).toBe(false)
  })

  it('should reject unknown values', async () => {
    expect(await isValidCodeType('unknown')).toBe(false)
  })
})
