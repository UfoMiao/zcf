import { describe, expect, it } from 'vitest'

import { detectSpokenLang, localeToLang } from '../src/lang'

describe('localeToLang', () => {
  it('maps Chinese locales to zh-CN and everything else to en', () => {
    expect(localeToLang('zh_CN.UTF-8')).toBe('zh-CN')
    expect(localeToLang('zh_TW.UTF-8')).toBe('zh-CN')
    expect(localeToLang('en_US.UTF-8')).toBe('en')
    expect(localeToLang(undefined)).toBe('en')
  })
})

describe('detectSpokenLang', () => {
  it('lets ZCF_LANG pin the language over the locale', () => {
    expect(detectSpokenLang({ ZCF_LANG: 'zh-CN', LC_ALL: 'en_US.UTF-8' })).toBe('zh-CN')
    // A value ZCF does not speak is not a language at all: the locale decides again.
    expect(detectSpokenLang({ ZCF_LANG: 'fr', LANG: 'zh_CN.UTF-8' })).toBe('zh-CN')
  })

  it('reads the first locale variable that is set', () => {
    expect(detectSpokenLang({ LC_ALL: 'zh_CN.UTF-8', LANG: 'en_US.UTF-8' })).toBe('zh-CN')
    expect(detectSpokenLang({ LC_MESSAGES: 'zh_CN.UTF-8', LANG: 'en_US.UTF-8' })).toBe('zh-CN')
    expect(detectSpokenLang({ LANG: 'en_US.UTF-8' })).toBe('en')
  })
})
