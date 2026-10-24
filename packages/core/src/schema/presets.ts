import * as v from 'valibot'

import { ProviderSchema } from './config'

const HttpsUrl = v.pipe(v.string(), v.url(), v.startsWith('https://'))

/** One preset: a provider without the key, plus an id and a description per language. */
export const PresetSchema = v.object({
  ...v.omit(ProviderSchema, ['apiKey']).entries,
  id: v.pipe(v.string(), v.regex(/^[a-z0-9][a-z0-9-]*$/)),
  description: v.optional(v.record(v.string(), v.string()), {}),
  website: v.optional(HttpsUrl),
  // Presets come from the network, so every endpoint must be HTTPS.
  anthropic: v.optional(v.object({ baseUrl: HttpsUrl, authType: v.optional(v.picklist(['auth_token', 'api_key'])) })),
  openai: v.optional(v.object({ baseUrl: HttpsUrl, model: v.optional(v.string()) })),
  gemini: v.optional(v.object({ baseUrl: v.optional(HttpsUrl), model: v.optional(v.string()) })),
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

/**
 * The provider a preset describes, keeping the user's API key. Protocol blocks and
 * models come from the preset, so nothing from the previous provider is left behind.
 */
export function applyPreset(preset: ProviderPreset, current: unknown): Record<string, unknown> {
  const provider: Record<string, unknown> = { name: preset.name }
  const apiKey = typeof current === 'object' && current !== null && 'apiKey' in current ? current.apiKey : undefined
  if (typeof apiKey === 'string' && apiKey) provider.apiKey = apiKey
  if (preset.anthropic) provider.anthropic = { ...preset.anthropic }
  if (preset.openai) provider.openai = { ...preset.openai }
  if (preset.gemini) provider.gemini = { ...preset.gemini }
  if (Object.keys(preset.models).length > 0) provider.models = { ...preset.models }
  return provider
}
