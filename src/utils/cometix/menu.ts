import inquirer from 'inquirer';
import ansis from 'ansis';
import type { SupportedLang } from '../../constants';
import { getTranslation } from '../../i18n';
import { runCometixInstallOrUpdate, runCometixPrintConfig } from './commands';
import { handleExitPromptError, handleGeneralError } from '../error-handler';

export async function showCometixMenu(scriptLang: SupportedLang): Promise<boolean> {
  try {
    const i18n = getTranslation(scriptLang);
    
    // Display CCometixLine menu title
    console.log('\n' + ansis.cyan('═'.repeat(50)));
    console.log(ansis.bold.cyan(`  ${i18n.cometix.cometixMenuTitle}`));
    console.log(ansis.cyan('═'.repeat(50)) + '\n');
    
    // Display menu options
    console.log(`  ${ansis.cyan('1.')} ${i18n.cometix.cometixMenuOptions.installOrUpdate} ${ansis.gray('- ' + i18n.cometix.cometixMenuDescriptions.installOrUpdate)}`);
    console.log(`  ${ansis.cyan('2.')} ${i18n.cometix.cometixMenuOptions.printConfig} ${ansis.gray('- ' + i18n.cometix.cometixMenuDescriptions.printConfig)}`);
    console.log(`  ${ansis.yellow('0.')} ${i18n.cometix.cometixMenuOptions.back}`);
    console.log('');
    
    // Get user choice
    const { choice } = await inquirer.prompt<{ choice: string }>({
      type: 'input',
      name: 'choice',
      message: i18n.common.enterChoice,
      validate: (value) => {
        const valid = ['1', '2', '0'];
        return valid.includes(value) || i18n.common.invalidChoice;
      },
    });
    
    // Handle menu selection
    switch (choice) {
      case '1':
        await runCometixInstallOrUpdate(scriptLang);
        break;
        
      case '2':
        await runCometixPrintConfig(scriptLang);
        break;
        
      case '0':
        // Back to main menu
        return false;
    }
    
    // Ask if user wants to continue in CCometixLine menu
    if (choice !== '0') {
      console.log('\n' + ansis.dim('─'.repeat(50)) + '\n');
      const { continueInCometix } = await inquirer.prompt<{ continueInCometix: boolean }>({
        type: 'confirm',
        name: 'continueInCometix',
        message: i18n.common.returnToMenu,
        default: true,
      });
      
      if (continueInCometix) {
        return await showCometixMenu(scriptLang);
      }
    }
    
    return false;
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error, scriptLang);
    }
    return false;
  }
}