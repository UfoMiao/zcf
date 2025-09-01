import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import ansis from 'ansis'
import inquirer from 'inquirer'
import ora from 'ora'
import { ensureI18nInitialized, format, i18n } from '../i18n'
import { checkCcrVersion, checkClaudeCodeVersion, checkCometixLineVersion } from './version-checker'

const execAsync = promisify(exec)

export async function updateCcr(force = false): Promise<boolean> {
  ensureI18nInitialized()
  const spinner = ora(i18n.t('updater:checkingVersion')).start()

  try {
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkCcrVersion()
    spinner.stop()

    if (!installed) {
      console.log(ansis.yellow(i18n.t('updater:ccrNotInstalled')))
      return false
    }

    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t('updater:ccrUpToDate'), { version: currentVersion || '' })))
      return true
    }

    if (!latestVersion) {
      console.log(ansis.yellow(i18n.t('updater:cannotCheckVersion')))
      return false
    }

    // Show version info
    console.log(ansis.cyan(format(i18n.t('updater:currentVersion'), { version: currentVersion || '' })))
    console.log(ansis.cyan(format(i18n.t('updater:latestVersion'), { version: latestVersion })))

    // Ask for confirmation
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: format(i18n.t('updater:confirmUpdate'), { tool: 'CCR' }),
      default: true,
    })

    if (!confirm) {
      console.log(ansis.gray(i18n.t('updater:updateSkipped')))
      return true
    }

    // Perform update
    const updateSpinner = ora(format(i18n.t('updater:updating'), { tool: 'CCR' })).start()

    try {
      // Update the package
      await execAsync('npm update -g @musistudio/claude-code-router')
      updateSpinner.succeed(format(i18n.t('updater:updateSuccess'), { tool: 'CCR' }))
      return true
    }
    catch (error) {
      updateSpinner.fail(format(i18n.t('updater:updateFailed'), { tool: 'CCR' }))
      console.error(ansis.red(error instanceof Error ? error.message : String(error)))
      return false
    }
  }
  catch (error) {
    spinner.fail(i18n.t('updater:checkFailed'))
    console.error(ansis.red(error instanceof Error ? error.message : String(error)))
    return false
  }
}

export async function updateClaudeCode(force = false): Promise<boolean> {
  ensureI18nInitialized()
  const spinner = ora(i18n.t('updater:checkingVersion')).start()

  try {
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkClaudeCodeVersion()
    spinner.stop()

    if (!installed) {
      console.log(ansis.yellow(i18n.t('updater:claudeCodeNotInstalled')))
      return false
    }

    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t('updater:claudeCodeUpToDate'), { version: currentVersion || '' })))
      return true
    }

    if (!latestVersion) {
      console.log(ansis.yellow(i18n.t('updater:cannotCheckVersion')))
      return false
    }

    // Show version info
    console.log(ansis.cyan(format(i18n.t('updater:currentVersion'), { version: currentVersion || '' })))
    console.log(ansis.cyan(format(i18n.t('updater:latestVersion'), { version: latestVersion })))

    // Ask for confirmation
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: format(i18n.t('updater:confirmUpdate'), { tool: 'Claude Code' }),
      default: true,
    })

    if (!confirm) {
      console.log(ansis.gray(i18n.t('updater:updateSkipped')))
      return true
    }

    // Perform update
    const updateSpinner = ora(format(i18n.t('updater:updating'), { tool: 'Claude Code' })).start()

    try {
      await execAsync('npm update -g @anthropic-ai/claude-code')
      updateSpinner.succeed(format(i18n.t('updater:updateSuccess'), { tool: 'Claude Code' }))
      return true
    }
    catch (error) {
      updateSpinner.fail(format(i18n.t('updater:updateFailed'), { tool: 'Claude Code' }))
      console.error(ansis.red(error instanceof Error ? error.message : String(error)))
      return false
    }
  }
  catch (error) {
    spinner.fail(i18n.t('updater:checkFailed'))
    console.error(ansis.red(error instanceof Error ? error.message : String(error)))
    return false
  }
}

export async function updateCometixLine(force = false): Promise<boolean> {
  ensureI18nInitialized()
  const spinner = ora(i18n.t('updater:checkingVersion')).start()

  try {
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkCometixLineVersion()
    spinner.stop()

    if (!installed) {
      console.log(ansis.yellow(i18n.t('updater:cometixLineNotInstalled')))
      return false
    }

    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t('updater:cometixLineUpToDate'), { version: currentVersion || '' })))
      return true
    }

    if (!latestVersion) {
      console.log(ansis.yellow(i18n.t('updater:cannotCheckVersion')))
      return false
    }

    // Show version info
    console.log(ansis.cyan(format(i18n.t('updater:currentVersion'), { version: currentVersion || '' })))
    console.log(ansis.cyan(format(i18n.t('updater:latestVersion'), { version: latestVersion })))

    // Ask for confirmation
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: format(i18n.t('updater:confirmUpdate'), { tool: 'CCometixLine' }),
      default: true,
    })

    if (!confirm) {
      console.log(ansis.gray(i18n.t('updater:updateSkipped')))
      return true
    }

    // Perform update
    const updateSpinner = ora(format(i18n.t('updater:updating'), { tool: 'CCometixLine' })).start()

    try {
      // Update the package
      await execAsync('npm update -g @cometix/ccline')
      updateSpinner.succeed(format(i18n.t('updater:updateSuccess'), { tool: 'CCometixLine' }))
      return true
    }
    catch (error) {
      updateSpinner.fail(format(i18n.t('updater:updateFailed'), { tool: 'CCometixLine' }))
      console.error(ansis.red(error instanceof Error ? error.message : String(error)))
      return false
    }
  }
  catch (error) {
    spinner.fail(i18n.t('updater:checkFailed'))
    console.error(ansis.red(error instanceof Error ? error.message : String(error)))
    return false
  }
}

export async function checkAndUpdateTools(): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.bold.cyan(`\n🔍 ${i18n.t('updater:checkingTools')}\n`))

  // Check and update CCR
  await updateCcr()

  console.log() // Empty line

  // Check and update Claude Code
  await updateClaudeCode()

  console.log() // Empty line

  // Check and update CCometixLine
  await updateCometixLine()
}
