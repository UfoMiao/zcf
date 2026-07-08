import type { CodeToolType, SupportedLang } from '../constants'
import type { WorkflowConfig, WorkflowInstallResult } from '../types/workflow'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import { getOrderedWorkflows, getWorkflowConfig } from '../config/workflows'
import { CLAUDE_DIR, CLAUDE_SKILLS_DIR, CODEX_SKILLS_DIR, OPENCODE_SKILLS_DIR } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { updateOpenCodeSkillsPaths } from './code-tools/opencode'
import { copyDir, exists, isDirectory, readDir, remove } from './fs-operations'
import { readZcfConfig } from './zcf-config'

export function getRootDir(): string {
  const currentFilePath = fileURLToPath(import.meta.url)
  const distDir = dirname(dirname(currentFilePath))
  return dirname(distDir)
}

function getCodeToolType(): CodeToolType {
  const zcfConfig = readZcfConfig()
  return zcfConfig?.codeToolType || 'claude-code'
}

function getSkillsSourceDir(rootDir: string, codeToolType: CodeToolType): string {
  return join(rootDir, 'templates', codeToolType, 'skills')
}

function getSkillTargetBaseDir(codeToolType: CodeToolType): string {
  switch (codeToolType) {
    case 'claude-code':
      return CLAUDE_SKILLS_DIR
    case 'codex':
      return CODEX_SKILLS_DIR
    case 'opencode':
      return OPENCODE_SKILLS_DIR
    default:
      return CLAUDE_SKILLS_DIR
  }
}

function discoverSkillGroupDir(sourceDir: string, groupId: string): string | null {
  const direct = join(sourceDir, groupId)
  if (exists(direct) && isDirectory(direct)) {
    return direct
  }
  return null
}

function discoverSkills(sourceDir: string, groupId: string): string[] {
  const groupDir = discoverSkillGroupDir(sourceDir, groupId)
  if (!groupDir) {
    return []
  }

  return readDir(groupDir).filter(entry => isDirectory(join(groupDir, entry)))
}

export async function selectAndInstallWorkflows(
  _configLang: SupportedLang,
  preselectedWorkflows?: string[],
): Promise<WorkflowInstallResult[]> {
  ensureI18nInitialized()
  const codeToolType = getCodeToolType()
  const workflows = getOrderedWorkflows()

  const choices = workflows.map((workflow) => {
    return {
      name: workflow.name,
      value: workflow.id,
      checked: workflow.defaultSelected,
    }
  })

  let selectedWorkflows: string[]

  if (preselectedWorkflows) {
    selectedWorkflows = preselectedWorkflows
  }
  else {
    const response = await inquirer.prompt<{ selectedWorkflows: string[] }>({
      type: 'checkbox',
      name: 'selectedWorkflows',
      message: `${i18n.t('workflow:selectWorkflowType')}${i18n.t('common:multiSelectHint')}`,
      choices,
    })
    selectedWorkflows = response.selectedWorkflows
  }

  if (!selectedWorkflows || selectedWorkflows.length === 0) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return []
  }

  await cleanupOldVersionFiles()

  const results: WorkflowInstallResult[] = []
  for (const workflowId of selectedWorkflows) {
    const config = getWorkflowConfig(workflowId)
    if (config) {
      const result = installWorkflowSkills(config, codeToolType)
      results.push(result)
    }
  }

  return results
}

function installWorkflowSkills(
  config: WorkflowConfig,
  codeToolType: CodeToolType,
): WorkflowInstallResult {
  const rootDir = getRootDir()
  ensureI18nInitialized()

  const result: WorkflowInstallResult = {
    workflow: config.id,
    success: true,
    installedSkills: [],
    installedCommands: [],
    installedAgents: [],
    errors: [],
  }

  const sourceDir = getSkillsSourceDir(rootDir, codeToolType)
  const sourceGroupDir = discoverSkillGroupDir(sourceDir, config.sourceDir)

  if (!sourceGroupDir) {
    const errorMsg = i18n.t('workflow:skillGroupNotFound', { group: config.sourceDir })
    result.errors?.push(errorMsg)
    result.success = false
    console.error(ansis.red(`  ✗ ${errorMsg}`))
    return result
  }

  console.log(ansis.cyan(`\n📦 ${i18n.t('workflow:installingWorkflow')}: ${config.name}...`))

  const targetBaseDir = getSkillTargetBaseDir(codeToolType)
  const targetGroupDir = join(targetBaseDir, config.sourceDir)
  const skills = discoverSkills(sourceDir, config.sourceDir)

  for (const skillName of skills) {
    const skillSource = join(sourceGroupDir, skillName)
    const skillTarget = join(targetGroupDir, skillName)

    try {
      copyDir(skillSource, skillTarget)
      result.installedSkills.push(skillName)
      console.log(ansis.gray(`  ✔ ${i18n.t('workflow:installedSkill')}: ${config.sourceDir}/${skillName}`))
    }
    catch (error) {
      const errorMsg = `${i18n.t('workflow:failedToInstallSkill')} ${skillName}: ${error}`
      result.errors?.push(errorMsg)
      console.error(ansis.red(`  ✗ ${errorMsg}`))
      result.success = false
    }
  }

  if (codeToolType === 'opencode') {
    updateOpenCodeSkillsPaths([targetGroupDir])
  }

  if (result.success) {
    console.log(ansis.green(`✔ ${config.name} ${i18n.t('workflow:workflowInstallSuccess')}`))
  }
  else {
    console.log(ansis.red(`✗ ${config.name} ${i18n.t('workflow:workflowInstallError')}`))
  }

  return result
}

/**
 * Uninstall all skills managed by ZCF for the given code tool.
 * Removes the per-tool skills directories and cleans up OpenCode paths.
 */
export async function uninstallSkillsForCodeTool(codeToolType: CodeToolType): Promise<void> {
  ensureI18nInitialized()
  const workflows = getOrderedWorkflows()
  const targetBaseDir = getSkillTargetBaseDir(codeToolType)

  for (const config of workflows) {
    const targetGroupDir = join(targetBaseDir, config.sourceDir)
    if (exists(targetGroupDir)) {
      try {
        await remove(targetGroupDir)
        console.log(ansis.gray(`  ✔ ${i18n.t('workflow:removedSkillGroup')}: ${targetGroupDir}`))
      }
      catch (error) {
        console.error(ansis.red(`  ✗ ${i18n.t('workflow:failedToRemoveSkillGroup')}: ${targetGroupDir}: ${error}`))
      }
    }
  }

  if (codeToolType === 'opencode') {
    const pathsToRemove = Array.from(new Set(workflows.map(config => join(targetBaseDir, config.sourceDir))))
    updateOpenCodeSkillsPaths(pathsToRemove, { remove: true })
  }
}

async function cleanupOldVersionFiles(): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.cyan(`\n🧹 ${i18n.t('workflow:cleaningOldFiles')}...`))

  const oldPaths = [
    join(CLAUDE_DIR, 'commands', 'workflow.md'),
    join(CLAUDE_DIR, 'commands', 'feat.md'),
    join(CLAUDE_DIR, 'agents', 'planner.md'),
    join(CLAUDE_DIR, 'agents', 'ui-ux-designer.md'),
    join(CLAUDE_DIR, 'commands', 'zcf'),
    join(CLAUDE_DIR, 'agents', 'zcf'),
  ]

  for (const path of oldPaths) {
    if (exists(path)) {
      try {
        await remove(path)
        console.log(ansis.gray(`  ✔ ${i18n.t('workflow:removedOldFile')}: ${path.replace(CLAUDE_DIR, '~/.claude')}`))
      }
      catch {
        console.error(ansis.yellow(`  ⚠ ${i18n.t('errors:failedToRemoveFile')}: ${path.replace(CLAUDE_DIR, '~/.claude')}`))
      }
    }
  }
}
