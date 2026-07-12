import type { SupportedLang } from '../../constants'
import type {
  CodeToolAdapter,
  CodeToolContext,
  CodeToolPaths,
  CodeToolUpdateOptions,
} from '../types'
import { join } from 'pathe'
import { version } from '../../../package.json'
import {
  ClAUDE_CONFIG_FILE,
  CLAUDE_DIR,
  CLAUDE_MD_FILE,
  CLAUDE_VSC_CONFIG_FILE,
  SETTINGS_FILE,
} from '../../constants'
import { i18n } from '../../i18n'
import { createTimestampedBackup } from '../backup'

function getHomeDir(): string {
  return CLAUDE_DIR
}

function getPaths(): CodeToolPaths {
  const homeDir = getHomeDir()
  return {
    homeDir,
    configFiles: [
      { id: 'settings', path: SETTINGS_FILE, format: 'json' as const, mergeStrategy: 'merge' as const },
      { id: 'claude-md', path: CLAUDE_MD_FILE, format: 'markdown' as const, mergeStrategy: 'append' as const },
      { id: 'claude-json', path: ClAUDE_CONFIG_FILE, format: 'json' as const, mergeStrategy: 'merge' as const },
      { id: 'vs-code-config', path: CLAUDE_VSC_CONFIG_FILE, format: 'json' as const, mergeStrategy: 'merge' as const },
    ],
    skillsDir: join(CLAUDE_DIR, 'skills'),
    templateDir: 'templates/claude-code',
  }
}

/**
 * Claude Code adapter — Phase 1 facade over existing utils.
 * Full init/uninstall remain in commands/ until Phase 2 module consolidation.
 */
export const claudeCodeAdapter: CodeToolAdapter = {
  id: 'claude-code',
  displayName: 'Claude Code',
  aliases: ['cc', 'claude'],
  banner: 'for Claude Code',
  get paths() {
    return getPaths()
  },
  skillsAgents: ['claude-code', 'universal'],

  async detectInstalled() {
    const { isClaudeCodeInstalled } = await import('../../utils/installer')
    return isClaudeCodeInstalled()
  },

  async update(options: CodeToolUpdateOptions, _ctx: CodeToolContext): Promise<void> {
    const { readZcfConfig, updateZcfConfig } = await import('../../utils/zcf-config')
    const { updatePromptOnly } = await import('../../utils/config-operations')
    const { resolveAiOutputLanguage, resolveTemplateLanguage } = await import('../../utils/prompts')
    const { checkClaudeCodeVersionAndPrompt } = await import('../../utils/version-checker')
    const { selectAndInstallWorkflows } = await import('../../utils/workflow-installer')
    const ansis = (await import('ansis')).default

    const zcfConfig = readZcfConfig()
    const configLang = await resolveTemplateLanguage(
      options.configLang,
      zcfConfig,
      options.skipPrompt,
    )
    const aiOutputLang = await resolveAiOutputLanguage(
      i18n.language as SupportedLang,
      options.aiOutputLang,
      zcfConfig,
      options.skipPrompt,
    )

    console.log(ansis.cyan(`\n${i18n.t('configuration:updatingPrompts')}\n`))
    await updatePromptOnly(aiOutputLang)
    await selectAndInstallWorkflows(configLang)
    await checkClaudeCodeVersionAndPrompt(false)

    updateZcfConfig({
      version,
      templateLang: configLang,
      aiOutputLang,
      codeToolType: 'claude-code',
    })
  },

  async uninstall() {
    throw new Error('Claude Code uninstall is handled by commands/uninstall.ts (Phase 2 migration)')
  },

  async backup(file) {
    return createTimestampedBackup(file, getHomeDir())
  },
}
