import { displayBannerWithInfo } from '../utils/banner'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { showCcrMenu } from '../utils/tools/ccr-menu'
import { showMainMenu } from './menu'

export interface CcrOptions {
  skipBanner?: boolean
}

export async function ccr(options: CcrOptions = {}): Promise<void> {
  try {
    // Display banner if not skipped
    if (!options.skipBanner) {
      displayBannerWithInfo()
    }

    // Show CCR menu
    const continueInCcr = await showCcrMenu()

    // If user selected back (0) and not called from main menu, show main menu
    if (!continueInCcr && !options.skipBanner) {
      await showMainMenu()
    }
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}
