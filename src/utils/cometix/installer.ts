import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import ansis from 'ansis'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { addCCometixLineConfig, hasCCometixLineConfig } from '../ccometixline-config'
import { COMETIX_COMMANDS } from './common'

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

  // Check if already installed
  const isInstalled = await isCometixLineInstalled()
  if (isInstalled) {
    console.log(ansis.green(`✔ ${i18n.t('cometix:cometixAlreadyInstalled')}`))

    // Update CCometixLine
    try {
      console.log(ansis.blue(`${i18n.t('cometix:installingOrUpdating')}`))
      await execAsync(COMETIX_COMMANDS.INSTALL)
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
    await execAsync(COMETIX_COMMANDS.INSTALL)
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
