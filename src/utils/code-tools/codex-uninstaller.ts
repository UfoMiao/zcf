// Usage: Type the supported language passed through Codex uninstall flows.
import type { SupportedLang } from '../../constants'
// Usage: Read and update Codex artifacts while preserving ownership-sensitive content.
import { lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
// Usage: Resolve the user's Codex home directory for ownership-scoped cleanup.
import { homedir } from 'node:os'
// Usage: Check whether Codex artifacts exist before attempting cleanup.
import { pathExists } from 'fs-extra'
// Usage: Build platform-neutral paths for Codex resources.
import { join } from 'pathe'
// Usage: Match Codex MCP sections against the canonical ZCF service templates.
import { MCP_SERVICE_CONFIGS } from '../../config/mcp-services'
// Usage: Locate Codex configuration, auth, prompt, and legacy resource paths.
import {
  CODEX_AGENTS_FILE,
  CODEX_AUTH_FILE,
  CODEX_CONFIG_FILE,
  CODEX_DIR,
  CODEX_PROMPTS_DIR,
  LEGACY_ZCF_CONFIG_FILES,
  ZCF_CONFIG_FILE,
} from '../../constants'
// Usage: Localize Codex uninstall results and warnings.
import { i18n } from '../../i18n'
// Usage: Match credentials and generated prompts to ZCF ownership fingerprints.
import {
  getZcfSystemPromptContent,
  hashConfigValue,
  isLegacyZcfResourceContent,
  isZcfResourceContent,
  isZcfSystemPromptContent,
  stripZcfLanguageDirective,
} from '../config-ownership'
// Usage: Read and preserve JSON configuration entries during selective cleanup.
import { readJsonConfig, writeJsonConfig } from '../json-config'
// Usage: Parse Codex TOML sections without rewriting user-owned sections.
import { parseToml } from '../toml-edit'
// Usage: Move only proven ZCF-owned files to the system trash location.
import { moveToTrash } from '../trash'
// Usage: Reuse safe parsing, ownership matching, and user-content preservation helpers.
import {
  asRecord,
  escapeRegExp,
  formatHomePath,
  getErrorMessage,
  isZcfSkillContent,
  readTextFile,
  removeTomlSections,
} from '../uninstall-helpers'

export type CodexUninstallItem
  = 'config'
    | 'auth'
    | 'system-prompt'
    | 'workflow'
    | 'cli-package'
    | 'api-config'
    | 'mcp-config'
    | 'backups'

export interface CodexUninstallResult {
  success: boolean
  removed: string[] // Files/directories moved to trash
  removedConfigs: string[] // Configuration items deleted from config files
  errors: string[] // Error messages
  warnings: string[] // Warning messages
}

const ZCF_MCP_SERVER_IDS = new Set([
  'context7',
  'open-websearch',
  'spec-workflow',
  'mcp-deepwiki',
  'playwright',
  'exa',
  'serena',
])

const ZCF_SKILL_NAMES = [
  'init-project',
  'workflow',
  'feat',
  'git-commit',
  'git-rollback',
  'git-clean-branches',
  'git-worktree',
  'bmad-init',
] as const

const ZCF_LEGACY_PROMPT_FILES = [
  'workflow.md',
  'feat.md',
  'init-project.md',
  'git-commit.md',
  'git-rollback.md',
  'git-cleanBranches.md',
  'git-clean-branches.md',
  'git-worktree.md',
  'bmad-init.md',
] as const

const LEGACY_CODEX_PROMPT_FINGERPRINTS: Record<string, string[]> = {
  'init-project.md': [
    '535397d4ad6da0c73d4876bf97cab90aaae4d8a47e0cdaed06836e5cc4ba5f3d',
    'c971108844058e54060ebe6ef8ff8ba6c94e61f8e5379a56d1555e9e4e815131',
  ],
  'feat.md': [
    '9345f31f53cd82b1b46894b7d8d4493e5b7e16ffa6e89c182c7e7ee5991ca93e',
    '2119683d987fa6e25b95fe5031f71cc26a1e6d3560378ded1bf879f2585bb33f',
  ],
  'workflow.md': [
    '9349574e43ad8e2b13328a688f4f11ae5996358726267aecfac886783c379431',
    '495896b6c91615842062712ef69943ebb4ee92e3cc5f1d473c9501fcffc7a9f6',
  ],
  'bmad-init.md': [
    'a2f97a74e9cc17ee25bdbfef7d4fe031f96fa984a386bbfe237e43c97e6b6c81',
    '4132c455213be59b066e29cede53810aefcc1554f7d38cb87d06838c2f25e3db',
  ],
  'git-commit.md': [
    '97a543415d459de4f4fa3ac849626d160f7ec7d71ba94002ac36de0606163872',
    '66af163db6f768dc2087c638cd9491612d183af13ead3543afc1fde7ad38c994',
  ],
  'git-rollback.md': [
    'c30c43a3ff9962153ecdf09580a294971d373188f489e5f628396cb07b556036',
    'e6cb03064edec52007204d7e10a8a75287d77877408773481d2316d35de7419d',
  ],
  'git-cleanbranches.md': [
    '74797f9b48fb109c33e975df93ddac594796305ad386a6a1134dbcc4fd797dd1',
    '86b3780ce6e36d7adf4b96f76cb99d0a5b18dd6efba352825b183aed63cc9ef6',
  ],
  'git-clean-branches.md': [
    '74797f9b48fb109c33e975df93ddac594796305ad386a6a1134dbcc4fd797dd1',
    '86b3780ce6e36d7adf4b96f76cb99d0a5b18dd6efba352825b183aed63cc9ef6',
  ],
  'git-worktree.md': [
    'bc3f3987d3221d3da5bae7adaa15a974f1c1127570af7218f18373aa741b03d2',
    '96dd8c900f42bc727634362acbefae62687a5e668cc03a55eee508ad0c0ddfdd',
  ],
}

const LEGACY_CODEX_SKILL_FINGERPRINTS: Record<string, string[]> = {
  'init-project': [
    'fe1820493a288ebcfc6d32b4c405ee4c745aa4d88c2aa42139206a32ca747044',
    '81057af0a609a216dbeffbca9b773e744d4dc614c50c0dbb27a8eaad7df79548',
  ],
  'workflow': [
    '62b0f57c8a69dd3c5d35a4703694dd5b817994ab19e55fb7206b0501ba9bdc6f',
    '83263da649d5f3c2a2f45291da707ba12adb1e7fff9185ad9efc978bd6db4bb9',
  ],
  'feat': [
    '5e5ad8b61d0e35438f4d3f657168e03ee299e88840cc16e9b0d3aae000da3408',
    '0ea5488205603801e3768f39d4655da757d02465367da10053b52f79eab1e2e9',
  ],
  'git-commit': [
    'dad91bef51bc24d9290d79ef69657ae9d7e489ce84bb655841f8f778fcafac9c',
    '4a95b86c83f4d2bb3b6618cbd30220b5d1e62496010ddaa4855f0901addfbde4',
  ],
  'git-rollback': [
    '4dc78b75feb78fd97a9db3d009c5b51c2ec64900ada19abcc93b74fb8d59b7db',
    'acaf37b96577ec104b2fcacd962f1368ce54a3c8bb9dae85469779c0453034fb',
  ],
  'git-clean-branches': [
    'c6b9c9ddf120af2c3aebf06ced3729604b7d57f24a606ad0afb16f8e0e10e183',
    '33b7a501b3c697cbc13d60fc16a2ed43403b2a50b7f20f78e4683e80dd38c23e',
  ],
  'git-worktree': [
    'c1fc758330ec4fbbac5aa08d1b9c8a0dc26df7dcbe63bd3315c3100b9b51e77a',
    '97383f55c431321c45f543c9c8470329e93789164de5ab6013c543c1834ae539',
  ],
  'bmad-init': [
    'd1f0c99deb1c779e54943643f3d55dd38a57ddfc788edeee2b953dbeb6740e08',
    '075253f5484f859f71d4c9af37eda901ea7d47cd894fe1ea85bf781453d41b46',
  ],
}

// Hashes of the markerless system prompts written to AGENTS.md before the
// ownership marker was introduced. Exact snapshots preserve modified files.
const LEGACY_CODEX_SYSTEM_PROMPT_FINGERPRINTS = [
  'c6123ef59f88d2bb19f898982f12856f61aff4b8aca1568aa5d997a2644d8f47',
  '2200569c7145f79a3b5083dce17107e47280e1ffe6746df10decfc610472dec6',
  'c2519960623294ad78477c755548bb38d134865461cb3e98f164cccdf0b796c0',
  'e957a4da6d42cbadbb0e77c5769137c7e285f7aec1317482508481a9c24d0e2d',
  '5c45b78302268de3f2b20e0539daad9fe1d38d8f9c1c515c1cd629102188488b',
  '5dc6e6a2eb2a41d6ed49329afd89ec7d434eb78f01d225a35d371cbfa697dd81',
  '8873b456a7bd61305c070bc3f26aa0b3ab3ff316a1e58718f6a49f35ffc22624',
  'd04aa4a8faa39cf5f77330c55d48c5604e57ffb2883b4f86f4ab3ef4507e5418',
  '6dbf93026f06b9e50ee4009ad60f3d6648711941f5150ad7acbf04f2a5676d23',
  '533f3efec3bec4be93028785f5aedd06ffed8759ea39287ad1011ec9afd181ff',
  '361094e406f97b00f6f1eb8deb24d4425dfc99e27fa6b37ebbf4439ef6d0adba',
  'a87607a9a8e788df025b4ffb336d82e9476755203a5e9ee76f825feb404acfb7',
]

function hasClaudeSkillLink(skillName: string): boolean {
  try {
    return lstatSync(join(homedir(), '.claude', 'skills', skillName)).isSymbolicLink()
  }
  catch {
    return false
  }
}

const LEGACY_CODEX_LANGUAGE_DIRECTIVE = /\n+\*\*Most Important:Always respond in (?:English|Chinese-simplified)\*\*\s*$/i

function getLegacyCodexSystemPromptBody(content: string): string | null {
  const normalizedContent = content.replace(/\r\n?/g, '\n').trimEnd()
  if (LEGACY_CODEX_SYSTEM_PROMPT_FINGERPRINTS.includes(hashConfigValue(normalizedContent)))
    return normalizedContent

  const directive = normalizedContent.match(LEGACY_CODEX_LANGUAGE_DIRECTIVE)
  if (!directive || directive.index === undefined)
    return null

  const body = normalizedContent.slice(0, directive.index).trimEnd()
  return LEGACY_CODEX_SYSTEM_PROMPT_FINGERPRINTS.includes(hashConfigValue(body)) ? body : null
}

function isLegacyCodexOnlyJsonConfig(config: unknown): boolean {
  const record = asRecord(config)
  if (!record || record.zcfManaged !== true || record.codeToolType !== 'codex')
    return false

  return !Object.prototype.hasOwnProperty.call(record, 'claudeCode')
    && !Object.prototype.hasOwnProperty.call(record, 'profiles')
}

const ZCF_PROVIDER_MARKER_PREFIX = '# ZCF managed provider:'
const ZCF_PROVIDER_SNAPSHOT_PREFIX = '# ZCF managed provider snapshot:'
const ZCF_TOP_LEVEL_MARKER_PREFIX = '# ZCF managed top-level:'
const ZCF_MCP_MARKER_PREFIX = '# ZCF managed MCP:'

function isZcfProviderMarker(line: string, providerId: string): boolean {
  const pattern = `^${escapeRegExp(ZCF_PROVIDER_MARKER_PREFIX)}\\s*${escapeRegExp(providerId)}`
    + '(?:\\s+[a-f0-9]{64})?\\s*$'
  return new RegExp(pattern, 'i').test(line.trim())
}

function getZcfProviderMarkerHash(lines: string[], providerId: string): string | null {
  const pattern = new RegExp(
    `^${escapeRegExp(ZCF_PROVIDER_MARKER_PREFIX)}\\s*${escapeRegExp(providerId)}(?:\\s+([a-f0-9]{64}))?\\s*$`,
    'i',
  )
  const marker = lines.map(line => pattern.exec(line.trim())).find(Boolean)
  return marker?.[1]?.toLowerCase() || null
}

function getZcfProviderSnapshotHash(lines: string[], providerId: string): string | null {
  const pattern = new RegExp(
    `^${escapeRegExp(ZCF_PROVIDER_SNAPSHOT_PREFIX)}\\s*${escapeRegExp(providerId)}\\s+([a-f0-9]{64})\\s*$`,
    'i',
  )
  const marker = lines.map(line => pattern.exec(line.trim())).find(Boolean)
  return marker?.[1]?.toLowerCase() || null
}

function isZcfProviderSnapshotOwned(lines: string[], providerId: string): boolean {
  const snapshotHash = getZcfProviderSnapshotHash(lines, providerId)
  if (!snapshotHash)
    return false

  const providerMarkerPattern = new RegExp(
    `^${escapeRegExp(ZCF_PROVIDER_MARKER_PREFIX)}\\s*${escapeRegExp(providerId)}(?:\\s+[a-f0-9]{64})?\\s*$`,
    'i',
  )
  const snapshotMarkerPattern = new RegExp(
    `^${escapeRegExp(ZCF_PROVIDER_SNAPSHOT_PREFIX)}\\s*${escapeRegExp(providerId)}(?:\\s+[a-f0-9]{64})?\\s*$`,
    'i',
  )
  const body = lines
    .filter(line => !providerMarkerPattern.test(line.trim()) && !snapshotMarkerPattern.test(line.trim()))
    .join('\n')
    .trim()
  return hashConfigValue(body) === snapshotHash
}

function getTopLevelFieldValue(lines: string[], field: string): string | null {
  const firstSectionIndex = lines.findIndex(line => /^\s*\[/.test(line))
  const topLevelLines = firstSectionIndex >= 0 ? lines.slice(0, firstSectionIndex) : lines
  const pattern = new RegExp(`^#?\\s*${escapeRegExp(field)}\\s*=\\s*["']([^"']+)["']`)
  const match = topLevelLines.map(line => pattern.exec(line.trim())).find(Boolean)
  return match?.[1] || null
}

function isZcfTopLevelFieldOwned(lines: string[], field: string, value: string): boolean {
  const pattern = new RegExp(
    `^${escapeRegExp(ZCF_TOP_LEVEL_MARKER_PREFIX)}\\s*${escapeRegExp(field)}\\s+([a-f0-9]{64})\\s*$`,
    'i',
  )
  const firstSectionIndex = lines.findIndex(line => /^\s*\[/.test(line))
  const topLevelLines = firstSectionIndex >= 0 ? lines.slice(0, firstSectionIndex) : lines
  const marker = topLevelLines.map(line => pattern.exec(line.trim())).find(Boolean)
  return marker?.[1]?.toLowerCase() === hashConfigValue(value)
}

function getZcfMcpMarkerHash(lines: string[], serverId: string): string | null {
  const pattern = new RegExp(
    `^${escapeRegExp(ZCF_MCP_MARKER_PREFIX)}\\s*${escapeRegExp(serverId)}(?:\\s+([a-f0-9]{64}))?\\s*$`,
    'i',
  )
  const marker = lines.map(line => line.trim()).map(line => pattern.exec(line)).find(Boolean)
  return marker?.[1] || null
}

function hasZcfMcpMarker(lines: string[], serverId: string): boolean {
  const pattern = new RegExp(
    `^${escapeRegExp(ZCF_MCP_MARKER_PREFIX)}\\s*${escapeRegExp(serverId)}(?:\\s+[a-f0-9]{64})?\\s*$`,
    'i',
  )
  return lines.some(line => pattern.test(line.trim()))
}

function createEmptyCodexUninstallResult(): CodexUninstallResult {
  return {
    success: false,
    removed: [],
    removedConfigs: [],
    errors: [],
    warnings: [],
  }
}

function mergeCodexUninstallResults(results: CodexUninstallResult[]): CodexUninstallResult {
  return {
    success: results.every(result => result.success),
    removed: results.flatMap(result => result.removed),
    removedConfigs: results.flatMap(result => result.removedConfigs),
    errors: results.flatMap(result => result.errors),
    warnings: results.flatMap(result => result.warnings),
  }
}

interface ZcfCodexConfigCleanup {
  content: string
  providerIds: string[]
  authKeys: string[]
  credentialHashes: string[]
  unhashedAuthKeys: string[]
  removedApiConfig: boolean
  removedMcpConfig: boolean
}

const ZCF_PROVIDER_FIELD_KEYS = new Set([
  'name',
  'base_url',
  'wire_api',
  'temp_env_key',
  'env_key',
  'requires_openai_auth',
  'model',
])

function isLegacyZcfProviderHeader(line: string): boolean {
  return /^#\s*---\s*model provider added by ZCF\s*---\s*$/i.test(line.trim())
}

function isLegacyZcfMcpHeader(line: string): boolean {
  return /^#\s*---\s*MCP servers added by ZCF\s*---\s*$/i.test(line.trim())
}

function parseProviderSection(sectionName: string, body: string[]): Record<string, unknown> | null {
  try {
    const parsed = parseToml<Record<string, unknown>>(`[${sectionName}]\n${body.join('\n')}`)
    const providers = asRecord(parsed.model_providers)
    const providerId = sectionName.slice('model_providers.'.length).toLowerCase()
    const parsedCandidate = providers
      ? asRecord(Object.entries(providers).find(([id]) => id.toLowerCase() === providerId)?.[1])
      : null
    return parsedCandidate || null
  }
  catch {
    return null
  }
}

function getProviderAuthKey(body: string[]): string | null {
  for (const line of body) {
    const match = line.trim().match(/^(?:temp_env_key|env_key)\s*=\s*["']([^"']+)["']/)
    if (match)
      return match[1]
  }
  return null
}

function isLegacyZcfProviderSection(
  sectionName: string,
  body: string[],
  hasLegacyProviderHeader: boolean,
): boolean {
  if (!hasLegacyProviderHeader || !sectionName.startsWith('model_providers.'))
    return false

  const providerId = sectionName.slice('model_providers.'.length)
  if (body.some(line => isZcfProviderMarker(line, providerId)))
    return false

  const candidate = parseProviderSection(sectionName, body)
  if (!candidate)
    return false
  if (Object.keys(candidate).some(key => !ZCF_PROVIDER_FIELD_KEYS.has(key)))
    return false
  if (typeof candidate.name !== 'string' || typeof candidate.base_url !== 'string')
    return false

  return typeof candidate.temp_env_key === 'string' || typeof candidate.env_key === 'string'
}

function getSectionBodies(lines: string[]): Map<string, string[]> {
  const sections = new Map<string, string[]>()
  let currentSection: string | null = null

  for (const line of lines) {
    const sectionMatch = line.trim().match(/^\[([^\]]+)\]/)
    if (sectionMatch) {
      currentSection = sectionMatch[1]
      sections.set(currentSection, [])
      continue
    }

    if (currentSection)
      sections.get(currentSection)!.push(line)
  }

  return sections
}

function isKnownZcfMcpSection(
  sectionName: string,
  body: string[],
  allowLegacyCanonical = false,
): boolean {
  const serverId = sectionName.slice('mcp_servers.'.length).toLowerCase()
  if (!ZCF_MCP_SERVER_IDS.has(serverId))
    return false

  const service = MCP_SERVICE_CONFIGS.find(config => config.id.toLowerCase() === serverId)
  if (!service)
    return false

  let candidate: Record<string, unknown>
  try {
    const parsed = parseToml<Record<string, unknown>>(`[${sectionName}]\n${body.join('\n')}`)
    const mcpServers = asRecord(parsed.mcp_servers)
    const parsedCandidate = mcpServers
      ? asRecord(Object.entries(mcpServers).find(([id]) => id.toLowerCase() === serverId)?.[1])
      : null
    if (!parsedCandidate)
      return false
    candidate = parsedCandidate
  }
  catch {
    return false
  }

  const allowedKeys = new Set(['command', 'args', 'env', 'url', 'startup_timeout_sec'])
  if (Object.keys(candidate).some(key => !allowedKeys.has(key)))
    return false
  if (candidate.startup_timeout_sec !== undefined && candidate.startup_timeout_sec !== 30)
    return false

  if (service.config.url) {
    const matchesUrl = candidate.url === service.config.url
      && Object.keys(candidate).every(key => key === 'url' || key === 'startup_timeout_sec')
    if (matchesUrl)
      return hasZcfMcpMarker(body, serverId) || allowLegacyCanonical

    if (serverId === 'mcp-deepwiki') {
      const candidateArgs = Array.isArray(candidate.args) ? candidate.args : []
      const candidateEnv = asRecord(candidate.env) || {}
      return candidate.command === serverId
        && candidateArgs.length === 0
        && Object.keys(candidateEnv).length === 0
        && candidate.url === undefined
        && (hasZcfMcpMarker(body, serverId) || allowLegacyCanonical)
    }
    return false
  }

  if (typeof service.config.command !== 'string' || typeof candidate.command !== 'string')
    return false

  const expectedArgs = (service.config.args || []).map(arg => String(arg))
  if (serverId === 'serena') {
    const contextIndex = expectedArgs.indexOf('--context')
    if (contextIndex >= 0 && contextIndex + 1 < expectedArgs.length)
      expectedArgs[contextIndex + 1] = 'codex'
  }

  const candidateArgs = Array.isArray(candidate.args) ? candidate.args.map(String) : []
  const expectedCandidateArgs = candidate.command === service.config.command
    ? expectedArgs
    : candidate.command === 'cmd'
      ? ['/c', service.config.command, ...expectedArgs]
      : null
  if (!expectedCandidateArgs
    || candidateArgs.length !== expectedCandidateArgs.length
    || !expectedCandidateArgs.every((arg, index) => candidateArgs[index] === arg)) {
    return false
  }

  const expectedEnv = service.config.env || {}
  const candidateEnv = asRecord(candidate.env) || {}
  const allowedEnvKeys = new Set([...Object.keys(expectedEnv), 'SYSTEMROOT'])
  if (Object.keys(candidateEnv).some(key => !allowedEnvKeys.has(key)))
    return false
  if (Object.keys(expectedEnv).some(key => !Object.prototype.hasOwnProperty.call(candidateEnv, key)))
    return false

  const hasMarker = hasZcfMcpMarker(body, serverId)
  if (!hasMarker && !allowLegacyCanonical)
    return false

  return Object.entries(expectedEnv).every(([key, value]) => {
    if (serverId === 'exa' && key === 'EXA_API_KEY') {
      if (typeof candidateEnv[key] !== 'string')
        return false
      if (!hasMarker)
        return true
      return getZcfMcpMarkerHash(body, serverId) === hashConfigValue(candidateEnv[key])
    }
    return candidateEnv[key] === value
  })
}

function isZcfLegacyPrompt(fileName: string, content: string): boolean {
  return /zcf:workflow/i.test(content)
    || /structured six[- ]phase workflow/i.test(content)
    || /#\s+Claude Command:/i.test(content)
    || (/\$ARGUMENTS/.test(content) && /##\s+Core Workflow/i.test(content))
    || (fileName === 'init-project.md' && /get-current-datetime|init-architect|module-level.*CLAUDE\.md/i.test(content))
    || (fileName === 'bmad-init.md' && /#\s+\/bmad-init Command|bmad-method/i.test(content))
}

function isLegacyZcfPrompt(fileName: string, content: string): boolean {
  return isLegacyZcfResourceContent(content, LEGACY_CODEX_PROMPT_FINGERPRINTS[fileName.toLowerCase()] || [])
}

/**
 * Remove ZCF-managed Codex TOML sections while preserving user sections.
 * Marked provider/MCP sections are removed when their fingerprints still
 * match. Markerless canonical sections are removed only when a legacy ZCF
 * ownership header is present, so user-edited or independently created
 * sections stay in place.
 */
function cleanZcfCodexConfig(content: string): ZcfCodexConfigCleanup {
  const lines = content.split('\n')
  const sections = getSectionBodies(lines)
  const hasLegacyProviderHeader = lines.some(line => isLegacyZcfProviderHeader(line))
  const hasLegacyMcpHeader = lines.some(line => isLegacyZcfMcpHeader(line))
  const removableProviderIds = new Set(
    [...sections.entries()]
      .filter(([section, body]) => {
        if (!section.startsWith('model_providers.'))
          return false
        const providerId = section.slice('model_providers.'.length)
        const markedOwned = body.some(line => isZcfProviderMarker(line, providerId))
          && isZcfProviderSnapshotOwned(body, providerId)
        return markedOwned || isLegacyZcfProviderSection(section, body, hasLegacyProviderHeader)
      })
      .map(([section]) => section.slice('model_providers.'.length).toLowerCase()),
  )
  const knownMcpSections = new Set(
    [...sections.entries()]
      .filter(([section, body]) => {
        return section.startsWith('mcp_servers.')
          && isKnownZcfMcpSection(section, body, hasLegacyMcpHeader)
      })
      .map(([section]) => section),
  )
  const providerIds: string[] = []
  const authKeys: string[] = []
  const credentialHashes: string[] = []
  const unhashedAuthKeys: string[] = []
  const output: string[] = []

  let skippedSection: 'api' | 'mcp' | null = null
  let removedApiConfig = false
  let removedMcpConfig = false
  let currentSection: string | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    const sectionMatch = trimmed.match(/^\[([^\]]+)\]/)
    if (sectionMatch) {
      currentSection = sectionMatch[1]
      skippedSection = null

      const isProviderSection = currentSection.startsWith('model_providers.')
      const isMcpSection = currentSection.startsWith('mcp_servers.')
      const providerId = isProviderSection ? currentSection.slice('model_providers.'.length) : ''

      const removeProvider = isProviderSection
        && removableProviderIds.has(providerId.toLowerCase())
      const removeMcp = isMcpSection && knownMcpSections.has(currentSection)

      if (removeProvider) {
        skippedSection = 'api'
        providerIds.push(providerId)
        const sectionBody = sections.get(currentSection) || []
        const providerMarkerHash = getZcfProviderMarkerHash(sectionBody, providerId)
        if (providerMarkerHash) {
          credentialHashes.push(providerMarkerHash)
        }
        else {
          unhashedAuthKeys.push(providerId)
          const authKey = getProviderAuthKey(sectionBody)
          if (authKey)
            unhashedAuthKeys.push(authKey)
        }
        removedApiConfig = true
        continue
      }
      if (removeMcp) {
        skippedSection = 'mcp'
        removedMcpConfig = true
        continue
      }

      output.push(line)
      continue
    }

    if (skippedSection) {
      if (skippedSection === 'api') {
        const authKeyMatch = trimmed.match(/^(?:temp_env_key|env_key)\s*=\s*["']([^"']+)["']/)
        if (authKeyMatch)
          authKeys.push(authKeyMatch[1])
      }
      continue
    }

    if (currentSection === null) {
      const modelProviderMatch = trimmed.match(/^#?\s*model_provider\s*=\s*["']([^"']+)["']/)
      if (modelProviderMatch) {
        const providerId = modelProviderMatch[1]
        if (isZcfTopLevelFieldOwned(lines, 'model_provider', providerId)) {
          providerIds.push(providerId)
          removedApiConfig = true
          continue
        }
      }
      const modelMatch = trimmed.match(/^#?\s*model\s*=\s*["']([^"']+)["']/)
      const model = modelMatch?.[1] || getTopLevelFieldValue(lines, 'model')
      if (model !== null && /^#?\s*model\s*=/.test(trimmed)
        && isZcfTopLevelFieldOwned(lines, 'model', model)) {
        removedApiConfig = true
        continue
      }
    }

    output.push(line)
  }

  return {
    content: output.join('\n').replace(/\n{3,}/g, '\n\n'),
    providerIds: [...new Set(providerIds)],
    authKeys: [...new Set(authKeys)],
    credentialHashes: [...new Set(credentialHashes)],
    unhashedAuthKeys: [...new Set(unhashedAuthKeys)],
    removedApiConfig,
    removedMcpConfig,
  }
}

/**
 * Codex Uninstaller - Handles removal of Codex configurations and tools
 */
export class CodexUninstaller {
  private _lang: SupportedLang
  private conflictResolution = new Map<CodexUninstallItem, CodexUninstallItem[]>()

  private readonly CODEX_BACKUP_DIR = join(CODEX_DIR, 'backup')

  constructor(lang: SupportedLang = 'en') {
    this._lang = lang
    this.conflictResolution.set('cli-package', ['config', 'auth'])
    this.conflictResolution.set('config', ['api-config', 'mcp-config'])
    void this._lang
  }

  /**
   * Remove config file (config.toml)
   */
  async removeConfig(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      if (await pathExists(CODEX_CONFIG_FILE)) {
        const trashResult = await moveToTrash(CODEX_CONFIG_FILE)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || i18n.t('codex:trashMoveFailed'))
        }
        else {
          result.removed.push('config.toml')
          result.success = true
        }
      }
      else {
        result.warnings.push(i18n.t('codex:configNotFound'))
        result.success = true
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('codex:configRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove auth file (auth.json)
   */
  async removeAuth(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      if (await pathExists(CODEX_AUTH_FILE)) {
        const trashResult = await moveToTrash(CODEX_AUTH_FILE)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || i18n.t('codex:trashMoveFailed'))
        }
        else {
          result.removed.push('auth.json')
          result.success = true
        }
      }
      else {
        result.warnings.push(i18n.t('codex:authNotFound'))
        result.success = true
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('codex:authRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove the complete system prompt selected by custom uninstall.
   */
  async removeSystemPrompt(): Promise<CodexUninstallResult> {
    const result = createEmptyCodexUninstallResult()

    try {
      if (await pathExists(CODEX_AGENTS_FILE)) {
        const trashResult = await moveToTrash(CODEX_AGENTS_FILE)
        if (!trashResult[0]?.success) {
          result.warnings.push(i18n.t('codex:resourceTrashFailed', {
            resource: 'AGENTS.md',
            error: trashResult[0]?.error || i18n.t('codex:unknownTrashError'),
          }))
        }
        else {
          result.removed.push('AGENTS.md')
          result.success = true
        }
      }
      else {
        result.warnings.push(i18n.t('codex:systemPromptNotFound'))
        result.success = true
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('codex:systemPromptRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove only the ZCF system prompt from AGENTS.md.
   * User-authored AGENTS.md files are kept; an appended language directive is
   * removed in place so the rest of the file remains intact.
   */
  async removeZcfSystemPrompt(): Promise<CodexUninstallResult> {
    const result = createEmptyCodexUninstallResult()

    try {
      if (await pathExists(CODEX_AGENTS_FILE)) {
        const content = readTextFile(CODEX_AGENTS_FILE)
        const promptOwnership = content === null ? null : getZcfSystemPromptContent(content)
        const legacyPromptBody = content === null ? null : getLegacyCodexSystemPromptBody(content)
        const ownsWholeFile = content !== null
          && (isZcfSystemPromptContent(content) || legacyPromptBody !== null)

        if (ownsWholeFile) {
          const trashResult = await moveToTrash(CODEX_AGENTS_FILE)
          if (!trashResult[0]?.success) {
            result.warnings.push(i18n.t('codex:zcfResourceTrashFailed', {
              resource: 'AGENTS.md',
              error: trashResult[0]?.error || i18n.t('codex:zcfUnknownTrashError'),
            }))
          }
          else {
            result.removed.push('AGENTS.md')
          }
        }
        else if (content !== null) {
          const contentBody = promptOwnership?.body ?? content
          const markedContent = stripZcfLanguageDirective(contentBody)
          const cleanedContent = markedContent !== null
            ? markedContent.trimEnd()
            : null
          if (cleanedContent !== null) {
            writeFileSync(CODEX_AGENTS_FILE, `${cleanedContent}\n`)
            if (cleanedContent !== contentBody.trimEnd())
              result.removedConfigs.push(i18n.t('codex:zcfLanguageDirectiveRemoved'))
          }
        }
        result.success = !ownsWholeFile || result.warnings.length === 0
      }
      else {
        result.warnings.push(i18n.t('codex:systemPromptNotFound'))
        result.success = true
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('codex:zcfSystemPromptRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove the complete workflow directory selected by custom uninstall.
   */
  async removeWorkflow(): Promise<CodexUninstallResult> {
    const result = createEmptyCodexUninstallResult()

    try {
      if (await pathExists(CODEX_PROMPTS_DIR)) {
        const trashResult = await moveToTrash(CODEX_PROMPTS_DIR)
        if (!trashResult[0]?.success) {
          result.warnings.push(i18n.t('codex:resourceTrashFailed', {
            resource: 'prompts/',
            error: trashResult[0]?.error || i18n.t('codex:unknownTrashError'),
          }))
        }
        else {
          result.removed.push('prompts/')
          result.success = true
        }
      }
      else {
        result.warnings.push(i18n.t('codex:workflowNotFound'))
        result.success = true
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('codex:workflowRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove legacy ZCF prompt files while preserving user prompts in prompts/.
   */
  async removeZcfWorkflow(): Promise<CodexUninstallResult> {
    const result = createEmptyCodexUninstallResult()

    try {
      if (await pathExists(CODEX_PROMPTS_DIR)) {
        let cleanupFailed = false
        for (const fileName of ZCF_LEGACY_PROMPT_FILES) {
          const promptPath = join(CODEX_PROMPTS_DIR, fileName)
          if (!(await pathExists(promptPath)))
            continue

          const content = readTextFile(promptPath)
          const markedPrompt = content !== null
            && isZcfResourceContent(content)
            && isZcfLegacyPrompt(fileName, content)
          const legacyPrompt = content !== null && isLegacyZcfPrompt(fileName, content)
          if (!markedPrompt && !legacyPrompt) {
            continue
          }

          const trashResult = await moveToTrash(promptPath)
          if (!trashResult[0]?.success) {
            cleanupFailed = true
            result.warnings.push(i18n.t('codex:zcfResourceTrashFailed', {
              resource: `prompts/${fileName}`,
              error: trashResult[0]?.error || i18n.t('codex:zcfUnknownTrashError'),
            }))
          }
          else {
            result.removed.push(`prompts/${fileName}`)
          }
        }
        result.success = !cleanupFailed
      }
      else {
        result.warnings.push(i18n.t('codex:workflowNotFound'))
        result.success = true
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('codex:zcfWorkflowRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Uninstall Codex CLI package
   */
  async uninstallCliPackage(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      // Use the unified uninstallCodeTool function which handles different install methods
      const { uninstallCodeTool } = await import('../installer')
      const success = await uninstallCodeTool('codex')

      if (success) {
        result.removed.push('@openai/codex')
        result.success = true
      }
      else {
        result.errors.push(i18n.t('uninstall:uninstallFailed', { codeType: i18n.t('common:codex'), message: '' }))
      }
    }
    catch (error: unknown) {
      if (getErrorMessage(error).includes('not found') || getErrorMessage(error).includes('not installed')) {
        result.warnings.push(i18n.t('codex:packageNotFound'))
        result.success = true
      }
      else {
        result.errors.push(i18n.t('uninstall:uninstallFailed', {
          codeType: i18n.t('common:codex'),
          message: `: ${getErrorMessage(error)}`,
        }))
      }
    }

    return result
  }

  /**
   * Remove API configuration from config.toml
   */
  async removeApiConfig(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      if (await pathExists(CODEX_CONFIG_FILE)) {
        // Read current config content
        const { readFileSync, writeFileSync } = await import('node:fs')
        const content = readFileSync(CODEX_CONFIG_FILE, 'utf-8')

        // Remove model_provider setting and all [model_providers.xxx] sections
        const lines = content.split('\n')
        const newLines: string[] = []
        let inProviderSection = false
        let configModified = false

        for (const line of lines) {
          // Check if entering a [model_providers.xxx] section
          if (line.trim().match(/^\[model_providers\./)) {
            inProviderSection = true
            configModified = true
            continue
          }

          // Check if leaving the provider section (next section starts)
          if (inProviderSection && line.trim().startsWith('[') && !line.trim().match(/^\[model_providers\./)) {
            inProviderSection = false
          }

          // Skip lines inside provider sections
          if (inProviderSection) {
            continue
          }

          // Skip model_provider line
          if (line.trim().startsWith('model_provider')) {
            configModified = true
            continue
          }

          newLines.push(line)
        }

        if (configModified) {
          writeFileSync(CODEX_CONFIG_FILE, newLines.join('\n'))
          result.removedConfigs.push(i18n.t('codex:apiConfigRemoved'))
        }
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('codex:configNotFound'))
        result.success = true
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('codex:apiConfigRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove backup directory (~/.codex/backup/)
   */
  async removeBackups(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      if (await pathExists(this.CODEX_BACKUP_DIR)) {
        const trashResult = await moveToTrash(this.CODEX_BACKUP_DIR)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || i18n.t('codex:backupTrashFailed'))
        }
        else {
          result.removed.push('backup/')
          result.success = true
        }
      }
      else {
        result.warnings.push(i18n.t('codex:backupNotFound'))
        result.success = true
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('codex:backupRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove MCP configuration from config.toml
   */
  async removeMcpConfig(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      if (await pathExists(CODEX_CONFIG_FILE)) {
        // Read current config content
        const { readFileSync, writeFileSync } = await import('node:fs')
        const content = readFileSync(CODEX_CONFIG_FILE, 'utf-8')

        // Remove MCP service sections: [mcp_servers.xxx] (env is inline now)
        const lines = content.split('\n')
        const newLines: string[] = []
        let inMcpSection = false
        let configModified = false

        for (const line of lines) {
          // Check if entering a MCP section
          if (line.trim().match(/^\[mcp_servers\./)) {
            inMcpSection = true
            configModified = true
            continue
          }

          // Check if leaving the MCP section (next section starts)
          if (inMcpSection && line.trim().startsWith('[') && !line.trim().match(/^\[mcp_servers\./)) {
            inMcpSection = false
          }

          // Skip lines inside MCP sections
          if (inMcpSection) {
            continue
          }

          newLines.push(line)
        }

        if (configModified) {
          writeFileSync(CODEX_CONFIG_FILE, newLines.join('\n'))
          result.removedConfigs.push(i18n.t('codex:mcpConfigRemoved'))
        }
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('codex:configNotFound'))
        result.success = true
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('codex:mcpConfigRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove only ZCF-managed Codex TOML and auth entries.
   */
  async removeZcfManagedConfig(): Promise<CodexUninstallResult> {
    const result = createEmptyCodexUninstallResult()

    try {
      if (!(await pathExists(CODEX_CONFIG_FILE))) {
        result.warnings.push(i18n.t('codex:configNotFound'))
        result.success = true
        return result
      }

      const content = readFileSync(CODEX_CONFIG_FILE, 'utf8')
      const cleanup = cleanZcfCodexConfig(content)

      if (cleanup.removedApiConfig && await pathExists(CODEX_AUTH_FILE)) {
        const auth = readJsonConfig<Record<string, unknown>>(CODEX_AUTH_FILE)
        if (!auth || Array.isArray(auth))
          throw new Error(i18n.t('codex:authConfigUnreadable'))

        const authKeys = new Set([...cleanup.authKeys, ...cleanup.providerIds])
        const credentialHashes = new Set(cleanup.credentialHashes)
        const unhashedAuthKeys = new Set(cleanup.unhashedAuthKeys)
        const removedCredentialHashes = new Set<string>()
        let authModified = false

        for (const key of authKeys) {
          if (!Object.prototype.hasOwnProperty.call(auth, key))
            continue
          const value = auth[key]
          if (typeof value !== 'string')
            continue
          const fingerprintOwned = credentialHashes.has(hashConfigValue(value))
          const legacyOwned = unhashedAuthKeys.has(key)
          if (!fingerprintOwned && !legacyOwned)
            continue
          delete auth[key]
          removedCredentialHashes.add(hashConfigValue(value))
          authModified = true
        }

        // OPENAI_API_KEY is also written as a compatibility alias by ZCF.
        // Remove it only when it points at a credential proven to belong to a
        // removed ZCF provider; unrelated user credentials must survive.
        if (!authKeys.has('OPENAI_API_KEY')
          && typeof auth.OPENAI_API_KEY === 'string'
          && removedCredentialHashes.has(hashConfigValue(auth.OPENAI_API_KEY))) {
          delete auth.OPENAI_API_KEY
          authModified = true
        }

        if (authModified) {
          writeJsonConfig(CODEX_AUTH_FILE, auth)
          result.removedConfigs.push(i18n.t('codex:zcfAuthConfigRemoved'))
        }
      }

      if (cleanup.content !== content)
        writeFileSync(CODEX_CONFIG_FILE, cleanup.content)

      if (cleanup.removedApiConfig)
        result.removedConfigs.push(i18n.t('codex:zcfApiConfigRemoved'))
      if (cleanup.removedMcpConfig)
        result.removedConfigs.push(i18n.t('codex:zcfMcpConfigRemoved'))

      result.success = true
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('codex:zcfConfigRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove the canonical global skills installed for Codex by ZCF.
   */
  async removeZcfGlobalSkills(): Promise<CodexUninstallResult> {
    const result = createEmptyCodexUninstallResult()
    const globalSkillsDir = join(homedir(), '.agents', 'skills')

    try {
      let cleanupFailed = false
      for (const skillName of ZCF_SKILL_NAMES) {
        const skillPath = join(globalSkillsDir, skillName)
        if (!(await pathExists(skillPath)))
          continue

        const skillFile = join(skillPath, 'SKILL.md')
        if (!(await pathExists(skillFile)))
          continue
        const skillContent = readTextFile(skillFile)
        if (!skillContent || (!isZcfSkillContent(skillName, skillContent)
          && !isLegacyZcfResourceContent(skillContent, LEGACY_CODEX_SKILL_FINGERPRINTS[skillName] || []))) {
          continue
        }
        if (hasClaudeSkillLink(skillName))
          continue

        const entries = readdirSync(skillPath)
        if (entries.some(entry => entry !== 'SKILL.md'))
          continue

        const trashResult = await moveToTrash(skillPath)
        if (!trashResult[0]?.success) {
          cleanupFailed = true
          result.warnings.push(i18n.t('codex:zcfResourceTrashFailed', {
            resource: `~/.agents/skills/${skillName}/`,
            error: trashResult[0]?.error || i18n.t('codex:zcfUnknownTrashError'),
          }))
        }
        else {
          result.removed.push(`~/.agents/skills/${skillName}/`)
        }
      }
      result.success = !cleanupFailed
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('codex:zcfSkillsRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove the shared ZCF preference file and legacy preference files.
   */
  async removeZcfGlobalConfig(): Promise<CodexUninstallResult> {
    const result = createEmptyCodexUninstallResult()
    const configPaths = [ZCF_CONFIG_FILE, ...(Array.isArray(LEGACY_ZCF_CONFIG_FILES) ? LEGACY_ZCF_CONFIG_FILES : [])]

    try {
      for (const configPath of [...new Set(configPaths)]) {
        if (!(await pathExists(configPath)))
          continue

        if (configPath === ZCF_CONFIG_FILE) {
          const content = readTextFile(configPath)
          const cleanedContent = content === null ? null : removeTomlSections(content, ['codex'])
          if (cleanedContent !== null) {
            writeFileSync(configPath, cleanedContent)
            result.removedConfigs.push(i18n.t('codex:zcfApiConfigRemoved'))
          }
          continue
        }

        const content = readTextFile(configPath)
        if (content === null)
          continue

        let parsedConfig: unknown
        try {
          parsedConfig = JSON.parse(content)
        }
        catch {
          continue
        }
        if (!isLegacyCodexOnlyJsonConfig(parsedConfig))
          continue

        const trashResult = await moveToTrash(configPath)
        if (!trashResult[0]?.success) {
          result.success = false
          result.warnings.push(i18n.t('codex:zcfResourceTrashFailed', {
            resource: formatHomePath(configPath, homedir()),
            error: trashResult[0]?.error || i18n.t('codex:zcfUnknownTrashError'),
          }))
        }
        else {
          result.removed.push(formatHomePath(configPath, homedir()))
        }
      }
      if (!result.warnings.length)
        result.success = true
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('codex:zcfGlobalConfigRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove ZCF-managed Codex configuration only.
   * The Codex CLI, user sections, and backups are intentionally kept.
   */
  async uninstallZcfConfig(): Promise<CodexUninstallResult> {
    const results = await Promise.all([
      this.removeZcfManagedConfig(),
      this.removeZcfSystemPrompt(),
      this.removeZcfWorkflow(),
      this.removeZcfGlobalSkills(),
      this.removeZcfGlobalConfig(),
    ])

    return mergeCodexUninstallResults(results)
  }

  /** Alias kept for callers that use the mode name as a method name. */
  async uninstallZcfOnly(): Promise<CodexUninstallResult> {
    return await this.uninstallZcfConfig()
  }

  /**
   * Complete uninstall - remove all directories and packages
   */
  async completeUninstall(): Promise<CodexUninstallResult> {
    const result: CodexUninstallResult = {
      success: true,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      // Remove entire .codex directory
      if (await pathExists(CODEX_DIR)) {
        const trashResult = await moveToTrash(CODEX_DIR)
        if (!trashResult[0]?.success) {
          result.success = false
          result.warnings.push(trashResult[0]?.error
            ? i18n.t('codex:completeTrashFailed', { error: trashResult[0].error })
            : i18n.t('codex:trashMoveFailed'))
        }
        else {
          result.removed.push('~/.codex/')
          result.success = true
        }
      }

      // Use existing uninstallCliPackage method to avoid code duplication
      const cliUninstallResult = await this.uninstallCliPackage()

      // Merge results from CLI package uninstall
      result.removed.push(...cliUninstallResult.removed)
      result.removedConfigs.push(...cliUninstallResult.removedConfigs)
      result.errors.push(...cliUninstallResult.errors)
      result.warnings.push(...cliUninstallResult.warnings)

      // Overall success is true only if both operations succeeded
      result.success = result.success && cliUninstallResult.success
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('codex:completeUninstallFailed', { error: getErrorMessage(error) }))
      result.success = false
    }

    return result
  }

  /**
   * Custom uninstall with conflict resolution
   */
  async customUninstall(selectedItems: CodexUninstallItem[]): Promise<CodexUninstallResult[]> {
    // Resolve conflicts
    const resolvedItems = this.resolveConflicts(selectedItems)

    const results: CodexUninstallResult[] = []

    for (const item of resolvedItems) {
      try {
        const result = await this.executeUninstallItem(item)
        results.push(result)
      }
      catch (error: unknown) {
        results.push({
          success: false,
          removed: [],
          removedConfigs: [],
          errors: [i18n.t('codex:customUninstallItemFailed', {
            item,
            error: getErrorMessage(error),
          })],
          warnings: [],
        })
      }
    }

    return results
  }

  /**
   * Resolve conflicts between uninstall items
   */
  private resolveConflicts(items: CodexUninstallItem[]): CodexUninstallItem[] {
    const resolved = [...items]

    for (const [primary, conflicts] of this.conflictResolution) {
      if (resolved.includes(primary)) {
        // Remove conflicting items
        conflicts.forEach((conflict) => {
          const index = resolved.indexOf(conflict)
          if (index > -1) {
            resolved.splice(index, 1)
          }
        })
      }
    }

    return resolved
  }

  /**
   * Execute uninstall for a specific item
   */
  private async executeUninstallItem(item: CodexUninstallItem): Promise<CodexUninstallResult> {
    switch (item) {
      case 'config':
        return await this.removeConfig()
      case 'auth':
        return await this.removeAuth()
      case 'system-prompt':
        return await this.removeSystemPrompt()
      case 'workflow':
        return await this.removeWorkflow()
      case 'cli-package':
        return await this.uninstallCliPackage()
      case 'api-config':
        return await this.removeApiConfig()
      case 'mcp-config':
        return await this.removeMcpConfig()
      case 'backups':
        return await this.removeBackups()
      default:
        return {
          success: false,
          removed: [],
          removedConfigs: [],
          errors: [i18n.t('codex:unknownUninstallItem', { item })],
          warnings: [],
        }
    }
  }
}
