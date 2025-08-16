import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import ansis from 'ansis';
import type { SupportedLang } from '../../constants';
import { getTranslation } from '../../i18n';
import { COMETIX_COMMANDS, COMETIX_COMMAND_NAME } from './common';

const execAsync = promisify(exec);

export async function runCometixInstallOrUpdate(scriptLang: SupportedLang): Promise<void> {
  const i18n = getTranslation(scriptLang);
  
  try {
    console.log(ansis.blue(`${i18n.cometix.installingOrUpdating}`));
    await execAsync(COMETIX_COMMANDS.INSTALL);
    console.log(ansis.green(`✔ ${i18n.cometix.installUpdateSuccess}`));
  } catch (error) {
    console.error(ansis.red(`✗ ${i18n.cometix.installUpdateFailed}: ${error}`));
    throw error;
  }
}

export async function runCometixPrintConfig(scriptLang: SupportedLang): Promise<void> {
  const i18n = getTranslation(scriptLang);
  
  try {
    console.log(ansis.blue(`${i18n.cometix.printingConfig}`));
    const { stdout } = await execAsync(COMETIX_COMMANDS.PRINT_CONFIG);
    console.log(stdout);
  } catch (error) {
    if ((error as Error).message.includes(`command not found: ${COMETIX_COMMAND_NAME}`)) {
      console.error(ansis.red(`✗ ${i18n.cometix.commandNotFound}`));
    } else {
      console.error(ansis.red(`✗ ${i18n.cometix.printConfigFailed}: ${error}`));
    }
    throw error;
  }
}