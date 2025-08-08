import ansis from 'ansis';
import { existsSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'pathe';
import type { SupportedLang } from '../constants';
import { CLAUDE_DIR, I18N } from '../constants';

export interface BmadAgent {
  id: string;
  name: string;
  description: string;
}

const BMAD_AGENTS: BmadAgent[] = [
  {
    id: 'analyst',
    name: 'Business Analyst (Mary)',
    description: 'Market research, brainstorming, competitive analysis',
  },
  { id: 'pm', name: 'Product Manager (John)', description: 'PRDs, product strategy, feature prioritization' },
  {
    id: 'architect',
    name: 'Architect (Winston)',
    description: 'System design, architecture documents, technology selection',
  },
  { id: 'sm', name: 'Scrum Master (Bob)', description: 'Story creation, epic management, agile process' },
  { id: 'dev', name: 'Full Stack Developer (James)', description: 'Code implementation, debugging, refactoring' },
  { id: 'qa', name: 'QA Architect (Quinn)', description: 'Code review, test planning, quality assurance' },
  { id: 'po', name: 'Product Owner (Sarah)', description: 'Backlog management, story refinement, sprint planning' },
];

export async function installBmadAgents(configLang: SupportedLang, scriptLang: SupportedLang): Promise<boolean> {
  const i18n = I18N[scriptLang];

  console.log(ansis.cyan(`\n🏗️ ${i18n.installingBmadAgents}`));
  console.log(ansis.gray(`${i18n.installingAllBmadAgents}:\n`));

  // Auto-install all BMAD agents
  const selectedAgents = BMAD_AGENTS.map((agent) => agent.id);

  // Create agents directory
  const agentsDir = join(CLAUDE_DIR, 'agents');
  if (!existsSync(agentsDir)) {
    await mkdir(agentsDir, { recursive: true });
  }

  // Copy selected agent files
  const currentFilePath = fileURLToPath(import.meta.url);
  const distDir = dirname(dirname(currentFilePath));
  const rootDir = dirname(distDir);
  const templateDir = join(rootDir, 'templates', 'bmad-agents', configLang);

  for (const agentId of selectedAgents) {
    const sourcePath = join(templateDir, `${agentId}.md`);
    const destPath = join(agentsDir, `bmad-${agentId}.md`);

    if (existsSync(sourcePath)) {
      await copyFile(sourcePath, destPath);
      console.log(ansis.gray(`  ✔ ${i18n.installedBmadAgent}: ${agentId}`));
    }
  }

  // Copy bmad command
  const commandsDir = join(CLAUDE_DIR, 'commands');
  if (!existsSync(commandsDir)) {
    await mkdir(commandsDir, { recursive: true });
  }

  const workflowSource = join(rootDir, 'templates', configLang, 'commands', 'bmad.md');
  const workflowDest = join(commandsDir, 'bmad.md');

  if (existsSync(workflowSource)) {
    await copyFile(workflowSource, workflowDest);
    console.log(ansis.gray(`  ✔ ${i18n.installedBmadWorkflowCommand}`));
  }

  console.log(ansis.green(`\n✔ ${i18n.bmadAgentsInstallSuccess}: ${selectedAgents.length}`));
  return true;
}
