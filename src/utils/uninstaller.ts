import type { SupportedLang } from '../constants'
// Usage: Read and update uninstall settings and memory files while preserving user data.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { pathExists } from 'fs-extra'
import { join } from 'pathe'
import { exec } from 'tinyexec'
// Usage: Match Claude MCP sections against the canonical ZCF service templates.
import { MCP_SERVICE_CONFIGS } from '../config/mcp-services'
// Usage: Identify the legacy ZCF workflow skills eligible for selective cleanup.
import { getAllWorkflowSkillNames } from '../config/workflows'
// Usage: Resolve the configuration and legacy resource paths used by uninstall flows.
import { LEGACY_ZCF_CONFIG_FILES, SETTINGS_FILE, ZCF_CONFIG_FILE } from '../constants'
import { i18n } from '../i18n'
// Usage: Match sensitive values to ZCF ownership fingerprints during cleanup.
import {
  hashConfigValue,
  isLegacyZcfResourceContent,
  isZcfLanguageDirectiveContent,
  isZcfResourceContent,
  stripZcfLanguageDirective,
  ZCF_API_ENV_KEYS,
} from './config-ownership'
import { readJsonConfig, writeJsonConfig } from './json-config'
// Usage: Parse shared TOML configuration while preserving unrelated sections.
import { parseToml } from './toml-edit'
import { moveToTrash } from './trash'
// Usage: Preserve user content while identifying ZCF-owned uninstall artifacts.
import {
  asRecord,
  formatHomePath,
  getErrorMessage,
  hasFrontmatterValue,
  isZcfOutputStyleContent,
  isZcfSkillContent,
  readTextFile,
  removeTomlSections,
} from './uninstall-helpers'

export type UninstallItem
  = | 'output-styles'
    | 'skills'
    | 'agents'
    | 'claude-md'
    | 'permissions-envs'
    | 'mcps'
    | 'ccr'
    | 'ccline'
    | 'claude-code'
    | 'backups'
    | 'zcf-config'

export interface UninstallResult {
  success: boolean
  removed: string[] // Files/directories moved to trash
  removedConfigs: string[] // Configuration items deleted from config files
  errors: string[] // Error messages
  warnings: string[] // Warning messages
}

const ZCF_TEMPLATE_ENV_VALUES: Record<string, string> = {
  DISABLE_TELEMETRY: '1',
  DISABLE_ERROR_REPORTING: '1',
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  MCP_TIMEOUT: '60000',
}

const ZCF_MCP_SERVER_IDS = [
  'context7',
  'open-websearch',
  'spec-workflow',
  'mcp-deepwiki',
  'Playwright',
  'exa',
  'serena',
] as const

const ZCF_OUTPUT_STYLE_NAMES = [
  'engineer-professional',
  'laowang-engineer',
  'leibus-engineer',
  'nekomata-engineer',
  'ojousama-engineer',
  'rem-engineer',
] as const

const LEGACY_ZCF_LANGUAGE_DIRECTIVES = new Set([
  'Always respond in English',
  'Always respond in Chinese-simplified',
])

const LEGACY_CLAUDE_CONFIG_KEYS = [
  'version',
  'preferredLang',
  'templateLang',
  'aiOutputLang',
  'outputStyles',
  'defaultOutputStyle',
  'codeToolType',
  'lastUpdated',
  'claudeCode',
] as const

// Hashes of the markerless output styles shipped before ownership markers
// were introduced. Exact snapshots let compatibility cleanup remove old ZCF
// styles while retaining styles that users edited or extended.
const LEGACY_ZCF_OUTPUT_STYLE_FINGERPRINTS: Record<string, string[]> = {
  'engineer-professional': [
    'c6123ef59f88d2bb19f898982f12856f61aff4b8aca1568aa5d997a2644d8f47',
    '8873b456a7bd61305c070bc3f26aa0b3ab3ff316a1e58718f6a49f35ffc22624',
  ],
  'laowang-engineer': [
    '2200569c7145f79a3b5083dce17107e47280e1ffe6746df10decfc610472dec6',
    'd04aa4a8faa39cf5f77330c55d48c5604e57ffb2883b4f86f4ab3ef4507e5418',
  ],
  'leibus-engineer': [
    'c2519960623294ad78477c755548bb38d134865461cb3e98f164cccdf0b796c0',
    '6dbf93026f06b9e50ee4009ad60f3d6648711941f5150ad7acbf04f2a5676d23',
  ],
  'nekomata-engineer': [
    'e957a4da6d42cbadbb0e77c5769137c7e285f7aec1317482508481a9c24d0e2d',
    '533f3efec3bec4be93028785f5aedd06ffed8759ea39287ad1011ec9afd181ff',
  ],
  'ojousama-engineer': [
    '5c45b78302268de3f2b20e0539daad9fe1d38d8f9c1c515c1cd629102188488b',
    '361094e406f97b00f6f1eb8deb24d4425dfc99e27fa6b37ebbf4439ef6d0adba',
  ],
  'rem-engineer': [
    '5dc6e6a2eb2a41d6ed49329afd89ec7d434eb78f01d225a35d371cbfa697dd81',
    'a87607a9a8e788df025b4ffb336d82e9476755203a5e9ee76f825feb404acfb7',
  ],
}

const ZCF_LEGACY_WORKFLOW_FILES = [
  'init-project.md',
  'workflow.md',
  'feat.md',
  'git-commit.md',
  'git-rollback.md',
  'git-cleanBranches.md',
  'git-clean-branches.md',
  'git-worktree.md',
  'bmad-init.md',
] as const

const ZCF_LEGACY_AGENT_FILES = [
  'init-architect.md',
  'get-current-datetime.md',
  'planner.md',
  'ui-ux-designer.md',
] as const

// Hashes of the markerless workflow templates shipped before ownership
// markers were introduced. Exact snapshots let compatibility cleanup remove
// old ZCF files while retaining files that users edited or extended.
const LEGACY_ZCF_RESOURCE_FINGERPRINTS: Record<string, string[]> = {
  'init-project.md': [
    '535397d4ad6da0c73d4876bf97cab90aaae4d8a47e0cdaed06836e5cc4ba5f3d',
    'c971108844058e54060ebe6ef8ff8ba6c94e61f8e5379a56d1555e9e4e815131',
  ],
  'feat.md': [
    '9345f31f53cd82b1b46894b7d8d4493e5b7e16ffa6e89c182c7e7ee5991ca93e',
    '2119683d987fa6e25b95fe5031f71cc26a1e6d3560378ded1bf879f2585bb33f',
  ],
  'workflow.md': [
    '31c0265025738b16bacae15c23bee8866fdd4faf2e2d03c3440f2fc88d96817e',
    'da02202c38dd46725743c772b7847ee1410b6f2abc1c8f150760d8a59f9496a8',
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
  'init-architect.md': [
    '7b6cce170645b993824eb9399d047b4a9d7900abb18ccec7cc64aec409557591',
    '1b25ab0a0ec091034299166de98aad960655844047ae17ade522ac2d79a793fa',
  ],
  'get-current-datetime.md': [
    '8fd504717b3e369a5f97ed2aacce590935ea85e314a202f8ab6affa78b76dc65',
    '1d073ef752e5bfbd2c394305698cb62edf4e46cdebb99539652ffe10e14276d6',
  ],
  'planner.md': [
    '96e919efbb601deef9ec63d3a5fbd55109b5e503eddad57ab8d2729933d66a24',
    'ec4cdf9ebe05cfc11e84ce9486b690800aa65937834423b84664b204dac94858',
  ],
  'ui-ux-designer.md': [
    'e1c2bd84598752dea09b121457472925509098c432e74004481a846362faf435',
    '91ae5fc89f259a698798da1b16483ab406099131357ff8ee943f561c30f6d29b',
  ],
}

// The skill layout also predates ownership markers. Keep these snapshots
// separate because skills are directories rather than workflow file paths.
const LEGACY_ZCF_SKILL_FINGERPRINTS: Record<string, string[]> = {
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

function isZcfMcpServerConfig(serverId: string, server: unknown): boolean {
  const service = MCP_SERVICE_CONFIGS.find(config => config.id.toLowerCase() === serverId.toLowerCase())
  if (!service || !server || typeof server !== 'object')
    return false

  const candidate = asRecord(server)
  if (!candidate)
    return false
  const expected = service.config

  if (expected.url) {
    if (candidate.type !== undefined && candidate.type !== expected.type)
      return false
    return candidate.url === expected.url
      && Object.keys(candidate).every(key => key === 'type' || key === 'url')
  }

  const allowedKeys = new Set(['type', 'command', 'args', 'env'])
  if (Object.keys(candidate).some(key => !allowedKeys.has(key)))
    return false

  if (candidate.type !== undefined && candidate.type !== expected.type)
    return false

  if (!expected.command || typeof candidate.command !== 'string')
    return false

  const candidateArgs = Array.isArray(candidate.args) ? candidate.args.map(String) : []
  const expectedArgs = expected.args || []
  const expectedCandidateArgs = candidate.command === expected.command
    ? expectedArgs
    : candidate.command === 'cmd'
      ? ['/c', expected.command, ...expectedArgs]
      : null
  if (!expectedCandidateArgs
    || candidateArgs.length !== expectedCandidateArgs.length
    || !expectedCandidateArgs.every((arg, index) => candidateArgs[index] === arg)) {
    return false
  }

  const expectedEnv = expected.env || {}
  const candidateEnv = asRecord(candidate.env) || {}
  if (Object.keys(candidateEnv).some(key => !Object.prototype.hasOwnProperty.call(expectedEnv, key)))
    return false
  if (Object.keys(expectedEnv).some(key => !Object.prototype.hasOwnProperty.call(candidateEnv, key)))
    return false
  return Object.entries(expectedEnv).every(([key, value]) => {
    if (serverId.toLowerCase() === 'exa' && key === 'EXA_API_KEY')
      return typeof candidateEnv[key] === 'string'
    return candidateEnv[key] === value
  })
}

function stripLegacyZcfLanguageDirective(content: string): string | null {
  const normalizedContent = content.replace(/\r\n?/g, '\n').trim()
  if (!LEGACY_ZCF_LANGUAGE_DIRECTIVES.has(normalizedContent))
    return null

  return ''
}

function isZcfOutputStyleFileContent(styleName: string, content: string): boolean {
  return isZcfOutputStyleContent(styleName, content)
    || isLegacyZcfResourceContent(content, LEGACY_ZCF_OUTPUT_STYLE_FINGERPRINTS[styleName] || [])
}

function addLegacyZcfEnvHash(hashes: Record<string, string[]>, key: string, value: string): void {
  const valueHash = hashConfigValue(value)
  const existingHashes = hashes[key] || []
  if (!existingHashes.includes(valueHash))
    existingHashes.push(valueHash)
  hashes[key] = existingHashes
}

function getLegacyZcfEnvHashes(): Record<string, string[]> {
  try {
    const content = readFileSync(ZCF_CONFIG_FILE, 'utf8')
    const config = parseToml<Record<string, unknown>>(content)
    const claudeCode = asRecord(config.claudeCode)
    const profiles = asRecord(claudeCode?.profiles)
    if (!profiles)
      return {}

    const hashes: Record<string, string[]> = {}
    for (const profile of Object.values(profiles)) {
      const record = asRecord(profile)
      if (!record)
        continue

      const authKey = record.authType === 'auth_token'
        ? 'ANTHROPIC_AUTH_TOKEN'
        : 'ANTHROPIC_API_KEY'
      if (typeof record.apiKey === 'string')
        addLegacyZcfEnvHash(hashes, authKey, record.apiKey)
      if (typeof record.baseUrl === 'string')
        addLegacyZcfEnvHash(hashes, 'ANTHROPIC_BASE_URL', record.baseUrl)

      const modelFields: Array<[string, string]> = [
        ['primaryModel', 'ANTHROPIC_MODEL'],
        ['defaultHaikuModel', 'ANTHROPIC_DEFAULT_HAIKU_MODEL'],
        ['defaultSonnetModel', 'ANTHROPIC_DEFAULT_SONNET_MODEL'],
        ['defaultOpusModel', 'ANTHROPIC_DEFAULT_OPUS_MODEL'],
      ]
      for (const [profileField, envKey] of modelFields) {
        if (typeof record[profileField] === 'string')
          addLegacyZcfEnvHash(hashes, envKey, record[profileField] as string)
      }
    }
    return hashes
  }
  catch {
    return {}
  }
}

function isZcfLegacyCommand(filePath: string, content: string): boolean {
  const fileName = filePath.split('/').pop()?.toLowerCase()
  if (!fileName)
    return false

  if (/zcf:workflow/i.test(content) || /#\s+Claude Command:/i.test(content))
    return true
  if (fileName === 'workflow.md')
    return /structured six[- ]phase workflow/i.test(content)
  if (fileName === 'feat.md')
    return /\$ARGUMENTS/.test(content) && /##\s+Core Workflow/i.test(content)
  if (fileName === 'init-project.md')
    return /get-current-datetime|init-architect|module-level.*CLAUDE\.md/i.test(content)
  if (fileName === 'bmad-init.md')
    return /#\s+\/bmad-init Command/i.test(content)

  return false
}

function isZcfLegacyAgent(filePath: string, content: string): boolean {
  const fileName = filePath.split('/').pop()?.replace(/\.md$/i, '')
  if (!fileName || !ZCF_LEGACY_AGENT_FILES.some(name => name.replace(/\.md$/, '') === fileName))
    return false

  if (!hasFrontmatterValue(content, 'name', fileName))
    return false

  return /^color:[ \t]*\S+/im.test(content)
    && /CLAUDE\.md|project planning|项目规划|UI\/UX|date command|当前时间|当前日期和时间/i.test(content)
}

function isLegacyClaudeOnlyJsonConfig(config: unknown): boolean {
  const record = asRecord(config)
  if (!record || record.zcfManaged !== true || record.codeToolType === 'codex')
    return false

  const codex = asRecord(record.codex)
  if (codex?.enabled === true)
    return false

  return LEGACY_CLAUDE_CONFIG_KEYS.some(key => Object.prototype.hasOwnProperty.call(record, key))
}

function getZcfTrashWarning(resource: string, error: string): string {
  return i18n.t('uninstall:zcfResourceTrashFailed', { resource, error })
}

function createEmptyUninstallResult(): UninstallResult {
  return {
    success: false,
    removed: [],
    removedConfigs: [],
    errors: [],
    warnings: [],
  }
}

function mergeUninstallResults(results: UninstallResult[]): UninstallResult {
  return {
    success: results.every(result => result.success),
    removed: results.flatMap(result => result.removed),
    removedConfigs: results.flatMap(result => result.removedConfigs),
    errors: results.flatMap(result => result.errors),
    warnings: results.flatMap(result => result.warnings),
  }
}

/**
 * ZCF Uninstaller - Handles removal of ZCF configurations and tools
 */
export class ZcfUninstaller {
  private _lang: SupportedLang // Reserved for future i18n support
  private conflictResolution = new Map<UninstallItem, UninstallItem[]>()

  constructor(lang: SupportedLang = 'en') {
    this._lang = lang

    // Set up conflict resolution rules
    this.conflictResolution.set('claude-code', ['mcps']) // Claude Code uninstall includes MCP removal

    // Ensure lang parameter is used (future i18n support)
    void this._lang
  }

  /**
   * 1. Remove outputStyle field from settings.json and output-styles directory
   */
  async removeOutputStyles(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const settingsPath = join(homedir(), '.claude', 'settings.json')
      const outputStylesPath = join(homedir(), '.claude', 'output-styles')

      // Remove outputStyle field from settings.json
      if (await pathExists(settingsPath)) {
        const settings = readJsonConfig<any>(settingsPath) || {}

        if (settings.outputStyle) {
          delete settings.outputStyle
          writeJsonConfig(settingsPath, settings)
          result.removedConfigs.push('outputStyle field from settings.json')
        }
      }
      else {
        result.warnings.push(i18n.t('uninstall:settingsJsonNotFound'))
      }

      // Remove output-styles directory
      if (await pathExists(outputStylesPath)) {
        const trashResult = await moveToTrash(outputStylesPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || i18n.t('uninstall:trashMoveFailed'))
        }
        result.removed.push('~/.claude/output-styles/')
      }
      else {
        result.warnings.push(i18n.t('uninstall:outputStylesDirectoryNotFound'))
      }

      result.success = true
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:outputStylesRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * 2. Remove ZCF workflow skills and legacy commands directory (commands/zcf/)
   */
  async removeWorkflowSkills(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const { getAllWorkflowSkillNames } = await import('../config/workflows')
      const skillsDir = join(homedir(), '.claude', 'skills')
      const legacyCommandsPath = join(homedir(), '.claude', 'commands', 'zcf')

      if (await pathExists(legacyCommandsPath)) {
        const trashResult = await moveToTrash(legacyCommandsPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || i18n.t('uninstall:trashMoveFailed'))
        }
        result.removed.push('commands/zcf/')
      }

      let removedAnySkill = false
      for (const skillName of getAllWorkflowSkillNames()) {
        const skillPath = join(skillsDir, skillName)
        if (await pathExists(skillPath)) {
          const trashResult = await moveToTrash(skillPath)
          if (!trashResult[0]?.success) {
            result.warnings.push(trashResult[0]?.error || i18n.t('uninstall:resourceTrashFailed', {
              resource: `skills/${skillName}/`,
              error: i18n.t('uninstall:trashMoveFailed'),
            }))
          }
          else {
            result.removed.push(`skills/${skillName}/`)
            removedAnySkill = true
          }
        }
      }

      if (!removedAnySkill && !(await pathExists(legacyCommandsPath))) {
        result.warnings.push(i18n.t('uninstall:skillsNotFound'))
      }

      result.success = true
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:customSkillsRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * 3. Remove custom agents directory (agents/zcf/)
   */
  async removeCustomAgents(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const agentsPath = join(homedir(), '.claude', 'agents', 'zcf')

      if (await pathExists(agentsPath)) {
        const trashResult = await moveToTrash(agentsPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || i18n.t('uninstall:trashMoveFailed'))
        }
        result.removed.push('agents/zcf/')
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('uninstall:agentsNotFound'))
        result.success = true
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:customAgentsRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * 4. Remove global memory file (CLAUDE.md)
   */
  async removeClaudeMd(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const claudeMdPath = join(homedir(), '.claude', 'CLAUDE.md')

      if (await pathExists(claudeMdPath)) {
        const trashResult = await moveToTrash(claudeMdPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || i18n.t('uninstall:trashMoveFailed'))
        }
        result.removed.push('CLAUDE.md')
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('uninstall:claudeMdNotFound'))
        result.success = true
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:claudeMdRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * 5. Remove permissions and environment variables
   */
  async removePermissionsAndEnvs(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const settingsPath = join(homedir(), '.claude', 'settings.json')

      if (await pathExists(settingsPath)) {
        const settings = readJsonConfig<any>(settingsPath) || {}
        let modified = false

        // Remove permissions
        if (settings.permissions) {
          delete settings.permissions
          result.removedConfigs.push('permissions configuration')
          modified = true
        }

        // Remove environment variables
        if (settings.env) {
          delete settings.env
          result.removedConfigs.push('environment variables')
          modified = true
        }

        if (modified) {
          writeJsonConfig(settingsPath, settings)
        }
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('uninstall:settingsJsonNotFound'))
        result.success = true
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:permissionsEnvsRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * 6. Remove MCP servers from .claude.json (mcpServers field only)
   */
  async removeMcps(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const claudeJsonPath = join(homedir(), '.claude.json')

      if (await pathExists(claudeJsonPath)) {
        const config = readJsonConfig<any>(claudeJsonPath) || {}

        if (config.mcpServers) {
          delete config.mcpServers
          writeJsonConfig(claudeJsonPath, config)
          result.removedConfigs.push('mcpServers from .claude.json')
        }
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('uninstall:claudeJsonNotFound'))
        result.success = true
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:mcpsRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * 7. Uninstall Claude Code Router and remove configuration
   */
  async uninstallCcr(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      // Remove CCR directory
      const ccrPath = join(homedir(), '.claude-code-router')

      if (await pathExists(ccrPath)) {
        const trashResult = await moveToTrash(ccrPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || i18n.t('uninstall:trashMoveFailed'))
        }
        result.removed.push('.claude-code-router/')
      }

      // Uninstall npm package
      try {
        await exec('npm', ['uninstall', '-g', '@musistudio/claude-code-router'])
        result.removed.push('@musistudio/claude-code-router package')
        result.success = true
      }
      catch (npmError: unknown) {
        if (getErrorMessage(npmError).includes('not found') || getErrorMessage(npmError).includes('not installed')) {
          result.warnings.push(i18n.t('uninstall:ccrPackageNotFound'))
          result.success = true
        }
        else {
          result.errors.push(i18n.t('uninstall:ccrPackageRemovalFailed', { error: getErrorMessage(npmError) }))
        }
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:ccrRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * 8. Uninstall CCometixLine
   */
  async uninstallCcline(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      await exec('npm', ['uninstall', '-g', '@cometix/ccline'])
      result.removed.push('@cometix/ccline package')
      result.success = true
    }
    catch (error: unknown) {
      if (getErrorMessage(error).includes('not found') || getErrorMessage(error).includes('not installed')) {
        result.warnings.push(i18n.t('uninstall:cclinePackageNotFound'))
        result.success = true
      }
      else {
        result.errors.push(i18n.t('uninstall:cclineRemovalFailed', { error: getErrorMessage(error) }))
      }
    }

    return result
  }

  /**
   * 9. Uninstall Claude Code and remove entire .claude.json
   */
  async uninstallClaudeCode(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      // Remove entire .claude.json file (includes MCP removal)
      const claudeJsonPath = join(homedir(), '.claude.json')

      if (await pathExists(claudeJsonPath)) {
        const trashResult = await moveToTrash(claudeJsonPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || i18n.t('uninstall:trashMoveFailed'))
        }
        result.removed.push('.claude.json (includes MCP configuration)')
      }

      // Use the unified uninstallCodeTool function which handles different install methods
      try {
        const { uninstallCodeTool } = await import('./installer')
        const success = await uninstallCodeTool('claude-code')

        if (success) {
          result.removed.push('@anthropic-ai/claude-code')
          result.success = true
        }
        else {
          result.errors.push(i18n.t('uninstall:uninstallFailed', {
            codeType: i18n.t('common:claudeCode'),
            message: '',
          }))
        }
      }
      catch (npmError: unknown) {
        if (getErrorMessage(npmError).includes('not found') || getErrorMessage(npmError).includes('not installed')) {
          result.warnings.push(i18n.t('uninstall:claudeCodePackageNotFound'))
          result.success = true
        }
        else {
          result.errors.push(i18n.t('uninstall:uninstallFailed', {
            codeType: i18n.t('common:claudeCode'),
            message: `: ${getErrorMessage(npmError)}`,
          }))
        }
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:uninstallFailed', {
        codeType: i18n.t('common:claudeCode'),
        message: `: ${getErrorMessage(error)}`,
      }))
    }

    return result
  }

  /**
   * 10. Remove backup files
   */
  async removeBackups(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const backupPath = join(homedir(), '.claude', 'backup')

      if (await pathExists(backupPath)) {
        const trashResult = await moveToTrash(backupPath)
        if (!trashResult[0]?.success) {
          result.warnings.push(trashResult[0]?.error || i18n.t('uninstall:trashMoveFailed'))
        }
        result.removed.push('backup/')
        result.success = true
      }
      else {
        result.warnings.push(i18n.t('uninstall:backupsNotFound'))
        result.success = true
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:backupsRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * 11. Remove ZCF preference configuration
   */
  async removeZcfConfig(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      const zcfConfigPath = ZCF_CONFIG_FILE
      if (!(await pathExists(zcfConfigPath))) {
        result.warnings.push(i18n.t('uninstall:zcfConfigNotFound'))
        result.success = true
        return result
      }

      const content = readTextFile(zcfConfigPath)
      const cleanedContent = content === null ? null : removeTomlSections(content, ['claudeCode'])
      if (cleanedContent !== null) {
        writeFileSync(zcfConfigPath, cleanedContent)
        result.removedConfigs.push(i18n.t('uninstall:zcfClaudeConfigRemoved'))
      }
      result.success = true
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:zcfConfigRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove ZCF-managed fields from Claude Code settings while preserving
   * unrelated user settings.
   */
  async removeZcfSettings(): Promise<UninstallResult> {
    const result = createEmptyUninstallResult()
    const settingsPath = SETTINGS_FILE || join(homedir(), '.claude', 'settings.json')

    try {
      if (!(await pathExists(settingsPath))) {
        result.warnings.push(i18n.t('uninstall:settingsJsonNotFound'))
        result.success = true
        return result
      }

      const settings = readJsonConfig<Record<string, unknown>>(settingsPath) || {}
      let modified = false
      const claudeVscConfigPath = join(homedir(), '.claude', 'config.json')
      const claudeVscConfig = await pathExists(claudeVscConfigPath)
        ? asRecord(readJsonConfig<Record<string, unknown>>(claudeVscConfigPath))
        : null
      const hasZcfApiMarker = claudeVscConfig?.primaryApiKey === 'zcf'
      const zcfManagedEnvHashes = asRecord(claudeVscConfig?.zcfManagedEnvHashes)
      const legacyZcfEnvHashes = hasZcfApiMarker && zcfManagedEnvHashes === null
        ? getLegacyZcfEnvHashes()
        : null
      const zcfManagedSettingsFields = new Set(
        Array.isArray(claudeVscConfig?.zcfManagedSettingsFields)
          ? claudeVscConfig.zcfManagedSettingsFields.filter((field): field is string => typeof field === 'string')
          : [],
      )
      const zcfManagedSettingsHashes = asRecord(claudeVscConfig?.zcfManagedSettingsHashes)
      const zcfManagedPermissionEntries = new Set(
        Array.isArray(claudeVscConfig?.zcfManagedPermissionEntries)
          ? claudeVscConfig.zcfManagedPermissionEntries.filter((entry): entry is string => typeof entry === 'string')
          : [],
      )
      const env = asRecord(settings.env)
      if (env) {
        for (const key of Object.keys(env)) {
          const isTemplateValue = Object.prototype.hasOwnProperty.call(ZCF_TEMPLATE_ENV_VALUES, key)
            && typeof env[key] === 'string'
            && env[key] === ZCF_TEMPLATE_ENV_VALUES[key]
            && zcfManagedSettingsFields.has(`env.${key}`)
            && zcfManagedSettingsHashes?.[`env.${key}`] === hashConfigValue(env[key])
          const isMarkedApiValue = hasZcfApiMarker
            && ZCF_API_ENV_KEYS.has(key)
            && typeof env[key] === 'string'
            && zcfManagedEnvHashes?.[key] === hashConfigValue(env[key])
          const isLegacyMarkedApiValue = hasZcfApiMarker
            && zcfManagedEnvHashes === null
            && ZCF_API_ENV_KEYS.has(key)
            && typeof env[key] === 'string'
            && legacyZcfEnvHashes?.[key]?.includes(hashConfigValue(env[key])) === true
          if (isTemplateValue || isMarkedApiValue || isLegacyMarkedApiValue) {
            delete env[key]
            result.removedConfigs.push(i18n.t('uninstall:zcfSettingsEnvRemoved', { key }))
            modified = true
          }
        }
        if (Object.keys(env).length === 0) {
          delete settings.env
          modified = true
        }
      }

      const outputStyle = typeof settings.outputStyle === 'string' ? settings.outputStyle : null
      const isCustomOutputStyle = outputStyle !== null
        && (ZCF_OUTPUT_STYLE_NAMES as readonly string[]).includes(outputStyle)
      const outputStyleHash = typeof zcfManagedSettingsHashes?.outputStyle === 'string'
        ? zcfManagedSettingsHashes.outputStyle
        : null
      const outputStyleOwnershipMatches = isCustomOutputStyle
        && zcfManagedSettingsFields.has('outputStyle')
        && (outputStyleHash === null || outputStyleHash === hashConfigValue(outputStyle))
      if (outputStyle) {
        const stylePath = join(homedir(), '.claude', 'output-styles', `${outputStyle}.md`)
        const styleContent = await pathExists(stylePath) ? readTextFile(stylePath) : null
        const isOwnedOutputStyle = isCustomOutputStyle && styleContent !== null
          ? isZcfOutputStyleFileContent(outputStyle, styleContent)
          : outputStyleOwnershipMatches
        if (isOwnedOutputStyle) {
          delete settings.outputStyle
          result.removedConfigs.push(i18n.t('uninstall:zcfOutputStyleRemoved'))
          modified = true
        }
      }

      const statusLine = asRecord(settings.statusLine)
      const statusLineHash = typeof zcfManagedSettingsHashes?.statusLine === 'string'
        ? zcfManagedSettingsHashes.statusLine
        : null
      const statusLineFingerprintMatches = statusLineHash !== null
        && statusLine !== null
        && statusLineHash === hashConfigValue(JSON.stringify(statusLine))
      if (statusLine?.command === '~/.claude/ccline/ccline'
        && zcfManagedSettingsFields.has('statusLine')
        && (statusLineFingerprintMatches
          || (statusLineHash === null && Object.keys(statusLine).length === 1))) {
        delete settings.statusLine
        result.removedConfigs.push(i18n.t('uninstall:zcfStatusLineRemoved'))
        modified = true
      }

      const permissions = asRecord(settings.permissions)
      if (permissions) {
        const allow = Array.isArray(permissions.allow) ? permissions.allow as unknown[] : null
        if (allow && zcfManagedSettingsFields.has('permissions') && zcfManagedPermissionEntries.size > 0) {
          const filteredAllow = allow.filter((permission: unknown) => {
            return typeof permission !== 'string' || !zcfManagedPermissionEntries.has(permission)
          })
          if (filteredAllow.length !== allow.length) {
            if (filteredAllow.length > 0)
              permissions.allow = filteredAllow
            else
              delete permissions.allow
            result.removedConfigs.push(i18n.t('uninstall:zcfPermissionsRemoved'))
            modified = true
          }
        }
        if (zcfManagedSettingsFields.has('permissions')
          && zcfManagedPermissionEntries.size > 0
          && Object.keys(permissions).length === 0) {
          delete settings.permissions
          modified = true
        }
      }

      const includeCoAuthoredByHash = typeof zcfManagedSettingsHashes?.includeCoAuthoredBy === 'string'
        ? zcfManagedSettingsHashes.includeCoAuthoredBy
        : null
      const includeCoAuthoredByOwned = zcfManagedSettingsFields.has('includeCoAuthoredBy')
        && (includeCoAuthoredByHash === null
          || includeCoAuthoredByHash === hashConfigValue(JSON.stringify(settings.includeCoAuthoredBy)))
      if (includeCoAuthoredByOwned && settings.includeCoAuthoredBy === false) {
        delete settings.includeCoAuthoredBy
        result.removedConfigs.push(i18n.t('uninstall:zcfIncludeCoAuthoredByRemoved'))
        modified = true
      }

      const hooks = asRecord(settings.hooks)
      const hooksHash = typeof zcfManagedSettingsHashes?.hooks === 'string'
        ? zcfManagedSettingsHashes.hooks
        : null
      const hooksOwned = zcfManagedSettingsFields.has('hooks')
        && hooks !== null
        && (hooksHash === null || hooksHash === hashConfigValue(JSON.stringify(hooks)))
      if (hooksOwned && hooks && Object.keys(hooks).length === 0) {
        delete settings.hooks
        result.removedConfigs.push(i18n.t('uninstall:zcfHooksRemoved'))
        modified = true
      }

      if (modified)
        writeJsonConfig(settingsPath, settings)

      result.success = true
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:zcfSettingsRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove only MCP and onboarding metadata created by ZCF from .claude.json.
   */
  async removeZcfClaudeConfig(): Promise<UninstallResult> {
    const result = createEmptyUninstallResult()
    const claudeJsonPath = join(homedir(), '.claude.json')

    try {
      if (!(await pathExists(claudeJsonPath))) {
        result.warnings.push(i18n.t('uninstall:claudeJsonNotFound'))
        result.success = true
        return result
      }

      const config = readJsonConfig<Record<string, unknown>>(claudeJsonPath) || {}
      let modified = false
      const mcpServers = asRecord(config.mcpServers)
      const zcfManagedMcpServers = asRecord(config.zcfManagedMcpServers)

      if (mcpServers && typeof mcpServers === 'object') {
        const zcfMcpIds = new Set(ZCF_MCP_SERVER_IDS.map(id => id.toLowerCase()))
        for (const key of Object.keys(mcpServers)) {
          const ownershipMarker = typeof zcfManagedMcpServers?.[key.toLowerCase()] === 'string'
            ? zcfManagedMcpServers[key.toLowerCase()] as string
            : undefined
          const server = mcpServers[key]
          const serverRecord = asRecord(server)
          const serverEnv = asRecord(serverRecord?.env)
          const isExaOwned = key.toLowerCase() === 'exa'
            && ownershipMarker !== undefined
            && typeof serverEnv?.EXA_API_KEY === 'string'
            && ownershipMarker === hashConfigValue(serverEnv.EXA_API_KEY)
          const isMarkedOwned = key.toLowerCase() !== 'exa' && ownershipMarker !== undefined
          if (zcfMcpIds.has(key.toLowerCase())
            && (isMarkedOwned || isExaOwned)
            && isZcfMcpServerConfig(key, server)) {
            delete mcpServers[key]
            result.removedConfigs.push(i18n.t('uninstall:zcfMcpServerRemoved', { key }))
            modified = true
          }
        }
        if (modified && Object.keys(mcpServers).length === 0) {
          delete config.mcpServers
        }
      }

      if (zcfManagedMcpServers) {
        const zcfMcpIds = new Set(ZCF_MCP_SERVER_IDS.map(id => id.toLowerCase()))
        let markerRemoved = false
        for (const key of Object.keys(zcfManagedMcpServers)) {
          if (zcfMcpIds.has(key.toLowerCase())) {
            delete zcfManagedMcpServers[key]
            markerRemoved = true
          }
        }
        if (markerRemoved) {
          if (Object.keys(zcfManagedMcpServers).length === 0)
            delete config.zcfManagedMcpServers
          else
            config.zcfManagedMcpServers = zcfManagedMcpServers
          modified = true
        }
      }

      if (modified)
        writeJsonConfig(claudeJsonPath, config)

      result.success = true
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:zcfClaudeConfigRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove ZCF's Claude Code 2.0 marker from ~/.claude/config.json.
   */
  async removeZcfClaudeVscConfig(): Promise<UninstallResult> {
    const result = createEmptyUninstallResult()
    const vscConfigPath = join(homedir(), '.claude', 'config.json')

    try {
      if (!(await pathExists(vscConfigPath))) {
        result.success = true
        return result
      }

      const config = readJsonConfig<Record<string, unknown>>(vscConfigPath) || {}
      const hasPrimaryApiMarker = config.primaryApiKey === 'zcf'
      const hasOwnershipMetadata = Array.isArray(config.zcfManagedSettingsFields)
        || asRecord(config.zcfManagedSettingsHashes) !== null
        || Array.isArray(config.zcfManagedPermissionEntries)
        || asRecord(config.zcfManagedEnvHashes) !== null
      if (hasPrimaryApiMarker || hasOwnershipMetadata) {
        if (hasPrimaryApiMarker)
          delete config.primaryApiKey
        delete config.zcfManagedEnvHashes
        delete config.zcfManagedSettingsFields
        delete config.zcfManagedSettingsHashes
        delete config.zcfManagedPermissionEntries
        writeJsonConfig(vscConfigPath, config)
        if (hasPrimaryApiMarker)
          result.removedConfigs.push(i18n.t('uninstall:zcfPrimaryApiKeyRemoved'))
      }
      result.success = true
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:zcfClaudeMarkerRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove the language-only CLAUDE.md written by ZCF, leaving user-authored
   * memory files untouched.
   */
  async removeZcfClaudeMd(): Promise<UninstallResult> {
    const result = createEmptyUninstallResult()
    const claudeMdPath = join(homedir(), '.claude', 'CLAUDE.md')

    try {
      if (!(await pathExists(claudeMdPath))) {
        result.success = true
        return result
      }

      const content = String(readFileSync(claudeMdPath, 'utf8'))
      let cleanupFailed = false
      if (isZcfLanguageDirectiveContent(content)) {
        const trashResult = await moveToTrash(claudeMdPath)
        if (!trashResult[0]?.success) {
          cleanupFailed = true
          result.warnings.push(getZcfTrashWarning(
            'CLAUDE.md',
            trashResult[0]?.error || i18n.t('uninstall:zcfUnknownTrashError'),
          ))
        }
        else {
          result.removed.push('CLAUDE.md')
        }
      }
      else {
        const cleanedContent = stripZcfLanguageDirective(content) ?? stripLegacyZcfLanguageDirective(content)
        if (cleanedContent !== null) {
          writeFileSync(claudeMdPath, cleanedContent)
          result.removedConfigs.push(i18n.t('uninstall:zcfLanguageDirectiveRemoved'))
        }
      }
      result.success = !cleanupFailed
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:zcfClaudeMdRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove known ZCF output style files without deleting unrelated styles.
   */
  async removeZcfOutputStyles(): Promise<UninstallResult> {
    const result = createEmptyUninstallResult()
    const outputStylesDir = join(homedir(), '.claude', 'output-styles')

    try {
      let cleanupFailed = false
      for (const styleName of ZCF_OUTPUT_STYLE_NAMES) {
        const stylePath = join(outputStylesDir, `${styleName}.md`)
        if (!(await pathExists(stylePath)))
          continue

        const styleContent = readTextFile(stylePath)
        if (!styleContent || !isZcfOutputStyleFileContent(styleName, styleContent))
          continue

        const trashResult = await moveToTrash(stylePath)
        if (!trashResult[0]?.success) {
          cleanupFailed = true
          result.warnings.push(getZcfTrashWarning(
            `output-styles/${styleName}.md`,
            trashResult[0]?.error || i18n.t('uninstall:zcfUnknownTrashError'),
          ))
        }
        else {
          result.removed.push(`output-styles/${styleName}.md`)
        }
      }
      result.success = !cleanupFailed
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:zcfOutputStylesRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove legacy workflow files only when their contents match ZCF templates.
   * The old layout used shared command and agent locations, so path names alone
   * are not sufficient ownership evidence.
   */
  async removeZcfWorkflowArtifacts(): Promise<UninstallResult> {
    const result = createEmptyUninstallResult()
    const claudeDir = join(homedir(), '.claude')
    const candidateFiles = new Set<string>()

    for (const fileName of ['workflow.md', 'feat.md'])
      candidateFiles.add(join(claudeDir, 'commands', fileName))

    for (const fileName of ZCF_LEGACY_WORKFLOW_FILES)
      candidateFiles.add(join(claudeDir, 'commands', 'zcf', fileName))

    for (const fileName of ZCF_LEGACY_AGENT_FILES) {
      candidateFiles.add(join(claudeDir, 'agents', fileName))
      candidateFiles.add(join(claudeDir, 'agents', 'zcf', fileName))
      candidateFiles.add(join(claudeDir, 'agents', 'zcf', 'common', fileName))
      candidateFiles.add(join(claudeDir, 'agents', 'zcf', 'plan', fileName))
    }

    try {
      let cleanupFailed = false
      for (const filePath of candidateFiles) {
        if (!(await pathExists(filePath)))
          continue

        const content = readTextFile(filePath)
        const isAgent = filePath.includes('/agents/')
        const fileName = filePath.split('/').pop()?.toLowerCase() || ''
        const legacyFingerprints = LEGACY_ZCF_RESOURCE_FINGERPRINTS[fileName] || []
        const isMarkedResource = content !== null
          && isZcfResourceContent(content)
          && (isAgent
            ? isZcfLegacyAgent(filePath, content)
            : isZcfLegacyCommand(filePath, content))
        const isOwned = content !== null
          && (isLegacyZcfResourceContent(content, legacyFingerprints) || isMarkedResource)
        if (!isOwned)
          continue

        const trashResult = await moveToTrash(filePath)
        const displayPath = formatHomePath(filePath, homedir())
        if (!trashResult[0]?.success) {
          cleanupFailed = true
          result.warnings.push(getZcfTrashWarning(
            displayPath,
            trashResult[0]?.error || i18n.t('uninstall:zcfUnknownTrashError'),
          ))
          continue
        }

        result.removed.push(displayPath)
      }
      result.success = !cleanupFailed
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:zcfWorkflowRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove canonical global skill installations created for Claude Code.
   */
  async removeZcfGlobalSkills(): Promise<UninstallResult> {
    const result = createEmptyUninstallResult()
    // ~/.agents/skills is shared with Codex; Codex owns that canonical root.
    // Claude's symlinks under ~/.claude/skills can be removed independently.
    const skillRoots = [join(homedir(), '.claude', 'skills')]

    try {
      let cleanupFailed = false
      for (const skillRoot of skillRoots) {
        for (const skillName of getAllWorkflowSkillNames()) {
          const skillPath = join(skillRoot, skillName)
          if (!(await pathExists(skillPath)))
            continue

          const skillFile = join(skillPath, 'SKILL.md')
          if (!(await pathExists(skillFile)))
            continue

          const skillContent = readTextFile(skillFile)
          const legacyFingerprints = LEGACY_ZCF_SKILL_FINGERPRINTS[skillName] || []
          if (!skillContent
            || (!isZcfSkillContent(skillName, skillContent)
              && !isLegacyZcfResourceContent(skillContent, legacyFingerprints))) {
            continue
          }

          const entries = readdirSync(skillPath)
          if (entries.some(entry => entry !== 'SKILL.md'))
            continue

          const trashResult = await moveToTrash(skillPath)
          const displayPath = formatHomePath(skillPath, homedir())
          if (!trashResult[0]?.success) {
            cleanupFailed = true
            result.warnings.push(getZcfTrashWarning(
              displayPath,
              trashResult[0]?.error || i18n.t('uninstall:zcfUnknownTrashError'),
            ))
            continue
          }
          result.removed.push(`${displayPath}/`)
        }
      }
      result.success = !cleanupFailed
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:zcfSkillsRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove legacy ZCF preference files left by older releases.
   */
  async removeLegacyZcfConfigs(): Promise<UninstallResult> {
    const result = createEmptyUninstallResult()

    try {
      let cleanupFailed = false
      const legacyPaths = Array.isArray(LEGACY_ZCF_CONFIG_FILES) ? LEGACY_ZCF_CONFIG_FILES : []
      for (const legacyPath of legacyPaths) {
        if (!(await pathExists(legacyPath)))
          continue

        const content = readTextFile(legacyPath)
        if (content === null)
          continue

        let parsedConfig: unknown
        try {
          parsedConfig = JSON.parse(content)
        }
        catch {
          continue
        }
        if (!isLegacyClaudeOnlyJsonConfig(parsedConfig))
          continue

        const trashResult = await moveToTrash(legacyPath)
        if (!trashResult[0]?.success) {
          cleanupFailed = true
          result.warnings.push(getZcfTrashWarning(
            formatHomePath(legacyPath, homedir()),
            trashResult[0]?.error || i18n.t('uninstall:zcfUnknownTrashError'),
          ))
        }
        else {
          result.removed.push(formatHomePath(legacyPath, homedir()))
        }
      }
      result.success = !cleanupFailed
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:zcfLegacyConfigRemovalFailed', { error: getErrorMessage(error) }))
    }

    return result
  }

  /**
   * Remove ZCF-managed Claude Code configuration only.
   * The Claude Code CLI, user settings, and backups are intentionally kept.
   */
  async uninstallZcfConfig(): Promise<UninstallResult> {
    const results: UninstallResult[] = []
    const settingsResult = await this.removeZcfSettings()
    results.push(settingsResult)
    results.push(await this.removeZcfClaudeConfig())
    if (settingsResult.success)
      results.push(await this.removeZcfClaudeVscConfig())
    results.push(await this.removeZcfClaudeMd())
    results.push(await this.removeZcfOutputStyles())
    results.push(await this.removeZcfWorkflowArtifacts())
    results.push(await this.removeZcfGlobalSkills())
    results.push(await this.removeZcfConfig())
    results.push(await this.removeLegacyZcfConfigs())

    return mergeUninstallResults(results)
  }

  /** Alias kept for callers that use the mode name as a method name. */
  async uninstallZcfOnly(): Promise<UninstallResult> {
    return await this.uninstallZcfConfig()
  }

  /**
   * Complete uninstall - remove all directories and packages
   */
  async completeUninstall(): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: true,
      removed: [],
      removedConfigs: [],
      errors: [],
      warnings: [],
    }

    try {
      // Remove all directories
      const directoriesToRemove = [
        { path: join(homedir(), '.claude'), name: '~/.claude/' },
        { path: join(homedir(), '.claude.json'), name: '~/.claude.json' },
        { path: join(homedir(), '.claude-code-router'), name: '~/.claude-code-router/' },
      ]

      for (const dir of directoriesToRemove) {
        try {
          if (await pathExists(dir.path)) {
            const trashResult = await moveToTrash(dir.path)
            if (!trashResult[0]?.success) {
              result.warnings.push(trashResult[0]?.error
                ? i18n.t('uninstall:resourceTrashFailed', { resource: dir.name, error: trashResult[0].error })
                : i18n.t('uninstall:trashMoveFailed'))
            }
            result.removed.push(dir.name)
          }
        }
        catch (error: unknown) {
          result.warnings.push(i18n.t('uninstall:resourceRemovalFailed', {
            resource: dir.name,
            error: getErrorMessage(error),
          }))
        }
      }

      // Uninstall npm packages
      const packagesToUninstall = [
        '@musistudio/claude-code-router',
        '@cometix/ccline',
        '@anthropic-ai/claude-code',
      ]

      for (const pkg of packagesToUninstall) {
        try {
          await exec('npm', ['uninstall', '-g', pkg])
          result.removed.push(`${pkg} package`)
        }
        catch (error: unknown) {
          if (getErrorMessage(error).includes('not found') || getErrorMessage(error).includes('not installed')) {
            if (pkg.includes('claude-code-router')) {
              result.warnings.push(i18n.t('uninstall:ccrPackageNotFound'))
            }
            else if (pkg.includes('ccline')) {
              result.warnings.push(i18n.t('uninstall:cclinePackageNotFound'))
            }
            else {
              result.warnings.push(i18n.t('uninstall:claudeCodePackageNotFound'))
            }
          }
          else {
            result.warnings.push(i18n.t('uninstall:packageRemovalFailed', {
              package: pkg,
              error: getErrorMessage(error),
            }))
          }
        }
      }
    }
    catch (error: unknown) {
      result.errors.push(i18n.t('uninstall:completeUninstallFailed', { error: getErrorMessage(error) }))
      result.success = false
    }

    return result
  }

  /**
   * Custom uninstall with conflict resolution
   */
  async customUninstall(selectedItems: UninstallItem[]): Promise<UninstallResult[]> {
    // Resolve conflicts
    const resolvedItems = this.resolveConflicts(selectedItems)

    const results: UninstallResult[] = []

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
          errors: [i18n.t('uninstall:customUninstallItemFailed', {
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
  private resolveConflicts(items: UninstallItem[]): UninstallItem[] {
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
  private async executeUninstallItem(item: UninstallItem): Promise<UninstallResult> {
    switch (item) {
      case 'output-styles':
        return await this.removeOutputStyles()
      case 'skills':
        return await this.removeWorkflowSkills()
      case 'agents':
        return await this.removeCustomAgents()
      case 'claude-md':
        return await this.removeClaudeMd()
      case 'permissions-envs':
        return await this.removePermissionsAndEnvs()
      case 'mcps':
        return await this.removeMcps()
      case 'ccr':
        return await this.uninstallCcr()
      case 'ccline':
        return await this.uninstallCcline()
      case 'claude-code':
        return await this.uninstallClaudeCode()
      case 'backups':
        return await this.removeBackups()
      case 'zcf-config':
        return await this.removeZcfConfig()
      default:
        return {
          success: false,
          removed: [],
          removedConfigs: [],
          errors: [i18n.t('uninstall:unknownUninstallItem', { item })],
          warnings: [],
        }
    }
  }
}
