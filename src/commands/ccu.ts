import process from 'node:process'
import ansis from 'ansis'
import { x } from 'tinyexec'
import { i18n } from '../i18n'

export async function executeCcusage(args: string[] = []): Promise<void> {
  try {
    // Construct the command with arguments
    const command = 'npx'
    const commandArgs = ['ccusage@latest', ...(args || [])]

    console.log(ansis.cyan(i18n.t('tools:runningCcusage')))
    console.log(ansis.gray(`$ npx ccusage@latest ${(args || []).join(' ')}`))
    console.log('')

    // Execute ccusage with inherited stdio for real-time output
    await x(command, commandArgs, {
      nodeOptions: {
        stdio: 'inherit',
      },
    })
  }
  catch (error) {
    console.error(ansis.red(i18n.t('tools:ccusageFailed')))
    console.error(ansis.yellow(i18n.t('tools:checkNetworkConnection')))
    if (process.env.DEBUG) {
      console.error(ansis.gray(i18n.t('tools:errorDetails')), error)
    }
    // Only exit in production, not during tests
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1)
    }
    throw error
  }
}
