import type { AgentAdapter, AgentConfigFile, AgentContext, AgentSkillSpec, InstallOptions, UninstallOptions, UpdateOptions } from '../adapter-interface'
import { join } from 'pathe'
import { CODEX_DIR } from '../../constants'
import {
  checkCodexUpdate,
  isCodexInstalled,
  listCodexProviders,
  runCodexFullInit,
  runCodexUninstall,
  runCodexUpdate,
  switchCodexProvider,
} from '../../utils/code-tools/codex'
import { createTimestampedBackup } from '../backup'

const homeDir = CODEX_DIR

const configFiles: AgentConfigFile[] = [
  { id: 'config', path: join(CODEX_DIR, 'config.toml'), format: 'toml', mergeStrategy: 'merge' },
  { id: 'auth', path: join(CODEX_DIR, 'auth.json'), format: 'json', mergeStrategy: 'merge' },
  { id: 'agents', path: join(CODEX_DIR, 'AGENTS.md'), format: 'markdown', mergeStrategy: 'append' },
]

const skillSpec: AgentSkillSpec = {
  skillsDir: join(CODEX_DIR, 'skills'),
  manifestName: 'SKILL.md',
  scopes: ['global', 'project'],
}

function toCodexInitOptions(options: InstallOptions, ctx: AgentContext): Record<string, unknown> {
  const hasApiConfigs = Boolean(options.apiConfigs || options.apiConfigsFile)

  const apiMode = hasApiConfigs
    ? 'skip'
    : options.apiType === 'auth_token' || options.apiType === 'ccr_proxy'
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
  if (Array.isArray(options.workflows)) {
    selectedWorkflows = options.workflows
  }
  else if (typeof options.workflows === 'string') {
    selectedWorkflows = [options.workflows]
  }
  else if (options.workflows === true) {
    selectedWorkflows = []
  }

  let selectedMcpServices: string[] | false | undefined
  if (options.mcpServices === false || options.mcpServices === 'skip') {
    selectedMcpServices = false
  }
  else if (Array.isArray(options.mcpServices)) {
    selectedMcpServices = options.mcpServices
  }
  else if (typeof options.mcpServices === 'string') {
    selectedMcpServices = [options.mcpServices]
  }

  return {
    aiOutputLang: options.aiOutputLang ?? options.configLang ?? ctx.lang,
    skipPrompt: options.skipPrompt,
    apiMode,
    customApiConfig,
    workflows: selectedWorkflows,
    mcpServices: selectedMcpServices,
  }
}

/**
 * Legacy Codex adapter.
 *
 * Phase 0-2 (UFO-131) wraps the existing codex.ts helpers so the registry can
 * discover Codex and the command layer can delegate without duplication.
 */
export const codexAdapter: AgentAdapter = {
  id: 'codex',
  displayName: 'Codex',
  aliases: ['cx', 'openai-codex'],
  homeDir,
  configFiles,
  templateDir: 'templates/codex',
  skillSpec,

  isInstalled: isCodexInstalled,

  async install(options: InstallOptions, ctx: AgentContext): Promise<void> {
    await runCodexFullInit(toCodexInitOptions(options, ctx) as any)
  },

  async update(options: UpdateOptions, _ctx: AgentContext): Promise<void> {
    await runCodexUpdate(false, options.skipPrompt ?? false)
  },

  async uninstall(_options: UninstallOptions, _ctx: AgentContext): Promise<void> {
    await runCodexUninstall()
  },

  async listConfigurations(): Promise<Array<{ id: string, name: string }>> {
    const providers = await listCodexProviders()
    return providers.map(p => ({ id: p.id, name: p.name }))
  },

  async switchConfiguration(target: string, _ctx: AgentContext): Promise<void> {
    await switchCodexProvider(target)
  },

  async checkUpdates(_ctx: AgentContext): Promise<{ hasUpdate: boolean, currentVersion?: string, latestVersion?: string }> {
    const info = await checkCodexUpdate()
    return {
      hasUpdate: info.needsUpdate,
      currentVersion: info.currentVersion ?? undefined,
      latestVersion: info.latestVersion ?? undefined,
    }
  },

  async backup(file: AgentConfigFile): Promise<string | null> {
    return createTimestampedBackup(file, homeDir)
  },
}
