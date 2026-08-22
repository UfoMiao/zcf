import type { SupportedLang } from '../../constants'
import type {
  CodeToolAdapter,
  CodeToolContext,
  CodeToolInitOptions,
  CodeToolUninstallOptions,
  CodeToolUpdateOptions,
} from '../types'
import { version } from '../../../package.json'
import { getCodeToolDefinition } from '../definitions'
import { claudeCodeMenu } from './menu'

const definition = getCodeToolDefinition('claude-code')

async function runClaudeUpdate(options: CodeToolUpdateOptions): Promise<void> {
  const { readZcfConfig, updateZcfConfig } = await import('../../utils/zcf-config')
  const { updatePromptOnly } = await import('../../utils/config-operations')
  const { resolveAiOutputLanguage, resolveTemplateLanguage } = await import('../../utils/prompts')
  const { checkClaudeCodeVersionAndPrompt } = await import('../../utils/version-checker')
  const { selectAndInstallWorkflows } = await import('../../utils/workflow-installer')
  const { i18n } = await import('../../i18n')
  const ansis = (await import('ansis')).default

  const zcfConfig = readZcfConfig()
  const configLang = await resolveTemplateLanguage(
    options.configLang,
    zcfConfig,
    options.skipPrompt,
    i18n.t(definition.displayNameKey),
  )
  const aiOutputLang = await resolveAiOutputLanguage(
    i18n.language as SupportedLang,
    options.aiOutputLang,
    zcfConfig,
    options.skipPrompt,
  )

  console.log(ansis.cyan(`\n${i18n.t('configuration:updatingPrompts')}\n`))
  await updatePromptOnly(aiOutputLang)
  await selectAndInstallWorkflows(configLang, undefined, definition.id)
  await checkClaudeCodeVersionAndPrompt(false)

  updateZcfConfig({
    version,
    templateLang: configLang,
    aiOutputLang,
    codeToolType: definition.id,
  })
}

export const claudeCodeAdapter: CodeToolAdapter = {
  definition,
  menu: claudeCodeMenu,

  async detectInstalled() {
    const { isClaudeCodeInstalled } = await import('../../utils/installer')
    return isClaudeCodeInstalled()
  },

  async validateInitOptions(options: CodeToolInitOptions) {
    if (!options.skipPrompt)
      return
    const { validateSkipPromptOptions } = await import('./legacy-init')
    await validateSkipPromptOptions(options)
  },

  async init(options: CodeToolInitOptions, ctx: CodeToolContext) {
    const { runClaudeCodeInit } = await import('./init')
    return runClaudeCodeInit(options, ctx)
  },

  async update(options: CodeToolUpdateOptions) {
    await runClaudeUpdate(options)
  },

  async uninstall(options: CodeToolUninstallOptions, ctx: CodeToolContext) {
    const { runClaudeCodeUninstall } = await import('./uninstall')
    await runClaudeCodeUninstall(options, ctx)
  },

  async backup(file) {
    const { createTimestampedBackup } = await import('../backup')
    return createTimestampedBackup(file, definition.paths.homeDir)
  },

  async updateTools(skipPrompt: boolean) {
    const { checkAndUpdateTools } = await import('../../utils/auto-updater')
    await checkAndUpdateTools(skipPrompt)
  },

  providers: {
    async importDefinitions(definitions) {
      const { importClaudeProviderDefinitions } = await import('./legacy-init')
      await importClaudeProviderDefinitions(definitions)
    },
  },

  configurations: {
    async list() {
      const { ClaudeCodeConfigManager } = await import('../../utils/claude-code-config-manager')
      const config = ClaudeCodeConfigManager.readConfig()
      return Object.entries(config?.profiles || {}).map(([id, profile]) => ({
        id: profile.id || id,
        name: profile.name,
        isActive: profile.id === config?.currentProfileId,
        description: profile.authType,
      }))
    },
    async switch(target) {
      const { handleClaudeCodeDirectSwitch } = await import('../configuration-ui')
      await handleClaudeCodeDirectSwitch(target)
    },
    async displayList() {
      const { listClaudeCodeProfiles } = await import('../configuration-ui')
      await listClaudeCodeProfiles()
    },
    async interactiveSwitch() {
      const { handleClaudeCodeInteractiveSwitch } = await import('../configuration-ui')
      await handleClaudeCodeInteractiveSwitch()
    },
  },
}
