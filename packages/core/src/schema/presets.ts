import * as v from 'valibot'

import { ProviderSchema } from './config'

const HttpsUrl = v.pipe(v.string(), v.url(), v.startsWith('https://'))
// Presets come from the network, so every remote endpoint must be HTTPS; a local gateway
// on loopback is the one exception, plain HTTP included.
const EndpointUrl = v.pipe(
  v.string(),
  v.url(),
  v.check(url => url.startsWith('https://') || ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)),
)

/** One preset: a provider without the key, plus an id and a description per language. */
export const PresetSchema = v.object({
  ...v.omit(ProviderSchema, ['apiKey']).entries,
  id: v.pipe(v.string(), v.regex(/^[a-z0-9][a-z0-9-]*$/)),
  description: v.optional(v.record(v.string(), v.string()), {}),
  website: v.optional(HttpsUrl),
  // Presets come from the network, so every endpoint must be HTTPS, loopback excepted.
  anthropic: v.optional(
    v.object({ baseUrl: EndpointUrl, authType: v.optional(v.picklist(['auth_token', 'api_key'])) }),
  ),
  openai: v.optional(v.object({ baseUrl: EndpointUrl, model: v.optional(v.string()) })),
  gemini: v.optional(v.object({ baseUrl: v.optional(EndpointUrl), model: v.optional(v.string()) })),
})
export type ProviderPreset = v.InferOutput<typeof PresetSchema>

/** The valid presets in a preset file. A broken entry is left out instead of failing the list. */
export function parsePresets(data: unknown): ProviderPreset[] | undefined {
  const file = v.safeParse(v.object({ version: v.literal(1), providers: v.array(v.unknown()) }), data)
  if (!file.success) return undefined
  const presets: ProviderPreset[] = []
  for (const entry of file.output.providers) {
    const preset = v.safeParse(PresetSchema, entry)
    if (preset.success && !presets.some(known => known.id === preset.output.id)) presets.push(preset.output)
  }
  return presets
}

/** The hosts a provider or preset sends requests to. */
function endpointHosts(provider: unknown): string[] {
  if (typeof provider !== 'object' || provider === null) return []
  const hosts = new Set<string>()
  const entries: [string, unknown][] = Object.entries(provider)
  for (const [protocol, block] of entries) {
    if (protocol !== 'anthropic' && protocol !== 'openai' && protocol !== 'gemini') continue
    const url = typeof block === 'object' && block !== null && 'baseUrl' in block ? block.baseUrl : undefined
    if (typeof url === 'string' && URL.canParse(url)) hosts.add(new URL(url).host)
  }
  return [...hosts]
}

/**
 * The provider a preset describes. Protocol blocks and models come from the preset, so
 * nothing from the previous provider is left behind. The API key stays only when the
 * preset talks to the same hosts, so a key is never sent to a provider it was not issued for.
 */
export function applyPreset(preset: ProviderPreset, current: unknown): Record<string, unknown> {
  const provider: Record<string, unknown> = { name: preset.name }
  const apiKey = typeof current === 'object' && current !== null && 'apiKey' in current ? current.apiKey : undefined
  const knownHosts = endpointHosts(current)
  const presetHosts = endpointHosts(preset)
  const sameHosts = presetHosts.length > 0 && presetHosts.every(host => knownHosts.includes(host))
  if (typeof apiKey === 'string' && apiKey && sameHosts) provider.apiKey = apiKey
  if (preset.anthropic) provider.anthropic = { ...preset.anthropic }
  if (preset.openai) provider.openai = { ...preset.openai }
  if (preset.gemini) provider.gemini = { ...preset.gemini }
  if (Object.keys(preset.models).length > 0) provider.models = { ...preset.models }
  return provider
}

/**
 * How a preset is listed: the hosts it sends requests to, then its description in `lang`.
 * The hosts come first so a user sees where their API key would go before picking it.
 */
export function presetSummary(preset: ProviderPreset, lang: string): string {
  const hosts = endpointHosts(preset)
  const description = preset.description[lang] ?? preset.description.en
  return [hosts.join(', '), description].filter(Boolean).join(' · ')
}
