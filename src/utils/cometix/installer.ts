import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import ansis from 'ansis'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { addCCometixLineConfig, hasCCometixLineConfig } from '../ccometixline-config'
import { wrapCommandWithSudo } from '../platform'
import { COMETIX_COMMANDS, COMETIX_PACKAGE_NAME } from './common'

const execAsync = promisify(exec)

export async function isCometixLineInstalled(): Promise<boolean> {
  try {
    await execAsync(COMETIX_COMMANDS.CHECK_INSTALL)
    return true
  }
  catch {
    return false
  }
}

export async function installCometixLine(): Promise<void> {
  ensureI18nInitialized()
  const runInstallCommand = async (): Promise<void> => {
    const installArgs = ['install', '-g', COMETIX_PACKAGE_NAME]
    const { command, args, usedSudo } = wrapCommandWithSudo('npm', installArgs)
    if (usedSudo) {
      console.log(ansis.yellow(`ℹ ${i18n.t('installation:usingSudo')}`))
    }
    await execAsync([command, ...args].join(' '))
  }

  // Check if already installed
  const isInstalled = await isCometixLineInstalled()
  if (isInstalled) {
    console.log(ansis.green(`✔ ${i18n.t('cometix:cometixAlreadyInstalled')}`))

    // Update CCometixLine
    try {
      console.log(ansis.blue(`${i18n.t('cometix:installingOrUpdating')}`))
      await runInstallCommand()
      console.log(ansis.green(`✔ ${i18n.t('cometix:installUpdateSuccess')}`))
    }
    catch (error) {
      console.log(ansis.yellow(`⚠ ${i18n.t('cometix:installUpdateFailed')}: ${error}`))
    }

    // Check if statusLine config exists, add if missing
    if (!hasCCometixLineConfig()) {
      try {
        addCCometixLineConfig()
        console.log(ansis.green(`✔ ${i18n.t('cometix:statusLineConfigured') || 'Claude Code statusLine configured'}`))
      }
      catch (error) {
        console.log(ansis.yellow(`⚠ ${i18n.t('cometix:statusLineConfigFailed') || 'Failed to configure statusLine'}: ${error}`))
      }
    }
    else {
      console.log(ansis.blue(`ℹ ${i18n.t('cometix:statusLineAlreadyConfigured') || 'Claude Code statusLine already configured'}`))
    }
    return
  }

  try {
    console.log(ansis.blue(`${i18n.t('cometix:installingCometix')}`))
    await runInstallCommand()
    console.log(ansis.green(`✔ ${i18n.t('cometix:cometixInstallSuccess')}`))

    // Configure Claude Code statusLine after successful installation
    try {
      addCCometixLineConfig()
      console.log(ansis.green(`✔ ${i18n.t('cometix:statusLineConfigured') || 'Claude Code statusLine configured'}`))
    }
    catch (configError) {
      console.log(ansis.yellow(`⚠ ${i18n.t('cometix:statusLineConfigFailed') || 'Failed to configure statusLine'}: ${configError}`))
      console.log(ansis.blue(`💡 ${i18n.t('cometix:statusLineManualConfig') || 'Please manually add statusLine configuration to Claude Code settings'}`))
    }
  }
  catch (error) {
    console.error(ansis.red(`✗ ${i18n.t('cometix:cometixInstallFailed')}: ${error}`))
    throw error
  }
}
