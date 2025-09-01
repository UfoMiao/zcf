import { exec, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import ansis from 'ansis'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { COMETIX_COMMAND_NAME, COMETIX_COMMANDS } from './common'

const execAsync = promisify(exec)

export async function runCometixPrintConfig(): Promise<void> {
  ensureI18nInitialized()

  try {
    console.log(ansis.blue(`${i18n.t('cometix:printingConfig')}`))
    const { stdout } = await execAsync(COMETIX_COMMANDS.PRINT_CONFIG)
    console.log(stdout)
  }
  catch (error) {
    if ((error as Error).message.includes(`command not found: ${COMETIX_COMMAND_NAME}`)) {
      console.error(ansis.red(`✗ ${i18n.t('cometix:commandNotFound')}`))
    }
    else {
      console.error(ansis.red(`✗ ${i18n.t('cometix:printConfigFailed')}: ${error}`))
    }
    throw error
  }
}

export async function runCometixTuiConfig(): Promise<void> {
  ensureI18nInitialized()

  return new Promise((resolve, reject) => {
    console.log(ansis.blue(`${i18n.t('cometix:enteringTuiConfig')}`))

    // Use spawn with inherited stdio for proper TUI interaction
    const child = spawn(COMETIX_COMMAND_NAME, ['-c'], {
      stdio: 'inherit', // This allows the TUI to interact directly with the terminal
      shell: true,
    })

    child.on('close', (code) => {
      if (code === 0) {
        console.log(ansis.green(`✓ ${i18n.t('cometix:tuiConfigSuccess')}`))
        resolve()
      }
      else {
        const error = new Error(`${COMETIX_COMMAND_NAME} -c exited with code ${code}`)
        console.error(ansis.red(`✗ ${i18n.t('cometix:tuiConfigFailed')}: ${error.message}`))
        reject(error)
      }
    })

    child.on('error', (error) => {
      if (error.message.includes(`command not found`) || error.message.includes('ENOENT')) {
        console.error(ansis.red(`✗ ${i18n.t('cometix:commandNotFound')}`))
      }
      else {
        console.error(ansis.red(`✗ ${i18n.t('cometix:tuiConfigFailed')}: ${error.message}`))
      }
      reject(error)
    })
  })
}
