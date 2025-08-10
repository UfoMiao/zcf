import { getTranslation, type SupportedLang, type TranslationKeys } from '../i18n';

let currentLang: SupportedLang = 'zh-CN';

export function setLanguage(lang: SupportedLang): void {
  currentLang = lang;
}

export function getLanguage(): SupportedLang {
  return currentLang;
}

export function t(): TranslationKeys {
  return getTranslation(currentLang);
}

// Helper function for formatted strings with replacements
export function format(template: string, replacements: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return replacements[key] || match;
  });
}