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
    /** Wire API protocol type (only 'responses' is supported in new Codex) */
    wireApi: 'responses'
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
    id: 'aicodemirror',
    name: 'AICodeMirror',
    supportedCodeTools: ['claude-code', 'codex'],
    claudeCode: {
      baseUrl: 'https://api.aicodemirror.com/api/claudecode',
      authType: 'auth_token',
    },
    codex: {
      baseUrl: 'https://api.aicodemirror.com/api/codex/backend-api/codex',
      wireApi: 'responses',
    },
    description: 'AICodeMirror Global High-Quality Line',
  },
  {
    id: 'aicodemirror-cn',
    name: 'AICodeMirror CN',
    supportedCodeTools: ['claude-code', 'codex'],
    claudeCode: {
      baseUrl: 'https://api.claudecode.net.cn/api/claudecode',
      authType: 'auth_token',
    },
    codex: {
      baseUrl: 'https://api.claudecode.net.cn/api/codex/backend-api/codex',
      wireApi: 'responses',
    },
    description: 'AICodeMirror China Optimized Line',
  },
  {
    id: 'crazyrouter',
    name: 'Crazyrouter',
    supportedCodeTools: ['claude-code', 'codex'],
    claudeCode: {
      baseUrl: 'https://crazyrouter.com',
      authType: 'api_key',
    },
    codex: {
      baseUrl: 'https://crazyrouter.com/v1',
      wireApi: 'responses',
    },
    description: 'Crazyrouter AI API aggregation gateway',
  },
  {
    id: 'glm-cn',
    name: 'GLM CN',
    supportedCodeTools: ['claude-code'],
    claudeCode: {
      baseUrl: 'https://open.bigmodel.cn/api/anthropic',
      authType: 'auth_token',
    },
    description: 'GLM (智谱AI)',
  },
  {
    id: 'z-ai',
    name: 'Z.ai',
    supportedCodeTools: ['claude-code'],
    claudeCode: {
      baseUrl: 'https://api.z.ai/api/anthropic',
      authType: 'auth_token',
    },
    description: 'Z.ai API Service',
  },
  {
    id: 'bailian-coding',
    name: 'Bailian Coding',
    supportedCodeTools: ['claude-code'],
    claudeCode: {
      baseUrl: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
      authType: 'auth_token',
      defaultModels: ['GLM-5'],
    },
    description: 'Bailian Coding API Service',
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    supportedCodeTools: ['claude-code'],
    claudeCode: {
      baseUrl: 'https://api.minimaxi.com/anthropic',
      authType: 'auth_token',
      defaultModels: ['MiniMax-M2', 'MiniMax-M2'],
    },
    description: 'MiniMax API Service',
  },
  {
    id: 'kimi-coding',
    name: 'Kimi Coding',
    supportedCodeTools: ['claude-code'],
    claudeCode: {
      baseUrl: 'https://api.kimi.com/coding/',
      authType: 'auth_token',
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
