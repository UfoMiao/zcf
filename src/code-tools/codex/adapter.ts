import type {
  CodeToolAdapter,
  CodeToolContext,
  CodeToolInitOptions,
  CodeToolUninstallOptions,
  CodeToolUpdateOptions,
} from '../types'
import process from 'node:process'
import { version } from '../../../package.json'
import { getCodeToolDefinition } from '../definitions'
import { applyAllLang, applySkipPromptInitDefaults, parseWorkflows } from '../init-options'
import { codexMenu } from './menu'

const definition = getCodeToolDefinition('codex')

function toCodexInitOptions(options: CodeToolInitOptions): Record<string, unknown> {
  const hasApiConfigs = Boolean(options.apiConfigs || options.apiConfigsFile)
  const apiMode = hasApiConfigs
    ? 'skip'
    : options.apiType === 'auth_token'
      ? 'official'
      : options.apiType === 'api_key'
        ? 'custom'
        : options.apiType === 'skip'
          ? 'skip'
          : options.skipPrompt
            ? 'skip'
            : undefined

  const customApiConfig = (!hasApiConfigs && options.apiType === 'api_key' && options.apiKey)
    ? {
        type: 'api_key' as const,
        token: options.apiKey,
        baseUrl: options.apiUrl,
        model: options.apiModel,
      }
    : undefined

  const selectedWorkflows = Array.isArray(options.workflows)
    ? options.workflows
    : typeof options.workflows === 'string'
      ? [options.workflows]
      : options.workflows === true
        ? []
        : undefined

  return {
    aiOutputLang: options.aiOutputLang,
    skipPrompt: options.skipPrompt,
    configAction: options.configAction,
    apiMode,
    customApiConfig,
    workflows: options.workflows === false ? false : selectedWorkflows,
    systemPromptStyle: options.outputStyles === false || options.outputStyles === 'skip' || options.outputStyles === 'false'
      ? false
      : undefined,
  }
}

async function withSkipPromptSingleBackup<T>(
  skipPrompt: boolean | undefined,
  run: () => Promise<T>,
): Promise<T> {
  if (!skipPrompt)
    return run()

  // Later API/MCP stages call backup again; without this pin they recopy the already-rewritten provider.
  const previous = process.env.ZCF_CODEX_SKIP_PROMPT_SINGLE_BACKUP
  process.env.ZCF_CODEX_SKIP_PROMPT_SINGLE_BACKUP = 'true'
  try {
    return await run()
  }
  finally {
    if (previous === undefined)
      delete process.env.ZCF_CODEX_SKIP_PROMPT_SINGLE_BACKUP
    else
      process.env.ZCF_CODEX_SKIP_PROMPT_SINGLE_BACKUP = previous
  }
}

export const codexAdapter: CodeToolAdapter = {
  definition,
  menu: codexMenu,

  async detectInstalled() {
    const { isCodexInstalled } = await import('../../utils/code-tools/codex')
    return isCodexInstalled()
  },

  async validateInitOptions(options: CodeToolInitOptions) {
    applyAllLang(options)
    parseWorkflows(options)
    applySkipPromptInitDefaults(options)
    if (typeof options.installCometixLine === 'string')
      options.installCometixLine = options.installCometixLine.toLowerCase() === 'true'
  },

  async init(options: CodeToolInitOptions) {
    const { runCodexFullInit } = await import('../../utils/code-tools/codex')
    const { i18n } = await import('../../i18n')
    const { readZcfConfig, updateZcfConfig } = await import('../../utils/zcf-config')
    const ansis = (await import('ansis')).default
    const zcfConfig = readZcfConfig()
    const configLang = options.configLang
      ?? zcfConfig?.templateLang
      ?? (i18n.language as 'zh-CN' | 'en')
    if (typeof options.apiConfigs === 'string' || options.apiConfigsFile) {
      const { handleMultiConfigurations } = await import('../multi-config')
      await handleMultiConfigurations(options, 'codex')
    }

    const resolvedAiOutputLang = await withSkipPromptSingleBackup(
      options.skipPrompt,
      () => runCodexFullInit(toCodexInitOptions(options)),
    )
    updateZcfConfig({
      version,
      preferredLang: i18n.language as 'zh-CN' | 'en',
      templateLang: configLang,
      aiOutputLang: resolvedAiOutputLang
        ?? options.aiOutputLang
        ?? zcfConfig?.aiOutputLang
        ?? 'en',
      codeToolType: definition.id,
    })
    console.log(ansis.green(i18n.t('codex:setupComplete')))
    return resolvedAiOutputLang
  },

  async update(options: CodeToolUpdateOptions) {
    const { runCodexUpdate } = await import('../../utils/code-tools/codex')
    const { readZcfConfig, updateZcfConfig } = await import('../../utils/zcf-config')

    await runCodexUpdate(false, options.skipPrompt ?? false)
    const preferredLang = options.configLang || readZcfConfig()?.preferredLang
    updateZcfConfig({
      version,
      ...(preferredLang ? { preferredLang } : {}),
      codeToolType: definition.id,
    })
  },

  async uninstall(_options: CodeToolUninstallOptions, _ctx: CodeToolContext) {
    const { runCodexUninstall } = await import('../../utils/code-tools/codex')
    await runCodexUninstall()
  },

  async backup(file) {
    const { createTimestampedBackup } = await import('../backup')
    return createTimestampedBackup(file, definition.paths.homeDir)
  },

  async checkUpdates() {
    const { checkCodexUpdate } = await import('../../utils/code-tools/codex')
    const info = await checkCodexUpdate()
    return {
      hasUpdate: info.needsUpdate,
      currentVersion: info.currentVersion ?? undefined,
      latestVersion: info.latestVersion ?? undefined,
    }
  },

  async updateTools(skipPrompt: boolean) {
    const { runCodexUpdate } = await import('../../utils/code-tools/codex')
    await runCodexUpdate(false, skipPrompt)
  },

  providers: {
    async toProfiles(definitions) {
      const { createCodexProviderProfile } = await import('./providers')
      return definitions.map(definition => createCodexProviderProfile(definition))
    },
    async importDefinitions(profiles) {
      const { importCodexProviderDefinitions } = await import('./providers')
      await importCodexProviderDefinitions(profiles)
    },
  },

  configurations: {
    async list() {
      const { listCodexProviders, readCodexConfig } = await import('../../utils/code-tools/codex')
      const config = readCodexConfig()
      return (await listCodexProviders()).map(provider => ({
        id: provider.id,
        name: provider.name,
        isActive: provider.id === config?.modelProvider && !config?.modelProviderCommented,
        description: provider.baseUrl,
      }))
    },
    async switch(target) {
      const { switchCodexProvider } = await import('../../utils/code-tools/codex')
      await switchCodexProvider(target)
    },
    async displayList() {
      const { listCodexProvidersWithDisplay } = await import('../configuration-ui')
      await listCodexProvidersWithDisplay()
    },
    async interactiveSwitch() {
      const { handleCodexInteractiveSwitch } = await import('../configuration-ui')
      await handleCodexInteractiveSwitch()
    },
  },
}
