import prompts from '@posva/prompts';
import ansis from 'ansis';
import { version } from '../../package.json';
import { I18N } from '../constants';
import { displayBanner } from '../utils/banner';
import { 
  fullInitFeature,
  importWorkflowFeature,
  configureApiFeature,
  configureMcpFeature,
  configureDefaultModelFeature,
  configureAiMemoryFeature,
  clearZcfCacheFeature,
  changeScriptLanguageFeature
} from '../utils/features';
import { selectScriptLanguage } from '../utils/prompts';
import { readZcfConfig } from '../utils/zcf-config';

export async function showMainMenu() {
  try {
    // Display banner
    displayBanner();
    console.log(ansis.gray(`  Version: ${ansis.cyan(version)}  |  ${ansis.cyan('https://github.com/UfoMiao/zcf')}\n`));

    // Get script language
    const zcfConfig = readZcfConfig();
    let scriptLang = zcfConfig?.preferredLang || await selectScriptLanguage();
    
    // Menu loop
    let exitMenu = false;
    while (!exitMenu) {
      const i18n = I18N[scriptLang];
      
      // Display menu options
      console.log(ansis.cyan(i18n.selectFunction));
      console.log('');
      console.log(`  ${ansis.cyan('1.')} ${i18n.menuOptions.fullInit}`);
      console.log(`     ${ansis.gray(i18n.menuDescriptions.fullInit)}`);
      console.log('');
      console.log(`  ${ansis.cyan('2.')} ${i18n.menuOptions.importWorkflow}`);
      console.log(`     ${ansis.gray(i18n.menuDescriptions.importWorkflow)}`);
      console.log('');
      console.log(`  ${ansis.cyan('3.')} ${i18n.menuOptions.configureApi}`);
      console.log(`     ${ansis.gray(i18n.menuDescriptions.configureApi)}`);
      console.log('');
      console.log(`  ${ansis.cyan('4.')} ${i18n.menuOptions.configureMcp}`);
      console.log(`     ${ansis.gray(i18n.menuDescriptions.configureMcp)}`);
      console.log('');
      console.log(`  ${ansis.cyan('5.')} ${i18n.menuOptions.configureModel}`);
      console.log(`     ${ansis.gray(i18n.menuDescriptions.configureModel)}`);
      console.log('');
      console.log(`  ${ansis.cyan('6.')} ${i18n.menuOptions.configureAiMemory}`);
      console.log(`     ${ansis.gray(i18n.menuDescriptions.configureAiMemory)}`);
      console.log('');
      console.log(`  ${ansis.gray('-.')} ${ansis.gray(i18n.menuOptions.clearCache)}`);
      console.log(`     ${ansis.gray(i18n.menuDescriptions.clearCache)}`);
      console.log('');
      console.log(`  ${ansis.cyan('0.')} ${i18n.menuOptions.changeLanguage}`);
      console.log(`     ${ansis.gray(i18n.menuDescriptions.changeLanguage)}`);
      console.log('');
      console.log(`  ${ansis.red('q.')} ${ansis.red(i18n.menuOptions.exit)}`);
      console.log('');

      // Get user input
      const response = await prompts({
        type: 'text',
        name: 'choice',
        message: i18n.enterChoice || 'Enter your choice',
        validate: (value) => {
          const valid = ['1', '2', '3', '4', '5', '6', '-', '0', 'q', 'Q'];
          return valid.includes(value) || 'Invalid choice. Please enter a valid option.';
        }
      });

      if (!response.choice) {
        console.log(ansis.yellow(i18n.cancelled));
        exitMenu = true;
        break;
      }

      // Handle menu selection
      switch (response.choice.toLowerCase()) {
        case '1':
          await fullInitFeature(scriptLang);
          break;
        case '2':
          await importWorkflowFeature(scriptLang);
          break;
        case '3':
          await configureApiFeature(scriptLang);
          break;
        case '4':
          await configureMcpFeature(scriptLang);
          break;
        case '5':
          await configureDefaultModelFeature(scriptLang);
          break;
        case '6':
          await configureAiMemoryFeature(scriptLang);
          break;
        case '-':
          await clearZcfCacheFeature(scriptLang);
          break;
        case '0':
          scriptLang = await changeScriptLanguageFeature(scriptLang);
          break;
        case 'q':
          exitMenu = true;
          console.log(ansis.cyan(i18n.goodbye));
          break;
      }

      // Add spacing between operations
      if (!exitMenu && response.choice.toLowerCase() !== 'q') {
        console.log('\n' + ansis.dim('─'.repeat(50)) + '\n');
        
        // Ask if user wants to continue
        const continueResponse = await prompts({
          type: 'confirm',
          name: 'continue',
          message: i18n.returnToMenu,
          initial: true
        });

        if (!continueResponse.continue) {
          exitMenu = true;
          console.log(ansis.cyan(i18n.goodbye));
        }
      }
    }
  } catch (error) {
    const zcfConfig = readZcfConfig();
    const defaultLang = zcfConfig?.preferredLang || 'en';
    const errorMsg = I18N[defaultLang].error;
    console.error(ansis.red(`${errorMsg}:`), error);
    
    // Log error details for debugging
    if (error instanceof Error) {
      console.error(ansis.gray(`Stack: ${error.stack}`));
    }
    
    process.exit(1);
  }
}