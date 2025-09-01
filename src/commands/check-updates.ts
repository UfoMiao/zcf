import process from 'node:process'
import ansis from 'ansis'
import { i18n } from '../i18n'
import { checkAndUpdateTools } from '../utils/auto-updater'

export async function checkUpdates(): Promise<void> {
  try {
    await checkAndUpdateTools()
  }
  catch (error) {
    console.error(ansis.red(i18n.t('updater:errorCheckingUpdates')), error)
    process.exit(1)
  }
}
