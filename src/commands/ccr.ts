import type { SupportedLang } from '../constants';
import { showCcrMenu } from '../utils/tools/ccr-menu';
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler';
import { readZcfConfigAsync } from '../utils/zcf-config';
import { selectScriptLanguage } from '../utils/prompts';
import { displayBannerWithInfo } from '../utils/banner';
import { showMainMenu } from './menu';

export interface CcrOptions {
  lang?: SupportedLang;
  skipBanner?: boolean;
}

export async function ccr(options: CcrOptions = {}) {
  try {
    // Display banner if not skipped
    if (!options.skipBanner) {
      displayBannerWithInfo();
    }
    
    // Get script language from config or ask user
    const zcfConfig = await readZcfConfigAsync();
    const scriptLang = options.lang || zcfConfig?.preferredLang || (await selectScriptLanguage());
    
    // Show CCR menu
    const continueInCcr = await showCcrMenu(scriptLang);
    
    // If user selected back (0) and not called from main menu, show main menu
    if (!continueInCcr && !options.skipBanner) {
      await showMainMenu();
    }
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error, options.lang);
    }
  }
}
