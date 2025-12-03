import { exec } from 'node:child_process'
import * as nodeFs from 'node:fs'
import process from 'node:process'
import { promisify } from 'node:util'
import semver from 'semver'
import { findCommandPath, getHomebrewCommandPaths, getPlatform } from './platform'

const execAsync = promisify(exec)

/**
 * Get installed version of a command-line tool
 *
 * This function detects the version regardless of installation method (npm, Homebrew, etc.)
 * by executing the command and parsing its version output.
 *
 * @param command - Command name (e.g., 'claude', 'ccr', 'codex')
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Version string or null if command is not installed
 */
export async function getInstalledVersion(command: string, maxRetries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try -v first (more universal), then --version
      let stdout: string
      try {
        const result = await execAsync(`${command} -v`)
        stdout = result.stdout
      }
      catch {
        // Fallback to --version if -v doesn't work
        const result = await execAsync(`${command} --version`)
        stdout = result.stdout
      }

      // Extract version from output
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+(?:-[\w.]+)?)/)
      return versionMatch ? versionMatch[1] : null
    }
    catch {
      if (attempt === maxRetries) {
        // Final attempt failed, return null
        return null
      }
      // Wait briefly before retry (100ms * attempt number)
      await new Promise(resolve => setTimeout(resolve, 100 * attempt))
    }
  }
  return null
}

export async function getLatestVersion(packageName: string, maxRetries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { stdout } = await execAsync(`npm view ${packageName} version`)
      return stdout.trim()
    }
    catch {
      if (attempt === maxRetries) {
        // Final attempt failed, return null
        return null
      }
      // Wait briefly before retry (200ms * attempt number for network calls)
      await new Promise(resolve => setTimeout(resolve, 200 * attempt))
    }
  }
  return null
}

/**
 * Determine the installation source of Claude Code based on the actual command path
 *
 * This function finds the actual `claude` command path and determines whether it
 * comes from a Homebrew cask installation or another source (npm, curl, etc.).
 *
 * @returns Installation source info including whether it's from Homebrew
 */
export async function getClaudeCodeInstallationSource(): Promise<{
  isHomebrew: boolean
  commandPath: string | null
  source: 'homebrew-cask' | 'npm' | 'other' | 'not-found'
}> {
  // Only check Homebrew on macOS
  if (getPlatform() !== 'macos') {
    const commandPath = await findCommandPath('claude')
    return {
      isHomebrew: false,
      commandPath,
      source: commandPath ? 'other' : 'not-found',
    }
  }

  const commandPath = await findCommandPath('claude')
  if (!commandPath) {
    return { isHomebrew: false, commandPath: null, source: 'not-found' }
  }

  // Check if the path is from Homebrew Caskroom
  // Homebrew cask paths look like: /opt/homebrew/Caskroom/claude-code/2.0.56/claude
  // or /usr/local/Caskroom/claude-code/*/claude
  const isFromCaskroom = commandPath.includes('/Caskroom/claude-code/')

  if (isFromCaskroom) {
    return { isHomebrew: true, commandPath, source: 'homebrew-cask' }
  }

  // Check if it's a symlink to a Caskroom path
  try {
    const { stdout: realPath } = await execAsync(`readlink -f "${commandPath}" 2>/dev/null || realpath "${commandPath}" 2>/dev/null || echo "${commandPath}"`)
    const resolvedPath = realPath.trim()

    if (resolvedPath.includes('/Caskroom/claude-code/')) {
      return { isHomebrew: true, commandPath, source: 'homebrew-cask' }
    }
  }
  catch {
    // Ignore symlink resolution errors
  }

  // Not from Homebrew cask - could be npm, curl installation, etc.
  // Check if path suggests npm installation
  if (commandPath.includes('/node_modules/') || commandPath.includes('/npm/') || commandPath.includes('/Cellar/node/')) {
    return { isHomebrew: false, commandPath, source: 'npm' }
  }

  return { isHomebrew: false, commandPath, source: 'other' }
}

export interface ClaudeCodeInstallation {
  source: 'homebrew-cask' | 'npm' | 'npm-homebrew-node' | 'curl' | 'other'
  path: string
  version: string | null
  isActive: boolean // true if this is the one in PATH
}

/**
 * Detect all Claude Code installations on the system
 *
 * This function finds all possible Claude Code installations including:
 * - Homebrew cask installation
 * - npm global installation
 * - npm via Homebrew's Node.js
 * - curl installation
 *
 * @returns Array of all detected installations with their paths and sources
 */
export async function detectAllClaudeCodeInstallations(): Promise<ClaudeCodeInstallation[]> {
  const installations: ClaudeCodeInstallation[] = []
  const checkedPaths = new Set<string>()

  // Get the active command path (first in PATH)
  const activeCommandPath = await findCommandPath('claude')
  let activeResolvedPath: string | null = null

  if (activeCommandPath) {
    // Resolve symlinks to get the real path
    try {
      const { stdout } = await execAsync(`readlink -f "${activeCommandPath}" 2>/dev/null || realpath "${activeCommandPath}" 2>/dev/null || echo "${activeCommandPath}"`)
      activeResolvedPath = stdout.trim()
    }
    catch {
      activeResolvedPath = activeCommandPath
    }
  }

  // Helper to get version from a specific path
  async function getVersionFromPath(path: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`"${path}" -v 2>/dev/null || "${path}" --version 2>/dev/null`)
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+(?:-[\w.]+)?)/)
      return versionMatch ? versionMatch[1] : null
    }
    catch {
      return null
    }
  }

  // Helper to check if a path is the active one
  function isActivePath(path: string): boolean {
    if (!activeResolvedPath)
      return false
    return path === activeResolvedPath || path === activeCommandPath
  }

  // Helper to add installation if path exists and not already checked
  async function addInstallation(path: string, source: ClaudeCodeInstallation['source']): Promise<void> {
    // Resolve symlinks
    let resolvedPath = path
    try {
      const { stdout } = await execAsync(`readlink -f "${path}" 2>/dev/null || realpath "${path}" 2>/dev/null || echo "${path}"`)
      resolvedPath = stdout.trim()
    }
    catch {
      // Keep original path
    }

    if (checkedPaths.has(resolvedPath))
      return
    checkedPaths.add(resolvedPath)

    if (!nodeFs.existsSync(path))
      return

    const version = await getVersionFromPath(path)
    installations.push({
      source,
      path,
      version,
      isActive: isActivePath(path) || isActivePath(resolvedPath),
    })
  }

  // 0. First, add the active command path if it exists
  // This ensures we capture installations from fnm, nvm, or other Node version managers
  if (activeCommandPath && nodeFs.existsSync(activeCommandPath)) {
    let activeSource: ClaudeCodeInstallation['source'] = 'other'

    // Determine source based on path
    if (activeResolvedPath?.includes('/Caskroom/claude-code/')) {
      activeSource = 'homebrew-cask'
    }
    else if (
      activeResolvedPath?.includes('/node_modules/')
      || activeResolvedPath?.includes('/npm/')
      || activeResolvedPath?.includes('/fnm_multishells/')
      || activeResolvedPath?.includes('/.nvm/')
      || activeResolvedPath?.includes('/Cellar/node/')
      || activeCommandPath.includes('/fnm_multishells/')
      || activeCommandPath.includes('/.nvm/')
    ) {
      activeSource = 'npm'
    }

    await addInstallation(activeCommandPath, activeSource)
  }

  // 1. Check Homebrew cask installation
  if (getPlatform() === 'macos') {
    const homebrewPaths = await getHomebrewCommandPaths('claude')
    for (const path of homebrewPaths) {
      if (path.includes('/Caskroom/claude-code/')) {
        await addInstallation(path, 'homebrew-cask')
      }
      else if (path.includes('/Cellar/node/')) {
        await addInstallation(path, 'npm-homebrew-node')
      }
    }

    // Also check if cask is installed but symlink might be different
    try {
      // execAsync throws if command fails (cask not installed)
      await execAsync('brew list --cask claude-code')
      // If we get here, the cask is installed - find actual cask path
      const homebrewPrefixes = ['/opt/homebrew', '/usr/local']
      for (const prefix of homebrewPrefixes) {
        const caskroomPath = `${prefix}/Caskroom/claude-code`
        if (nodeFs.existsSync(caskroomPath)) {
          const versions = nodeFs.readdirSync(caskroomPath).filter(v => !v.startsWith('.'))
          for (const version of versions) {
            const claudePath = `${caskroomPath}/${version}/claude`
            await addInstallation(claudePath, 'homebrew-cask')
          }
        }
      }
    }
    catch {
      // Homebrew cask not installed - this is expected
    }
  }

  // 2. Check npm global installation paths
  const npmGlobalPaths = [
    '/usr/local/bin/claude',
    '/usr/bin/claude',
    `${process.env.HOME}/.npm-global/bin/claude`,
    `${process.env.HOME}/.local/bin/claude`,
  ]

  for (const path of npmGlobalPaths) {
    if (nodeFs.existsSync(path)) {
      // Determine if it's npm or curl based on resolved path
      let resolvedPath = path
      try {
        const { stdout } = await execAsync(`readlink -f "${path}" 2>/dev/null || realpath "${path}" 2>/dev/null || echo "${path}"`)
        resolvedPath = stdout.trim()
      }
      catch {
        // Keep original
      }

      if (resolvedPath.includes('/node_modules/') || resolvedPath.includes('/npm/')) {
        await addInstallation(path, 'npm')
      }
      else if (resolvedPath.includes('/Caskroom/')) {
        // Skip, already handled above
      }
      else {
        // Could be curl or other installation
        await addInstallation(path, 'other')
      }
    }
  }

  // 3. Check Homebrew's Node.js npm global path on macOS
  if (getPlatform() === 'macos') {
    const homebrewPrefixes = ['/opt/homebrew', '/usr/local']
    for (const prefix of homebrewPrefixes) {
      const cellarNodePath = `${prefix}/Cellar/node`
      if (nodeFs.existsSync(cellarNodePath)) {
        try {
          const versions = nodeFs.readdirSync(cellarNodePath)
          for (const version of versions) {
            const claudePath = `${cellarNodePath}/${version}/bin/claude`
            await addInstallation(claudePath, 'npm-homebrew-node')
          }
        }
        catch {
          // Ignore read errors
        }
      }
    }
  }

  return installations
}

/**
 * Check if there are multiple Claude Code installations that could cause conflicts
 *
 * @returns Object with duplicate detection info and recommended action
 */
export async function checkDuplicateInstallations(): Promise<{
  hasDuplicates: boolean
  installations: ClaudeCodeInstallation[]
  activeInstallation: ClaudeCodeInstallation | null
  inactiveInstallations: ClaudeCodeInstallation[]
  homebrewInstallation: ClaudeCodeInstallation | null
  npmInstallation: ClaudeCodeInstallation | null
  recommendation: 'remove-npm' | 'none'
}> {
  const installations = await detectAllClaudeCodeInstallations()

  const activeInstallation = installations.find(i => i.isActive) || null
  const inactiveInstallations = installations.filter(i => !i.isActive)

  // Find specific installation types
  const homebrewInstallation = installations.find(i => i.source === 'homebrew-cask') || null
  const npmInstallation = installations.find(i => i.source === 'npm' || i.source === 'npm-homebrew-node') || null

  // Determine if there are meaningful duplicates
  // We consider it a duplicate if there's both a Homebrew cask and npm installation
  const hasDuplicates = homebrewInstallation !== null && npmInstallation !== null

  // Always recommend removing npm and keeping Homebrew when both exist
  // Homebrew cask is the official recommended installation method
  const recommendation: 'remove-npm' | 'none' = hasDuplicates ? 'remove-npm' : 'none'

  return {
    hasDuplicates,
    installations,
    activeInstallation,
    inactiveInstallations,
    homebrewInstallation,
    npmInstallation,
    recommendation,
  }
}

/**
 * Get display name for installation source
 */
export function getSourceDisplayName(source: ClaudeCodeInstallation['source'], i18n: { t: (key: string) => string }): string {
  const sourceMap: Record<ClaudeCodeInstallation['source'], string> = {
    'homebrew-cask': i18n.t('installation:sourceHomebrewCask'),
    'npm': i18n.t('installation:sourceNpm'),
    'npm-homebrew-node': i18n.t('installation:sourceNpmHomebrewNode'),
    'curl': i18n.t('installation:sourceCurl'),
    'other': i18n.t('installation:sourceOther'),
  }
  return sourceMap[source] || source
}

/**
 * Helper function to perform npm removal and activate Homebrew
 * This is shared between automatic (skipPrompt) and interactive modes
 */
async function performNpmRemovalAndActivateHomebrew(
  _npmInstallation: ClaudeCodeInstallation,
  homebrewInstallation: ClaudeCodeInstallation | null,
  tinyExec: typeof import('tinyexec')['exec'],
  i18n: { t: (key: string, options?: Record<string, string>) => string },
  ansis: typeof import('ansis').default,
): Promise<{
  hadDuplicates: boolean
  resolved: boolean
  action: 'removed-npm' | 'kept-both'
}> {
  const ora = (await import('ora')).default
  const spinner = ora(i18n.t('installation:removingDuplicateInstallation')).start()

  try {
    const { wrapCommandWithSudo } = await import('./platform')
    const { command, args, usedSudo } = wrapCommandWithSudo('npm', ['uninstall', '-g', '@anthropic-ai/claude-code'])
    if (usedSudo) {
      spinner.info(i18n.t('installation:usingSudo'))
      spinner.start()
    }
    await tinyExec(command, args)
    spinner.succeed(i18n.t('installation:duplicateRemoved'))

    // After removing npm, help activate Homebrew if it's not already active
    if (homebrewInstallation && !homebrewInstallation.isActive) {
      console.log('')
      console.log(ansis.cyan(`🔗 ${i18n.t('installation:activatingHomebrew')}`))

      // Try to create symlink for Homebrew installation
      const { createHomebrewSymlink } = await import('./installer')
      const symlinkResult = await createHomebrewSymlink('claude', homebrewInstallation.path)

      if (symlinkResult.success) {
        console.log(ansis.green(`✔ ${i18n.t('installation:symlinkCreated', { path: symlinkResult.symlinkPath || '/usr/local/bin/claude' })}`))
      }
      else {
        // Provide manual instructions - use error message if available (contains correct path),
        // otherwise determine correct Homebrew bin path based on architecture
        console.log(ansis.yellow(`⚠ ${i18n.t('installation:manualSymlinkHint')}`))
        if (symlinkResult.error) {
          // The error message from createHomebrewSymlink already contains the correct sudo command
          console.log(ansis.gray(`   ${symlinkResult.error}`))
        }
        else {
          // Fallback: determine correct Homebrew bin based on architecture
          const homebrewBin = nodeFs.existsSync('/opt/homebrew/bin') ? '/opt/homebrew/bin' : '/usr/local/bin'
          console.log(ansis.gray(`   sudo ln -sf "${homebrewInstallation.path}" ${homebrewBin}/claude`))
        }
      }
    }

    return { hadDuplicates: true, resolved: true, action: 'removed-npm' }
  }
  catch (error) {
    spinner.fail(i18n.t('installation:duplicateRemovalFailed'))
    if (error instanceof Error) {
      console.error(ansis.gray(error.message))
    }
    return { hadDuplicates: true, resolved: false, action: 'kept-both' }
  }
}

/**
 * Display duplicate installation information and prompt user for action
 *
 * When both npm and Homebrew installations exist, always recommend removing npm
 * and keeping Homebrew (which is the official recommended installation method).
 * After removing npm, help activate Homebrew by creating a symlink if needed.
 *
 * @param skipPrompt - If true, automatically remove npm without prompting
 * @returns Result object with action taken
 */
export async function handleDuplicateInstallations(skipPrompt: boolean = false): Promise<{
  hadDuplicates: boolean
  resolved: boolean
  action: 'removed-npm' | 'kept-both' | 'no-duplicates'
}> {
  // Lazy imports to avoid circular dependencies
  const { ensureI18nInitialized, format, i18n } = await import('../i18n')
  const ansis = (await import('ansis')).default

  ensureI18nInitialized()

  const duplicateInfo = await checkDuplicateInstallations()

  if (!duplicateInfo.hasDuplicates) {
    return { hadDuplicates: false, resolved: true, action: 'no-duplicates' }
  }

  const { npmInstallation, homebrewInstallation } = duplicateInfo

  // Display duplicate installation warning
  console.log('')
  console.log(ansis.yellow.bold(i18n.t('installation:duplicateInstallationsDetected')))
  console.log(ansis.gray(i18n.t('installation:duplicateInstallationsWarning')))
  console.log('')

  // Display Homebrew installation (recommended to keep)
  if (homebrewInstallation) {
    const isActive = homebrewInstallation.isActive
    const statusIcon = isActive ? '✅' : '⚠️'
    const statusColor = isActive ? ansis.green : ansis.yellow
    console.log(ansis.cyan.bold(`🍺 Homebrew Cask ${i18n.t('installation:recommendedMethod')}:`))
    console.log(ansis.white(`   ${i18n.t('installation:installationSource')}: ${statusColor(getSourceDisplayName(homebrewInstallation.source, i18n))}`))
    console.log(ansis.white(`   ${i18n.t('installation:installationPath')}: ${ansis.gray(homebrewInstallation.path)}`))
    if (homebrewInstallation.version) {
      console.log(ansis.white(`   ${i18n.t('installation:installationVersion')}: ${ansis.cyan(homebrewInstallation.version)}`))
    }
    console.log(ansis.white(`   ${statusIcon} ${isActive ? i18n.t('installation:currentActiveInstallation') : i18n.t('installation:inactiveInstallations')}`))
    console.log('')
  }

  // Display npm installation (recommended to remove)
  if (npmInstallation) {
    const isActive = npmInstallation.isActive
    console.log(ansis.yellow.bold(`📦 npm ${i18n.t('installation:notRecommended')}:`))
    console.log(ansis.white(`   ${i18n.t('installation:installationSource')}: ${ansis.yellow(getSourceDisplayName(npmInstallation.source, i18n))}`))
    console.log(ansis.white(`   ${i18n.t('installation:installationPath')}: ${ansis.gray(npmInstallation.path)}`))
    if (npmInstallation.version) {
      console.log(ansis.white(`   ${i18n.t('installation:installationVersion')}: ${ansis.cyan(npmInstallation.version)}`))

      // Check for version mismatch
      if (homebrewInstallation?.version && npmInstallation.version !== homebrewInstallation.version) {
        console.log(ansis.red(`   ${format(i18n.t('installation:versionMismatchWarning'), {
          npmVersion: npmInstallation.version,
          homebrewVersion: homebrewInstallation.version,
        })}`))
      }
    }
    if (isActive) {
      console.log(ansis.white(`   ⚠️ ${i18n.t('installation:currentActiveInstallation')}`))
    }
    console.log('')
  }

  // Show recommendation - always recommend removing npm
  console.log(ansis.cyan(`💡 ${i18n.t('installation:recommendRemoveNpm')}`))
  console.log('')

  if (!npmInstallation) {
    return { hadDuplicates: true, resolved: false, action: 'kept-both' }
  }

  const { exec: tinyExec } = await import('tinyexec')

  // If skipPrompt (-s flag), automatically remove npm and keep Homebrew
  if (skipPrompt) {
    console.log(ansis.cyan(`🔄 ${i18n.t('installation:autoRemovingNpm')}`))
    return await performNpmRemovalAndActivateHomebrew(
      npmInstallation,
      homebrewInstallation,
      tinyExec,
      i18n,
      ansis,
    )
  }

  // Prompt user for action
  const inquirer = (await import('inquirer')).default

  const sourceDisplayName = getSourceDisplayName(npmInstallation.source, i18n)
  const confirmMessage = format(i18n.t('installation:confirmRemoveDuplicate'), { source: sourceDisplayName })

  const { action } = await inquirer.prompt<{ action: 'remove' | 'keep' }>([
    {
      type: 'list',
      name: 'action',
      message: confirmMessage,
      choices: [
        {
          name: `✅ ${i18n.t('common:yes')} - ${i18n.t('installation:removingDuplicateInstallation')}`,
          value: 'remove',
        },
        {
          name: `❌ ${i18n.t('installation:keepBothInstallations')}`,
          value: 'keep',
        },
      ],
    },
  ])

  if (action === 'keep') {
    console.log(ansis.gray(i18n.t('installation:duplicateWarningContinue')))
    return { hadDuplicates: true, resolved: false, action: 'kept-both' }
  }

  // Perform npm removal using the helper function
  return await performNpmRemovalAndActivateHomebrew(
    npmInstallation,
    homebrewInstallation,
    tinyExec,
    i18n,
    ansis,
  )
}

/**
 * Check if Claude Code is installed via Homebrew
 *
 * @deprecated Use getClaudeCodeInstallationSource() instead for accurate detection
 * when both npm and Homebrew installations coexist.
 *
 * This function only checks if the Homebrew cask EXISTS, not whether the active
 * `claude` command comes from it. Use getClaudeCodeInstallationSource() to
 * determine the actual installation source of the command in PATH.
 *
 * @returns true if claude-code cask is installed (may not be the active installation)
 */
export async function isClaudeCodeInstalledViaHomebrew(): Promise<boolean> {
  try {
    // Use brew list --cask to check if claude-code is installed via Homebrew
    // This avoids the side effect of running claude update
    const result = await execAsync('brew list --cask claude-code')
    return result.stdout.includes('claude-code')
  }
  catch {
    // If brew command fails, it's not installed via Homebrew
    return false
  }
}

/**
 * Get the latest Claude Code version from Homebrew cask
 *
 * @returns Version string or null if unable to fetch
 */
export async function getHomebrewClaudeCodeVersion(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('brew info --cask claude-code --json=v2')
    const info = JSON.parse(stdout)
    // For casks, the structure is different
    if (info.casks && info.casks.length > 0) {
      return info.casks[0].version
    }
    return null
  }
  catch {
    return null
  }
}

export function compareVersions(current: string, latest: string): number {
  // Returns: -1 if current < latest, 0 if equal, 1 if current > latest
  if (!semver.valid(current) || !semver.valid(latest)) {
    return -1 // Assume update needed if version is invalid
  }

  return semver.compare(current, latest)
}

export function shouldUpdate(current: string, latest: string): boolean {
  return compareVersions(current, latest) < 0
}

export async function checkCcrVersion(): Promise<{
  installed: boolean
  currentVersion: string | null
  latestVersion: string | null
  needsUpdate: boolean
}> {
  const currentVersion = await getInstalledVersion('ccr')
  // Get the latest version from npm
  const latestVersion = await getLatestVersion('@musistudio/claude-code-router')

  return {
    installed: currentVersion !== null,
    currentVersion,
    latestVersion,
    needsUpdate: currentVersion && latestVersion ? shouldUpdate(currentVersion, latestVersion) : false,
  }
}

/**
 * Check Claude Code version and compare with latest version from appropriate source
 *
 * This function detects the installation method by checking the actual command path
 * (not just whether the Homebrew cask exists) and uses the corresponding version
 * source for accurate update detection.
 *
 * IMPORTANT: Uses getClaudeCodeInstallationSource() to determine the actual source
 * of the `claude` command in PATH, avoiding the bug where a Homebrew cask exists
 * but the active command comes from npm.
 *
 * @returns Version information including update availability and installation method
 */
export async function checkClaudeCodeVersion(): Promise<{
  installed: boolean
  currentVersion: string | null
  latestVersion: string | null
  needsUpdate: boolean
  isHomebrew: boolean
  commandPath: string | null
  installationSource: 'homebrew-cask' | 'npm' | 'other' | 'not-found'
}> {
  const currentVersion = await getInstalledVersion('claude')

  // Determine installation source by checking actual command path
  // This correctly handles the case where both npm and Homebrew installations exist
  const installationInfo = await getClaudeCodeInstallationSource()
  const { isHomebrew, commandPath, source: installationSource } = installationInfo

  // Use appropriate version source based on actual installation method
  let latestVersion: string | null
  if (isHomebrew) {
    latestVersion = await getHomebrewClaudeCodeVersion()
  }
  else {
    latestVersion = await getLatestVersion('@anthropic-ai/claude-code')
  }

  return {
    installed: currentVersion !== null,
    currentVersion,
    latestVersion,
    needsUpdate: currentVersion && latestVersion ? shouldUpdate(currentVersion, latestVersion) : false,
    isHomebrew,
    commandPath,
    installationSource,
  }
}

export async function checkCometixLineVersion(): Promise<{
  installed: boolean
  currentVersion: string | null
  latestVersion: string | null
  needsUpdate: boolean
}> {
  const currentVersion = await getInstalledVersion('ccline')
  const latestVersion = await getLatestVersion('@cometix/ccline')

  return {
    installed: currentVersion !== null,
    currentVersion,
    latestVersion,
    needsUpdate: currentVersion && latestVersion ? shouldUpdate(currentVersion, latestVersion) : false,
  }
}

/**
 * Check Claude Code version and prompt for update if needed
 *
 * @param skipPrompt - Whether to auto-update without user prompt (default: false)
 *
 * Behavior:
 * - Interactive mode (skipPrompt=false): Checks version and prompts user for confirmation
 * - Skip-prompt mode (skipPrompt=true): Checks version and auto-updates without prompting
 * - Gracefully handles errors without interrupting main flow
 */
export async function checkClaudeCodeVersionAndPrompt(
  skipPrompt: boolean = false,
): Promise<void> {
  try {
    // Check Claude Code version status
    const versionInfo = await checkClaudeCodeVersion()

    // Early return if no update is needed
    if (!versionInfo.needsUpdate) {
      return
    }

    // Lazy import to avoid circular dependencies and improve performance
    const { updateClaudeCode } = await import('./auto-updater')

    // Choose update strategy based on mode
    // In skip-prompt mode, don't force update, just skip user confirmation
    await updateClaudeCode(false, skipPrompt)
  }
  catch (error) {
    // Graceful error handling - log warning but don't interrupt main flow
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.warn(`Claude Code version check failed: ${errorMessage}`)
  }
}
