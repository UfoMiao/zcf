import type { Plan } from './plan/types'

/**
 * Where ZCF downloads from. `china` asks mirrors in mainland China first, as magpie's
 * China mirror switch (「国内镜像」) does. Only mirrors that serve the very same files are used
 * (npmmirror for npm, jsDelivr for GitHub files), never a proxy that could hand back
 * anything it liked. Git clones are the one exception: a prefix mirror in magpie's
 * `--mirror` style, where git's object-hash chain still fails a clone whose bytes were
 * changed in transit, though the refs themselves come from the mirror, as with magpie.
 */
export const MIRRORS = ['official', 'china'] as const
export type Mirror = (typeof MIRRORS)[number]

export function isMirror(value: unknown): value is Mirror {
  return MIRRORS.some(mirror => mirror === value)
}

export const OFFICIAL_NPM_REGISTRY = 'https://registry.npmjs.org'
export const CHINA_NPM_REGISTRY = 'https://registry.npmmirror.com'

/** The npm registry each mirror uses. */
export function npmRegistry(mirror: Mirror): string {
  return mirror === 'china' ? CHINA_NPM_REGISTRY : OFFICIAL_NPM_REGISTRY
}

/**
 * The prefix a GitHub URL is downloaded through on the China mirror, as magpie's
 * `--mirror` does: the mirror's address first, then the whole official URL, so only
 * the download address changes. The guarantee is magpie's too: the refs still come
 * from the mirror, so it decides which history is fetched, while a change inside the
 * bytes it hands back breaks git's object-hash chain and fails the clone.
 */
export const OFFICIAL_GITHUB = 'https://github.com'
export const CHINA_GITHUB_PREFIX = 'https://gh-proxy.com/https://github.com'

/** A mirror name as people type it: any case, and `cn` for `china`. `undefined` when it names no mirror. */
export function parseMirrorName(value: string | undefined): Mirror | undefined {
  const name = value?.trim().toLowerCase()
  if (name === 'cn') return 'china'
  return isMirror(name) ? name : undefined
}

/** `ZCF_MIRROR` as a mirror; `undefined` when it is unset or not a mirror name. */
export function envMirror(env: Record<string, string | undefined>): Mirror | undefined {
  return parseMirrorName(env.ZCF_MIRROR)
}

/**
 * The mirror a run uses: the front end's choice for this run (such as a `--mirror`
 * flag), else `ZCF_MIRROR`, else the config's `mirror`.
 */
export function resolveMirror(options: {
  override?: Mirror
  env: Record<string, string | undefined>
  config?: { mirror?: Mirror }
}): Mirror {
  return options.override ?? envMirror(options.env) ?? options.config?.mirror ?? 'official'
}

/** Whether the user already chose an npm registry for child processes; npm reads the name in any case. */
function hasRegistryEnv(env: Record<string, string | undefined>): boolean {
  return Object.keys(env).some(key => key.toLowerCase() === 'npm_config_registry' && env[key]?.trim())
}

/**
 * Environment variables that point npm, and everything that runs it (`npx skills`,
 * a tool's own updater on an npm install), at the mirror's registry. Empty for the
 * official mirror, and when the user already set a registry this way.
 */
export function mirrorEnv(mirror: Mirror, env: Record<string, string | undefined>): Record<string, string> {
  if (mirror === 'official' || hasRegistryEnv(env)) return {}
  return { npm_config_registry: npmRegistry(mirror) }
}

/** Whether the user already passes git configuration to child processes through `GIT_CONFIG_COUNT`. */
function hasGitConfigEnv(env: Record<string, string | undefined>): boolean {
  return Object.keys(env).some(key => key.toUpperCase() === 'GIT_CONFIG_COUNT' && env[key]?.trim())
}

/**
 * Environment variables that point the `git clone` inside `npx skills add` at the mirror,
 * in git's own `GIT_CONFIG_COUNT` form: a `url.<prefix>.insteadOf` rule that rewrites
 * `https://github.com` to the mirror prefix, for this one process only; the user's global
 * git configuration is never touched. Empty for the official mirror, and when the user
 * already owns URL rewriting: through `GIT_CONFIG_COUNT`, which cannot be merged with, or
 * through `url.<base>.insteadOf` rules of their own (`userUrlRewrites`) — git prefers an
 * env-injected rule over a file rule of the same match length, so the mirror's rewrite
 * must not shadow theirs.
 */
export function githubMirrorEnv(
  mirror: Mirror,
  env: Record<string, string | undefined>,
  userUrlRewrites: boolean,
): Record<string, string> {
  if (mirror === 'official' || hasGitConfigEnv(env) || userUrlRewrites) return {}
  return {
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: `url.${CHINA_GITHUB_PREFIX}.insteadOf`,
    GIT_CONFIG_VALUE_0: OFFICIAL_GITHUB,
  }
}

/** Add the mirror's environment to every command step of a plan. */
export function withMirrorEnv(plan: Plan, mirror: Mirror, env: Record<string, string | undefined>): Plan {
  const extra = mirrorEnv(mirror, env)
  if (Object.keys(extra).length === 0) return plan
  return {
    tools: plan.tools.map(toolPlan => ({
      ...toolPlan,
      steps: toolPlan.steps.map(step => (step.kind === 'command' ? { ...step, env: { ...extra, ...step.env } } : step)),
    })),
  }
}

export interface GitHubFile {
  /** `owner/name` */
  repo: string
  /** A branch, tag or commit. */
  ref: string
  /** The file's path in the repository, without a leading slash. */
  path: string
}

/** jsDelivr hosts that serve the same files as cdn.jsdelivr.net and are usually reachable from mainland China. */
const CHINA_JSDELIVR_HOSTS = ['fastly.jsdelivr.net', 'gcore.jsdelivr.net']

/**
 * Addresses of a file in a public GitHub repository, to try in order. Each one serves
 * the same bytes; raw.githubusercontent.com is the source the others copy.
 */
export function githubFileUrls({ repo, ref, path }: GitHubFile, mirror: Mirror): string[] {
  const jsdelivr = (host: string) => `https://${host}/gh/${repo}@${ref}/${path}`
  const raw = `https://raw.githubusercontent.com/${repo}/${ref}/${path}`
  const hosts = mirror === 'china' ? [...CHINA_JSDELIVR_HOSTS, 'cdn.jsdelivr.net'] : ['cdn.jsdelivr.net']
  return [...hosts.map(jsdelivr), raw]
}
