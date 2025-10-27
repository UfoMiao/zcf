import { homedir } from 'node:os'
import ansis from 'ansis'
import { join } from 'pathe'
import { exec } from 'tinyexec'
import { ensureI18nInitialized, i18n } from '../i18n'
import { updateClaudeCode } from './auto-updater'
import { exists, isExecutable, remove } from './fs-operations'
import { commandExists, getTermuxPrefix, getWSLInfo, isTermux, isWSL } from './platform'

export async function isClaudeCodeInstalled(): Promise<boolean> {
  return await commandExists('claude')
}

export async function installClaudeCode(): Promise<void> {
  ensureI18nInitialized()

  // Check if already installed
  const installed = await isClaudeCodeInstalled()
  if (installed) {
    console.log(ansis.green(`✔ ${i18n.t('installation:alreadyInstalled')}`))
    // Check for updates after confirming installation
    await updateClaudeCode()
    // Set installMethod to npm in ~/.claude.json
    await setInstallMethod('npm')
    return
  }

  // Check if running in Termux
  if (isTermux()) {
    console.log(ansis.yellow(`ℹ ${i18n.t('installation:termuxDetected')}`))
    const termuxPrefix = getTermuxPrefix()
    console.log(ansis.gray(i18n.t('installation:termuxPathInfo', { path: termuxPrefix })))
    console.log(ansis.gray(`Node.js: ${termuxPrefix}/bin/node`))
    console.log(ansis.gray(`npm: ${termuxPrefix}/bin/npm`))
  }

  // Check if running in WSL
  if (isWSL()) {
    const wslInfo = getWSLInfo()
    if (wslInfo?.distro) {
      console.log(ansis.yellow(`ℹ ${i18n.t('installation:wslDetected', { distro: wslInfo.distro })}`))
    }
    else {
      console.log(ansis.yellow(`ℹ ${i18n.t('installation:wslDetectedGeneric')}`))
    }
    console.log(ansis.gray(i18n.t('installation:wslPathInfo', { path: `${homedir()}/.claude/` })))
  }

  console.log(i18n.t('installation:installing'))

  try {
    // Always use npm for installation to ensure automatic updates work
    // Note: If the user can run 'npx zcf', npm is already available
    await exec('npm', ['install', '-g', '@anthropic-ai/claude-code'])
    console.log(`✔ ${i18n.t('installation:installSuccess')}`)

    // Set installMethod to npm in ~/.claude.json
    await setInstallMethod('npm')

    // Additional hint for Termux users
    if (isTermux()) {
      console.log(ansis.gray(`\nClaude Code installed to: ${getTermuxPrefix()}/bin/claude`))
    }

    // Additional hint for WSL users
    if (isWSL()) {
      console.log(ansis.gray(`\n${i18n.t('installation:wslInstallSuccess')}`))
    }
  }
  catch (error) {
    console.error(`✖ ${i18n.t('installation:installFailed')}`)
    if (isTermux()) {
      console.error(ansis.yellow(`\n${i18n.t('installation:termuxInstallHint')}\n`))
    }
    throw error
  }
}

/**
 * Check if local Claude Code installation exists
 */
export async function isLocalClaudeCodeInstalled(): Promise<boolean> {
  const localClaudePath = join(homedir(), '.claude', 'local', 'claude')

  if (!exists(localClaudePath)) {
    return false
  }

  return await isExecutable(localClaudePath)
}

/**
 * Get installation status for both global and local Claude Code
 */
export interface InstallationStatus {
  hasGlobal: boolean
  hasLocal: boolean
  localPath: string
}

export async function getInstallationStatus(): Promise<InstallationStatus> {
  const localPath = join(homedir(), '.claude', 'local', 'claude')

  const [hasGlobal, hasLocal] = await Promise.all([
    isClaudeCodeInstalled(),
    isLocalClaudeCodeInstalled(),
  ])

  return {
    hasGlobal,
    hasLocal,
    localPath,
  }
}

/**
 * Remove local Claude Code installation
 */
export async function removeLocalClaudeCode(): Promise<void> {
  const localDir = join(homedir(), '.claude', 'local')

  if (!exists(localDir)) {
    return
  }

  try {
    await remove(localDir)
  }
  catch (error) {
    ensureI18nInitialized()
    throw new Error(`${i18n.t('installation:failedToRemoveLocalInstallation')}: ${error}`)
  }
}

/**
 * Set installMethod to 'npm' in ~/.claude.json
 * This ensures Claude Code knows it was installed via npm for proper auto-updates
 */
export async function setInstallMethod(method: 'npm' | 'native' = 'npm'): Promise<void> {
  try {
    const { readMcpConfig, writeMcpConfig } = await import('./claude-config')

    // Read existing config or create new one
    let config = readMcpConfig()
    if (!config) {
      config = { mcpServers: {} }
    }

    // Set installMethod
    config.installMethod = method

    // Write updated config
    writeMcpConfig(config)
  }
  catch (error) {
    // Don't throw error to avoid breaking the main flow
    // This is a nice-to-have feature, not critical
    console.error('Failed to set installMethod in ~/.claude.json:', error)
  }
}
