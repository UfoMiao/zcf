import type { ApiConfigDefinition } from '../types/claude-code-config'
import { getValidProviderIds } from '../config/api-providers'
import { i18n } from '../i18n'
import { readFile } from '../utils/fs-operations'

export interface ProviderDefinitionSource {
  apiConfigs?: string
  apiConfigsFile?: string
}

export function readProviderDefinitions(options: ProviderDefinitionSource): ApiConfigDefinition[] {
  if (options.apiConfigs) {
    try {
      return JSON.parse(options.apiConfigs) as ApiConfigDefinition[]
    }
    catch (error) {
      throw new Error(i18n.t('multi-config:invalidJson', {
        error: error instanceof Error ? error.message : String(error),
      }))
    }
  }

  if (options.apiConfigsFile) {
    try {
      return JSON.parse(readFile(options.apiConfigsFile)) as ApiConfigDefinition[]
    }
    catch (error) {
      throw new Error(i18n.t('multi-config:fileReadFailed', {
        error: error instanceof Error ? error.message : String(error),
      }))
    }
  }

  return []
}

export async function validateProviderDefinitions(configs: ApiConfigDefinition[]): Promise<void> {
  if (!Array.isArray(configs))
    throw new TypeError(i18n.t('multi-config:mustBeArray'))

  const validProviders = [...getValidProviderIds(), 'custom']
  const names = new Set<string>()

  for (const config of configs) {
    if (config.provider && !config.type)
      config.type = 'api_key'
    if (config.provider && !config.name)
      config.name = config.provider.toUpperCase()

    if (!config.provider && !config.type)
      throw new Error(i18n.t('multi-config:providerOrTypeRequired'))

    if (config.provider && !validProviders.includes(config.provider)) {
      throw new Error(i18n.t('errors:invalidProvider', {
        provider: config.provider,
        validProviders: validProviders.join(', '),
      }))
    }

    if (!config.name || typeof config.name !== 'string' || config.name.trim() === '')
      throw new Error(i18n.t('multi-config:mustHaveValidName'))

    if (!['api_key', 'auth_token', 'ccr_proxy'].includes(config.type!))
      throw new Error(i18n.t('multi-config:invalidAuthType', { type: config.type }))

    if (names.has(config.name))
      throw new Error(i18n.t('multi-config:duplicateName', { name: config.name }))
    names.add(config.name)

    if (config.type !== 'ccr_proxy' && !config.key)
      throw new Error(i18n.t('multi-config:configApiKeyRequired', { name: config.name }))
  }
}
