import type { i18n as I18nInstance } from 'i18next'
import type { SupportedLang } from '../constants'
import { existsSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import i18next from 'i18next'
import Backend from 'i18next-fs-backend'
import { dirname, join } from 'pathe'

// Create i18next instance
export const i18n: I18nInstance = i18next.createInstance()

// All available namespaces based on current project structure
const NAMESPACES = [
  'common',
  'api',
  'ccr',
  'cli',
  'cometix',
  'configuration',
  'errors',
  'installation',
  'language',
  'mcp',
  'menu',
  'tools',
  'updater',
  'workflow',
] as const

// Ensure i18n is initialized - safety check for utility functions
export function ensureI18nInitialized(): void {
  if (!i18n.isInitialized) {
    throw new Error(
      'i18n is not initialized. Please call initI18n() in CLI command before using utility functions.',
    )
  }
}

// Initialize i18next with fs-backend (should only be called from CLI commands)
export async function initI18n(language: SupportedLang = 'zh-CN'): Promise<void> {
  if (i18n.isInitialized) {
    // If already initialized, just change language without reloading resources
    if (i18n.language !== language) {
      await i18n.changeLanguage(language)
    }
    return
  }

  await i18n
    .use(Backend)
    .init({
      lng: language,
      fallbackLng: 'en',

      // Load all translations as a single flat structure
      ns: NAMESPACES,
      defaultNS: 'common',
      preload: [language], // Preload the selected language

      // Backend configuration for loading JSON files
      backend: {
        loadPath: (() => {
          const currentDir = dirname(fileURLToPath(import.meta.url))

          // Try multiple possible paths in order of preference
          const possibleBasePaths = [
            join(currentDir, 'locales'), // Development: src/i18n/locales
            join(process.cwd(), 'dist/i18n/locales'), // Production: dist/i18n/locales
            join(currentDir, '../../../dist/i18n/locales'), // Fallback for deep chunk paths
          ]

          // Find the first path that exists by checking for common.json
          for (const basePath of possibleBasePaths) {
            const testFile = join(basePath, 'zh-CN/common.json')
            if (existsSync(testFile)) {
              return join(basePath, '{{lng}}/{{ns}}.json')
            }
          }

          // Fallback to the production path if none found
          return join(process.cwd(), 'dist/i18n/locales/{{lng}}/{{ns}}.json')
        })(),
      },

      // Interpolation settings
      interpolation: {
        escapeValue: false, // Not needed for server-side usage
      },

      // Disable key separator for flat keys, enable namespace separator
      keySeparator: false,
      nsSeparator: ':',

      // Debugging (disable for clean output)
      debug: false,
    })

  // Ensure all namespaces are loaded before proceeding
  for (const ns of NAMESPACES) {
    if (ns !== 'common') { // common is already loaded
      await i18n.loadNamespaces(ns)
    }
  }
}

// Simple format function for legacy compatibility
export function format(template: string, values?: Record<string, string>): string {
  if (!values)
    return template

  return Object.keys(values).reduce((result, key) => {
    return result.replace(new RegExp(`{${key}}`, 'g'), values[key])
  }, template)
}

// Language management
export async function changeLanguage(lng: SupportedLang): Promise<void> {
  await i18n.changeLanguage(lng)
}

export function getCurrentLanguage(): SupportedLang {
  return i18n.language as SupportedLang
}

export type { SupportedLang }
