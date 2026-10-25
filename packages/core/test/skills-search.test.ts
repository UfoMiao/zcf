import { describe, expect, it } from 'vitest'

import { searchSkills, SKILLS_SEARCH_URL } from '../src/skills-search'

/** A trimmed copy of a real answer from `GET /api/skills?q=git&limit=3`. */
const ANSWER = {
  skills: [
    {
      id: '0e8b3f36-1e1f-4d0c-9c5e-a13ba5c6e001',
      name: 'using-git-worktrees',
      namespace: '@obra/superpowers/using-git-worktrees',
      sourceUrl: 'https://github.com/obra/superpowers/tree/main/skills/using-git-worktrees',
      description: 'Create and manage git worktrees.',
      version: null,
      dependencies: null,
      author: 'obra',
      stars: 4211,
      installs: 541,
      metadata: {
        repoOwner: 'obra',
        repoName: 'superpowers',
        directoryPath: 'skills/using-git-worktrees',
        rawFileUrl: 'https://raw.githubusercontent.com/obra/superpowers/main/skills/using-git-worktrees/SKILL.md',
      },
      createdAt: '2025-11-20T10:00:00.000Z',
      updatedAt: '2026-02-02T00:00:00Z',
    },
    {
      id: '0e8b3f36-1e1f-4d0c-9c5e-a13ba5c6e002',
      name: 'git-advanced-workflows',
      namespace: '@wshobson/agents/git-advanced-workflows',
      sourceUrl: 'https://github.com/wshobson/agents/tree/main/skills/git-advanced-workflows',
      description: 'Advanced git workflows.',
      version: null,
      dependencies: null,
      author: 'wshobson',
      stars: 1597,
      installs: 377,
      metadata: {
        repoOwner: 'wshobson',
        repoName: 'agents',
        directoryPath: 'skills/git-advanced-workflows',
        rawFileUrl: 'https://raw.githubusercontent.com/wshobson/agents/main/skills/git-advanced-workflows/SKILL.md',
      },
      createdAt: '2025-11-02T04:37:22.688Z',
      updatedAt: '2026-01-11T16:51:45Z',
    },
    {
      // A skill the index knows but cannot map to a repository, so it cannot be installed.
      id: '0e8b3f36-1e1f-4d0c-9c5e-a13ba5c6e003',
      name: 'orphan-skill',
      namespace: '@mirror/orphan-skill',
      sourceUrl: 'https://example.com/orphan',
      description: 'No repository behind this one.',
      installs: 12,
      metadata: {},
      createdAt: '2025-11-02T04:37:22.688Z',
      updatedAt: '2026-01-11T16:51:45Z',
    },
    {
      // The same skill as the first hit under a mirrored repository, which must not repeat it.
      id: '0e8b3f36-1e1f-4d0c-9c5e-a13ba5c6e004',
      name: 'using-git-worktrees',
      namespace: '@mirror/superpowers/using-git-worktrees',
      sourceUrl: 'https://github.com/mirror/superpowers/tree/main/skills/using-git-worktrees',
      description: 'Create and manage git worktrees (mirror).',
      installs: 3,
      metadata: { repoOwner: 'obra', repoName: 'superpowers', directoryPath: 'skills/using-git-worktrees' },
      createdAt: '2025-11-20T10:00:00.000Z',
      updatedAt: '2026-02-02T00:00:00Z',
    },
  ],
}

function fakeFetch(answer: unknown, status = 200) {
  const calls: string[] = []
  const fetcher = (async (url: string) => {
    calls.push(url)
    return new Response(JSON.stringify(answer), { status })
  }) as typeof fetch
  return { fetcher, calls }
}

describe('searchSkills', () => {
  it('maps hits to installable sources and drops or repeats what it cannot install', async () => {
    const { fetcher, calls } = fakeFetch(ANSWER)
    const list = await searchSkills('git worktree', { fetch: fetcher })
    expect(list).toEqual({
      source: 'remote',
      skills: [
        {
          name: 'using-git-worktrees',
          source: 'obra/superpowers',
          description: 'Create and manage git worktrees.',
          installs: 541,
          stars: 4211,
        },
        {
          name: 'git-advanced-workflows',
          source: 'wshobson/agents',
          description: 'Advanced git workflows.',
          installs: 377,
          stars: 1597,
        },
      ],
    })
    expect(calls).toEqual([`${SKILLS_SEARCH_URL}?q=git%20worktree&limit=30`])
  })

  it('does not fetch for a query the index would refuse anyway', async () => {
    const { fetcher, calls } = fakeFetch(ANSWER)
    const refused: string[] = ['', ' ', 'g']
    const lists = await Promise.all(refused.map(query => searchSkills(query, { fetch: fetcher })))
    expect(lists).toEqual(refused.map(() => ({ skills: [], source: 'none' })))
    expect(calls).toEqual([])
  })

  it('reports nothing when the index is unreachable or wrong', async () => {
    const offline = (async () => {
      throw new Error('offline')
    }) as typeof fetch
    await expect(searchSkills('git', { fetch: offline })).resolves.toEqual({ skills: [], source: 'none' })
    const { fetcher } = fakeFetch({ skills: 'nope' }, 500)
    await expect(searchSkills('git', { fetch: fetcher })).resolves.toEqual({ skills: [], source: 'none' })
  })

  it('queries ZCF_SKILLS_SEARCH_URL when it is set', async () => {
    const { fetcher, calls } = fakeFetch(ANSWER)
    await searchSkills('git', { fetch: fetcher, env: { ZCF_SKILLS_SEARCH_URL: 'https://mirror.example/search' } })
    expect(calls).toEqual(['https://mirror.example/search?q=git&limit=30'])
  })
})
