import { join } from 'pathe'

import type { Notice } from '../plan/types'
import type { Provider, ProviderProtocol, ToolId } from '../schema/config'
import { protocolModel } from '../schema/config'
import { notice } from './shared'
import type { AdapterContext } from './types'

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

const PROTOCOLS: readonly ProviderProtocol[] = ['anthropic', 'openai', 'gemini']

/**
 * pi-ai speaks every protocol a ZCF provider can have, so a tool built on it takes the first
 * one that names a model: Anthropic, then OpenAI, then Gemini. A tool that serves fewer of
 * them passes its own `protocols`, in the same order.
 */
export function piAiRoute(
  provider: Provider,
  tool: ToolId,
  protocols = PROTOCOLS,
): { route: PiAiRoute } | { notice: Notice } {
  for (const protocol of protocols) {
    const found = route(provider, protocol)
    if (found) return { route: found }
  }
  // Name a protocol that has its own `model` field when there is one; Anthropic only has `models.default`.
  const protocol = (['openai', 'gemini', 'anthropic'] as const).find(name => protocols.includes(name) && provider[name])
  if (protocol) return { notice: notice('warning', 'notice.modelMissing', { tool, protocol }) }
  return { notice: notice('warning', 'notice.providerMissingProtocol', { tool, protocol: protocols.join(' / ') }) }
}

/** pi and DeepSeek Harness expand a leading `~` in their home overrides, such as `PI_CODING_AGENT_DIR=~/pi`. */
export function expandHome(ctx: AdapterContext, path: string): string {
  if (path === '~') return ctx.home
  if (path.startsWith('~/') || (ctx.platform === 'win32' && path.startsWith('~\\')))
    return join(ctx.home, path.slice(2))
  return path
}
