import process from 'node:process'
import ansis from 'ansis'
import { i18n } from '../i18n'
import { resolveCodeType } from '../utils/code-type-resolver'
import { ToolUpdateScheduler } from '../utils/tool-update-scheduler'

export interface CheckUpdatesOptions {
  lang?: string
  skipPrompt?: boolean
  codeType?: string
}

export async function checkUpdates(options: CheckUpdatesOptions = {}): Promise<void> {
  try {
    const skipPrompt = options.skipPrompt || false

    // Resolve code type using the new resolver
    const codeType = await resolveCodeType(options.codeType)

    // Use the new scheduler for updates
    const scheduler = new ToolUpdateScheduler()
    await scheduler.updateByCodeType(codeType, skipPrompt)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`${i18n.t('updater:errorCheckingUpdates')} ${errorMessage}`))
    process.exit(1)
  }
}
