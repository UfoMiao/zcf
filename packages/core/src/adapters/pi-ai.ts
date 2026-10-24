import type { Notice } from '../plan/types'
import type { Provider, ProviderProtocol, ToolId } from '../schema/config'
import { protocolModel } from '../schema/config'
import { notice } from './shared'

/** The wire protocols of pi-ai, the model layer behind pi and DeepSeek Harness. */
export type PiAiApi = 'anthropic-messages' | 'openai-completions' | 'google-generative-ai'

export interface PiAiRoute {
  api: PiAiApi
  baseUrl: string
  model: string
  /** Send the key as `Authorization: Bearer`, as Claude Code does with `ANTHROPIC_AUTH_TOKEN`. */
  bearer: boolean
}

const GEMINI_API = 'https://generativelanguage.googleapis.com'

/** pi-ai puts the API version in the base URL; the Gemini SDKs that ZCF's `gemini.baseUrl` follows add it themselves. */
function geminiBaseUrl(baseUrl = GEMINI_API): string {
  const trimmed = baseUrl.replace(/\/+$/, '')
  return /\/v1(?:alpha|beta)?$/.test(trimmed) ? trimmed : `${trimmed}/v1beta`
}

function route(provider: Provider, protocol: ProviderProtocol): PiAiRoute | undefined {
  if (protocol === 'anthropic') {
    const { anthropic } = provider
    const model = provider.models.default
    if (!anthropic || !model) return undefined
    // pi-ai uses the Anthropic SDK, which adds `/v1/messages` to the same base URL Claude Code takes.
    return { api: 'anthropic-messages', baseUrl: anthropic.baseUrl, model, bearer: anthropic.authType === 'auth_token' }
  }
  const model = protocolModel(provider, protocol)
  if (protocol === 'openai') {
    if (!provider.openai || !model) return undefined
    return { api: 'openai-completions', baseUrl: provider.openai.baseUrl, model, bearer: false }
  }
  if (!provider.gemini || !model) return undefined
  return { api: 'google-generative-ai', baseUrl: geminiBaseUrl(provider.gemini.baseUrl), model, bearer: false }
}

const PROTOCOLS = ['anthropic', 'openai', 'gemini'] as const

/**
 * pi-ai speaks every protocol a ZCF provider can have, so a tool built on it takes the
 * first one that names a model: Anthropic, then OpenAI, then Gemini.
 */
export function piAiRoute(provider: Provider, tool: ToolId): { route: PiAiRoute } | { notice: Notice } {
  for (const protocol of PROTOCOLS) {
    const found = route(provider, protocol)
    if (found) return { route: found }
  }
  // Name a protocol that has its own `model` field when there is one; Anthropic only has `models.default`.
  const protocol = (['openai', 'gemini', 'anthropic'] as const).find(name => provider[name])
  if (protocol) return { notice: notice('warning', 'notice.modelMissing', { tool, protocol }) }
  return { notice: notice('warning', 'notice.providerMissingProtocol', { tool, protocol: PROTOCOLS.join(' / ') }) }
}
