import type { Buffer } from 'node:buffer'
import { exec, spawn } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'
import ansis from 'ansis'
import ora from 'ora'
import { ensureI18nInitialized, format, i18n } from '../i18n'
import { promptBoolean } from './toggle-prompt'
import { checkCcrVersion, checkClaudeCodeVersion, checkCometixLineVersion } from './version-checker'

const execAsync = promisify(exec)

/**
 * Get Claude Code installation method using simplified detection logic
 * @returns 'native' if native installation, 'npm' if npm installation, null if cannot determine
 */
async function getClaudeCodeInstallMethod(): Promise<'native' | 'npm' | null> {
  // Strategy 1: Try claude doctor with proper input handling and environment
  try {
    console.log(ansis.dim('Detecting installation method using claude doctor...'))

    // Use child_process.spawn to handle interactive input properly

    return new Promise((resolve) => {
      const claudeDoctor = spawn('claude', ['doctor'], {
        env: {
          ...process.env,
          NO_COLOR: '1',
          // Remove CI: 'true' to allow proper interactive mode
        },
        stdio: ['pipe', 'pipe', 'pipe'], // Explicitly set stdio to handle pipes properly
      })

      let stdout = ''
      let stderr = ''

      claudeDoctor.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      claudeDoctor.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      claudeDoctor.on('close', (_code: number) => {
        const combinedOutput = stdout + stderr

        // Look for "Config install method" in the output
        const installMethodMatch = combinedOutput.match(/Config install method:\s*(.+)/i)
        if (installMethodMatch && installMethodMatch[1]) {
          const method = installMethodMatch[1].trim().toLowerCase()
          if (method.includes('native')) {
            console.log(ansis.dim(`Detected installation method: ${method}`))
            resolve('native')
            return
          }
          else if (method.includes('npm')) {
            console.log(ansis.dim(`Detected installation method: ${method}`))
            resolve('npm')
            return
          }
        }

        // Fallback: check "Currently running" field
        const currentlyRunningMatch = combinedOutput.match(/Currently running:\s*(.+)/i)
        if (currentlyRunningMatch && currentlyRunningMatch[1]) {
          const runningInfo = currentlyRunningMatch[1].trim().toLowerCase()
          if (runningInfo.includes('native')) {
            console.log(ansis.dim(`Detected from Currently running: native`))
            resolve('native')
            return
          }
          else if (runningInfo.includes('npm')) {
            console.log(ansis.dim(`Detected from Currently running: npm`))
            resolve('npm')
            return
          }
        }

        // Check if we got useful output despite raw mode errors
        if (combinedOutput.includes('Config install method')
          || combinedOutput.includes('Currently running')
          || combinedOutput.includes('Installation')) {
          console.log(ansis.dim('Got partial claude doctor output, using path detection...'))
        }
        else {
          console.log(ansis.dim('claude doctor failed (likely due to terminal limitations), using path detection...'))
        }
        resolve(null)
      })

      claudeDoctor.on('error', () => {
        // More specific error handling
        console.log(ansis.dim('claude doctor failed, using path detection...'))
        resolve(null)
      })

      // Send Enter key after 5 seconds to allow complete information collection
      setTimeout(() => {
        claudeDoctor.stdin?.write('\n')
      }, 5000)

      // Timeout fallback - increased from 10s to 15s for slower systems
      setTimeout(() => {
        if (!claudeDoctor.killed) {
          claudeDoctor.kill()
          console.log(ansis.dim('claude doctor timed out, using path detection...'))
          resolve(null)
        }
      }, 15000)
    })
  }
  catch {
    console.log(ansis.dim('claude doctor failed, using path detection...'))
  }

  // Strategy 2: Path-based detection as fallback
  try {
    const { stdout: whichOutput } = await process.platform === 'win32'
      ? await execAsync('where claude', { timeout: 5000 })
      : await execAsync('which claude', { timeout: 5000 })

    const claudePath = whichOutput.trim().split('\n')[0]
    console.log(ansis.dim(`Detected Claude Code path: ${claudePath}`))

    // Check for native installation paths
    if (claudePath.includes('.local/bin')
      || claudePath.includes('.claude')
      || claudePath.includes('AppData')
      || claudePath.includes('Applications')
      || claudePath.includes('Program Files')
      || claudePath.includes('ProgramData')
      || claudePath.endsWith('.exe')) {
      console.log(ansis.dim('Path indicates native installation'))
      return 'native'
    }

    // Check for npm installation paths
    if (claudePath.includes('node_modules')
      || claudePath.includes('npm')
      || claudePath.includes('pnpm')
      || claudePath.includes('yarn')) {
      console.log(ansis.dim('Path indicates npm installation'))
      return 'npm'
    }
  }
  catch {
    console.log(ansis.dim('Path detection failed'))
  }

  // Strategy 3: Check npm global packages
  try {
    const { stdout: npmList } = await execAsync('npm list -g @anthropic-ai/claude-code', { timeout: 5000 })
    if (npmList.includes('@anthropic-ai/claude-code')) {
      console.log(ansis.dim('Detected npm global installation'))
      return 'npm'
    }
  }
  catch {
    // npm check failed
  }

  // Strategy 4: Default assumption based on platform
  if (process.platform === 'win32') {
    console.log(ansis.dim('Defaulting to native installation on Windows'))
    return 'native'
  }

  console.log(ansis.dim('Unable to determine installation method'))
  return null
}

export async function updateCcr(force = false, skipPrompt = false): Promise<boolean> {
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

    // Handle confirmation based on skipPrompt mode
    if (!skipPrompt) {
      // Interactive mode: Ask for confirmation
      const confirm = await promptBoolean({
        message: format(i18n.t('updater:confirmUpdate'), { tool: 'CCR' }),
        defaultValue: true,
      })

      if (!confirm) {
        console.log(ansis.gray(i18n.t('updater:updateSkipped')))
        return true
      }
    }
    else {
      // Skip-prompt mode: Auto-update with notification
      console.log(ansis.cyan(format(i18n.t('updater:autoUpdating'), { tool: 'CCR' })))
    }

    // Perform update
    const updateSpinner = ora(format(i18n.t('updater:updating'), { tool: 'CCR' })).start()

    try {
      // Update the package
      await execAsync('npm update -g @musistudio/claude-code-router', { timeout: 60000 }) // 1 minute timeout for npm update

      // Wait a moment for the update to fully complete
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Verify the update was successful
      updateSpinner.text = 'Verifying update...'
      const { currentVersion: newVersion } = await checkCcrVersion()

      if (newVersion && newVersion !== currentVersion) {
        updateSpinner.succeed(format(i18n.t('updater:updateSuccess'), { tool: 'CCR' }))
        console.log(ansis.green(`  Updated from v${currentVersion} to v${newVersion}`))
        return true
      }
      else {
        updateSpinner.warn(format(i18n.t('updater:updateVerifyFailed'), { tool: 'CCR' }))
        if (newVersion === currentVersion) {
          console.log(ansis.yellow(`  Version unchanged: v${currentVersion}`))
        }
        else {
          console.log(ansis.yellow(`  Unable to verify new version`))
        }
        return false
      }
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

export async function updateClaudeCode(force = false, skipPrompt = false): Promise<boolean> {
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

    // Handle confirmation based on skipPrompt mode
    if (!skipPrompt) {
      // Interactive mode: Ask for confirmation
      const confirm = await promptBoolean({
        message: format(i18n.t('updater:confirmUpdate'), { tool: 'Claude Code' }),
        defaultValue: true,
      })

      if (!confirm) {
        console.log(ansis.gray(i18n.t('updater:updateSkipped')))
        return true
      }
    }
    else {
      // Skip-prompt mode: Auto-update with notification
      console.log(ansis.cyan(format(i18n.t('updater:autoUpdating'), { tool: 'Claude Code' })))
    }

    // Check installation method
    console.log(ansis.dim(i18n.t('updater:detectingInstallMethod')))
    const installMethod = await getClaudeCodeInstallMethod()

    if (installMethod) {
      console.log(ansis.dim(format(i18n.t('updater:installMethodDetected'), { method: installMethod })))
    }
    else {
      console.log(ansis.yellow(i18n.t('updater:installMethodUnknown')))
    }

    // Perform update
    const updateSpinner = ora(format(i18n.t('updater:updating'), { tool: 'Claude Code' })).start()

    try {
      if (installMethod === 'native') {
        // Use native update command for native installation
        console.log(ansis.dim(i18n.t('updater:usingNativeUpdate')))
        await execAsync('claude update', { timeout: 120000 }) // 2 minutes timeout for native update

        // Wait a moment for the update to fully complete
        await new Promise(resolve => setTimeout(resolve, 3000))

        // Verify the update was successful
        updateSpinner.text = 'Verifying update...'
        const { currentVersion: newVersion } = await checkClaudeCodeVersion()

        if (newVersion && newVersion !== currentVersion) {
          updateSpinner.succeed(format(i18n.t('updater:updateSuccess'), { tool: 'Claude Code' }))
          console.log(ansis.green(`  Updated from v${currentVersion} to v${newVersion}`))
          return true
        }
        else {
          updateSpinner.warn(format(i18n.t('updater:updateVerifyFailed'), { tool: 'Claude Code' }))
          if (newVersion === currentVersion) {
            console.log(ansis.yellow(`  Version unchanged: v${currentVersion}`))
          }
          else {
            console.log(ansis.yellow(`  Unable to verify new version`))
          }
          return false
        }
      }
      else {
        // Use npm update for npm installation (default behavior)
        console.log(ansis.dim(i18n.t('updater:usingNpmUpdate')))
        await execAsync('npm update -g @anthropic-ai/claude-code', { timeout: 60000 }) // 1 minute timeout for npm update

        // Wait a moment for the update to fully complete
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Verify the update was successful
        updateSpinner.text = 'Verifying update...'
        const { currentVersion: newVersion } = await checkClaudeCodeVersion()

        if (newVersion && newVersion !== currentVersion) {
          updateSpinner.succeed(format(i18n.t('updater:updateSuccess'), { tool: 'Claude Code' }))
          console.log(ansis.green(`  Updated from v${currentVersion} to v${newVersion}`))
          return true
        }
        else {
          updateSpinner.warn(format(i18n.t('updater:updateVerifyFailed'), { tool: 'Claude Code' }))
          if (newVersion === currentVersion) {
            console.log(ansis.yellow(`  Version unchanged: v${currentVersion}`))
          }
          else {
            console.log(ansis.yellow(`  Unable to verify new version`))
          }
          return false
        }
      }
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

export async function updateCometixLine(force = false, skipPrompt = false): Promise<boolean> {
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

    // Handle confirmation based on skipPrompt mode
    if (!skipPrompt) {
      // Interactive mode: Ask for confirmation
      const confirm = await promptBoolean({
        message: format(i18n.t('updater:confirmUpdate'), { tool: 'CCometixLine' }),
        defaultValue: true,
      })

      if (!confirm) {
        console.log(ansis.gray(i18n.t('updater:updateSkipped')))
        return true
      }
    }
    else {
      // Skip-prompt mode: Auto-update with notification
      console.log(ansis.cyan(format(i18n.t('updater:autoUpdating'), { tool: 'CCometixLine' })))
    }

    // Perform update
    const updateSpinner = ora(format(i18n.t('updater:updating'), { tool: 'CCometixLine' })).start()

    try {
      // Update the package
      await execAsync('npm update -g @cometix/ccline', { timeout: 60000 }) // 1 minute timeout for npm update

      // Wait a moment for the update to fully complete
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Verify the update was successful
      updateSpinner.text = 'Verifying update...'
      const { currentVersion: newVersion } = await checkCometixLineVersion()

      if (newVersion && newVersion !== currentVersion) {
        updateSpinner.succeed(format(i18n.t('updater:updateSuccess'), { tool: 'CCometixLine' }))
        console.log(ansis.green(`  Updated from v${currentVersion} to v${newVersion}`))
        return true
      }
      else {
        updateSpinner.warn(format(i18n.t('updater:updateVerifyFailed'), { tool: 'CCometixLine' }))
        if (newVersion === currentVersion) {
          console.log(ansis.yellow(`  Version unchanged: v${currentVersion}`))
        }
        else {
          console.log(ansis.yellow(`  Unable to verify new version`))
        }
        return false
      }
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

export async function checkAndUpdateTools(skipPrompt = false): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.bold.cyan(`\n🔍 ${i18n.t('updater:checkingTools')}\n`))

  const results: Array<{ tool: string, success: boolean, error?: string }> = []

  // Check and update CCR with error handling
  try {
    const success = await updateCcr(false, skipPrompt)
    results.push({ tool: 'CCR', success })
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`❌ ${format(i18n.t('updater:updateFailed'), { tool: 'CCR' })}: ${errorMessage}`))
    results.push({ tool: 'CCR', success: false, error: errorMessage })
  }

  console.log() // Empty line

  // Check and update Claude Code with error handling
  try {
    const success = await updateClaudeCode(false, skipPrompt)
    results.push({ tool: 'Claude Code', success })
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`❌ ${format(i18n.t('updater:updateFailed'), { tool: 'Claude Code' })}: ${errorMessage}`))
    results.push({ tool: 'Claude Code', success: false, error: errorMessage })
  }

  console.log() // Empty line

  // Check and update CCometixLine with error handling
  try {
    const success = await updateCometixLine(false, skipPrompt)
    results.push({ tool: 'CCometixLine', success })
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`❌ ${format(i18n.t('updater:updateFailed'), { tool: 'CCometixLine' })}: ${errorMessage}`))
    results.push({ tool: 'CCometixLine', success: false, error: errorMessage })
  }

  // Summary report
  if (skipPrompt) {
    console.log(ansis.bold.cyan(`\n📋 ${i18n.t('updater:updateSummary')}`))
    for (const result of results) {
      if (result.success) {
        console.log(ansis.green(`✔ ${result.tool}: ${i18n.t('updater:success')}`))
      }
      else {
        console.log(ansis.red(`❌ ${result.tool}: ${i18n.t('updater:failed')} ${result.error ? `(${result.error})` : ''}`))
      }
    }
  }
}
