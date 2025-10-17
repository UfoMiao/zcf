import type { AiOutputLanguage } from '../../src/constants'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_CODE_TOOL_TYPE, getAiOutputLanguageLabel, isCodeToolType, resolveCodeToolType } from '../../src/constants'

const mockI18n = vi.hoisted(() => ({
  isInitialized: false,
  t: vi.fn((key: string) => key),
}))

vi.mock('../../src/i18n', () => ({
  i18n: mockI18n,
}))

describe('constants helpers', () => {
  it('should validate code tool types', () => {
    expect(isCodeToolType('claude-code')).toBe(true)
    expect(isCodeToolType('codex')).toBe(true)
    expect(isCodeToolType('unknown')).toBe(false)
  })

  it('should resolve code tool aliases and fallbacks', () => {
    expect(resolveCodeToolType('cc')).toBe('claude-code')
    expect(resolveCodeToolType('cx')).toBe('codex')
    expect(resolveCodeToolType('invalid')).toBe(DEFAULT_CODE_TOOL_TYPE)
  })

  it('should return language labels for built-in output languages', () => {
    expect(getAiOutputLanguageLabel('zh-CN')).toBe('简体中文')
    expect(getAiOutputLanguageLabel('en')).toBe('English')
  })

  it('should use i18n translation for custom language when initialized', () => {
    mockI18n.isInitialized = true
    mockI18n.t.mockReturnValueOnce('自定义语言')

    expect(getAiOutputLanguageLabel('custom' as AiOutputLanguage)).toBe('自定义语言')
  })

  it('should fall back to raw code when translation fails', () => {
    mockI18n.isInitialized = true
    mockI18n.t.mockImplementationOnce(() => {
      throw new Error('missing translation')
    })

    expect(getAiOutputLanguageLabel('custom' as AiOutputLanguage)).toBe('custom')
  })
})
