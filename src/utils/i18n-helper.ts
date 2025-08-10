/**
 * Helper functions for modular i18n structure
 */

import { I18N } from '../constants';
import type { SupportedLang, TranslationStructure } from '../i18n/types';

/**
 * Get modular i18n translations
 * Usage: const i18n = getModularI18n(lang);
 *        console.log(i18n.installation.installSuccess);
 */
export function getModularI18n(lang: SupportedLang): TranslationStructure {
  return I18N[lang];
}

/**
 * Migration helper - get specific module translations
 */
export function getI18nModule<K extends keyof TranslationStructure>(
  lang: SupportedLang,
  module: K
): TranslationStructure[K] {
  return I18N[lang][module];
}