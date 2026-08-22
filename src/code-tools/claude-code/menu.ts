import type { CodeToolMenuAction, CodeToolMenuCapability } from '../types'

export const claudeCodeMenu: CodeToolMenuCapability = {
  items: [
    { key: '1', labelKey: 'menu:menuOptions.fullInit', descriptionKey: 'menu:menuDescriptions.fullInit', action: 'init', promptToReturn: true },
    { key: '2', labelKey: 'menu:menuOptions.importWorkflow', descriptionKey: 'menu:menuDescriptions.importWorkflow', action: 'update', promptToReturn: true },
    { key: '3', labelKey: 'menu:menuOptions.configureApiOrCcr', descriptionKey: 'menu:menuDescriptions.configureApiOrCcr', action: 'configure-api', promptToReturn: true },
    { key: '4', labelKey: 'menu:menuOptions.configureMcp', descriptionKey: 'menu:menuDescriptions.configureMcp', action: 'configure-mcp', promptToReturn: true },
    { key: '5', labelKey: 'menu:menuOptions.configureModel', descriptionKey: 'menu:menuDescriptions.configureModel', action: 'configure-model', promptToReturn: true },
    { key: '6', labelKey: 'menu:menuOptions.configureAiMemory', descriptionKey: 'menu:menuDescriptions.configureAiMemory', action: 'configure-ai-memory', promptToReturn: true },
    { key: '7', labelKey: 'menu:menuOptions.configureEnvPermission', descriptionKey: 'menu:menuDescriptions.configureEnvPermission', action: 'configure-env-permission', promptToReturn: true },
  ],
  extras: [
    { key: 'r', labelKey: 'menu:menuOptions.ccrManagement', descriptionKey: 'menu:menuDescriptions.ccrManagement', action: 'ccr-menu' },
    { key: 'u', labelKey: 'menu:menuOptions.ccusage', descriptionKey: 'menu:menuDescriptions.ccusage', action: 'ccusage' },
    { key: 'l', labelKey: 'menu:menuOptions.cometixLine', descriptionKey: 'menu:menuDescriptions.cometixLine', action: 'cometix-menu' },
  ],
  uninstallLabelKey: 'menu:menuOptions.uninstall',
  uninstallDescriptionKey: 'menu:menuDescriptions.uninstall',
  updateLabelKey: 'menu:menuOptions.checkUpdates',
  updateDescriptionKey: 'menu:menuDescriptions.checkUpdates',
  updateAction: 'check-updates',
  async run(action: CodeToolMenuAction) {
    const features = await import('../../utils/features')
    const tools = await import('../../utils/tools')
    switch (action) {
      case 'configure-api':
        await features.configureApiFeature()
        return
      case 'configure-mcp':
        await features.configureMcpFeature()
        return
      case 'configure-model':
        await features.configureDefaultModelFeature()
        return
      case 'configure-ai-memory':
        await features.configureAiMemoryFeature()
        return
      case 'configure-env-permission':
        await features.configureEnvPermissionFeature()
        return
      case 'ccr-menu':
        await tools.runCcrMenuFeature()
        return
      case 'ccusage':
        await tools.runCcusageFeature()
        return
      case 'cometix-menu':
        await tools.runCometixMenuFeature()
        return
      default: {
        const { i18n } = await import('../../i18n')
        throw new Error(i18n.t('errors:unsupportedMenuAction', { action }))
      }
    }
  },
}
