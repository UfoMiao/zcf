import { join } from 'pathe'
import * as v from 'valibot'

import { readTextIfExists, writeFileAtomic } from './io/fs'
import type { GitHubFile, Mirror } from './mirror'
import { githubFileUrls } from './mirror'
import type { ProviderPreset } from './schema/presets'
import { parsePresets } from './schema/presets'

/**
 * Provider presets live in `presets/providers.json` in the ZCF repository, not in code, so a
 * provider can change without a release. ZCF fetches the file, keeps a copy, and uses the copy
 * when offline. Set ZCF_PRESETS_URL to use another file, such as a gist.
 */
export const PRESET_FILE: GitHubFile = { repo: 'UfoMiao/zcf', ref: 'main', path: 'presets/providers.json' }

/** A fresh copy is reused for this long before fetching again. */
export const PRESET_MAX_AGE_MS = 24 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 4000

export interface PresetList {
  presets: ProviderPreset[]
  /**
   * `remote`: up to date, fetched now or within the last day. `cache`: an older saved copy,
   * because no source answered. `none`: nothing to show.
   */
  source: 'remote' | 'cache' | 'none'
}

interface CacheFile {
  fetchedAt: number
  /** ZCF_PRESETS_URL when the copy came from it, so a changed setting never serves another list. */
  url?: string
  data: unknown
}

export interface LoadPresetsOptions {
  /** Folder for the saved copy, usually `~/.ufomiao/zcf/cache`. */
  cacheDir: string
  env?: Record<string, string | undefined>
  fetch?: typeof globalThis.fetch
  now?: () => number
  /** Fetch even when the saved copy is fresh. */
  refresh?: boolean
  /** Which hosts to fetch from, as for other downloads. */
  mirror?: Mirror
}

const CacheSchema = v.object({ fetchedAt: v.number(), url: v.optional(v.string()), data: v.unknown() })

/** The saved copy, when there is one and it came from `url` (or the ZCF repository when undefined). */
async function readCache(path: string, url: string | undefined): Promise<CacheFile | undefined> {
  try {
    const text = await readTextIfExists(path)
    const cache: unknown = text && JSON.parse(text)
    const parsed = v.safeParse(CacheSchema, cache)
    return parsed.success && parsed.output.url === url ? parsed.output : undefined
  } catch {
    return undefined
  }
}

async function download(url: string, fetcher: typeof globalThis.fetch, signal: AbortSignal): Promise<unknown> {
  const response = await fetcher(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]) })
  if (!response.ok) throw new Error(`${response.status} from ${url}`)
  return response.json()
}

/** The provider presets: a fresh saved copy, else the first source that answers, else any saved copy. */
export async function loadPresets(options: LoadPresetsOptions): Promise<PresetList> {
  const now = options.now ?? Date.now
  const fetcher = options.fetch ?? globalThis.fetch
  const cachePath = join(options.cacheDir, 'providers.json')
  const override = options.env?.ZCF_PRESETS_URL || undefined
  const cache = await readCache(cachePath, override)
  const cached = cache && parsePresets(cache.data)

  // A copy from the future means the clock was wrong when it was saved, so it counts as old.
  const age = cache ? now() - cache.fetchedAt : -1
  if (cached && !options.refresh && age >= 0 && age < PRESET_MAX_AGE_MS) return { presets: cached, source: 'remote' }

  // Ask every source at once and take the first valid answer, so a blocked host costs no extra wait.
  const urls = override ? [override] : githubFileUrls(PRESET_FILE, options.mirror ?? 'official')
  const done = new AbortController()
  try {
    const { presets, data } = await Promise.any(
      urls.map(async url => {
        const answer = await download(url, fetcher, done.signal)
        const list = parsePresets(answer)
        if (!list) throw new Error(`Not a preset file: ${url}`)
        return { presets: list, data: answer }
      }),
    )
    await writeFileAtomic(
      cachePath,
      `${JSON.stringify({ fetchedAt: now(), url: override, data } satisfies CacheFile)}\n`,
    ).catch(() => undefined)
    return { presets, source: 'remote' }
  } catch {
    // No source answered with a valid list.
    return cached ? { presets: cached, source: 'cache' } : { presets: [], source: 'none' }
  } finally {
    done.abort()
  }
}
