import ansis from 'ansis';
import { x } from 'tinyexec';
import { I18N, type SupportedLang } from '../constants';
import { readZcfConfigAsync } from '../utils/zcf-config';
import { getValidLanguage } from '../utils/tools';

export async function executeCcusage(args: string[] = []): Promise<void> {
  try {
    // Get user's preferred language with validation
    let lang: SupportedLang = 'en';
    try {
      const zcfConfig = await readZcfConfigAsync();
      const rawLang = zcfConfig?.preferredLang || 'en';
      lang = getValidLanguage(rawLang);
    } catch {
      // If config read fails, use default language
      lang = 'en';
    }
    const i18n = I18N[lang];
    
    // Construct the command with arguments
    const command = 'npx';
    const commandArgs = ['ccusage@latest', ...(args || [])];
    
    console.log(ansis.cyan(i18n.tools.runningCcusage));
    console.log(ansis.gray(`$ npx ccusage@latest ${(args || []).join(' ')}`));
    console.log('');
    
    // Execute ccusage with inherited stdio for real-time output
    await x(command, commandArgs, {
      nodeOptions: {
        stdio: 'inherit',
      },
    });
  } catch (error) {
    // Get user's preferred language for error messages with validation
    let lang: SupportedLang = 'en';
    try {
      const zcfConfig = await readZcfConfigAsync();
      const rawLang = zcfConfig?.preferredLang || 'en';
      lang = getValidLanguage(rawLang);
    } catch {
      // If config read fails in error handler, use default
      lang = 'en';
    }
    const i18n = I18N[lang];
    
    console.error(ansis.red(i18n.tools.ccusageFailed));
    console.error(ansis.yellow(i18n.tools.checkNetworkConnection));
    if (process.env.DEBUG) {
      console.error(ansis.gray(i18n.tools.errorDetails), error);
    }
    // Only exit in production, not during tests
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
}