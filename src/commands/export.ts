/**
 * Export configuration command
 *
 * This module implements the configuration export functionality,
 * allowing users to export their ZCF configurations to a portable zip package.
 */

import type { CodeType, ExportOptions, ExportScope } from '../types/export-import'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { ensureI18nInitialized, i18n } from '../i18n'
import { handleGeneralError } from '../utils/error-handler'
import { executeExport, getExportSummary, validateExportOptions } from '../utils/export-import/exporter'

interface ExportCommandOptions {
  codeType?: string // --code-type, -T
  scope?: string // --scope, -s
  includeSensitive?: boolean // --include-sensitive
  output?: string // --output, -o
  lang?: string // --lang, -l
}

/**
 * Main export command handler
 * @param options - Command options
 */
export async function exportCommand(options: ExportCommandOptions): Promise<void> {
  try {
    ensureI18nInitialized()

    // If all required options are provided, execute directly
    if (options.codeType && options.scope) {
      await handleDirectExport(options)
      return
    }

    // Otherwise, show interactive prompts
    await handleInteractiveExport(options)
  }
  catch (error) {
    // In test environment, re-throw the error instead of calling handleGeneralError
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      throw error
    }
    handleGeneralError(error)
  }
}

/**
 * Handle direct export with command line options
 */
async function handleDirectExport(cmdOptions: ExportCommandOptions): Promise<void> {
  const exportOptions: ExportOptions = {
    codeType: normalizeCodeType(cmdOptions.codeType!),
    scope: normalizeScope(cmdOptions.scope!),
    includeSensitive: cmdOptions.includeSensitive || false,
    outputPath: cmdOptions.output,
    lang: cmdOptions.lang,
  }

  // Validate options
  const validation = validateExportOptions(exportOptions)
  if (!validation.valid) {
    console.error(ansis.red(i18n.t('export:exportFailed')))
    for (const error of validation.errors) {
      console.error(ansis.red(`  - ${error}`))
    }
    process.exit(1)
  }

  // Execute export
  await performExport(exportOptions)
}

/**
 * Handle interactive export with prompts
 */
async function handleInteractiveExport(cmdOptions: ExportCommandOptions): Promise<void> {
  console.log(ansis.bold.cyan(`\n${i18n.t('export:title')}\n`))

  // Step 1: Select code type
  const codeType = await promptCodeType(cmdOptions.codeType)

  // Step 2: Select export scope
  const scope = await promptExportScope(cmdOptions.scope)

  // Step 3: Select whether to include sensitive data
  const includeSensitive = await promptIncludeSensitive(cmdOptions.includeSensitive)

  // Step 4: Select output path
  const outputPath = await promptOutputPath(cmdOptions.output)

  // Build export options
  const exportOptions: ExportOptions = {
    codeType,
    scope,
    includeSensitive,
    outputPath,
    lang: cmdOptions.lang,
  }

  // Step 5: Show preview and confirm
  const confirmed = await showPreviewAndConfirm(exportOptions)
  if (!confirmed) {
    console.log(ansis.yellow(i18n.t('common:operationCancelled')))
    return
  }

  // Step 6: Execute export
  await performExport(exportOptions)
}

/**
 * Prompt for code type selection
 */
async function promptCodeType(defaultValue?: string): Promise<CodeType> {
  if (defaultValue) {
    return normalizeCodeType(defaultValue)
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'codeType',
      message: i18n.t('export:selectCodeType'),
      choices: [
        {
          name: i18n.t('export:codeTypeClaudeCode'),
          value: 'claude-code',
        },
        {
          name: i18n.t('export:codeTypeCodex'),
          value: 'codex',
        },
        {
          name: i18n.t('export:codeTypeBoth'),
          value: 'all',
        },
      ],
      default: 'claude-code',
    },
  ])

  return answer.codeType as CodeType
}

/**
 * Prompt for export scope selection
 */
async function promptExportScope(defaultValue?: string): Promise<ExportScope> {
  if (defaultValue) {
    return normalizeScope(defaultValue)
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'scope',
      message: i18n.t('export:selectScope'),
      choices: [
        {
          name: i18n.t('export:scopeAll'),
          value: 'all',
        },
        {
          name: i18n.t('export:scopeWorkflows'),
          value: 'workflows',
        },
        {
          name: i18n.t('export:scopeMcp'),
          value: 'mcp',
        },
        {
          name: i18n.t('export:scopeSettings'),
          value: 'settings',
        },
      ],
      default: 'all',
    },
  ])

  return answer.scope as ExportScope
}

/**
 * Prompt for sensitive data inclusion
 */
async function promptIncludeSensitive(defaultValue?: boolean): Promise<boolean> {
  if (defaultValue !== undefined) {
    return defaultValue
  }

  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'includeSensitive',
      message: i18n.t('export:includeSensitive'),
      default: false,
    },
  ])

  // Show warning if user chooses to include sensitive data
  if (answer.includeSensitive) {
    console.log(ansis.yellow(`\n⚠️  ${i18n.t('export:sensitiveWarning')}\n`))
  }

  return answer.includeSensitive
}

/**
 * Prompt for output path
 */
async function promptOutputPath(defaultValue?: string): Promise<string | undefined> {
  if (defaultValue) {
    return defaultValue
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'pathChoice',
      message: i18n.t('export:selectOutputPath'),
      choices: [
        {
          name: i18n.t('export:defaultPath'),
          value: 'default',
        },
        {
          name: i18n.t('export:customPath'),
          value: 'custom',
        },
      ],
      default: 'default',
    },
  ])

  if (answer.pathChoice === 'custom') {
    const pathAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'path',
        message: i18n.t('export:enterOutputPath'),
        validate: (input: string) => {
          if (!input || input.trim() === '') {
            return i18n.t('export:invalidOutputPath')
          }
          return true
        },
      },
    ])
    return pathAnswer.path
  }

  return undefined
}

/**
 * Show export preview and ask for confirmation
 */
async function showPreviewAndConfirm(options: ExportOptions): Promise<boolean> {
  console.log(ansis.bold.cyan(`\n${i18n.t('export:collecting')}`))

  // Get export summary
  const summary = getExportSummary(options)

  if (summary.files.length === 0) {
    console.log(ansis.yellow(i18n.t('export:noFilesToExport')))
    return false
  }

  // Show summary
  console.log(ansis.green(i18n.t('export:collectedFiles', { count: summary.files.length })))
  console.log(`\n${i18n.t('export:fileList')}`)

  // Group files by type
  const filesByType: Record<string, string[]> = {}
  for (const file of summary.files) {
    if (!filesByType[file.type]) {
      filesByType[file.type] = []
    }
    filesByType[file.type].push(file.path)
  }

  // Display grouped files
  for (const [type, files] of Object.entries(filesByType)) {
    console.log(ansis.bold(`  ${type}:`))
    for (const file of files) {
      console.log(`    - ${file}`)
    }
  }

  // Show warning if including sensitive data
  if (options.includeSensitive) {
    console.log(ansis.yellow(`\n⚠️  ${i18n.t('export:sensitiveWarningMessage')}\n`))
  }

  // Confirm export
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: i18n.t('export:confirmExport'),
      default: true,
    },
  ])

  return answer.confirm
}

/**
 * Perform the actual export operation
 */
async function performExport(options: ExportOptions): Promise<void> {
  console.log(ansis.cyan(`\n${i18n.t('export:packaging')}`))

  // Track progress
  let lastProgress = 0
  const progressCallback = (info: { step: string, progress: number }): void => {
    if (info.progress !== lastProgress) {
      console.log(ansis.gray(`  ${info.step}... ${Math.round(info.progress)}%`))
      lastProgress = info.progress
    }
  }

  // Execute export
  const result = await executeExport(options, progressCallback)

  // Handle result
  if (result.success) {
    console.log(ansis.bold.green(`\n${i18n.t('export:complete')}`))
    console.log(ansis.cyan(`${i18n.t('export:packagePath')}: ${ansis.bold(result.packagePath)}`))
    console.log(ansis.cyan(`${i18n.t('export:fileCount')}: ${ansis.bold(result.fileCount)}`))
    if (result.packageSize) {
      const sizeMB = (result.packageSize / 1024 / 1024).toFixed(2)
      console.log(ansis.cyan(`${i18n.t('export:packageSize')}: ${ansis.bold(`${sizeMB} MB`)}`))
    }

    // Show warnings if any
    if (result.warnings && result.warnings.length > 0) {
      console.log(ansis.yellow('\nWarnings:'))
      for (const warning of result.warnings) {
        console.log(ansis.yellow(`  - ${warning}`))
      }
    }
  }
  else {
    console.error(ansis.red(`\n${i18n.t('export:exportFailed')}`))
    if (result.error) {
      console.error(ansis.red(`  ${result.error}`))
    }
    process.exit(1)
  }
}

/**
 * Normalize code type string to CodeType
 */
function normalizeCodeType(value: string): CodeType {
  const normalized = value.toLowerCase()
  if (normalized === 'claude-code' || normalized === 'cc') {
    return 'claude-code'
  }
  if (normalized === 'codex' || normalized === 'cx') {
    return 'codex'
  }
  if (normalized === 'all' || normalized === 'both') {
    return 'all'
  }
  // Default to claude-code
  return 'claude-code'
}

/**
 * Normalize scope string to ExportScope
 */
function normalizeScope(value: string): ExportScope {
  const normalized = value.toLowerCase()
  if (normalized === 'all' || normalized === 'full') {
    return 'all'
  }
  if (normalized === 'workflows' || normalized === 'wf') {
    return 'workflows'
  }
  if (normalized === 'mcp') {
    return 'mcp'
  }
  if (normalized === 'settings' || normalized === 'config') {
    return 'settings'
  }
  if (normalized === 'custom') {
    return 'custom'
  }
  // Default to all
  return 'all'
}
