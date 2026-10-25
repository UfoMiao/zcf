/**
 * The language a `ZCF_LANG`-style value or a locale names, by the one rule every part of ZCF
 * follows: `ZCF_LANG` wins when it names a language ZCF speaks, then the first of the locale
 * variables that is set, then the system locale. The CLI's `--lang` and the editors' `auto`
 * interface language both resolve through this.
 */
export function detectSpokenLang(env: Record<string, string | undefined>): 'en' | 'zh-CN' {
  if (env.ZCF_LANG === 'en' || env.ZCF_LANG === 'zh-CN') return env.ZCF_LANG
  return localeToLang(env.LC_ALL || env.LC_MESSAGES || env.LANG || new Intl.DateTimeFormat().resolvedOptions().locale)
}

/** Map a locale to the language ZCF speaks: Chinese variants become `zh-CN`, everything else English. */
export function localeToLang(locale: string | undefined): 'en' | 'zh-CN' {
  return locale?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}
