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
import { runCcusageFeature, runCcrMenuFeature } from '../utils/tools';
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
      console.log(ansis.cyan(i18n.menu.selectFunction));
      console.log('  -------- Claude Code --------');
      console.log(
        `  ${ansis.cyan('1.')} ${i18n.menu.menuOptions.fullInit} ${ansis.gray('- ' + i18n.menu.menuDescriptions.fullInit)}`
      );
      console.log(
        `  ${ansis.cyan('2.')} ${i18n.menu.menuOptions.importWorkflow} ${ansis.gray(
          '- ' + i18n.menu.menuDescriptions.importWorkflow
        )}`
      );
      console.log(
        `  ${ansis.cyan('3.')} ${i18n.menu.menuOptions.configureApiOrCcr} ${ansis.gray(
          '- ' + i18n.menu.menuDescriptions.configureApiOrCcr
        )}`
      );
      console.log(
        `  ${ansis.cyan('4.')} ${i18n.menu.menuOptions.configureMcp} ${ansis.gray(
          '- ' + i18n.menu.menuDescriptions.configureMcp
        )}`
      );
      console.log(
        `  ${ansis.cyan('5.')} ${i18n.menu.menuOptions.configureModel} ${ansis.gray(
          '- ' + i18n.menu.menuDescriptions.configureModel
        )}`
      );
      console.log(
        `  ${ansis.cyan('6.')} ${i18n.menu.menuOptions.configureAiMemory} ${ansis.gray(
          '- ' + i18n.menu.menuDescriptions.configureAiMemory
        )}`
      );
      console.log(
        `  ${ansis.cyan('7.')} ${i18n.menu.menuOptions.configureEnvPermission} ${ansis.gray(
          '- ' + i18n.menu.menuDescriptions.configureEnvPermission
        )}`
      );
      console.log('');
      console.log(`  --------- ${i18n.menu.menuSections.otherTools} ----------`);
      console.log(
        `  ${ansis.cyan('R.')} ${i18n.menu.menuOptions.ccrManagement} ${ansis.gray('- ' + i18n.menu.menuDescriptions.ccrManagement)}`
      );
      console.log(
        `  ${ansis.cyan('U.')} ${i18n.menu.menuOptions.ccusage} ${ansis.gray('- ' + i18n.menu.menuDescriptions.ccusage)}`
      );
      console.log('');
      console.log('  ------------ ZCF ------------');
      console.log(
        `  ${ansis.cyan('0.')} ${i18n.menu.menuOptions.changeLanguage} ${ansis.gray(
          '- ' + i18n.menu.menuDescriptions.changeLanguage
        )}`
      );
      console.log(
        `  ${ansis.cyan('-.')} ${i18n.menu.menuOptions.clearCache} ${ansis.gray('- ' + i18n.menu.menuDescriptions.clearCache)}`
      );
      console.log(`  ${ansis.red('Q.')} ${ansis.red(i18n.menu.menuOptions.exit)}`);
      console.log('');

      // Get user input
      const { choice } = await inquirer.prompt<{ choice: string }>({
        type: 'input',
        name: 'choice',
        message: i18n.common.enterChoice,
        validate: (value) => {
          const valid = ['1', '2', '3', '4', '5', '6', '7', 'r', 'R', 'u', 'U', '0', '-', 'q', 'Q'];
          return valid.includes(value) || i18n.common.invalidChoice;
        },
      });

      if (!choice) {
        console.log(ansis.yellow(i18n.common.cancelled));
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
        case 'r':
        case 'R':
          await runCcrMenuFeature(scriptLang);
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
          console.log(ansis.cyan(i18n.common.goodbye));
          break;
      }

      // Add spacing between operations
      if (!exitMenu && choice.toLowerCase() !== 'q') {
        // Skip confirmation for ZCF configuration options (0, -, u, r)
        if (choice === '0' || choice === '-' || choice.toLowerCase() === 'u' || choice.toLowerCase() === 'r') {
          console.log('\n' + ansis.dim('─'.repeat(50)) + '\n');
          continue; // Directly return to menu
        }

        console.log('\n' + ansis.dim('─'.repeat(50)) + '\n');

        // Ask if user wants to continue for other options
        const { continue: shouldContinue } = await inquirer.prompt<{ continue: boolean }>({
          type: 'confirm',
          name: 'continue',
          message: i18n.common.returnToMenu,
          default: true,
        });

        if (!shouldContinue) {
          exitMenu = true;
          console.log(ansis.cyan(i18n.common.goodbye));
        }
      }
    }
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error);
    }
  }
}
