import { zhCN, zhCNMcpServices } from './locales/zh-CN';
import { en, enMcpServices } from './locales/en';
import type { TranslationKeys, McpServicesTranslations, SupportedLang } from './types';

export * from './types';

export const translations: Record<SupportedLang, TranslationKeys> = {
  'zh-CN': zhCN,
  en: en,
};

export const mcpServiceTranslations: Record<SupportedLang, McpServicesTranslations> = {
  'zh-CN': zhCNMcpServices,
  en: enMcpServices,
};

export function getTranslation(lang: SupportedLang): TranslationKeys {
  return translations[lang];
}

export function getMcpServiceTranslation(lang: SupportedLang): McpServicesTranslations {
  return mcpServiceTranslations[lang];
}