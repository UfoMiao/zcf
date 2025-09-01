import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import ansis from 'ansis'
import { ensureI18nInitialized, i18n } from '../../i18n'

const execAsync = promisify(exec)

export async function runCcrUi(apiKey?: string): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.cyan(`\n🖥️  ${i18n.t('ccr:startingCcrUi')}`))

  // Show API key tip if available
  if (apiKey) {
    console.log(ansis.bold.green(`\n🔑 ${i18n.t('ccr:ccrUiApiKey') || 'CCR UI API Key'}: ${apiKey}`))
    console.log(ansis.gray(`   ${i18n.t('ccr:ccrUiApiKeyHint') || 'Use this API key to login to CCR UI'}\n`))
  }

  try {
    const { stdout, stderr } = await execAsync('ccr ui')
    if (stdout)
      console.log(stdout)
    if (stderr)
      console.error(ansis.yellow(stderr))
    console.log(ansis.green(`✔ ${i18n.t('ccr:ccrUiStarted')}`))
  }
  catch (error) {
    console.error(ansis.red(`✖ ${i18n.t('ccr:ccrCommandFailed')}: ${error instanceof Error ? error.message : String(error)}`))
    throw error
  }
}

export async function runCcrStatus(): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.cyan(`\n📊 ${i18n.t('ccr:checkingCcrStatus')}`))

  try {
    const { stdout, stderr } = await execAsync('ccr status')
    if (stdout) {
      console.log(`\n${ansis.bold(i18n.t('ccr:ccrStatusTitle'))}`)
      console.log(stdout)
    }
    if (stderr)
      console.error(ansis.yellow(stderr))
  }
  catch (error) {
    console.error(ansis.red(`✖ ${i18n.t('ccr:ccrCommandFailed')}: ${error instanceof Error ? error.message : String(error)}`))
    throw error
  }
}

export async function runCcrRestart(): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.cyan(`\n🔄 ${i18n.t('ccr:restartingCcr')}`))

  try {
    const { stdout, stderr } = await execAsync('ccr restart')
    if (stdout)
      console.log(stdout)
    if (stderr)
      console.error(ansis.yellow(stderr))
    console.log(ansis.green(`✔ ${i18n.t('ccr:ccrRestarted')}`))
  }
  catch (error) {
    console.error(ansis.red(`✖ ${i18n.t('ccr:ccrCommandFailed')}: ${error instanceof Error ? error.message : String(error)}`))
    throw error
  }
}

export async function runCcrStart(): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.cyan(`\n▶️  ${i18n.t('ccr:startingCcr')}`))

  try {
    const { stdout, stderr } = await execAsync('ccr start')
    if (stdout)
      console.log(stdout)
    if (stderr)
      console.error(ansis.yellow(stderr))
    console.log(ansis.green(`✔ ${i18n.t('ccr:ccrStarted')}`))
  }
  catch (error: any) {
    // CCR start command may return exit code 1 even when successful
    // Check if it's the expected output format (IP address and config loaded message)
    if (error.stdout && error.stdout.includes('Loaded JSON config from:')) {
      // This is normal CCR start behavior - show output and consider it successful
      console.log(error.stdout)
      if (error.stderr)
        console.error(ansis.yellow(error.stderr))
      console.log(ansis.green(`✔ ${i18n.t('ccr:ccrStarted')}`))
    }
    else {
      // This is a real error
      console.error(ansis.red(`✖ ${i18n.t('ccr:ccrCommandFailed')}: ${error instanceof Error ? error.message : String(error)}`))
      throw error
    }
  }
}

export async function runCcrStop(): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.cyan(`\n⏹️  ${i18n.t('ccr:stoppingCcr')}`))

  try {
    const { stdout, stderr } = await execAsync('ccr stop')
    if (stdout)
      console.log(stdout)
    if (stderr)
      console.error(ansis.yellow(stderr))
    console.log(ansis.green(`✔ ${i18n.t('ccr:ccrStopped')}`))
  }
  catch (error) {
    console.error(ansis.red(`✖ ${i18n.t('ccr:ccrCommandFailed')}: ${error instanceof Error ? error.message : String(error)}`))
    throw error
  }
}
