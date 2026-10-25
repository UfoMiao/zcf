/** The languages ZCF speaks; shared by the CLI and the browser app. */
export const LANGS = ['en', 'zh-CN'] as const
export type Lang = (typeof LANGS)[number]

export function isLang(value: unknown): value is Lang {
  return LANGS.some(lang => lang === value)
}

/** Fills `{name}` placeholders from `params`, leaving unknown ones as they are. */
export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}
