import type { CodexFullInitOptions, CodexMcpService } from './codex'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { getMcpServices, MCP_SERVICE_CONFIGS } from '../../config/mcp-services'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { selectMcpServices } from '../mcp-selector'
import { getSystemRoot, isWindows } from '../platform'
import { updateZcfConfig } from '../zcf-config'
import { backupCodexComplete, getBackupMessage, readCodexConfig, writeCodexConfig } from './codex'
import { applyCodexPlatformCommand } from './codex-platform'

export async function configureCodexMcp(options?: CodexFullInitOptions): Promise<void> {
  ensureI18nInitialized()

  const { skipPrompt = false } = options ?? {}
  const existingConfig = readCodexConfig()

  if (skipPrompt)
    return

  const backupPath = backupCodexComplete()
  if (backupPath)
    console.log(ansis.gray(getBackupMessage(backupPath)))

  const selectedIds = await selectMcpServices()
  if (!selectedIds)
    return

  const servicesMeta = await getMcpServices()
  const baseProviders = existingConfig?.providers || []
  const selection: CodexMcpService[] = []
  const existingServices = existingConfig?.mcpServices || []

  if (selectedIds.length === 0) {
    console.log(ansis.yellow(i18n.t('codex:noMcpConfigured')))

    const preserved = (existingServices || []).map((svc) => {
      if (isWindows()) {
        const systemRoot = getSystemRoot()
        if (systemRoot) {
          return {
            ...svc,
            env: {
              ...(svc.env || {}),
              SYSTEMROOT: systemRoot,
            },
          }
        }
      }
      return svc
    })

    writeCodexConfig({
      model: existingConfig?.model || null,
      modelProvider: existingConfig?.modelProvider || null,
      providers: baseProviders,
      mcpServices: preserved,
      managed: true,
      otherConfig: existingConfig?.otherConfig || [],
    })
    updateZcfConfig({ codeToolType: 'codex' })
    return
  }

  for (const id of selectedIds) {
    const configInfo = MCP_SERVICE_CONFIGS.find(service => service.id === id)
    if (!configInfo)
      continue

    const serviceMeta = servicesMeta.find(service => service.id === id)
    let command = configInfo.config.command || id
    let args = (configInfo.config.args || []).map(arg => String(arg))

    // Special handling: serena context should be "codex" for Codex
    if (id === 'serena') {
      const idx = args.indexOf('--context')
      if (idx >= 0 && idx + 1 < args.length) {
        args[idx + 1] = 'codex'
      }
      else {
        args.push('--context', 'codex')
      }
    }

    const serviceConfig: CodexMcpService = { id: id.toLowerCase(), command, args }
    applyCodexPlatformCommand(serviceConfig)
    command = serviceConfig.command
    args = serviceConfig.args || []

    const env = { ...(configInfo.config.env || {}) }

    if (isWindows()) {
      const systemRoot = getSystemRoot()
      if (systemRoot)
        env.SYSTEMROOT = systemRoot
    }

    if (configInfo.requiresApiKey && configInfo.apiKeyEnvVar) {
      const promptMessage = serviceMeta?.apiKeyPrompt || i18n.t('mcp:apiKeyPrompt')
      const { apiKey } = await inquirer.prompt<{ apiKey: string }>([{
        type: 'input',
        name: 'apiKey',
        message: promptMessage,
        validate: (input: string) => !!input || i18n.t('api:keyRequired'),
      }])

      if (!apiKey)
        continue

      env[configInfo.apiKeyEnvVar] = apiKey
    }

    selection.push({
      id: id.toLowerCase(),
      command: serviceConfig.command,
      args: serviceConfig.args,
      env: Object.keys(env).length > 0 ? env : undefined,
      startup_timeout_ms: configInfo.config.startup_timeout_ms,
    })
  }

  const mergedMap = new Map<string, CodexMcpService>()
  for (const svc of existingServices)
    mergedMap.set(svc.id.toLowerCase(), { ...svc })
  for (const svc of selection)
    mergedMap.set(svc.id.toLowerCase(), { ...svc })

  const finalServices = Array.from(mergedMap.values()).map((svc) => {
    if (isWindows()) {
      const systemRoot = getSystemRoot()
      if (systemRoot) {
        return {
          ...svc,
          env: {
            ...(svc.env || {}),
            SYSTEMROOT: systemRoot,
          },
        }
      }
    }
    return svc
  })

  writeCodexConfig({
    model: existingConfig?.model || null,
    modelProvider: existingConfig?.modelProvider || null,
    providers: baseProviders,
    mcpServices: finalServices,
    managed: true,
    otherConfig: existingConfig?.otherConfig || [],
  })

  updateZcfConfig({ codeToolType: 'codex' })
  console.log(ansis.green(i18n.t('codex:mcpConfigured')))
}
