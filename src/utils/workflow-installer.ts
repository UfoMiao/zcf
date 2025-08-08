import { join, dirname } from 'pathe';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import inquirer from 'inquirer';
import ansis from 'ansis';
import type { SupportedLang } from '../constants';
import { CLAUDE_DIR, I18N } from '../constants';
import { getOrderedWorkflows, getWorkflowConfig } from '../config/workflows';
import type { WorkflowType, WorkflowConfig, WorkflowInstallResult } from '../types/workflow';

function getRootDir(): string {
  const currentFilePath = fileURLToPath(import.meta.url);
  const distDir = dirname(dirname(currentFilePath));
  return dirname(distDir);
}

export async function selectAndInstallWorkflows(
  configLang: SupportedLang,
  scriptLang: SupportedLang
): Promise<void> {
  const i18n = I18N[scriptLang];
  const workflows = getOrderedWorkflows();

  // Build choices from configuration
  const choices = workflows.map(workflow => {
    const nameKey = workflow.id as keyof typeof i18n.workflowOption;
    const name = i18n.workflowOption[nameKey] || workflow.id;
    return {
      name,
      value: workflow.id,
      checked: workflow.defaultSelected,
    };
  });

  // Multi-select workflow types
  const { selectedWorkflows } = await inquirer.prompt<{ selectedWorkflows: WorkflowType[] }>({
    type: 'checkbox',
    name: 'selectedWorkflows',
    message: `${i18n.selectWorkflowType}${i18n.multiSelectHint}`,
    choices,
  });

  if (!selectedWorkflows || selectedWorkflows.length === 0) {
    console.log(ansis.yellow(i18n.cancelled));
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
  const i18n = I18N[scriptLang];
  const result: WorkflowInstallResult = {
    workflow: config.id,
    success: true,
    installedCommands: [],
    installedAgents: [],
    errors: [],
  };

  const workflowName = i18n.workflowOption[config.id as keyof typeof i18n.workflowOption] || config.id;
  console.log(ansis.cyan(`\n📦 ${i18n.installingWorkflow}: ${workflowName}...`));

  // Install commands to new structure
  const commandsDir = join(CLAUDE_DIR, 'commands', 'zcf');
  if (!existsSync(commandsDir)) {
    await mkdir(commandsDir, { recursive: true });
  }
  
  for (const commandFile of config.commands) {
    const commandSource = join(rootDir, 'templates', configLang, 'workflow', config.category, 'commands', commandFile);
    // Rename command files based on outputDir
    const destFileName = `${config.outputDir}.md`;
    const commandDest = join(commandsDir, destFileName);
    
    if (existsSync(commandSource)) {
      try {
        await copyFile(commandSource, commandDest);
        result.installedCommands.push(destFileName);
        console.log(ansis.gray(`  ✔ ${i18n.installedCommand}: zcf/${destFileName}`));
      } catch (error) {
        const errorMsg = `${i18n.failedToInstallCommand} ${commandFile}: ${error}`;
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
          console.log(ansis.gray(`  ✔ ${i18n.installedAgent}: zcf/${config.category}/${agent.filename}`));
        } catch (error) {
          const errorMsg = `${i18n.failedToInstallAgent} ${agent.filename}: ${error}`;
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
    console.log(ansis.green(`✔ ${workflowName} ${i18n.workflowInstallSuccess}`));
  } else {
    console.log(ansis.red(`✗ ${workflowName} ${i18n.workflowInstallError}`));
  }

  return result;
}

async function cleanupOldVersionFiles(scriptLang: SupportedLang): Promise<void> {
  const i18n = I18N[scriptLang];
  console.log(ansis.cyan(`\n🧹 ${i18n.cleaningOldFiles || 'Cleaning up old version files'}...`));
  
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
        console.log(ansis.gray(`  ✔ ${i18n.removedOldFile || 'Removed old file'}: ${file.replace(CLAUDE_DIR, '~/.claude')}`));
      } catch (error) {
        console.error(ansis.yellow(`  ⚠ ${i18n.failedToRemoveFile || 'Failed to remove'}: ${file.replace(CLAUDE_DIR, '~/.claude')}`));
      }
    }
  }
  
  // Clean up old agent files
  for (const file of oldAgentFiles) {
    if (existsSync(file)) {
      try {
        await rm(file, { force: true });
        console.log(ansis.gray(`  ✔ ${i18n.removedOldFile || 'Removed old file'}: ${file.replace(CLAUDE_DIR, '~/.claude')}`));
      } catch (error) {
        console.error(ansis.yellow(`  ⚠ ${i18n.failedToRemoveFile || 'Failed to remove'}: ${file.replace(CLAUDE_DIR, '~/.claude')}`));
      }
    }
  }
}

