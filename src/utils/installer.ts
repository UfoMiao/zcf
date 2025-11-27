import type { InstallMethod } from '../types/config'
import type { CodeType } from './platform'
import { homedir } from 'node:os'
import ansis from 'ansis'
import inquirer from 'inquirer'
import ora from 'ora'
import { join } from 'pathe'
import { exec } from 'tinyexec'
import { ensureI18nInitialized, i18n } from '../i18n'
import { updateClaudeCode } from './auto-updater'
import { exists, isExecutable, remove } from './fs-operations'
import { commandExists, getPlatform, getRecommendedInstallMethods, getTermuxPrefix, getWSLInfo, isTermux, isWSL, wrapCommandWithSudo } from './platform'

export async function isClaudeCodeInstalled(): Promise<boolean> {
  return await commandExists('claude')
}

/**
 * Install Claude Code with method selection support
 * @param skipMethodSelection - If true, use default npm installation
 */
export async function installClaudeCode(skipMethodSelection: boolean = false): Promise<void> {
  ensureI18nInitialized()

  const codeType: CodeType = 'claude-code'

  // Check if already installed
  const installed = await isClaudeCodeInstalled()
  if (installed) {
    console.log(ansis.green(`✔ ${i18n.t('installation:alreadyInstalled')}`))

    // Detect and display current version
    const version = await detectInstalledVersion(codeType)
    if (version) {
      console.log(ansis.gray(`  ${i18n.t('installation:detectedVersion', { version })}`))
    }

    // Check for updates after confirming installation
    await updateClaudeCode()
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

  // If skip method selection, use npm directly (for backwards compatibility)
  if (skipMethodSelection) {
    console.log(i18n.t('installation:installing'))

    try {
      const { command, args, usedSudo } = wrapCommandWithSudo('npm', ['install', '-g', '@anthropic-ai/claude-code'])
      if (usedSudo) {
        console.log(ansis.yellow(`ℹ ${i18n.t('installation:usingSudo')}`))
      }
      await exec(command, args)
      console.log(`✔ ${i18n.t('installation:installSuccess')}`)
      await setInstallMethod('npm')

      if (isTermux()) {
        console.log(ansis.gray(`\nClaude Code installed to: ${getTermuxPrefix()}/bin/claude`))
      }
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
    return
  }

  // New flow: select installation method
  const method = await selectInstallMethod(codeType)
  if (!method) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  const success = await executeInstallMethod(method, codeType)

  if (!success) {
    // Handle installation failure with retry options
    const retrySuccess = await handleInstallFailure(codeType, [method])
    if (!retrySuccess) {
      console.error(ansis.red(`✖ ${i18n.t('installation:installFailed')}`))
      throw new Error(i18n.t('installation:installFailed'))
    }
  }

  // Additional hints for special environments
  if (isTermux()) {
    console.log(ansis.gray(`\nClaude Code installed to: ${getTermuxPrefix()}/bin/claude`))
  }
  if (isWSL()) {
    console.log(ansis.gray(`\n${i18n.t('installation:wslInstallSuccess')}`))
  }
}

/**
 * Check if Codex is installed
 */
export async function isCodexInstalled(): Promise<boolean> {
  return await commandExists('codex')
}

/**
 * Install Codex with method selection support
 * @param skipMethodSelection - If true, use default npm installation
 */
export async function installCodex(skipMethodSelection: boolean = false): Promise<void> {
  ensureI18nInitialized()

  const codeType: CodeType = 'codex'
  const codeTypeName = i18n.t('common:codex')

  // Check if already installed
  const installed = await isCodexInstalled()
  if (installed) {
    console.log(ansis.green(`✔ ${codeTypeName} ${i18n.t('installation:alreadyInstalled')}`))

    // Detect and display current version
    const version = await detectInstalledVersion(codeType)
    if (version) {
      console.log(ansis.gray(`  ${i18n.t('installation:detectedVersion', { version })}`))
    }

    return
  }

  // If skip method selection, use npm directly (for backwards compatibility)
  if (skipMethodSelection) {
    console.log(i18n.t('installation:installingWith', { method: 'npm', codeType: codeTypeName }))

    try {
      const { command, args, usedSudo } = wrapCommandWithSudo('npm', ['install', '-g', '@openai/codex'])
      if (usedSudo) {
        console.log(ansis.yellow(`ℹ ${i18n.t('installation:usingSudo')}`))
      }
      await exec(command, args)
      console.log(ansis.green(`✔ ${codeTypeName} ${i18n.t('installation:installSuccess')}`))
    }
    catch (error) {
      console.error(ansis.red(`✖ ${codeTypeName} ${i18n.t('installation:installFailed')}`))
      throw error
    }
    return
  }

  // New flow: select installation method
  const method = await selectInstallMethod(codeType)
  if (!method) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  const success = await executeInstallMethod(method, codeType)

  if (!success) {
    // Handle installation failure with retry options
    const retrySuccess = await handleInstallFailure(codeType, [method])
    if (!retrySuccess) {
      console.error(ansis.red(`✖ ${codeTypeName} ${i18n.t('installation:installFailed')}`))
      throw new Error(i18n.t('installation:installFailed'))
    }
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
 * Get install method from config
 */
async function getInstallMethodFromConfig(codeType: CodeType): Promise<InstallMethod | 'npm-global' | 'native' | null> {
  try {
    if (codeType === 'claude-code') {
      const { readMcpConfig } = await import('./claude-config')
      const config = readMcpConfig()
      return config?.installMethod || null
    }
  }
  catch {
    // Config read failed, return null
  }
  return null
}

/**
 * Uninstall code tool based on install method
 * @param codeType - Type of code tool to uninstall
 * @returns true if uninstalled successfully
 */
export async function uninstallCodeTool(codeType: CodeType): Promise<boolean> {
  ensureI18nInitialized()

  const codeTypeName = codeType === 'claude-code' ? i18n.t('common:claudeCode') : i18n.t('common:codex')

  // Try to detect install method from config
  type ExtendedInstallMethod = InstallMethod | 'npm-global' | 'native' | 'manual' | null
  let method: ExtendedInstallMethod = await getInstallMethodFromConfig(codeType)

  // If method not in config, try to detect from system
  if (!method) {
    // Check if installed via Homebrew
    if (codeType === 'claude-code') {
      try {
        const result = await exec('brew', ['list', '--cask', 'claude-code'])
        if (result.exitCode === 0) {
          method = 'homebrew'
        }
      }
      catch {
        // Not installed via Homebrew
      }
    }
    else if (codeType === 'codex') {
      try {
        const result = await exec('brew', ['list', 'codex'])
        if (result.exitCode === 0) {
          method = 'homebrew'
        }
      }
      catch {
        // Not installed via Homebrew
      }
    }

    // Default to npm if method still not detected
    if (!method) {
      method = 'npm'
    }
  }

  // Map 'native' to actual native method based on platform
  if (method === 'native') {
    const platform = getPlatform()
    if (platform === 'macos' || platform === 'linux') {
      // Try Homebrew first, then fall back to manual removal
      try {
        const testResult = codeType === 'claude-code'
          ? await exec('brew', ['list', '--cask', 'claude-code'])
          : await exec('brew', ['list', 'codex'])
        if (testResult.exitCode === 0) {
          method = 'homebrew'
        }
      }
      catch {
        // Not Homebrew, will use manual removal below
        method = 'manual'
      }
    }
    else {
      // Windows native installs need manual removal
      method = 'manual'
    }
  }

  const spinner = ora(i18n.t('installation:uninstallingWith', { method, codeType: codeTypeName })).start()

  try {
    switch (method) {
      case 'npm':
      case 'npm-global': {
        const packageName = codeType === 'claude-code' ? '@anthropic-ai/claude-code' : '@openai/codex'
        const { command, args, usedSudo } = wrapCommandWithSudo('npm', ['uninstall', '-g', packageName])
        if (usedSudo) {
          spinner.info(i18n.t('installation:usingSudo'))
          spinner.start()
        }
        await exec(command, args)
        break
      }

      case 'homebrew': {
        if (codeType === 'claude-code') {
          await exec('brew', ['uninstall', '--cask', 'claude-code'])
        }
        else {
          await exec('brew', ['uninstall', 'codex'])
        }
        break
      }

      case 'manual':
      default: {
        // For native installs (curl/powershell/cmd), we need to manually find and remove the binary
        // This is platform-specific and might require sudo
        spinner.warn(i18n.t('installation:manualUninstallRequired', { codeType: codeTypeName }))

        // Try to find binary location
        const command = codeType === 'claude-code' ? 'claude' : 'codex'
        try {
          const whichCmd = getPlatform() === 'windows' ? 'where' : 'which'
          const result = await exec(whichCmd, [command])
          if (result.stdout) {
            const binaryPath = result.stdout.trim().split('\n')[0]
            spinner.info(i18n.t('installation:binaryLocation', { path: binaryPath }))

            // Attempt to remove the binary
            const platform = getPlatform()
            if (platform === 'windows') {
              // `del` is a shell builtin, so invoke through cmd
              const quotedBinaryPath = `"${binaryPath}"`
              await exec('cmd', ['/c', 'del', '/f', '/q', quotedBinaryPath])
            }
            else {
              const { command: rmCmd, args: rmArgs } = wrapCommandWithSudo('rm', ['-f', binaryPath])
              if (rmCmd === 'sudo') {
                spinner.info(i18n.t('installation:usingSudo'))
                spinner.start()
              }
              await exec(rmCmd, rmArgs)
            }
          }
        }
        catch {
          spinner.fail(i18n.t('installation:failedToLocateBinary', { command }))
          return false
        }
        break
      }
    }

    spinner.succeed(i18n.t('installation:uninstallSuccess', { method, codeType: codeTypeName }))
    return true
  }
  catch (error) {
    spinner.fail(i18n.t('installation:uninstallFailed', { method, codeType: codeTypeName }))
    if (error instanceof Error) {
      console.error(ansis.gray(error.message))
    }
    return false
  }
}

/**
 * Set installMethod in both ~/.claude.json and zcf-config
 * This ensures Claude Code knows it was installed via npm for proper auto-updates
 */
export async function setInstallMethod(method: InstallMethod, codeType: CodeType = 'claude-code'): Promise<void> {
  try {
    // Save to Claude Code config for auto-update compatibility
    if (codeType === 'claude-code') {
      const { readMcpConfig, writeMcpConfig } = await import('./claude-config')
      let config = readMcpConfig()
      if (!config) {
        config = { mcpServers: {} }
      }
      config.installMethod = method === 'npm' ? 'npm-global' : method
      writeMcpConfig(config)
    }

    // Note: ZCF TOML config doesn't have direct TOML read/write functions
    // Installation method tracking is handled through Claude Code config
    // This is intentional to maintain backwards compatibility
  }
  catch (error) {
    // Don't throw error to avoid breaking the main flow
    console.error('Failed to set installMethod:', error)
  }
}

/**
 * Detect installed version of a code tool
 * Returns version string or null if not installed
 */
export async function detectInstalledVersion(codeType: CodeType): Promise<string | null> {
  try {
    const command = codeType === 'claude-code' ? 'claude' : 'codex'
    const result = await exec(command, ['--version'])

    if (result.exitCode === 0 && result.stdout) {
      // Extract version number from output
      const versionMatch = result.stdout.match(/(\d+\.\d+\.\d+)/)
      return versionMatch ? versionMatch[1] : result.stdout.trim()
    }
  }
  catch {
    // Command doesn't exist or failed
  }

  return null
}

/**
 * Get install method options with localized labels
 */
function getInstallMethodOptions(codeType: CodeType, recommendedMethods: InstallMethod[]): Array<{ title: string, value: InstallMethod, description?: string }> {
  const allMethods: InstallMethod[] = ['npm', 'homebrew', 'curl', 'powershell', 'cmd']
  const platform = getPlatform()

  // Filter methods by platform availability and code type support
  const availableMethods = allMethods.filter((method) => {
    // Codex only supports npm and homebrew
    if (codeType === 'codex' && !['npm', 'homebrew'].includes(method)) {
      return false
    }

    if (method === 'homebrew')
      return platform === 'macos' || platform === 'linux'
    if (method === 'curl')
      return platform !== 'windows' || isWSL()
    if (method === 'powershell' || method === 'cmd')
      return platform === 'windows'
    return true // npm is always available
  })

  // Only mark the first recommended method (highest priority)
  const topRecommended = recommendedMethods.length > 0 ? recommendedMethods[0] : null

  return availableMethods.map((method) => {
    const isTopRecommended = method === topRecommended
    const title = isTopRecommended
      ? `${i18n.t(`installation:installMethod${method.charAt(0).toUpperCase() + method.slice(1)}`)} ${ansis.green(`[${i18n.t('installation:recommendedMethod')}]`)}`
      : i18n.t(`installation:installMethod${method.charAt(0).toUpperCase() + method.slice(1)}`)

    return {
      title,
      value: method,
    }
  })
}

/**
 * Select installation method interactively
 */
export async function selectInstallMethod(codeType: CodeType, excludeMethods: InstallMethod[] = []): Promise<InstallMethod | null> {
  ensureI18nInitialized()

  const codeTypeName = codeType === 'claude-code' ? i18n.t('common:claudeCode') : i18n.t('common:codex')
  const recommendedMethods = getRecommendedInstallMethods(codeType) as InstallMethod[]
  const methodOptions = getInstallMethodOptions(codeType, recommendedMethods)
    .filter(option => !excludeMethods.includes(option.value))

  if (methodOptions.length === 0) {
    console.log(ansis.yellow(i18n.t('installation:noMoreMethods')))
    return null
  }

  const response = await inquirer.prompt<{ method: InstallMethod }>({
    type: 'list',
    name: 'method',
    message: i18n.t('installation:selectInstallMethod', { codeType: codeTypeName }),
    choices: methodOptions.map(opt => ({
      name: opt.title,
      value: opt.value,
    })),
  })

  return response.method || null
}

/**
 * Execute installation using specified method
 */
export async function executeInstallMethod(method: InstallMethod, codeType: CodeType): Promise<boolean> {
  ensureI18nInitialized()

  const codeTypeName = codeType === 'claude-code' ? i18n.t('common:claudeCode') : i18n.t('common:codex')
  const spinner = ora(i18n.t('installation:installingWith', { method, codeType: codeTypeName })).start()

  try {
    switch (method) {
      case 'npm': {
        const packageName = codeType === 'claude-code' ? '@anthropic-ai/claude-code' : '@openai/codex'
        const { command, args, usedSudo } = wrapCommandWithSudo('npm', ['install', '-g', packageName])
        if (usedSudo) {
          spinner.info(i18n.t('installation:usingSudo'))
          spinner.start()
        }
        await exec(command, args)
        await setInstallMethod('npm', codeType)
        break
      }

      case 'homebrew': {
        if (codeType === 'claude-code') {
          await exec('brew', ['install', '--cask', 'claude-code'])
        }
        else {
          await exec('brew', ['install', 'codex'])
        }
        await setInstallMethod('homebrew', codeType)
        break
      }

      case 'curl': {
        if (codeType === 'claude-code') {
          await exec('bash', ['-c', 'curl -fsSL https://claude.ai/install.sh | bash'])
        }
        else {
          // Codex doesn't have curl install method, fallback to npm
          spinner.stop()
          return await executeInstallMethod('npm', codeType)
        }
        await setInstallMethod('curl', codeType)
        break
      }

      case 'powershell': {
        if (codeType === 'claude-code') {
          await exec('powershell', ['-Command', 'irm https://claude.ai/install.ps1 | iex'])
        }
        else {
          spinner.stop()
          return await executeInstallMethod('npm', codeType)
        }
        await setInstallMethod('powershell', codeType)
        break
      }

      case 'cmd': {
        if (codeType === 'claude-code') {
          await exec('cmd', ['/c', 'curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd'])
        }
        else {
          spinner.stop()
          return await executeInstallMethod('npm', codeType)
        }
        await setInstallMethod('cmd', codeType)
        break
      }

      default:
        throw new Error(`Unsupported install method: ${method}`)
    }

    spinner.succeed(i18n.t('installation:installMethodSuccess', { method }))
    return true
  }
  catch (error) {
    spinner.fail(i18n.t('installation:installMethodFailed', { method }))
    if (error instanceof Error) {
      console.error(ansis.gray(error.message))
    }
    return false
  }
}

/**
 * Handle installation failure with retry options
 */
export async function handleInstallFailure(codeType: CodeType, failedMethods: InstallMethod[]): Promise<boolean> {
  ensureI18nInitialized()

  const response = await inquirer.prompt<{ retry: boolean }>({
    type: 'confirm',
    name: 'retry',
    message: i18n.t('installation:tryAnotherMethod'),
    default: true,
  })

  if (!response.retry) {
    return false
  }

  // Try selecting another method
  const newMethod = await selectInstallMethod(codeType, failedMethods)
  if (!newMethod) {
    return false
  }

  const success = await executeInstallMethod(newMethod, codeType)
  if (success) {
    return true
  }

  // Recursively handle failure until success or user gives up
  return await handleInstallFailure(codeType, [...failedMethods, newMethod])
}
