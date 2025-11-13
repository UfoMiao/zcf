import type { CodeToolType } from '../constants'

/**
 * API Provider Preset Configuration
 * Defines API provider configurations for different code tools
 */
export interface ApiProviderPreset {
  /** Unique identifier for the provider */
  id: string
  /** Display name of the provider */
  name: string
  /** Supported code tool types */
  supportedCodeTools: CodeToolType[]
  /** Claude Code specific configuration */
  claudeCode?: {
    /** API base URL */
    baseUrl: string
    /** Authentication type */
    authType: 'api_key' | 'auth_token'
    /** Default models (optional) */
    defaultModels?: string[]
  }
  /** Codex specific configuration */
  codex?: {
    /** API base URL */
    baseUrl: string
    /** Wire API protocol type */
    wireApi: 'responses' | 'chat'
    /** Default model (optional) */
    defaultModel?: string
  }
  /** Provider description (optional) */
  description?: string
}

/**
 * Predefined API provider presets
 */
export const API_PROVIDER_PRESETS: ApiProviderPreset[] = [
  {
    id: '302ai',
    name: '302.AI',
    supportedCodeTools: ['claude-code', 'codex'],
    claudeCode: {
      baseUrl: 'https://api.302.ai/cc',
      authType: 'api_key',
    },
    codex: {
      baseUrl: 'https://api.302.ai/v1',
      wireApi: 'responses',
    },
    description: '302.AI API Service',
  },
  {
    id: 'packycode',
    name: 'PackyCode',
    supportedCodeTools: ['claude-code', 'codex'],
    claudeCode: {
      baseUrl: 'https://www.packyapi.com',
      authType: 'auth_token',
    },
    codex: {
      baseUrl: 'https://www.packyapi.com/v1',
      wireApi: 'responses',
    },
    description: 'PackyCode API Service',
  },
  {
    id: 'glm',
    name: 'GLM',
    supportedCodeTools: ['claude-code', 'codex'],
    claudeCode: {
      baseUrl: 'https://open.bigmodel.cn/api/anthropic',
      authType: 'auth_token',
    },
    codex: {
      baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
      wireApi: 'chat',
      defaultModel: 'GLM-4.6',
    },
    description: 'GLM (智谱AI)',
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    supportedCodeTools: ['claude-code', 'codex'],
    claudeCode: {
      baseUrl: 'https://api.minimaxi.com/anthropic',
      authType: 'auth_token',
      defaultModels: ['MiniMax-M2', 'MiniMax-M2'],
    },
    codex: {
      baseUrl: 'https://api.minimaxi.com/v1',
      wireApi: 'chat',
      defaultModel: 'MiniMax-M2',
    },
    description: 'MiniMax API Service',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    supportedCodeTools: ['claude-code', 'codex'],
    claudeCode: {
      baseUrl: 'https://api.kimi.com/coding/',
      authType: 'auth_token',
    },
    codex: {
      baseUrl: 'https://api.kimi.com/coding/v1',
      wireApi: 'chat',
      defaultModel: 'kimi-for-coding',
    },
    description: 'Kimi (Moonshot AI)',
  },
]

/**
 * Get API providers filtered by code tool type
 * @param codeToolType - The code tool type to filter by
 * @returns Array of API provider presets that support the specified code tool type
 */
export function getApiProviders(codeToolType: CodeToolType): ApiProviderPreset[] {
  return API_PROVIDER_PRESETS.filter(provider =>
    provider.supportedCodeTools.includes(codeToolType),
  )
}

/**
 * Get API provider preset by ID
 * @param providerId - The provider ID (302ai, glm, minimax, kimi, packycode)
 * @returns API provider preset or undefined if not found
 */
export function getProviderPreset(providerId: string): ApiProviderPreset | undefined {
  return API_PROVIDER_PRESETS.find(provider => provider.id === providerId)
}

/**
 * Get all valid provider IDs
 * @returns Array of valid provider IDs
 */
export function getValidProviderIds(): string[] {
  return API_PROVIDER_PRESETS.map(provider => provider.id)
}
