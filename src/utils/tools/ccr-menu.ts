import inquirer from 'inquirer';
import ansis from 'ansis';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { SupportedLang } from '../../constants';
import { I18N } from '../../constants';
import { isCcrInstalled, installCcr } from '../ccr/installer';
import { configureCcrFeature, readCcrConfig } from '../ccr/config';
import {
  runCcrUi,
  runCcrStatus,
  runCcrRestart,
  runCcrStart,
  runCcrStop,
} from '../ccr/commands';
import { handleExitPromptError, handleGeneralError } from '../error-handler';

// Helper function to check if CCR is properly configured
function isCcrConfigured(): boolean {
  const CCR_CONFIG_FILE = join(homedir(), '.claude-code-router', 'config.json');
  if (!existsSync(CCR_CONFIG_FILE)) {
    return false;
  }
  
  const config = readCcrConfig();
  // Check if config has actual providers configured (not empty)
  return config !== null && config.Providers && config.Providers.length > 0;
}

export async function showCcrMenu(scriptLang: SupportedLang): Promise<boolean> {
  try {
    const i18n = I18N[scriptLang];
    
    // Display CCR menu title
    console.log('\n' + ansis.cyan('═'.repeat(50)));
    console.log(ansis.bold.cyan(`  ${i18n.ccr.ccrMenuTitle}`));
    console.log(ansis.cyan('═'.repeat(50)) + '\n');
    
    // Display menu options
    console.log(`  ${ansis.cyan('1.')} ${i18n.ccr.ccrMenuOptions.initCcr} ${ansis.gray('- ' + i18n.ccr.ccrMenuDescriptions.initCcr)}`);
    console.log(`  ${ansis.cyan('2.')} ${i18n.ccr.ccrMenuOptions.startUi} ${ansis.gray('- ' + i18n.ccr.ccrMenuDescriptions.startUi)}`);
    console.log(`  ${ansis.cyan('3.')} ${i18n.ccr.ccrMenuOptions.checkStatus} ${ansis.gray('- ' + i18n.ccr.ccrMenuDescriptions.checkStatus)}`);
    console.log(`  ${ansis.cyan('4.')} ${i18n.ccr.ccrMenuOptions.restart} ${ansis.gray('- ' + i18n.ccr.ccrMenuDescriptions.restart)}`);
    console.log(`  ${ansis.cyan('5.')} ${i18n.ccr.ccrMenuOptions.start} ${ansis.gray('- ' + i18n.ccr.ccrMenuDescriptions.start)}`);
    console.log(`  ${ansis.cyan('6.')} ${i18n.ccr.ccrMenuOptions.stop} ${ansis.gray('- ' + i18n.ccr.ccrMenuDescriptions.stop)}`);
    console.log(`  ${ansis.yellow('0.')} ${i18n.ccr.ccrMenuOptions.back}`);
    console.log('');
    
    // Get user choice
    const { choice } = await inquirer.prompt<{ choice: string }>({
      type: 'input',
      name: 'choice',
      message: i18n.common.enterChoice,
      validate: (value) => {
        const valid = ['1', '2', '3', '4', '5', '6', '0'];
        return valid.includes(value) || i18n.common.invalidChoice;
      },
    });
    
    // Handle menu selection
    switch (choice) {
      case '1':
        // Initialize CCR
        const ccrInstalled = await isCcrInstalled();
        if (!ccrInstalled) {
          console.log(ansis.yellow(`${i18n.ccr.installingCcr}`));
          await installCcr(scriptLang);
        } else {
          console.log(ansis.green(`✔ ${i18n.ccr.ccrAlreadyInstalled}`));
        }
        await configureCcrFeature(scriptLang);
        console.log(ansis.green(`\n✔ ${i18n.ccr.ccrSetupComplete}`));
        break;
        
      case '2':
        // Start CCR UI - Check if CCR is configured first
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`\n⚠️  ${i18n.ccr.ccrNotConfigured || 'CCR is not configured yet. Please initialize CCR first.'}`));
          console.log(ansis.cyan(`   ${i18n.ccr.pleaseInitFirst || 'Please select option 1 to initialize CCR.'}\n`));
        } else {
          // Get CCR config to show API key
          const config = readCcrConfig();
          await runCcrUi(scriptLang, config?.APIKEY);
        }
        break;
        
      case '3':
        // Check CCR Status - Check if CCR is configured first
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`\n⚠️  ${i18n.ccr.ccrNotConfigured || 'CCR is not configured yet. Please initialize CCR first.'}`));
          console.log(ansis.cyan(`   ${i18n.ccr.pleaseInitFirst || 'Please select option 1 to initialize CCR.'}\n`));
        } else {
          await runCcrStatus(scriptLang);
        }
        break;
        
      case '4':
        // Restart CCR - Check if CCR is configured first
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`\n⚠️  ${i18n.ccr.ccrNotConfigured || 'CCR is not configured yet. Please initialize CCR first.'}`));
          console.log(ansis.cyan(`   ${i18n.ccr.pleaseInitFirst || 'Please select option 1 to initialize CCR.'}\n`));
        } else {
          await runCcrRestart(scriptLang);
        }
        break;
        
      case '5':
        // Start CCR - Check if CCR is configured first
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`\n⚠️  ${i18n.ccr.ccrNotConfigured || 'CCR is not configured yet. Please initialize CCR first.'}`));
          console.log(ansis.cyan(`   ${i18n.ccr.pleaseInitFirst || 'Please select option 1 to initialize CCR.'}\n`));
        } else {
          await runCcrStart(scriptLang);
        }
        break;
        
      case '6':
        // Stop CCR - Check if CCR is configured first
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`\n⚠️  ${i18n.ccr.ccrNotConfigured || 'CCR is not configured yet. Please initialize CCR first.'}`));
          console.log(ansis.cyan(`   ${i18n.ccr.pleaseInitFirst || 'Please select option 1 to initialize CCR.'}\n`));
        } else {
          await runCcrStop(scriptLang);
        }
        break;
        
      case '0':
        // Back to main menu
        return false;
    }
    
    // Ask if user wants to continue in CCR menu
    if (choice !== '0') {
      console.log('\n' + ansis.dim('─'.repeat(50)) + '\n');
      const { continueInCcr } = await inquirer.prompt<{ continueInCcr: boolean }>({
        type: 'confirm',
        name: 'continueInCcr',
        message: i18n.common.returnToMenu || 'Return to CCR menu?',
        default: true,
      });
      
      if (continueInCcr) {
        return await showCcrMenu(scriptLang);
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