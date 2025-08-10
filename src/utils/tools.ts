import inquirer from 'inquirer';
import ansis from 'ansis';
import { executeCcusage } from '../commands/ccu';
import { I18N } from '../constants';
import { getTranslation } from '../i18n';

/**
 * Validates and returns a valid language code
 * @param lang - Language code to validate
 * @returns Valid language code ('zh-CN' or 'en'), defaults to 'en'
 */
export function getValidLanguage(lang: any): 'zh-CN' | 'en' {
  return (lang && lang in I18N) ? lang : 'en';
}

export async function runCcusageFeature(scriptLang: 'zh-CN' | 'en'): Promise<void> {
  // Validate language and provide fallback to English
  const validLang = getValidLanguage(scriptLang);
  const i18n = getTranslation(validLang);
  
  console.log('');
  console.log(ansis.cyan(i18n.menu.menuOptions.ccusage));
  console.log(ansis.gray(`${i18n.tools.ccusageDescription} - https://github.com/ryoppippi/ccusage`));
  console.log('');
  
  const choices = [
    { name: i18n.tools.ccusageModes.daily, value: 'daily' },
    { name: i18n.tools.ccusageModes.monthly, value: 'monthly' },
    { name: i18n.tools.ccusageModes.session, value: 'session' },
    { name: i18n.tools.ccusageModes.blocks, value: 'blocks' },
    { name: i18n.tools.ccusageModes.custom, value: 'custom' },
    { name: i18n.common.back, value: 'back' },
  ];
  
  const { mode } = await inquirer.prompt<{ mode: string }>({
    type: 'list',
    name: 'mode',
    message: i18n.tools.selectAnalysisMode,
    choices,
  });
  
  if (mode === 'back') {
    return;
  }
  
  let args: string[] = [];
  
  if (mode === 'custom') {
    const { customArgs } = await inquirer.prompt<{ customArgs: string }>({
      type: 'input',
      name: 'customArgs',
      message: i18n.tools.enterCustomArgs,
      default: '',
    });
    
    // Handle various input types and parse arguments intelligently
    if (customArgs === null || customArgs === undefined || customArgs === '') {
      args = [];
    } else {
      // Convert to string if not already
      const argsString = String(customArgs).trim();
      
      if (!argsString) {
        args = [];
      } else {
        // Parse arguments while preserving quoted strings
        // This regex properly handles quoted strings with spaces
        const argPattern = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
        const matches = [];
        let match;
        
        while ((match = argPattern.exec(argsString)) !== null) {
          // match[1] is for double quotes, match[2] for single quotes, match[3] for unquoted
          const value = match[1] || match[2] || match[3];
          if (value) {
            matches.push(value);
          }
        }
        
        args = matches;
      }
    }
  } else {
    // Handle undefined or null mode - keep as is for test compatibility
    args = [mode];
  }
  
  console.log('');
  await executeCcusage(args);
  
  // Wait for user to continue
  console.log('');
  await inquirer.prompt({
    type: 'input',
    name: 'continue',
    message: ansis.gray(i18n.tools.pressEnterToContinue),
  });
}