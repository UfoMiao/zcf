import { join, dirname } from 'pathe';
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import inquirer from 'inquirer';
import ansis from 'ansis';
import type { SupportedLang } from '../constants';
import { CLAUDE_DIR, I18N } from '../constants';
import { installBmadAgents } from './bmad-agents';

export type WorkflowType = 'featPlanUx' | 'sixStepsWorkflow' | 'bmadWorkflow';

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

  // Multi-select workflow types
  const { selectedWorkflows } = await inquirer.prompt<{ selectedWorkflows: WorkflowType[] }>({
    type: 'checkbox',
    name: 'selectedWorkflows',
    message: i18n.selectWorkflowType,
    choices: [
      {
        name: i18n.workflowOption.featPlanUx,
        value: 'featPlanUx',
        checked: true, // Default selected
      },
      {
        name: i18n.workflowOption.sixStepsWorkflow,
        value: 'sixStepsWorkflow',
        checked: false,
      },
      {
        name: i18n.workflowOption.bmadWorkflow,
        value: 'bmadWorkflow',
        checked: false,
      },
    ],
  });

  if (!selectedWorkflows || selectedWorkflows.length === 0) {
    console.log(ansis.yellow(i18n.cancelled));
    return;
  }

  // Ensure directories exist
  const agentsDir = join(CLAUDE_DIR, 'agents');
  const commandsDir = join(CLAUDE_DIR, 'commands');
  
  if (!existsSync(agentsDir)) {
    await mkdir(agentsDir, { recursive: true });
  }
  if (!existsSync(commandsDir)) {
    await mkdir(commandsDir, { recursive: true });
  }

  // Install selected workflows
  for (const workflow of selectedWorkflows) {
    switch (workflow) {
      case 'featPlanUx':
        await installFeatPlanUx(configLang, scriptLang);
        break;
      case 'sixStepsWorkflow':
        await installSixStepsWorkflow(configLang, scriptLang);
        break;
      case 'bmadWorkflow':
        await installBmadAgents(configLang, scriptLang);
        break;
    }
  }
}

async function installFeatPlanUx(configLang: SupportedLang, scriptLang: SupportedLang): Promise<void> {
  const i18n = I18N[scriptLang];
  const rootDir = getRootDir();
  const templateDir = join(rootDir, 'templates', configLang);
  
  console.log(ansis.cyan('\n📋 Installing Feature Planning and UX Design workflow...'));
  
  // Copy feat command
  const featSource = join(templateDir, 'commands', 'feat.md');
  const featDest = join(CLAUDE_DIR, 'commands', 'feat.md');
  if (existsSync(featSource)) {
    await copyFile(featSource, featDest);
    console.log(ansis.gray('  ✔ Installed feat command'));
  }
  
  // Copy planner agent
  const plannerSource = join(templateDir, 'agents', 'planner.md');
  const plannerDest = join(CLAUDE_DIR, 'agents', 'planner.md');
  if (existsSync(plannerSource)) {
    await copyFile(plannerSource, plannerDest);
    console.log(ansis.gray('  ✔ Installed planner agent'));
  }
  
  // Copy ui-ux-designer agent
  const uiuxSource = join(templateDir, 'agents', 'ui-ux-designer.md');
  const uiuxDest = join(CLAUDE_DIR, 'agents', 'ui-ux-designer.md');
  if (existsSync(uiuxSource)) {
    await copyFile(uiuxSource, uiuxDest);
    console.log(ansis.gray('  ✔ Installed ui-ux-designer agent'));
  }
  
  console.log(ansis.green('✔ Feature Planning and UX Design workflow installed'));
}

async function installSixStepsWorkflow(configLang: SupportedLang, scriptLang: SupportedLang): Promise<void> {
  const i18n = I18N[scriptLang];
  const rootDir = getRootDir();
  const templateDir = join(rootDir, 'templates', configLang);
  
  console.log(ansis.cyan('\n⚙️ Installing Six Steps Workflow...'));
  
  // Copy workflow command
  const workflowSource = join(templateDir, 'commands', 'workflow.md');
  const workflowDest = join(CLAUDE_DIR, 'commands', 'workflow.md');
  if (existsSync(workflowSource)) {
    await copyFile(workflowSource, workflowDest);
    console.log(ansis.gray('  ✔ Installed workflow command'));
  }
  
  console.log(ansis.green('✔ Six Steps Workflow installed'));
}