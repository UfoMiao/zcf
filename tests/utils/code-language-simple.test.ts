/**
 * Simple tests for code language detection functionality
 */

import { describe, expect, it } from 'vitest'
import { getCommentLanguageInstruction } from '../../src/utils/code-language-detector'

describe('comment Language Instruction Generation', () => {
  it('should generate Chinese instruction for zh-CN', () => {
    const instruction = getCommentLanguageInstruction('zh-CN')
    expect(instruction).toContain('Chinese')
    expect(instruction).toContain('中文')
  })

  it('should generate English instruction for en', () => {
    const instruction = getCommentLanguageInstruction('en')
    expect(instruction).toContain('English')
    expect(instruction).not.toContain('中文')
  })

  it('should generate appropriate instruction for mixed', () => {
    const instruction = getCommentLanguageInstruction('mixed')
    expect(instruction).toContain('English')
  })
})
