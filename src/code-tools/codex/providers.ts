import type { ApiConfigDefinition } from '../../types/claude-code-config'
import type { CodexProvider } from '../../utils/code-tools/codex'
import type { ProviderProfile } from '../types'
import ansis from 'ansis'
import { getProviderPreset } from '../../config/api-providers'
import { API_DEFAULT_URL } from '../../constants'
import { i18n } from '../../i18n'

export function createCodexProviderProfile(config: ApiConfigDefinition): ProviderProfile {
  const displayName = config.name || config.provider || 'custom'
  const preset = config.provider && config.provider !== 'custom'
    ? getProviderPreset(config.provider)?.codex
    : undefined

  return {
    id: displayName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    name: displayName,
    provider: config.provider,
    baseUrl: config.url || preset?.baseUrl || API_DEFAULT_URL,
    auth: {
      type: config.type === 'auth_token'
        ? 'auth_token'
        : config.type === 'ccr_proxy'
          ? 'ccr_proxy'
          : 'api_key',
      credential: config.key,
      envKey: `${displayName}_API_KEY`.replace(/\W/g, '_').toUpperCase(),
    },
    models: {
      primary: config.primaryModel || preset?.defaultModel || 'gpt-5.2',
    },
    protocol: preset?.wireApi || 'responses',
  }
}

export function serializeCodexProvider(profile: ProviderProfile): CodexProvider {
  return {
    id: profile.id,
    name: profile.name,
    baseUrl: profile.baseUrl || API_DEFAULT_URL,
    wireApi: profile.protocol === 'chat' ? 'chat' : 'responses',
    tempEnvKey: profile.auth.envKey || `${profile.id}_API_KEY`.toUpperCase(),
    requiresOpenaiAuth: false,
    model: profile.models.primary,
  }
}

export async function importCodexProviderDefinitions(configs: ApiConfigDefinition[]): Promise<void> {
  const { addProviderToExisting } = await import('../../utils/code-tools/codex-provider-manager')
  const addedProviderIds: string[] = []

  for (const config of configs) {
    try {
      const profile = createCodexProviderProfile(config)
      const result = await addProviderToExisting(
        serializeCodexProvider(profile),
        profile.auth.credential || '',
      )
      if (!result.success) {
        throw new Error(i18n.t('multi-config:providerAddFailed', {
          name: config.name,
          error: result.error,
        }))
      }
      addedProviderIds.push(profile.id)
      console.log(ansis.green(`✔ ${i18n.t('multi-config:providerAdded', { name: config.name })}`))
    }
    catch (error) {
      console.error(ansis.red(i18n.t('multi-config:providerAddFailed', {
        name: config.name,
        error: error instanceof Error ? error.message : String(error),
      })))
      throw error
    }
  }

  const defaultConfig = configs.find(config => config.default)
  if (!defaultConfig)
    return

  const defaultProfile = createCodexProviderProfile(defaultConfig)
  if (!addedProviderIds.includes(defaultProfile.id)) {
    throw new Error(i18n.t('multi-config:providerAddFailed', {
      name: defaultProfile.name,
      error: i18n.t('multi-config:providerNotAdded'),
    }))
  }

  const { switchCodexProvider } = await import('../../utils/code-tools/codex')
  await switchCodexProvider(defaultProfile.id)
  console.log(ansis.green(`✔ ${i18n.t('multi-config:defaultProviderSet', { name: defaultProfile.name })}`))
}
