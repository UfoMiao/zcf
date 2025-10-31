/**
 * ZCF Clear Command
 *
 * Clears Claude's history data including history files and project history
 * in ~/.claude.json with user confirmation and backup
 */

import type { ClearOptions } from '../types/clear'
import process from 'node:process'
import { i18n } from '../i18n'
import { historyClearer } from '../utils/history-clearer'

interface ClearCommandOptions {
  mode?: 'conservative' | 'thorough'
  interactive?: boolean
  backup?: boolean
}

export async function clearCommand(options: ClearCommandOptions = {}): Promise<void> {
  const { mode = 'conservative', interactive = true, backup = true } = options

  // Use i18n for translations
  const t = (key: string, params?: Record<string, any>): string => i18n.t(key, params)

  console.log('🧹', t('clear:title'))
  console.log('='.repeat(50))

  try {
    // Get preview of what will be cleared
    const preview = await historyClearer.getClearPreview()

    // Display preview
    console.log('📊', t('clear:preview.title'))
    console.log(`  📁 ${t('clear:preview.historyFiles')}: ${preview.historyFileCount}`)
    console.log(`  📄 ${t('clear:preview.projects')}: ${preview.projectCount}`)

    if (preview.claudeJsonExists) {
      console.log(`  💾 ${t('clear:preview.jsonSize')}: ${historyClearer.formatBytes(preview.claudeJsonSize)}`)
      console.log(`  🔄 ${t('clear:preview.backupWillBeCreated')}: ${backup ? t('common:yes') : t('common:no')}`)
    }
    else {
      console.log(`  ⚠️  ${t('clear:preview.jsonNotExists')}`)
    }

    // Show history files if any
    if (preview.historyFiles.length > 0) {
      console.log('\n📂', t('clear:preview.historyFilesToList'))
      preview.historyFiles.forEach((file: string) => {
        console.log(`  - ${file}`)
      })
    }

    if (interactive) {
      // User confirmation
      console.log('\n' + '⚠️ ', t('clear:warning.title'))
      console.log(t('clear:warning.message', {
        mode: t(`clear:mode.${mode}`),
        historyFiles: preview.historyFileCount,
        projects: preview.projectCount,
      }))

      const { default: inquirer } = await import('inquirer')

      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: t('clear:confirm.message'),
          default: false,
        },
      ])

      if (!confirmed) {
        console.log('❌', t('clear:cancelled'))
        return
      }
    }

    // Execute clearing
    console.log('\n🚀', t('clear:starting'))

    const clearOptions: ClearOptions = {
      backupJson: backup,
      clearProjects: true,
    }

    const result = await historyClearer.executeClear(clearOptions)

    // Display results
    console.log(`\n${'='.repeat(50)}`)
    if (result.success) {
      console.log('✅', t('clear:success.title'))
      console.log(`  📁 ${t('clear:result.historyFilesDeleted')}: ${result.historyFilesDeleted}`)
      console.log(`  📄 ${t('clear:result.projectsCleared')}: ${result.projectsCleared}`)
      console.log(`  🧾 ${t('clear:result.historyItemsCleared')}: ${result.historyItemsCleared}`)
      console.log(`  💾 ${t('clear:result.spaceFreed')}: ${historyClearer.formatBytes(result.bytesFreed)}`)
      console.log(`  ⏱️  ${t('clear:result.duration')}: ${(result.duration / 1000).toFixed(2)}s`)

      if (result.backupPath) {
        console.log(`  📦 ${t('clear:result.backupLocation')}: ${result.backupPath}`)
        console.log(`  🔧 ${t('clear:result.restoreHint')}: cp "${result.backupPath}" "${historyClearer.getClaudeJsonPath()}"`)
      }

      console.log('\n💡', t('clear:success.tips'))
    }
    else {
      console.log('❌', t('clear:error.title'))
      result.errors.forEach((error: string) => {
        console.log(`  ${error}`)
      })
    }
  }
  catch (error) {
    console.error('\n❌', t('clear:error.unexpected'))
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
