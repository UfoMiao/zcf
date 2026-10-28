import { readFile } from 'node:fs/promises'

import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import { githubFileUrls } from '../src/mirror'
import { loadPresets, PRESET_FILE } from '../src/presets'

const PRESET_URLS = githubFileUrls(PRESET_FILE, 'official')
import { applyPreset, parsePresets, presetSummary } from '../src/schema/presets'
import { tempDir } from './helpers'

const file = {
  version: 1,
  providers: [
    { id: 'relay', name: 'Relay', anthropic: { baseUrl: 'https://relay.example.com', authType: 'api_key' } },
    { id: 'plain-http', name: 'Plain', anthropic: { baseUrl: 'http://relay.example.com' } },
    { id: 'Bad Id', name: 'Bad' },
    { id: 'relay', name: 'Duplicate' },
    {
      id: 'openai-only',
      name: 'OpenAI only',
      openai: { baseUrl: 'https://o.example.com/v1', model: 'm' },
      models: { default: 'd' },
    },
  ],
}

function fakeFetch(responses: Record<string, unknown>) {
  const calls: string[] = []
  const fetcher = (async (url: string) => {
    calls.push(url)
    if (!(url in responses)) throw new Error('offline')
    return new Response(JSON.stringify(responses[url]), { status: responses[url] === 404 ? 404 : 200 })
  }) as typeof fetch
  return { fetcher, calls }
}

describe('parsePresets', () => {
  it('keeps valid HTTPS entries and drops broken or repeated ones', () => {
    expect(parsePresets(file)?.map(preset => preset.id)).toEqual(['relay', 'openai-only'])
    expect(parsePresets({ version: 2, providers: [] })).toBeUndefined()
    expect(parsePresets('nope')).toBeUndefined()
  })

  it('accepts a loopback gateway on plain HTTP and rejects remote HTTP', () => {
    const gateway = parsePresets({
      version: 1,
      providers: [
        {
          id: 'magpie',
          name: 'magpie',
          anthropic: { baseUrl: 'http://127.0.0.1:3425' },
          openai: { baseUrl: 'http://localhost:3425/v1' },
        },
        { id: 'plain-http', name: 'no', anthropic: { baseUrl: 'http://relay.example.com' } },
        { id: 'lan-http', name: 'no', anthropic: { baseUrl: 'http://192.168.1.4:3425' } },
      ],
    })
    expect(gateway?.map(preset => preset.id)).toEqual(['magpie'])
  })

  it('accepts every preset in the repository file', async () => {
    const data: unknown = JSON.parse(
      await readFile(join(import.meta.dirname, '../../../presets/providers.json'), 'utf8'),
    )
    const raw = (data as { providers: unknown[] }).providers
    const parsed = parsePresets(data)
    expect(parsed).toHaveLength(raw.length)
    // The magpie gateway preset points every protocol at its local address.
    const magpie = parsed?.find(preset => preset.id === 'magpie')
    expect(magpie?.anthropic?.baseUrl).toBe('http://127.0.0.1:3425')
    expect(magpie?.openai?.baseUrl).toBe('http://127.0.0.1:3425/v1')
  })
})

describe('loadPresets', () => {
  it('fetches from the first source that answers and saves a copy', async () => {
    const cacheDir = await tempDir()
    const { fetcher, calls } = fakeFetch({ [PRESET_URLS[1]!]: file })
    const list = await loadPresets({ cacheDir, fetch: fetcher, now: () => 1000 })
    expect(list.source).toBe('remote')
    expect(list.presets.map(preset => preset.id)).toEqual(['relay', 'openai-only'])
    expect(calls).toEqual(PRESET_URLS)
    expect(JSON.parse(await readFile(join(cacheDir, 'providers.json'), 'utf8'))).toMatchObject({ fetchedAt: 1000 })

    // A fresh copy is used without fetching; an old one is refreshed, and kept when offline.
    const again = fakeFetch({})
    expect(await loadPresets({ cacheDir, fetch: again.fetcher, now: () => 2000 })).toMatchObject({ source: 'remote' })
    expect(again.calls).toEqual([])
    const offline = await loadPresets({ cacheDir, fetch: again.fetcher, now: () => 1000 + 25 * 3600 * 1000 })
    expect(offline.source).toBe('cache')
    expect(offline.presets).toHaveLength(2)
    expect(again.calls).toHaveLength(2)

    // A copy saved while the clock ran ahead is not trusted as fresh.
    const skewed = fakeFetch({})
    expect(await loadPresets({ cacheDir, fetch: skewed.fetcher, now: () => 0 })).toMatchObject({ source: 'cache' })
    expect(skewed.calls).toEqual(PRESET_URLS)
  })

  it('uses ZCF_PRESETS_URL instead, skips invalid answers, and reports when nothing is available', async () => {
    const cacheDir = await tempDir()
    const { fetcher, calls } = fakeFetch({ 'https://gist.example.com/p.json': { version: 9 } })
    expect(
      await loadPresets({ cacheDir, fetch: fetcher, env: { ZCF_PRESETS_URL: 'https://gist.example.com/p.json' } }),
    ).toEqual({ presets: [], source: 'none' })
    expect(calls).toEqual(['https://gist.example.com/p.json'])

    const failing = fakeFetch({ [PRESET_URLS[0]!]: 404 })
    expect((await loadPresets({ cacheDir, fetch: failing.fetcher, refresh: true })).source).toBe('none')
  })

  it('never serves a copy saved from another source', async () => {
    const cacheDir = await tempDir()
    const gist = 'https://gist.example.com/p.json'
    await loadPresets({ cacheDir, fetch: fakeFetch({ [PRESET_URLS[0]!]: file }).fetcher, now: () => 1000 })

    // A fresh copy of the default list is ignored once ZCF_PRESETS_URL is set, even offline.
    const custom = fakeFetch({ [gist]: { version: 1, providers: [{ id: 'mine', name: 'Mine' }] } })
    const list = await loadPresets({ cacheDir, fetch: custom.fetcher, now: () => 2000, env: { ZCF_PRESETS_URL: gist } })
    expect(list).toMatchObject({ source: 'remote', presets: [{ id: 'mine' }] })
    const offline = fakeFetch({})
    expect(await loadPresets({ cacheDir, fetch: offline.fetcher, now: () => 3000 })).toEqual({
      presets: [],
      source: 'none',
    })
    expect(offline.calls).toEqual(PRESET_URLS)
  })

  it('tries the China jsDelivr hosts first with the china mirror', async () => {
    const { fetcher, calls } = fakeFetch({})
    await loadPresets({ cacheDir: await tempDir(), fetch: fetcher, mirror: 'china' })
    expect(calls[0]).toMatch(
      /^https:\/\/(fastly|gcore)\.jsdelivr\.net\/gh\/UfoMiao\/zcf@main\/presets\/providers\.json$/,
    )
    expect(calls).toEqual(githubFileUrls(PRESET_FILE, 'china'))
  })
})

describe('applyPreset', () => {
  it("replaces the provider with the preset's settings, keeping the API key only for the same host", () => {
    const [relay, openaiOnly] = parsePresets(file)!
    const current = {
      name: 'old',
      apiKey: 'sk-1',
      openai: { baseUrl: 'https://o.example.com/old' },
      models: { opus: 'x' },
    }
    expect(applyPreset(openaiOnly!, current)).toEqual({
      name: 'OpenAI only',
      apiKey: 'sk-1',
      openai: { baseUrl: 'https://o.example.com/v1', model: 'm' },
      models: { default: 'd' },
    })
    // A key is never carried to another provider's host.
    expect(applyPreset(relay!, current)).not.toHaveProperty('apiKey')
    expect(applyPreset(relay!, undefined)).toEqual({
      name: 'Relay',
      anthropic: { baseUrl: 'https://relay.example.com', authType: 'api_key' },
    })
  })
})

describe('presetSummary', () => {
  it('lists the hosts a preset sends requests to, then its description', () => {
    const preset = parsePresets({
      version: 1,
      providers: [
        {
          id: 'multi',
          name: 'Multi',
          description: { en: 'Two protocols', 'zh-CN': '两种协议' },
          anthropic: { baseUrl: 'https://api.example.com/anthropic' },
          openai: { baseUrl: 'https://api.example.com/v1' },
          gemini: { baseUrl: 'https://g.example.com' },
        },
      ],
    })![0]!
    expect(presetSummary(preset, 'zh-CN')).toBe('api.example.com, g.example.com · 两种协议')
    expect(presetSummary(preset, 'fr')).toBe('api.example.com, g.example.com · Two protocols')
    expect(presetSummary({ ...preset, description: {} }, 'en')).toBe('api.example.com, g.example.com')
  })
})
