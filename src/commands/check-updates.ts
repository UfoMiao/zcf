import type { CodeToolType } from '../constants'
import process from 'node:process'
import ansis from 'ansis'
import { DEFAULT_CODE_TOOL_TYPE } from '../constants'
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
    let codeType: CodeToolType
    try {
      codeType = await resolveCodeType(options.codeType)
    }
    catch (err) {
      // If invalid, default to a safe value
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(ansis.red(`${errorMessage}\n${i18n.t('errors:defaultingCodeTool', {
        tool: DEFAULT_CODE_TOOL_TYPE,
      })}`))
      codeType = DEFAULT_CODE_TOOL_TYPE
    }

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
