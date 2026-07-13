import type {
  CodeToolAdapter,
  CodeToolContext,
  CodeToolInitOptions,
  CodeToolPaths,
  CodeToolUninstallOptions,
  CodeToolUpdateOptions,
} from '../types'
import { join } from 'pathe'
import { version } from '../../../package.json'
import { CODEX_AGENTS_FILE, CODEX_AUTH_FILE, CODEX_CONFIG_FILE, CODEX_DIR } from '../../constants'
import { createTimestampedBackup } from '../backup'

function getHomeDir(): string {
  return CODEX_DIR
}

function getPaths(): CodeToolPaths {
  const homeDir = getHomeDir()
  return {
    homeDir,
    configFiles: [
      { id: 'config', path: CODEX_CONFIG_FILE, format: 'toml' as const, mergeStrategy: 'merge' as const },
      { id: 'auth', path: CODEX_AUTH_FILE, format: 'json' as const, mergeStrategy: 'merge' as const },
      { id: 'agents', path: CODEX_AGENTS_FILE, format: 'markdown' as const, mergeStrategy: 'append' as const },
    ],
    skillsDir: join(CODEX_DIR, 'prompts'),
    templateDir: 'templates/codex',
  }
}

function toCodexInitOptions(options: CodeToolInitOptions, _ctx: CodeToolContext): Record<string, unknown> {
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

  let selectedWorkflows: string[] | undefined
  if (Array.isArray(options.workflows))
    selectedWorkflows = options.workflows
  else if (typeof options.workflows === 'string')
    selectedWorkflows = [options.workflows]
  else if (options.workflows === true)
    selectedWorkflows = []

  return {
    aiOutputLang: options.aiOutputLang,
    skipPrompt: options.skipPrompt,
    apiMode,
    customApiConfig,
    workflows: options.workflows === false ? false : selectedWorkflows,
  }
}

/**
 * Codex adapter — wraps existing codex.ts helpers for registry dispatch.
 */
export const codexAdapter: CodeToolAdapter = {
  id: 'codex',
  displayName: 'Codex',
  aliases: ['cx', 'openai-codex'],
  banner: 'for Codex',
  get paths() {
    return getPaths()
  },
  skillsAgents: ['codex'],

  async detectInstalled() {
    const { isCodexInstalled } = await import('../../utils/code-tools/codex')
    return isCodexInstalled()
  },

  async init(options: CodeToolInitOptions, ctx: CodeToolContext) {
    const { runCodexFullInit } = await import('../../utils/code-tools/codex')
    return runCodexFullInit(toCodexInitOptions(options, ctx) as any)
  },

  async update(options: CodeToolUpdateOptions, _ctx: CodeToolContext): Promise<void> {
    const { runCodexUpdate } = await import('../../utils/code-tools/codex')
    const { readZcfConfig, updateZcfConfig } = await import('../../utils/zcf-config')

    await runCodexUpdate(false, options.skipPrompt ?? false)

    const zcfConfig = readZcfConfig()
    const newPreferredLang = options.configLang || zcfConfig?.preferredLang
    if (newPreferredLang) {
      updateZcfConfig({
        version,
        preferredLang: newPreferredLang,
        codeToolType: 'codex',
      })
    }
    else {
      updateZcfConfig({
        version,
        codeToolType: 'codex',
      })
    }
  },

  async uninstall(_options: CodeToolUninstallOptions, _ctx: CodeToolContext): Promise<void> {
    const { runCodexUninstall } = await import('../../utils/code-tools/codex')
    await runCodexUninstall()
  },

  async listConfigurations() {
    const { listCodexProviders } = await import('../../utils/code-tools/codex')
    const providers = await listCodexProviders()
    return providers.map(p => ({ id: p.id, name: p.name }))
  },

  async switchConfiguration(target: string, _ctx: CodeToolContext): Promise<void> {
    const { switchCodexProvider } = await import('../../utils/code-tools/codex')
    await switchCodexProvider(target)
  },

  async checkUpdates(_ctx: CodeToolContext) {
    const { checkCodexUpdate } = await import('../../utils/code-tools/codex')
    const info = await checkCodexUpdate()
    return {
      hasUpdate: info.needsUpdate,
      currentVersion: info.currentVersion ?? undefined,
      latestVersion: info.latestVersion ?? undefined,
    }
  },

  async backup(file) {
    return createTimestampedBackup(file, getHomeDir())
  },
}
