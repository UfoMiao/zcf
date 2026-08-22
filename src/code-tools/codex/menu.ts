import type { CodeToolMenuAction, CodeToolMenuCapability } from '../types'

export const codexMenu: CodeToolMenuCapability = {
  items: [
    { key: '1', labelKey: 'menu:menuOptions.codexFullInit', descriptionKey: 'menu:menuDescriptions.codexFullInit', action: 'init', promptToReturn: true },
    { key: '2', labelKey: 'menu:menuOptions.codexImportWorkflow', descriptionKey: 'menu:menuDescriptions.codexImportWorkflow', action: 'codex-workflow', promptToReturn: true },
    { key: '3', labelKey: 'menu:menuOptions.codexConfigureApi', descriptionKey: 'menu:menuDescriptions.codexConfigureApi', action: 'codex-configure-api', promptToReturn: true },
    { key: '4', labelKey: 'menu:menuOptions.codexConfigureMcp', descriptionKey: 'menu:menuDescriptions.codexConfigureMcp', action: 'codex-configure-mcp', promptToReturn: true },
    { key: '5', labelKey: 'menu:menuOptions.codexConfigureModel', descriptionKey: 'menu:menuDescriptions.codexConfigureModel', action: 'codex-configure-model', promptToReturn: true },
    { key: '6', labelKey: 'menu:menuOptions.codexConfigureAiMemory', descriptionKey: 'menu:menuDescriptions.codexConfigureAiMemory', action: 'codex-configure-ai-memory', promptToReturn: true },
  ],
  uninstallLabelKey: 'menu:menuOptions.codexUninstall',
  uninstallDescriptionKey: 'menu:menuDescriptions.codexUninstall',
  updateLabelKey: 'menu:menuOptions.codexCheckUpdates',
  updateDescriptionKey: 'menu:menuDescriptions.codexCheckUpdates',
  updateAction: 'update',
  async run(action: CodeToolMenuAction) {
    const codex = await import('../../utils/code-tools/codex')
    const features = await import('../../utils/features')
    switch (action) {
      case 'codex-workflow':
        await codex.runCodexWorkflowImportWithLanguageSelection()
        return
      case 'codex-configure-api':
        await codex.configureCodexApi()
        return
      case 'codex-configure-mcp':
        await codex.configureCodexMcp()
        return
      case 'codex-configure-model':
        await features.configureCodexDefaultModelFeature()
        return
      case 'codex-configure-ai-memory':
        await features.configureCodexAiMemoryFeature()
        return
      default: {
        const { i18n } = await import('../../i18n')
        throw new Error(i18n.t('errors:unsupportedMenuAction', { action }))
      }
    }
  },
}
