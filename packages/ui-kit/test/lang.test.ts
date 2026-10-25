import { describe, expect, it } from 'vitest'

import { interpolate, isLang, LANGS } from '../src'

describe('lang', () => {
  it('knows the languages ZCF speaks', () => {
    expect([...LANGS]).toEqual(['en', 'zh-CN'])
    expect(isLang('en')).toBe(true)
    expect(isLang('auto')).toBe(false)
    expect(isLang(undefined)).toBe(false)
  })

  it('fills placeholders and leaves unknown ones alone', () => {
    expect(interpolate('{tool} is at {version}', { tool: 'Claude Code', version: 2 })).toBe('Claude Code is at 2')
    expect(interpolate('kept {unknown}', { tool: 'x' })).toBe('kept {unknown}')
  })
})
