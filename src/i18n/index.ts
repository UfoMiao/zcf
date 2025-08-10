import { zhCN, zhCNFlat, zhCNMcpServices } from './locales/zh-CN';
import { en, enFlat, enMcpServices } from './locales/en';
import type { TranslationStructure, TranslationKeys, McpServicesTranslations, SupportedLang } from './types';

export * from './types';

// New modular structure
export const I18N_NEW: Record<SupportedLang, TranslationStructure> = {
  'zh-CN': zhCN,
  en: en,
};

// Create a proxy to handle both flat and modular access
function createI18nProxy(modular: TranslationStructure, flat: any): any {
  return new Proxy(modular, {
    get(target, prop) {
      // First check if it's a module name
      if (prop in target) {
        return target[prop as keyof TranslationStructure];
      }
      // Then check flat structure for backward compatibility
      if (prop in flat) {
        return flat[prop];
      }
      return undefined;
    }
  });
}

// Backward compatible structure with proxy
export const translations: Record<SupportedLang, any> = {
  'zh-CN': createI18nProxy(zhCN, zhCNFlat),
  en: createI18nProxy(en, enFlat),
};

export const mcpServiceTranslations: Record<SupportedLang, McpServicesTranslations> = {
  'zh-CN': zhCNMcpServices,
  en: enMcpServices,
};

export function getTranslation(lang: SupportedLang): TranslationStructure {
  return I18N_NEW[lang];
}

export function getMcpServiceTranslation(lang: SupportedLang): McpServicesTranslations {
  return mcpServiceTranslations[lang];
}

// Helper function for migration - get flat translations for backward compatibility
export function getFlatTranslation(lang: SupportedLang): TranslationKeys {
  return translations[lang];
}