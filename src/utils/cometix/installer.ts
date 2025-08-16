import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import ansis from 'ansis';
import type { SupportedLang } from '../../constants';
import { getTranslation } from '../../i18n';
import { COMETIX_COMMANDS } from './common';

const execAsync = promisify(exec);

export async function isCometixLineInstalled(): Promise<boolean> {
  try {
    await execAsync(COMETIX_COMMANDS.CHECK_INSTALL);
    return true;
  } catch {
    return false;
  }
}

export async function installCometixLine(scriptLang: SupportedLang): Promise<void> {
  const i18n = getTranslation(scriptLang);
  
  // Check if already installed
  const isInstalled = await isCometixLineInstalled();
  if (isInstalled) {
    console.log(ansis.green(`✔ ${i18n.cometix.cometixAlreadyInstalled}`));
    return;
  }

  try {
    console.log(ansis.blue(`${i18n.cometix.installingCometix}`));
    await execAsync(COMETIX_COMMANDS.INSTALL);
    console.log(ansis.green(`✔ ${i18n.cometix.cometixInstallSuccess}`));
  } catch (error) {
    console.error(ansis.red(`✗ ${i18n.cometix.cometixInstallFailed}: ${error}`));
    throw error;
  }
}