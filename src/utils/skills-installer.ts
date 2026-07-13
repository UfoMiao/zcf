import type { CodeToolType } from '../constants'
import { exec } from 'tinyexec'

/** Registry-backed skills agent map (lazy-loaded to keep unit tests mock-friendly). */
const FALLBACK_SKILLS_AGENTS: Record<CodeToolType, string[]> = {
  'claude-code': ['claude-code', 'universal'],
  'codex': ['codex'],
}

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

  const skillsAgents = await getSkillsAgentsForCodeTool(agent)
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

/**
 * Skills CLI agent identifiers for a code tool (registry-backed with static fallback).
 */
export async function getSkillsAgentsForCodeTool(agent: CodeToolType): Promise<readonly string[]> {
  try {
    const { getCodeTool } = await import('../code-tools')
    return getCodeTool(agent).skillsAgents
  }
  catch {
    return FALLBACK_SKILLS_AGENTS[agent]
  }
}
