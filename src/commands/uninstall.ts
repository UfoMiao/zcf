import type { CodeToolType, SupportedLang } from '../constants'
import type { UninstallItem } from '../utils/uninstaller'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { DEFAULT_CODE_TOOL_TYPE, isCodeToolType } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { resolveCodeType } from '../utils/code-type-resolver'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { addNumbersToChoices } from '../utils/prompt-helpers'
import { promptBoolean } from '../utils/toggle-prompt'
import { ZcfUninstaller } from '../utils/uninstaller'
import { readZcfConfig } from '../utils/zcf-config'

export interface UninstallOptions {
  lang?: SupportedLang
  codeType?: CodeToolType | string
  mode?: 'complete' | 'custom' | 'interactive'
  items?: UninstallItem[] | string // Can be array or comma-separated string from CLI
}

/**
 * Main uninstall command - Remove ZCF configurations and tools
 * Supports both interactive and non-interactive modes
 */
export async function uninstall(options: UninstallOptions = {}): Promise<void> {
  try {
    // Initialize i18n system
    ensureI18nInitialized()

    // Determine code tool type (from option or config)
    let codeType: CodeToolType
    if (options.codeType) {
      try {
        codeType = await resolveCodeType(options.codeType)
      }
      catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(ansis.red(`${i18n.t('errors:generalError')} ${errorMessage}`))
        // Fallback to config
        const config = readZcfConfig()
        codeType = config?.codeToolType && isCodeToolType(config.codeToolType)
          ? config.codeToolType
          : DEFAULT_CODE_TOOL_TYPE
      }
    }
    else {
      // Read from config
      const config = readZcfConfig()
      codeType = config?.codeToolType && isCodeToolType(config.codeToolType)
        ? config.codeToolType
        : DEFAULT_CODE_TOOL_TYPE
    }

    // Initialize uninstaller
    const uninstaller = new ZcfUninstaller(options.lang || 'en')

    // For Codex, use Codex-specific uninstaller
    if (codeType === 'codex') {
      const { runCodexUninstall } = await import('../utils/code-tools/codex')
      await runCodexUninstall()
      return
    }

    // For Claude Code, continue with existing logic
    // Handle non-interactive mode
    if (options.mode && options.mode !== 'interactive') {
      if (options.mode === 'complete') {
        await executeCompleteUninstall(uninstaller)
        return
      }
      else if (options.mode === 'custom' && options.items) {
        // Handle CLI items (can be string or array)
        let items: UninstallItem[]
        if (typeof options.items === 'string') {
          items = options.items.split(',').map(item => item.trim() as UninstallItem)
        }
        else {
          items = options.items
        }
        await executeCustomUninstall(uninstaller, items)
        return
      }
    }

    // Interactive mode - show main choice menu
    await showInteractiveUninstall(uninstaller)
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}

/**
 * Show interactive uninstall menu
 */
async function showInteractiveUninstall(uninstaller: ZcfUninstaller): Promise<void> {
  console.log(ansis.cyan.bold(i18n.t('uninstall:title')))
  console.log('')

  // Main choice: complete vs custom
  const { mainChoice } = await inquirer.prompt<{ mainChoice: 'complete' | 'custom' }>({
    type: 'list',
    name: 'mainChoice',
    message: i18n.t('uninstall:selectMainOption'),
    choices: addNumbersToChoices([
      {
        name: `${i18n.t('uninstall:completeUninstall')} - ${ansis.gray(i18n.t('uninstall:completeUninstallDesc'))}`,
        value: 'complete',
        short: i18n.t('uninstall:completeUninstall'),
      },
      {
        name: `${i18n.t('uninstall:customUninstall')} - ${ansis.gray(i18n.t('uninstall:customUninstallDesc'))}`,
        value: 'custom',
        short: i18n.t('uninstall:customUninstall'),
      },
    ]),
  })

  if (!mainChoice) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  if (mainChoice === 'complete') {
    await executeCompleteUninstall(uninstaller)
  }
  else {
    await showCustomUninstallMenu(uninstaller)
  }
}

/**
 * Show custom uninstall menu with multi-select options
 */
async function showCustomUninstallMenu(uninstaller: ZcfUninstaller): Promise<void> {
  console.log('')
  console.log(ansis.cyan(i18n.t('uninstall:selectCustomItems')))

  const { customItems } = await inquirer.prompt<{ customItems: UninstallItem[] }>({
    type: 'checkbox',
    name: 'customItems',
    message: `${i18n.t('uninstall:selectItemsToRemove')} ${i18n.t('common:multiSelectHint')}`,
    choices: [
      {
        name: i18n.t('uninstall:outputStyles'),
        value: 'output-styles' as const,
      },
      {
        name: i18n.t('uninstall:commands'),
        value: 'commands' as const,
      },
      {
        name: i18n.t('uninstall:agents'),
        value: 'agents' as const,
      },
      {
        name: i18n.t('uninstall:claudeMd'),
        value: 'claude-md' as const,
      },
      {
        name: i18n.t('uninstall:permissionsEnvs'),
        value: 'permissions-envs' as const,
      },
      {
        name: i18n.t('uninstall:mcps'),
        value: 'mcps' as const,
      },
      {
        name: i18n.t('uninstall:ccr'),
        value: 'ccr' as const,
      },
      {
        name: i18n.t('uninstall:ccline'),
        value: 'ccline' as const,
      },
      {
        name: i18n.t('uninstall:claudeCode'),
        value: 'claude-code' as const,
      },
      {
        name: i18n.t('uninstall:backups'),
        value: 'backups' as const,
      },
      {
        name: i18n.t('uninstall:zcfConfig'),
        value: 'zcf-config' as const,
      },
    ],
    validate: (answers: readonly unknown[]) => {
      if (answers.length === 0) {
        return i18n.t('uninstall:selectAtLeastOne')
      }
      return true
    },
  })

  if (!customItems || customItems.length === 0) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  await executeCustomUninstall(uninstaller, customItems)
}

/**
 * Execute complete uninstall
 */
async function executeCompleteUninstall(uninstaller: ZcfUninstaller): Promise<void> {
  console.log('')
  console.log(ansis.red.bold(i18n.t('uninstall:executingComplete')))
  console.log(ansis.yellow(i18n.t('uninstall:completeWarning')))

  // Final confirmation
  const confirm = await promptBoolean({
    message: i18n.t('uninstall:confirmComplete'),
    defaultValue: false,
  })

  if (!confirm) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  console.log('')
  console.log(ansis.cyan(i18n.t('uninstall:processingComplete')))

  const result = await uninstaller.completeUninstall()
  displayUninstallResult('complete', [result])
}

/**
 * Execute custom uninstall
 */
async function executeCustomUninstall(uninstaller: ZcfUninstaller, items: UninstallItem[]): Promise<void> {
  console.log('')
  console.log(ansis.cyan(i18n.t('uninstall:executingCustom')))

  // Show selected items
  console.log(ansis.gray(i18n.t('uninstall:selectedItems')))
  items.forEach((item) => {
    console.log(`  • ${i18n.t(`uninstall:${item}`)}`)
  })

  // Final confirmation
  const confirm = await promptBoolean({
    message: i18n.t('uninstall:confirmCustom'),
    defaultValue: false,
  })

  if (!confirm) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  console.log('')
  console.log(ansis.cyan(i18n.t('uninstall:processingCustom')))

  const results = await uninstaller.customUninstall(items)
  displayUninstallResult('custom', results)
}

/**
 * Display uninstall results with proper formatting
 */
function displayUninstallResult(mode: 'complete' | 'custom', results: any[]): void {
  console.log('')
  console.log(ansis.cyan('─'.repeat(50)))

  let totalSuccess = 0
  let totalErrors = 0
  let totalWarnings = 0

  results.forEach((result) => {
    if (result.success) {
      totalSuccess++
    }

    // Display moved to trash items
    if (result.removed && result.removed.length > 0) {
      console.log(ansis.green(`🗑️ ${i18n.t('uninstall:movedToTrash')}:`))
      result.removed.forEach((item: string) => {
        console.log(ansis.gray(`  • ${item}`))
      })
    }

    // Display removed config items
    if (result.removedConfigs && result.removedConfigs.length > 0) {
      console.log(ansis.green(`✔ ${i18n.t('uninstall:removedConfigs')}:`))
      result.removedConfigs.forEach((item: string) => {
        console.log(ansis.gray(`  • ${item}`))
      })
    }

    // Display errors
    if (result.errors && result.errors.length > 0) {
      totalErrors += result.errors.length
      console.log(ansis.red(`✖ ${i18n.t('uninstall:errors')}:`))
      result.errors.forEach((error: string) => {
        console.log(ansis.red(`  • ${error}`))
      })
    }

    // Display warnings
    if (result.warnings && result.warnings.length > 0) {
      totalWarnings += result.warnings.length
      console.log(ansis.yellow(`⚠ ${i18n.t('uninstall:warnings')}:`))
      result.warnings.forEach((warning: string) => {
        console.log(ansis.yellow(`  • ${warning}`))
      })
    }
  })

  // Calculate counts for summary
  const totalRemovedFiles = results.reduce((count, result) =>
    count + (result.removed?.length || 0), 0)
  const totalRemovedConfigs = results.reduce((count, result) =>
    count + (result.removedConfigs?.length || 0), 0)

  // Summary
  console.log('')
  console.log(ansis.cyan('─'.repeat(50)))

  if (mode === 'complete') {
    if (totalErrors === 0) {
      console.log(ansis.green.bold(`✔ ${i18n.t('uninstall:completeSuccess')}`))
    }
    else {
      console.log(ansis.yellow.bold(`⚠ ${i18n.t('uninstall:completePartialSuccess')}`))
    }
  }
  else {
    // Custom success message based on what was actually removed
    if (totalRemovedFiles > 0 && totalRemovedConfigs > 0) {
      console.log(ansis.green.bold(`✔ ${i18n.t('uninstall:customSuccessBoth', {
        fileCount: totalRemovedFiles,
        configCount: totalRemovedConfigs,
      })}`))
    }
    else if (totalRemovedFiles > 0) {
      console.log(ansis.green.bold(`✔ ${i18n.t('uninstall:customSuccessFiles', {
        count: totalRemovedFiles,
      })}`))
    }
    else if (totalRemovedConfigs > 0) {
      console.log(ansis.green.bold(`✔ ${i18n.t('uninstall:customSuccessConfigs', {
        count: totalRemovedConfigs,
      })}`))
    }
    else {
      console.log(ansis.green.bold(`✔ ${i18n.t('uninstall:customSuccess', { count: totalSuccess })}`))
    }

    if (totalErrors > 0) {
      console.log(ansis.red(`✖ ${i18n.t('uninstall:errorsCount', { count: totalErrors })}`))
    }

    if (totalWarnings > 0) {
      console.log(ansis.yellow(`⚠ ${i18n.t('uninstall:warningsCount', { count: totalWarnings })}`))
    }
  }

  console.log('')
}
