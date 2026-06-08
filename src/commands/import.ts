/**
 * Import configuration command
 *
 * This module implements the configuration import functionality,
 * allowing users to import ZCF configurations from a portable zip package.
 */

import type { CodeType, ImportOptions, MergeStrategy } from '../types/export-import'
import process from 'node:process'
import ansis from 'ansis'
import dayjs from 'dayjs'
import inquirer from 'inquirer'
import { ensureI18nInitialized, i18n } from '../i18n'
import { handleGeneralError } from '../utils/error-handler'
import { executeImport, getImportSummary } from '../utils/export-import/importer'
import { validateImportOptions } from '../utils/export-import/validator'
import { exists } from '../utils/fs-operations'

interface ImportCommandOptions {
  packagePath?: string // positional argument or --package, -p
  codeType?: string // --code-type, -T
  mergeStrategy?: string // --merge-strategy, -m
  includeSensitive?: boolean // --include-sensitive
  noBackup?: boolean // --no-backup
  lang?: string // --lang, -l
}

/**
 * Main import command handler
 * @param packagePath - Package path (can be positional argument)
 * @param options - Command options
 */
export async function importCommand(
  packagePath: string | undefined,
  options: ImportCommandOptions,
): Promise<void> {
  try {
    ensureI18nInitialized()

    // Merge packagePath from positional argument or option
    const pkgPath = packagePath || options.packagePath

    // If all required options are provided, execute directly
    if (pkgPath && options.mergeStrategy) {
      await handleDirectImport(pkgPath, options)
      return
    }

    // Otherwise, show interactive prompts
    await handleInteractiveImport(pkgPath, options)
  }
  catch (error) {
    // In test environment, re-throw the error
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      throw error
    }
    handleGeneralError(error)
  }
}

/**
 * Handle direct import with command line options
 */
async function handleDirectImport(
  packagePath: string,
  cmdOptions: ImportCommandOptions,
): Promise<void> {
  const importOptions: ImportOptions = {
    packagePath,
    targetCodeType: normalizeCodeType(cmdOptions.codeType),
    mergeStrategy: normalizeMergeStrategy(cmdOptions.mergeStrategy!),
    importSensitive: cmdOptions.includeSensitive || false,
    backup: !cmdOptions.noBackup,
    lang: cmdOptions.lang,
  }

  // Validate options
  const validation = validateImportOptions(importOptions)
  if (!validation.valid) {
    console.error(ansis.red(i18n.t('import:importFailed')))
    for (const error of validation.errors) {
      console.error(ansis.red(`  - ${error}`))
    }
    process.exit(1)
  }

  // Execute import
  await performImport(importOptions)
}

/**
 * Handle interactive import with prompts
 */
async function handleInteractiveImport(
  initialPackagePath: string | undefined,
  cmdOptions: ImportCommandOptions,
): Promise<void> {
  console.log(ansis.bold.cyan(`\n${i18n.t('import:title')}\n`))

  // Step 1: Select package file
  const packagePath = await promptPackagePath(initialPackagePath)

  // Step 2: Validate and show package info
  console.log(ansis.cyan(`\n${i18n.t('import:validating')}`))

  const summary = getImportSummary(packagePath)

  if (!summary.validation.valid) {
    console.log(ansis.red(`\n${i18n.t('import:validationFailed')}\n`))

    if (summary.validation.errors.length > 0) {
      console.log(ansis.red(i18n.t('import:validationErrors')))
      for (const error of summary.validation.errors) {
        console.error(ansis.red(`  - ${error.message}`))
      }
    }

    if (summary.validation.warnings.length > 0) {
      console.log(ansis.yellow(`\n${i18n.t('import:validationWarnings')}`))
      for (const warning of summary.validation.warnings) {
        console.warn(ansis.yellow(`  - ${warning.message}`))
      }
    }

    return
  }

  console.log(ansis.green(`${i18n.t('import:validationPassed')}\n`))

  // Show package information
  const metadata = summary.metadata!
  await showPackageInfo(metadata)

  // Check for platform/version warnings
  if (summary.validation.warnings.length > 0) {
    console.log(ansis.yellow(`\n${i18n.t('import:validationWarnings')}`))
    for (const warning of summary.validation.warnings) {
      console.warn(ansis.yellow(`  - ${warning.message}`))
    }
    console.log()
  }

  // Step 3: Select target code type (if package contains 'all')
  const targetCodeType = await promptTargetCodeType(metadata.codeType, cmdOptions.codeType)

  // Step 4: Select merge strategy
  const mergeStrategy = await promptMergeStrategy(cmdOptions.mergeStrategy)

  // Step 5: Import sensitive data?
  const importSensitive = await promptImportSensitive(
    metadata.hasSensitiveData,
    cmdOptions.includeSensitive,
  )

  // Step 6: Create backup?
  const backup = await promptBackup(cmdOptions.noBackup)

  // Build import options
  const importOptions: ImportOptions = {
    packagePath,
    targetCodeType,
    mergeStrategy,
    importSensitive,
    backup,
    lang: cmdOptions.lang,
  }

  // Step 7: Confirm import
  const confirmed = await confirmImport(metadata)
  if (!confirmed) {
    console.log(ansis.yellow(i18n.t('common:operationCancelled')))
    return
  }

  // Step 8: Execute import
  await performImport(importOptions)
}

/**
 * Prompt for package path
 */
async function promptPackagePath(defaultValue?: string): Promise<string> {
  if (defaultValue && exists(defaultValue)) {
    return defaultValue
  }

  const answer = await inquirer.prompt([
    {
      type: 'input',
      name: 'path',
      message: i18n.t('import:enterPackagePath'),
      default: defaultValue,
      validate: (input: string) => {
        if (!input || input.trim() === '') {
          return i18n.t('import:invalidPackage')
        }
        if (!exists(input)) {
          return i18n.t('import:packageNotFound', { path: input })
        }
        if (!input.endsWith('.zip')) {
          return i18n.t('import:invalidZipFormat')
        }
        return true
      },
    },
  ])

  return answer.path
}

/**
 * Show package information
 */
async function showPackageInfo(metadata: any): Promise<void> {
  console.log(ansis.bold(i18n.t('import:packageInfo')))
  console.log(ansis.gray('─'.repeat(50)))

  console.log(`  ${ansis.bold(i18n.t('import:zcfVersion'))}:         ${ansis.cyan(metadata.version)}`)
  console.log(`  ${ansis.bold(i18n.t('import:exportDate'))}:        ${ansis.cyan(dayjs(metadata.exportDate).format('YYYY-MM-DD HH:mm:ss'))}`)
  console.log(`  ${ansis.bold(i18n.t('import:sourcePlatform'))}:    ${ansis.cyan(metadata.platform)}`)
  console.log(`  ${ansis.bold(i18n.t('import:codeType'))}:          ${ansis.cyan(metadata.codeType)}`)
  console.log(`  ${ansis.bold(i18n.t('import:scope'))}:             ${ansis.cyan(metadata.scope.join(', '))}`)
  console.log(`  ${ansis.bold(i18n.t('import:filesCount'))}:        ${ansis.cyan(metadata.files.length)}`)
  console.log(`  ${ansis.bold(i18n.t('import:hasSensitiveData'))}: ${metadata.hasSensitiveData ? ansis.red(i18n.t('common:yes')) : ansis.green(i18n.t('common:no'))}`)

  if (metadata.description) {
    console.log(`  ${ansis.bold(i18n.t('import:description'))}:      ${ansis.gray(metadata.description)}`)
  }

  if (metadata.tags && metadata.tags.length > 0) {
    console.log(`  ${ansis.bold(i18n.t('import:tags'))}:             ${ansis.gray(metadata.tags.join(', '))}`)
  }

  console.log(ansis.gray('─'.repeat(50)))
}

/**
 * Prompt for target code type
 */
async function promptTargetCodeType(
  packageCodeType: CodeType,
  defaultValue?: string,
): Promise<CodeType | undefined> {
  // If package is not 'all', no need to ask
  if (packageCodeType !== 'all') {
    return undefined
  }

  if (defaultValue) {
    return normalizeCodeType(defaultValue)
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'codeType',
      message: i18n.t('import:selectTargetCodeType'),
      choices: [
        {
          name: `${i18n.t('export:codeTypeClaudeCode')} (${i18n.t('import:autoDetected')})`,
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
 * Prompt for merge strategy
 */
async function promptMergeStrategy(defaultValue?: string): Promise<MergeStrategy> {
  if (defaultValue) {
    return normalizeMergeStrategy(defaultValue)
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'strategy',
      message: i18n.t('import:selectMergeStrategy'),
      choices: [
        {
          name: i18n.t('import:strategyMerge'),
          value: 'merge',
        },
        {
          name: i18n.t('import:strategySkipExisting'),
          value: 'skip-existing',
        },
        {
          name: ansis.yellow(i18n.t('import:strategyReplace')),
          value: 'replace',
        },
      ],
      default: 'merge',
    },
  ])

  // Show warning for replace strategy
  if (answer.strategy === 'replace') {
    console.log(ansis.yellow(`\n⚠️  ${i18n.t('import:mergeStrategyWarning')}\n`))
  }

  return answer.strategy as MergeStrategy
}

/**
 * Prompt for importing sensitive data
 */
async function promptImportSensitive(
  hasSensitiveData: boolean,
  defaultValue?: boolean,
): Promise<boolean> {
  if (defaultValue !== undefined) {
    return defaultValue
  }

  if (!hasSensitiveData) {
    console.log(ansis.gray(`\n💡 ${i18n.t('import:sensitiveDataNotAvailable')}\n`))
    return false
  }

  console.log(ansis.yellow(`\n⚠️  ${i18n.t('import:sensitiveDataAvailable')}\n`))

  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'importSensitive',
      message: i18n.t('import:importSensitive'),
      default: false,
    },
  ])

  return answer.importSensitive
}

/**
 * Prompt for backup creation
 * IMPORTANT: Backup is ALWAYS created by default for safety
 */
async function promptBackup(noBackup?: boolean): Promise<boolean> {
  // If explicitly disabled via command line, respect it
  if (noBackup === true) {
    console.log(ansis.yellow(`\n⚠️  ${i18n.t('import:backupRecommended')}\n`))
    return false
  }

  // For interactive mode, still ask but default to true
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'backup',
      message: i18n.t('import:createBackup'),
      default: true, // Always default to creating backup
    },
  ])

  if (!answer.backup) {
    console.log(ansis.yellow(`\n⚠️  ${i18n.t('import:backupRecommended')}\n`))

    // Show a second confirmation for safety
    const confirmNoBackup = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: ansis.yellow(i18n.t('import:confirmNoBackup')),
        default: false,
      },
    ])

    return !confirmNoBackup.confirm
  }

  return answer.backup
}

/**
 * Confirm import
 */
async function confirmImport(metadata: any): Promise<boolean> {
  console.log(ansis.bold.cyan(`\n${i18n.t('import:importSummary')}\n`))
  console.log(`  ${i18n.t('import:filesCount')}: ${ansis.bold(metadata.files.length)}`)
  console.log(`  ${i18n.t('import:scope')}: ${ansis.bold(metadata.scope.join(', '))}`)
  console.log()

  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: i18n.t('import:confirmImport'),
      default: true,
    },
  ])

  return answer.confirm
}

/**
 * Perform the actual import operation
 */
async function performImport(options: ImportOptions): Promise<void> {
  console.log(ansis.cyan(`\n${i18n.t('import:extracting')}`))

  // Track progress
  let lastProgress = 0
  const progressCallback = (info: { step: string, progress: number }): void => {
    if (info.progress !== lastProgress) {
      console.log(ansis.gray(`  ${info.step}... ${Math.round(info.progress)}%`))
      lastProgress = info.progress
    }
  }

  // Execute import
  const result = await executeImport(options, progressCallback)

  // Handle result
  if (result.success) {
    console.log(ansis.bold.green(`\n${i18n.t('import:complete')}`))

    if (result.backupPath) {
      console.log(ansis.cyan(`${i18n.t('import:backupPath')}: ${ansis.bold(result.backupPath)}`))
    }

    console.log(ansis.cyan(`${i18n.t('import:importedFiles')}: ${ansis.bold(result.fileCount)}`))

    if (result.resolvedConflicts && result.resolvedConflicts.length > 0) {
      console.log(ansis.cyan(`${i18n.t('import:resolvedConflicts')}: ${ansis.bold(result.resolvedConflicts.length)}`))
    }

    // Show warnings if any
    if (result.warnings && result.warnings.length > 0) {
      console.log(ansis.yellow(`\n${i18n.t('import:warnings')}:`))
      for (const warning of result.warnings) {
        console.log(ansis.yellow(`  - ${warning}`))
      }
    }
  }
  else {
    console.error(ansis.red(`\n${i18n.t('import:importFailed')}`))
    if (result.error) {
      console.error(ansis.red(`  ${result.error}`))
    }

    // Show rollback availability
    if (result.rollbackAvailable && result.backupPath) {
      console.log(ansis.yellow(`\n${i18n.t('import:rollbackAvailable')}: ${result.backupPath}`))
    }

    process.exit(1)
  }
}

/**
 * Normalize code type string to CodeType
 */
function normalizeCodeType(value?: string): CodeType | undefined {
  if (!value) {
    return undefined
  }

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

  return undefined
}

/**
 * Normalize merge strategy string to MergeStrategy
 */
function normalizeMergeStrategy(value: string): MergeStrategy {
  const normalized = value.toLowerCase()
  if (normalized === 'replace' || normalized === 'r') {
    return 'replace'
  }
  if (normalized === 'merge' || normalized === 'm') {
    return 'merge'
  }
  if (normalized === 'skip-existing' || normalized === 'skip' || normalized === 's') {
    return 'skip-existing'
  }

  // Default to merge
  return 'merge'
}
