import process from 'node:process'
import ansis from 'ansis'
import { i18n } from '../i18n'
import { checkAndUpdateTools } from '../utils/auto-updater'

export interface CheckUpdatesOptions {
  lang?: string
  skipPrompt?: boolean
}

export async function checkUpdates(options: CheckUpdatesOptions = {}): Promise<void> {
  try {
    const skipPrompt = options.skipPrompt || false
    await checkAndUpdateTools(skipPrompt)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`${i18n.t('updater:errorCheckingUpdates')} ${errorMessage}`))
    process.exit(1)
  }
}
