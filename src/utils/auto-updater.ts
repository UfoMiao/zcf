import { exec } from 'child_process';
import { promisify } from 'util';
import ansis from 'ansis';
import ora from 'ora';
import inquirer from 'inquirer';
import type { SupportedLang } from '../constants';
import { getTranslation } from '../i18n';
import { format } from './i18n';
import { checkCcrVersion, checkClaudeCodeVersion, checkCometixLineVersion } from './version-checker';

const execAsync = promisify(exec);

export async function updateCcr(scriptLang: SupportedLang, force = false): Promise<boolean> {
  const i18n = getTranslation(scriptLang);
  const spinner = ora(i18n.updater.checkingVersion).start();
  
  try {
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkCcrVersion();
    spinner.stop();
    
    if (!installed) {
      console.log(ansis.yellow(i18n.updater.ccrNotInstalled));
      return false;
    }
    
    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.updater.ccrUpToDate, { version: currentVersion || '' })));
      return true;
    }
    
    if (!latestVersion) {
      console.log(ansis.yellow(i18n.updater.cannotCheckVersion));
      return false;
    }
    
    // Show version info
    console.log(ansis.cyan(format(i18n.updater.currentVersion, { version: currentVersion || '' })));
    console.log(ansis.cyan(format(i18n.updater.latestVersion, { version: latestVersion })));
    
    // Ask for confirmation
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: format(i18n.updater.confirmUpdate, { tool: 'CCR' }),
      default: true
    });
    
    if (!confirm) {
      console.log(ansis.gray(i18n.updater.updateSkipped));
      return true;
    }
    
    // Perform update
    const updateSpinner = ora(format(i18n.updater.updating, { tool: 'CCR' })).start();
    
    try {
      // Update the package
      await execAsync('npm update -g @musistudio/claude-code-router');
      updateSpinner.succeed(format(i18n.updater.updateSuccess, { tool: 'CCR' }));
      return true;
    } catch (error) {
      updateSpinner.fail(format(i18n.updater.updateFailed, { tool: 'CCR' }));
      console.error(ansis.red(error instanceof Error ? error.message : String(error)));
      return false;
    }
  } catch (error) {
    spinner.fail(i18n.updater.checkFailed);
    console.error(ansis.red(error instanceof Error ? error.message : String(error)));
    return false;
  }
}

export async function updateClaudeCode(scriptLang: SupportedLang, force = false): Promise<boolean> {
  const i18n = getTranslation(scriptLang);
  const spinner = ora(i18n.updater.checkingVersion).start();
  
  try {
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkClaudeCodeVersion();
    spinner.stop();
    
    if (!installed) {
      console.log(ansis.yellow(i18n.updater.claudeCodeNotInstalled));
      return false;
    }
    
    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.updater.claudeCodeUpToDate, { version: currentVersion || '' })));
      return true;
    }
    
    if (!latestVersion) {
      console.log(ansis.yellow(i18n.updater.cannotCheckVersion));
      return false;
    }
    
    // Show version info
    console.log(ansis.cyan(format(i18n.updater.currentVersion, { version: currentVersion || '' })));
    console.log(ansis.cyan(format(i18n.updater.latestVersion, { version: latestVersion })));
    
    // Ask for confirmation
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: format(i18n.updater.confirmUpdate, { tool: 'Claude Code' }),
      default: true
    });
    
    if (!confirm) {
      console.log(ansis.gray(i18n.updater.updateSkipped));
      return true;
    }
    
    // Perform update
    const updateSpinner = ora(format(i18n.updater.updating, { tool: 'Claude Code' })).start();
    
    try {
      await execAsync('npm update -g @anthropic-ai/claude-code');
      updateSpinner.succeed(format(i18n.updater.updateSuccess, { tool: 'Claude Code' }));
      return true;
    } catch (error) {
      updateSpinner.fail(format(i18n.updater.updateFailed, { tool: 'Claude Code' }));
      console.error(ansis.red(error instanceof Error ? error.message : String(error)));
      return false;
    }
  } catch (error) {
    spinner.fail(i18n.updater.checkFailed);
    console.error(ansis.red(error instanceof Error ? error.message : String(error)));
    return false;
  }
}

export async function updateCometixLine(scriptLang: SupportedLang, force = false): Promise<boolean> {
  const i18n = getTranslation(scriptLang);
  const spinner = ora(i18n.updater.checkingVersion).start();
  
  try {
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkCometixLineVersion();
    spinner.stop();
    
    if (!installed) {
      console.log(ansis.yellow(i18n.updater.cometixLineNotInstalled));
      return false;
    }
    
    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.updater.cometixLineUpToDate, { version: currentVersion || '' })));
      return true;
    }
    
    if (!latestVersion) {
      console.log(ansis.yellow(i18n.updater.cannotCheckVersion));
      return false;
    }
    
    // Show version info
    console.log(ansis.cyan(format(i18n.updater.currentVersion, { version: currentVersion || '' })));
    console.log(ansis.cyan(format(i18n.updater.latestVersion, { version: latestVersion })));
    
    // Ask for confirmation
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: format(i18n.updater.confirmUpdate, { tool: 'CCometixLine' }),
      default: true
    });
    
    if (!confirm) {
      console.log(ansis.gray(i18n.updater.updateSkipped));
      return true;
    }
    
    // Perform update
    const updateSpinner = ora(format(i18n.updater.updating, { tool: 'CCometixLine' })).start();
    
    try {
      // Update the package
      await execAsync('cargo install ccometix');
      updateSpinner.succeed(format(i18n.updater.updateSuccess, { tool: 'CCometixLine' }));
      return true;
    } catch (error) {
      updateSpinner.fail(format(i18n.updater.updateFailed, { tool: 'CCometixLine' }));
      console.error(ansis.red(error instanceof Error ? error.message : String(error)));
      return false;
    }
  } catch (error) {
    spinner.fail(i18n.updater.checkFailed);
    console.error(ansis.red(error instanceof Error ? error.message : String(error)));
    return false;
  }
}

export async function checkAndUpdateTools(scriptLang: SupportedLang): Promise<void> {
  const i18n = getTranslation(scriptLang);
  console.log(ansis.bold.cyan(`\n🔍 ${i18n.updater.checkingTools}\n`));
  
  // Check and update CCR
  await updateCcr(scriptLang);
  
  console.log(); // Empty line
  
  // Check and update Claude Code
  await updateClaudeCode(scriptLang);
  
  console.log(); // Empty line
  
  // Check and update CCometixLine
  await updateCometixLine(scriptLang);
}