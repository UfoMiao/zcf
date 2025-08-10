import ansis from 'ansis';
import type { SupportedLang } from '../constants';
import { I18N } from '../constants';
import { isCcrInstalled, installCcr } from '../utils/ccr/installer';
import { configureCcrFeature } from '../utils/ccr/config';
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler';

export interface CcrOptions {
  lang?: SupportedLang;
}

export async function ccr(options: CcrOptions = {}) {
  try {
    const scriptLang = options.lang || 'zh-CN';
    const i18n = I18N[scriptLang];
    
    console.log(ansis.cyan(`\n🚀 ${i18n.ccr.configureCcr}`));
    
    // Check if CCR is installed
    const ccrInstalled = await isCcrInstalled();
    if (!ccrInstalled) {
      console.log(ansis.yellow(`${i18n.ccr.installingCcr}`));
      await installCcr(scriptLang);
    } else {
      console.log(ansis.green(`✔ ${i18n.ccr.ccrAlreadyInstalled}`));
    }
    
    // Configure CCR (includes backup)
    await configureCcrFeature(scriptLang);
    
    console.log(ansis.green(`\n✔ ${i18n.ccr.ccrSetupComplete}`));
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error, options.lang);
    }
  }
}