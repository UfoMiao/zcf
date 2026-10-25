import * as v from 'valibot'

import { SKILLS_SEARCH_MIN_QUERY } from './schema/skills'

/**
 * Community skills are searched through the open claude-plugins.dev index, the same source
 * the `skills` ecosystem crawls. Set ZCF_SKILLS_SEARCH_URL to query another host that serves
 * the same shape, such as a proxy.
 */
export const SKILLS_SEARCH_URL = 'https://claude-plugins.dev/api/skills'

const FETCH_TIMEOUT_MS = 4000
/** How many hits to ask for: enough to scroll, few enough for one readable page. */
const RESULT_LIMIT = 30

/** One skill the search found, mapped to what a `skills` source needs to install it. */
export interface SkillHit {
  /** The skill's folder name, the `skills` entry `npx skills add` installs with `-s`. */
  name: string
  /** The `owner/repo` the skill lives in, which is the source `npx skills add` installs from. */
  source: string
  description?: string
  installs?: number
  stars?: number
}

export interface SkillSearchList {
  skills: SkillHit[]
  /** `remote`: the index answered. `none`: no answer or nothing usable, so there is nothing to show. */
  source: 'remote' | 'none'
}

export interface SearchSkillsOptions {
  env?: Record<string, string | undefined>
  fetch?: typeof globalThis.fetch
}

/** The claude-plugins.dev listing: one page of the fields ZCF shows. */
const HitSchema = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  installs: v.optional(v.number()),
  stars: v.optional(v.number()),
  metadata: v.optional(
    v.object({
      repoOwner: v.optional(v.string()),
      repoName: v.optional(v.string()),
    }),
  ),
})
const AnswerSchema = v.object({ skills: v.array(HitSchema) })

/** Search the community index. Hits without a repository cannot be installed, so they drop out. */
export async function searchSkills(query: string, options: SearchSkillsOptions = {}): Promise<SkillSearchList> {
  const text = query.trim()
  if (text.length < SKILLS_SEARCH_MIN_QUERY) return { skills: [], source: 'none' }
  const url = `${options.env?.ZCF_SKILLS_SEARCH_URL || SKILLS_SEARCH_URL}?q=${encodeURIComponent(text)}&limit=${RESULT_LIMIT}`
  try {
    const response = await (options.fetch ?? globalThis.fetch)(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!response.ok) throw new Error(`${response.status} from ${url}`)
    const answer = v.parse(AnswerSchema, await response.json())
    const skills: SkillHit[] = []
    const seen = new Set<string>()
    for (const hit of answer.skills) {
      const { repoOwner, repoName } = hit.metadata ?? {}
      // Hits without a repository cannot be installed, and the index repeats skills that
      // several repos mirror, so both drop out while the first copy stays.
      if (!repoOwner || !repoName) continue
      const id = `${repoOwner}/${repoName}/${hit.name}`
      if (seen.has(id)) continue
      seen.add(id)
      skills.push({
        name: hit.name,
        source: `${repoOwner}/${repoName}`,
        description: hit.description,
        installs: hit.installs,
        stars: hit.stars,
      })
    }
    return { skills, source: 'remote' }
  } catch {
    return { skills: [], source: 'none' }
  }
}
