import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import ansis from 'ansis'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { updateCcr } from '../auto-updater'
import { wrapCommandWithSudo } from '../platform'

const execAsync = promisify(exec)

export interface CcrInstallStatus {
  isInstalled: boolean
  hasCorrectPackage: boolean
}

export async function isCcrInstalled(): Promise<CcrInstallStatus> {
  // First check if ccr command exists
  let commandExists = false
  try {
    // Try to run ccr version to check if it's installed
    await execAsync('ccr version')
    commandExists = true
  }
  catch {
    // If ccr command not found, try which command
    try {
      await execAsync('which ccr')
      commandExists = true
    }
    catch {
      commandExists = false
    }
  }

  // Check if the correct package is installed
  let hasCorrectPackage = false
  try {
    await execAsync('npm list -g @musistudio/claude-code-router')
    hasCorrectPackage = true
  }
  catch {
    // Correct package not found
    hasCorrectPackage = false
  }

  // If command exists but correct package is not installed,
  // it means the incorrect package is installed
  return {
    isInstalled: commandExists,
    hasCorrectPackage,
  }
}

export async function getCcrVersion(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('ccr version')
    // Extract version from output
    const match = stdout.match(/(\d+\.\d+\.\d+)/)
    return match ? match[1] : null
  }
  catch {
    return null
  }
}

export async function installCcr(): Promise<void> {
  ensureI18nInitialized()

  // Check CCR installation status
  const { isInstalled, hasCorrectPackage } = await isCcrInstalled()

  // If correct package is already installed, just check for updates
  if (hasCorrectPackage) {
    console.log(ansis.green(`✔ ${i18n.t('ccr:ccrAlreadyInstalled')}`))
    await updateCcr()
    return
  }

  // If ccr command exists but correct package is not installed,
  // it means the incorrect package is installed
  if (isInstalled && !hasCorrectPackage) {
    // Try to uninstall the incorrect package
    try {
      await execAsync('npm list -g claude-code-router')
      console.log(ansis.yellow(`⚠ ${i18n.t('ccr:detectedIncorrectPackage')}`))
      try {
        await execAsync('npm uninstall -g claude-code-router')
        console.log(ansis.green(`✔ ${i18n.t('ccr:uninstalledIncorrectPackage')}`))
      }
      catch {
        console.log(ansis.yellow(`⚠ ${i18n.t('ccr:failedToUninstallIncorrectPackage')}`))
      }
    }
    catch {
      // Incorrect package not found, but ccr command exists
      // This could be a different installation method
    }
  }

  // Install the correct package
  console.log(ansis.cyan(`📦 ${i18n.t('ccr:installingCcr')}`))

  try {
    const installArgs = ['install', '-g', '@musistudio/claude-code-router', '--force']
    const { command, args, usedSudo } = wrapCommandWithSudo('npm', installArgs)
    if (usedSudo) {
      console.log(ansis.yellow(`ℹ ${i18n.t('installation:usingSudo')}`))
    }
    await execAsync([command, ...args].join(' '))
    console.log(ansis.green(`✔ ${i18n.t('ccr:ccrInstallSuccess')}`))
  }
  catch (error: any) {
    // Check if it's an EEXIST error
    if (error.message?.includes('EEXIST')) {
      console.log(ansis.yellow(`⚠ ${i18n.t('ccr:ccrAlreadyInstalled')}`))
      // Check for updates even if EEXIST error
      await updateCcr()
      return
    }
    console.error(ansis.red(`✖ ${i18n.t('ccr:ccrInstallFailed')}`))
    throw error
  }
}

export async function startCcrService(): Promise<void> {
  ensureI18nInitialized()

  try {
    // Start CCR service in background
    exec('ccr', (error) => {
      if (error) {
        console.error(ansis.red(`${i18n.t('ccr:failedToStartCcrService')}:`), error)
      }
    })

    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  catch (error) {
    console.error(ansis.red(`${i18n.t('ccr:errorStartingCcrService')}:`), error)
  }
}
