import { describe, expect, it } from 'vitest'

import { createTranslator, detectLang } from '../src/i18n'

describe('detectLang', () => {
  it('prefers --lang, then ZCF_LANG, then the locale', () => {
    expect(detectLang(['plan', '--lang', 'zh-CN'], { LANG: 'en_US.UTF-8' })).toBe('zh-CN')
    expect(detectLang(['--lang=en'], { ZCF_LANG: 'zh-CN' })).toBe('en')
    expect(detectLang(['--lang', 'fr'], { ZCF_LANG: 'zh-CN' })).toBe('zh-CN')
    expect(detectLang([], { LANG: 'zh_CN.UTF-8' })).toBe('zh-CN')
    expect(detectLang([], { LC_ALL: 'en_GB.UTF-8', LANG: 'zh_CN.UTF-8' })).toBe('en')
    expect(['en', 'zh-CN']).toContain(detectLang([], {}))
  })
})

describe('createTranslator', () => {
  it('fills parameters and falls back to English, then to the key', () => {
    const zh = createTranslator('zh-CN')
    expect(zh('step.install', { tool: 'Codex' })).toBe('安装 Codex')
    expect(zh('step.install')).toBe('安装 {tool}')
    expect(zh('no.such.key')).toBe('no.such.key')
  })
})
