import type { CodeToolType } from '../constants'
import { exec } from 'tinyexec'
import { CODE_TOOL_DEFINITIONS, getCodeToolDefinition } from '../code-tools/definitions'

/**
 * Maps ZCF code tool types to skills CLI agent identifiers.
 * claude-code includes `universal` so non-interactive `-y` installs use symlink mode
 * (canonical `~/.agents/skills/` + symlink in `~/.claude/skills/`).
 */
export function getSkillsAgentsForCodeTool(codeTool: CodeToolType): readonly string[] {
  return getCodeToolDefinition(codeTool).skillsAgents
}

export const CODE_TOOL_TO_SKILLS_AGENTS = Object.fromEntries(
  CODE_TOOL_DEFINITIONS.map(definition => [definition.id, [...definition.skillsAgents]]),
) as Record<CodeToolType, string[]>

export interface SkillsInstallOptions {
  skillsPath: string
  skillNames: string[]
  agent: CodeToolType
  global?: boolean
}

export interface SkillsInstallResult {
  success: boolean
  installedSkills: string[]
  errors: string[]
}

/**
 * Install skills via the open skills CLI (`npx -y skills add`).
 * Thin wrapper aligned with CodeToolRegistry routing — extend here when registry lands.
 */
export async function installSkills(options: SkillsInstallOptions): Promise<SkillsInstallResult> {
  const { skillsPath, skillNames, agent, global = true } = options
  const result: SkillsInstallResult = {
    success: true,
    installedSkills: [],
    errors: [],
  }

  if (skillNames.length === 0)
    return result

  const skillsAgents = getSkillsAgentsForCodeTool(agent)
  const args = [
    '-y',
    'skills',
    'add',
    skillsPath,
    '-y',
  ]

  for (const skillsAgent of skillsAgents)
    args.push('-a', skillsAgent)

  if (global)
    args.push('-g')

  for (const skill of skillNames)
    args.push('-s', skill)

  try {
    await exec('npx', args)
    result.installedSkills.push(...skillNames)
  }
  catch (error) {
    result.success = false
    result.errors.push(`Failed to install skills: ${error}`)
  }

  return result
}

/**
 * Convert legacy command filename (e.g. git-cleanBranches.md) to skills directory name.
 */
export function commandFileToSkillName(filename: string): string {
  const base = filename.replace(/\.md$/, '')
  return base.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}
