import { join, dirname } from 'pathe';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import inquirer from 'inquirer';
import ansis from 'ansis';
import type { SupportedLang } from '../constants';
import { getTranslation } from '../i18n';
import { CLAUDE_DIR } from '../constants';
import { getOrderedWorkflows, getWorkflowConfig } from '../config/workflows';
import type { WorkflowType, WorkflowConfig, WorkflowInstallResult } from '../types/workflow';

function getRootDir(): string {
  const currentFilePath = fileURLToPath(import.meta.url);
  const distDir = dirname(dirname(currentFilePath));
  return dirname(distDir);
}

export async function selectAndInstallWorkflows(
  configLang: SupportedLang,
  scriptLang: SupportedLang,
  preselectedWorkflows?: string[]
): Promise<void> {
  const i18n = getTranslation(scriptLang);
  const workflows = getOrderedWorkflows();

  // Build choices from configuration
  const choices = workflows.map(workflow => {
    const nameKey = workflow.id as keyof typeof i18n.workflow.workflowOption;
    const name = i18n.workflow.workflowOption[nameKey] || workflow.id;
    return {
      name,
      value: workflow.id,
      checked: workflow.defaultSelected,
    };
  });

  // Multi-select workflow types or use preselected
  let selectedWorkflows: WorkflowType[];
  
  if (preselectedWorkflows) {
    selectedWorkflows = preselectedWorkflows as WorkflowType[];
  } else {
    const response = await inquirer.prompt<{ selectedWorkflows: WorkflowType[] }>({
      type: 'checkbox',
      name: 'selectedWorkflows',
      message: `${i18n.workflow.selectWorkflowType}${i18n.common.multiSelectHint}`,
      choices,
    });
    selectedWorkflows = response.selectedWorkflows;
  }

  if (!selectedWorkflows || selectedWorkflows.length === 0) {
    console.log(ansis.yellow(i18n.common.cancelled));
    return;
  }

  // Clean up old version files before installation
  await cleanupOldVersionFiles(scriptLang);

  // Install selected workflows with their dependencies
  for (const workflowId of selectedWorkflows) {
    const config = getWorkflowConfig(workflowId);
    if (config) {
      await installWorkflowWithDependencies(config, configLang, scriptLang);
    }
  }
}

async function installWorkflowWithDependencies(
  config: WorkflowConfig,
  configLang: SupportedLang,
  scriptLang: SupportedLang
): Promise<WorkflowInstallResult> {
  const rootDir = getRootDir();
  const i18n = getTranslation(scriptLang);
  const result: WorkflowInstallResult = {
    workflow: config.id,
    success: true,
    installedCommands: [],
    installedAgents: [],
    errors: [],
  };

  const workflowName = i18n.workflow.workflowOption[config.id as keyof typeof i18n.workflow.workflowOption] || config.id;
  console.log(ansis.cyan(`\n📦 ${i18n.workflow.installingWorkflow}: ${workflowName}...`));

  // Install commands to new structure
  const commandsDir = join(CLAUDE_DIR, 'commands', 'zcf');
  if (!existsSync(commandsDir)) {
    await mkdir(commandsDir, { recursive: true });
  }
  
  for (const commandFile of config.commands) {
    const commandSource = join(rootDir, 'templates', configLang, 'workflow', config.category, 'commands', commandFile);
    // Keep original file names for all commands
    const destFileName = commandFile;
    const commandDest = join(commandsDir, destFileName);
    
    if (existsSync(commandSource)) {
      try {
        await copyFile(commandSource, commandDest);
        result.installedCommands.push(destFileName);
        console.log(ansis.gray(`  ✔ ${i18n.workflow.installedCommand}: zcf/${destFileName}`));
      } catch (error) {
        const errorMsg = `${i18n.workflow.failedToInstallCommand} ${commandFile}: ${error}`;
        result.errors?.push(errorMsg);
        console.error(ansis.red(`  ✗ ${errorMsg}`));
        result.success = false;
      }
    }
  }

  // Install agents if autoInstallAgents is true
  if (config.autoInstallAgents && config.agents.length > 0) {
    const agentsCategoryDir = join(CLAUDE_DIR, 'agents', 'zcf', config.category);
    if (!existsSync(agentsCategoryDir)) {
      await mkdir(agentsCategoryDir, { recursive: true });
    }
    
    for (const agent of config.agents) {
      const agentSource = join(rootDir, 'templates', configLang, 'workflow', config.category, 'agents', agent.filename);
      const agentDest = join(agentsCategoryDir, agent.filename);
      
      if (existsSync(agentSource)) {
        try {
          await copyFile(agentSource, agentDest);
          result.installedAgents.push(agent.filename);
          console.log(ansis.gray(`  ✔ ${i18n.workflow.installedAgent}: zcf/${config.category}/${agent.filename}`));
        } catch (error) {
          const errorMsg = `${i18n.workflow.failedToInstallAgent} ${agent.filename}: ${error}`;
          result.errors?.push(errorMsg);
          console.error(ansis.red(`  ✗ ${errorMsg}`));
          if (agent.required) {
            result.success = false;
          }
        }
      }
    }
  }

  if (result.success) {
    console.log(ansis.green(`✔ ${workflowName} ${i18n.workflow.workflowInstallSuccess}`));
    
    // Show special prompt for BMAD workflow
    if (config.id === 'bmadWorkflow') {
      console.log(ansis.cyan(`\n${i18n.workflow.bmadInitPrompt}`));
    }
  } else {
    console.log(ansis.red(`✗ ${workflowName} ${i18n.workflow.workflowInstallError}`));
  }

  return result;
}

async function cleanupOldVersionFiles(scriptLang: SupportedLang): Promise<void> {
  const i18n = getTranslation(scriptLang);
  console.log(ansis.cyan(`\n🧹 ${i18n.workflow.cleaningOldFiles || 'Cleaning up old version files'}...`));
  
  // Old command files to remove
  const oldCommandFiles = [
    join(CLAUDE_DIR, 'commands', 'workflow.md'),
    join(CLAUDE_DIR, 'commands', 'feat.md'),
  ];
  
  // Old agent files to remove
  const oldAgentFiles = [
    join(CLAUDE_DIR, 'agents', 'planner.md'),
    join(CLAUDE_DIR, 'agents', 'ui-ux-designer.md'),
  ];
  
  // Clean up old command files
  for (const file of oldCommandFiles) {
    if (existsSync(file)) {
      try {
        await rm(file, { force: true });
        console.log(ansis.gray(`  ✔ ${i18n.workflow.removedOldFile || 'Removed old file'}: ${file.replace(CLAUDE_DIR, '~/.claude')}`));
      } catch (error) {
        console.error(ansis.yellow(`  ⚠ ${i18n.workflow.failedToRemoveFile || 'Failed to remove'}: ${file.replace(CLAUDE_DIR, '~/.claude')}`));
      }
    }
  }
  
  // Clean up old agent files
  for (const file of oldAgentFiles) {
    if (existsSync(file)) {
      try {
        await rm(file, { force: true });
        console.log(ansis.gray(`  ✔ ${i18n.workflow.removedOldFile || 'Removed old file'}: ${file.replace(CLAUDE_DIR, '~/.claude')}`));
      } catch (error) {
        console.error(ansis.yellow(`  ⚠ ${i18n.workflow.failedToRemoveFile || 'Failed to remove'}: ${file.replace(CLAUDE_DIR, '~/.claude')}`));
      }
    }
  }
}

