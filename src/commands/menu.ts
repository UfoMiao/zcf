import inquirer from 'inquirer';
import ansis from 'ansis';
import { I18N } from '../constants';
import { displayBannerWithInfo } from '../utils/banner';
import {
  configureApiFeature,
  configureMcpFeature,
  configureDefaultModelFeature,
  configureAiMemoryFeature,
  configureEnvPermissionFeature,
  clearZcfCacheFeature,
  changeScriptLanguageFeature,
} from '../utils/features';
import { runCcusageFeature } from '../utils/tools';
import { init } from './init';
import { update } from './update';
import { selectScriptLanguage } from '../utils/prompts';
import { readZcfConfigAsync } from '../utils/zcf-config';
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler';

export async function showMainMenu() {
  try {
    // Display banner
    displayBannerWithInfo();

    // Get script language
    const zcfConfig = await readZcfConfigAsync();
    let scriptLang = zcfConfig?.preferredLang || (await selectScriptLanguage());

    // Menu loop
    let exitMenu = false;
    while (!exitMenu) {
      const i18n = I18N[scriptLang];

      // Display menu options
      console.log(ansis.cyan(i18n.selectFunction));
      console.log('  -------- Claude Code --------');
      console.log(
        `  ${ansis.cyan('1.')} ${i18n.menuOptions.fullInit} ${ansis.gray('- ' + i18n.menuDescriptions.fullInit)}`
      );
      console.log(
        `  ${ansis.cyan('2.')} ${i18n.menuOptions.importWorkflow} ${ansis.gray(
          '- ' + i18n.menuDescriptions.importWorkflow
        )}`
      );
      console.log(
        `  ${ansis.cyan('3.')} ${i18n.menuOptions.configureApiOrCcr} ${ansis.gray(
          '- ' + i18n.menuDescriptions.configureApiOrCcr
        )}`
      );
      console.log(
        `  ${ansis.cyan('4.')} ${i18n.menuOptions.configureMcp} ${ansis.gray(
          '- ' + i18n.menuDescriptions.configureMcp
        )}`
      );
      console.log(
        `  ${ansis.cyan('5.')} ${i18n.menuOptions.configureModel} ${ansis.gray(
          '- ' + i18n.menuDescriptions.configureModel
        )}`
      );
      console.log(
        `  ${ansis.cyan('6.')} ${i18n.menuOptions.configureAiMemory} ${ansis.gray(
          '- ' + i18n.menuDescriptions.configureAiMemory
        )}`
      );
      console.log(
        `  ${ansis.cyan('7.')} ${i18n.menuOptions.configureEnvPermission} ${ansis.gray(
          '- ' + i18n.menuDescriptions.configureEnvPermission
        )}`
      );
      console.log('');
      console.log(`  --------- ${i18n.menuSections.otherTools} ----------`);
      console.log(
        `  ${ansis.cyan('U.')} ${i18n.menuOptions.ccusage} ${ansis.gray('- ' + i18n.menuDescriptions.ccusage)}`
      );
      console.log('');
      console.log('  ------------ ZCF ------------');
      console.log(
        `  ${ansis.cyan('0.')} ${i18n.menuOptions.changeLanguage} ${ansis.gray(
          '- ' + i18n.menuDescriptions.changeLanguage
        )}`
      );
      console.log(
        `  ${ansis.cyan('-.')} ${i18n.menuOptions.clearCache} ${ansis.gray('- ' + i18n.menuDescriptions.clearCache)}`
      );
      console.log(`  ${ansis.red('Q.')} ${ansis.red(i18n.menuOptions.exit)}`);
      console.log('');

      // Get user input
      const { choice } = await inquirer.prompt<{ choice: string }>({
        type: 'input',
        name: 'choice',
        message: i18n.enterChoice,
        validate: (value) => {
          const valid = ['1', '2', '3', '4', '5', '6', '7', 'u', 'U', '0', '-', 'q', 'Q'];
          return valid.includes(value) || i18n.invalidChoice;
        },
      });

      if (!choice) {
        console.log(ansis.yellow(i18n.cancelled));
        exitMenu = true;
        break;
      }

      // Handle menu selection
      switch (choice.toLowerCase()) {
        case '1':
          await init({ lang: scriptLang, skipBanner: true });
          break;
        case '2':
          await update({ skipBanner: true });
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
        case '7':
          await configureEnvPermissionFeature(scriptLang);
          break;
        case 'u':
        case 'U':
          await runCcusageFeature(scriptLang);
          break;
        case '0':
          const newLang = await changeScriptLanguageFeature(scriptLang);
          if (newLang !== scriptLang) {
            scriptLang = newLang;
          }
          break;
        case '-':
          await clearZcfCacheFeature(scriptLang);
          break;
        case 'q':
          exitMenu = true;
          console.log(ansis.cyan(i18n.goodbye));
          break;
      }

      // Add spacing between operations
      if (!exitMenu && choice.toLowerCase() !== 'q') {
        // Skip confirmation for ZCF configuration options (0, -, u)
        if (choice === '0' || choice === '-' || choice.toLowerCase() === 'u') {
          console.log('\n' + ansis.dim('─'.repeat(50)) + '\n');
          continue; // Directly return to menu
        }

        console.log('\n' + ansis.dim('─'.repeat(50)) + '\n');

        // Ask if user wants to continue for other options
        const { continue: shouldContinue } = await inquirer.prompt<{ continue: boolean }>({
          type: 'confirm',
          name: 'continue',
          message: i18n.returnToMenu,
          default: true,
        });

        if (!shouldContinue) {
          exitMenu = true;
          console.log(ansis.cyan(i18n.goodbye));
        }
      }
    }
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error);
    }
  }
}
