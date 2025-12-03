import type { InstallMethod } from '../types/config'
import type { CodeType } from './platform'
import * as nodeFs from 'node:fs'
import { homedir } from 'node:os'
import ansis from 'ansis'
import inquirer from 'inquirer'
import ora from 'ora'
import { join } from 'pathe'
import { exec } from 'tinyexec'
import { ensureI18nInitialized, i18n } from '../i18n'
import { updateClaudeCode } from './auto-updater'
import { exists, isExecutable, remove } from './fs-operations'
import { commandExists, findCommandPath, getHomebrewCommandPaths, getPlatform, getRecommendedInstallMethods, getTermuxPrefix, getWSLInfo, isTermux, isWSL, wrapCommandWithSudo } from './platform'

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

    // Verify installation and ensure symlink exists
    // This handles the case where claude is installed via cask but symlink is missing/broken
    const verification = await verifyInstallation(codeType)
    if (verification.symlinkCreated) {
      displayVerificationResult(verification, codeType)
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
      // Use --force to handle EEXIST errors when files already exist
      const { command, args, usedSudo } = wrapCommandWithSudo('npm', ['install', '-g', '@anthropic-ai/claude-code', '--force'])
      if (usedSudo) {
        console.log(ansis.yellow(`ℹ ${i18n.t('installation:usingSudo')}`))
      }
      await exec(command, args)
      console.log(`✔ ${i18n.t('installation:installSuccess')}`)
      await setInstallMethod('npm')

      // Verify installation and create symlink if needed
      const verification = await verifyInstallation(codeType)
      displayVerificationResult(verification, codeType)

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
      // Use --force to handle EEXIST errors when files already exist
      const { command, args, usedSudo } = wrapCommandWithSudo('npm', ['install', '-g', '@openai/codex', '--force'])
      if (usedSudo) {
        console.log(ansis.yellow(`ℹ ${i18n.t('installation:usingSudo')}`))
      }
      await exec(command, args)
      console.log(ansis.green(`✔ ${codeTypeName} ${i18n.t('installation:installSuccess')}`))

      // Verify installation and create symlink if needed
      const verification = await verifyInstallation(codeType)
      displayVerificationResult(verification, codeType)
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
        // Codex is installed as a cask
        const result = await exec('brew', ['list', '--cask', 'codex'])
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
        // Both Claude Code and Codex are installed as casks
        const testResult = codeType === 'claude-code'
          ? await exec('brew', ['list', '--cask', 'claude-code'])
          : await exec('brew', ['list', '--cask', 'codex'])
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
          // Codex is also installed as a cask
          await exec('brew', ['uninstall', '--cask', 'codex'])
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
 * Get localized label for install method
 * Uses explicit i18n keys instead of dynamic string concatenation for better i18n plugin support
 */
function getInstallMethodLabel(method: InstallMethod): string {
  switch (method) {
    case 'npm':
      return i18n.t('installation:installMethodNpm')
    case 'homebrew':
      return i18n.t('installation:installMethodHomebrew')
    case 'curl':
      return i18n.t('installation:installMethodCurl')
    case 'powershell':
      return i18n.t('installation:installMethodPowershell')
    case 'cmd':
      return i18n.t('installation:installMethodCmd')
    default:
      return method
  }
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
    const methodLabel = getInstallMethodLabel(method)
    const title = isTopRecommended
      ? `${methodLabel} ${ansis.green(`[${i18n.t('installation:recommendedMethod')}]`)}`
      : methodLabel

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
        // Use --force to handle EEXIST errors when files already exist
        const { command, args, usedSudo } = wrapCommandWithSudo('npm', ['install', '-g', packageName, '--force'])
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
          // Codex is also installed as a cask
          await exec('brew', ['install', '--cask', 'codex'])
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

    // Verify installation and create symlink if needed
    // Verification is informational only - don't fail the installation if verification fails
    // The installation command succeeded, so we should return true even if the command
    // isn't immediately accessible (e.g., PATH not updated, symlink creation failed)
    const verification = await verifyInstallation(codeType)
    displayVerificationResult(verification, codeType)

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

/**
 * Installation verification result
 */
export interface VerificationResult {
  success: boolean
  commandPath: string | null
  version: string | null
  needsSymlink: boolean
  symlinkCreated: boolean
  error?: string
}

/**
 * Check if command is directly accessible via which/where (in standard PATH)
 * This is different from commandExists which also checks Homebrew Caskroom paths
 */
async function isCommandInPath(command: string): Promise<boolean> {
  try {
    const cmd = getPlatform() === 'windows' ? 'where' : 'which'
    const res = await exec(cmd, [command])
    return res.exitCode === 0
  }
  catch {
    return false
  }
}

/**
 * Verify installation by checking command availability and version
 * If command is not in PATH but found in Homebrew paths, attempt to create symlink
 */
export async function verifyInstallation(codeType: CodeType): Promise<VerificationResult> {
  const command = codeType === 'claude-code' ? 'claude' : 'codex'

  // Step 1: Check if command is accessible via which (directly in PATH)
  // Use isCommandInPath instead of commandExists to avoid detecting Caskroom paths
  // which would skip symlink creation
  const commandInPath = await isCommandInPath(command)

  if (commandInPath) {
    // Command found in PATH, verify it works
    const version = await detectInstalledVersion(codeType)
    return {
      success: true,
      commandPath: await findCommandPath(command),
      version,
      needsSymlink: false,
      symlinkCreated: false,
    }
  }

  // Step 2: Command not in PATH, look for it in Homebrew paths (including Caskroom)
  if (getPlatform() === 'macos') {
    const homebrewPaths = await getHomebrewCommandPaths(command)
    let foundPath: string | null = null

    for (const path of homebrewPaths) {
      if (exists(path)) {
        foundPath = path
        break
      }
    }

    if (foundPath) {
      // Found in Homebrew path, try to create symlink
      const symlinkResult = await createHomebrewSymlink(command, foundPath)

      if (symlinkResult.success) {
        // Symlink created, verify it works
        const version = await detectInstalledVersion(codeType)
        return {
          success: true,
          commandPath: symlinkResult.symlinkPath,
          version,
          needsSymlink: true,
          symlinkCreated: true,
        }
      }

      return {
        success: false,
        commandPath: foundPath,
        version: null,
        needsSymlink: true,
        symlinkCreated: false,
        error: symlinkResult.error,
      }
    }
  }

  // Step 3: Check Termux paths
  if (isTermux()) {
    const termuxPrefix = getTermuxPrefix()
    const termuxPaths = [
      `${termuxPrefix}/bin/${command}`,
      `${termuxPrefix}/usr/bin/${command}`,
    ]

    for (const path of termuxPaths) {
      if (exists(path)) {
        const version = await detectInstalledVersion(codeType)
        return {
          success: true,
          commandPath: path,
          version,
          needsSymlink: false,
          symlinkCreated: false,
        }
      }
    }
  }

  return {
    success: false,
    commandPath: null,
    version: null,
    needsSymlink: false,
    symlinkCreated: false,
    error: 'Command not found in any known location',
  }
}

/**
 * Symlink creation result
 */
interface SymlinkResult {
  success: boolean
  symlinkPath: string | null
  error?: string
}

/**
 * Create symlink in Homebrew bin directory for commands installed via npm
 * This handles the case where npm global packages are installed to
 * /opt/homebrew/Cellar/node/{version}/bin/ but that path is not in the user's PATH
 */
export async function createHomebrewSymlink(command: string, sourcePath: string): Promise<SymlinkResult> {
  // Determine the appropriate Homebrew bin directory
  const homebrewBinPaths = [
    '/opt/homebrew/bin', // Apple Silicon (M1/M2)
    '/usr/local/bin', // Intel Mac
  ]

  let targetDir: string | null = null
  for (const binPath of homebrewBinPaths) {
    // Check if the bin directory itself exists, not just its parent
    // This ensures we only create symlinks in directories that actually exist
    // (e.g., /usr/local always exists on macOS but /usr/local/bin may not)
    if (nodeFs.existsSync(binPath)) {
      targetDir = binPath
      break
    }
  }

  if (!targetDir) {
    return {
      success: false,
      symlinkPath: null,
      error: 'No suitable Homebrew bin directory found',
    }
  }

  const symlinkPath = join(targetDir, command)

  // Check if symlink already exists using lstat to detect broken symlinks
  // Note: existsSync returns false for broken symlinks, so we need lstat
  try {
    const stats = nodeFs.lstatSync(symlinkPath)
    if (stats.isSymbolicLink()) {
      const existingTarget = nodeFs.readlinkSync(symlinkPath)
      if (existingTarget === sourcePath) {
        // Symlink already points to correct location
        return {
          success: true,
          symlinkPath,
        }
      }
      // Remove existing symlink pointing to wrong location (including broken symlinks)
      nodeFs.unlinkSync(symlinkPath)
    }
    else {
      // File exists but is not a symlink, don't overwrite
      return {
        success: false,
        symlinkPath: null,
        error: `File already exists at ${symlinkPath} and is not a symlink`,
      }
    }
  }
  catch (error: any) {
    // ENOENT means file doesn't exist, which is fine - we'll create it
    if (error.code !== 'ENOENT') {
      return {
        success: false,
        symlinkPath: null,
        error: `Failed to check existing file: ${error}`,
      }
    }
  }

  // Create the symlink
  try {
    nodeFs.symlinkSync(sourcePath, symlinkPath)
    return {
      success: true,
      symlinkPath,
    }
  }
  catch (error: any) {
    // If permission denied, suggest manual command
    if (error.code === 'EACCES') {
      return {
        success: false,
        symlinkPath: null,
        error: `Permission denied. Try running: sudo ln -sf ${sourcePath} ${symlinkPath}`,
      }
    }
    return {
      success: false,
      symlinkPath: null,
      error: `Failed to create symlink: ${error.message}`,
    }
  }
}

/**
 * Display verification result to user with appropriate messages
 */
export function displayVerificationResult(result: VerificationResult, codeType: CodeType): void {
  ensureI18nInitialized()

  const codeTypeName = codeType === 'claude-code' ? i18n.t('common:claudeCode') : i18n.t('common:codex')

  if (result.success) {
    if (result.symlinkCreated) {
      console.log(ansis.green(`✔ ${codeTypeName} ${i18n.t('installation:verificationSuccess')}`))
      console.log(ansis.gray(`  ${i18n.t('installation:symlinkCreated', { path: result.commandPath })}`))
    }
    if (result.version) {
      console.log(ansis.gray(`  ${i18n.t('installation:detectedVersion', { version: result.version })}`))
    }
  }
  else {
    console.log(ansis.yellow(`⚠ ${codeTypeName} ${i18n.t('installation:verificationFailed')}`))
    if (result.commandPath) {
      console.log(ansis.gray(`  ${i18n.t('installation:foundAtPath', { path: result.commandPath })}`))
    }
    if (result.error) {
      console.log(ansis.gray(`  ${result.error}`))
    }
    if (result.needsSymlink && !result.symlinkCreated) {
      console.log(ansis.yellow(`  ${i18n.t('installation:manualSymlinkHint')}`))
    }
  }
}
