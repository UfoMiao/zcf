import type { CodeToolType, SupportedLang } from '../constants'
import type { WorkflowConfig, WorkflowInstallResult, WorkflowType } from '../types/workflow'
// Usage: Inspect installed workflow files and update their ownership markers.
import { existsSync } from 'node:fs'
// Usage: Copy and update workflow files on disk.
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import { getOrderedWorkflows, getWorkflowConfig } from '../config/workflows'
import { CLAUDE_DIR, DEFAULT_CODE_TOOL_TYPE } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
// Usage: Mark generated workflow files and recognize files already owned by ZCF.
import { isZcfResourceContent, markZcfResourceContent } from './config-ownership'
import { installSkills } from './skills-installer'
// Usage: Remove legacy workflow artifacts only after ownership verification.
import { ZcfUninstaller } from './uninstaller'

function getRootDir(): string {
  const currentFilePath = fileURLToPath(import.meta.url)
  const distDir = dirname(dirname(currentFilePath))
  return dirname(distDir)
}

const DEFAULT_CODE_TOOL_TEMPLATE = 'claude-code'

export async function selectAndInstallWorkflows(
  configLang: SupportedLang,
  preselectedWorkflows?: string[],
  codeToolType: CodeToolType = DEFAULT_CODE_TOOL_TYPE,
): Promise<void> {
  ensureI18nInitialized()
  const workflows = getOrderedWorkflows()

  const choices = workflows.map(workflow => ({
    name: workflow.name,
    value: workflow.id,
    checked: workflow.defaultSelected,
  }))

  let selectedWorkflows: WorkflowType[]

  if (preselectedWorkflows) {
    selectedWorkflows = preselectedWorkflows as WorkflowType[]
  }
  else {
    const response = await inquirer.prompt<{ selectedWorkflows: WorkflowType[] }>({
      type: 'checkbox',
      name: 'selectedWorkflows',
      message: `${i18n.t('workflow:selectWorkflowType')}${i18n.t('common:multiSelectHint')}`,
      choices,
    })
    selectedWorkflows = response.selectedWorkflows
  }

  if (!selectedWorkflows || selectedWorkflows.length === 0) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  await cleanupOldVersionFiles()

  const skillNamesToInstall = new Set<string>()

  for (const workflowId of selectedWorkflows) {
    const config = getWorkflowConfig(workflowId)
    if (config)
      await installWorkflowWithDependencies(config, configLang, skillNamesToInstall)
  }

  if (skillNamesToInstall.size > 0) {
    const rootDir = getRootDir()
    const skillsSourceDir = join(rootDir, 'templates', 'skills', configLang)
    const installResult = await installSkills({
      skillsPath: skillsSourceDir,
      skillNames: [...skillNamesToInstall],
      agent: codeToolType,
      global: true,
    })

    if (installResult.success) {
      for (const skill of installResult.installedSkills)
        console.log(ansis.gray(`  ✔ ${i18n.t('workflow:installedSkill')}: ${skill}`))
    }
    else {
      for (const error of installResult.errors)
        console.error(ansis.red(`  ✗ ${error}`))
    }
  }
}

async function installWorkflowWithDependencies(
  config: WorkflowConfig,
  configLang: SupportedLang,
  skillNamesToInstall: Set<string>,
): Promise<WorkflowInstallResult> {
  const rootDir = getRootDir()
  ensureI18nInitialized()
  const result: WorkflowInstallResult = {
    workflow: config.id,
    success: true,
    installedSkills: [],
    installedAgents: [],
    errors: [],
  }

  const WORKFLOW_OPTION_KEYS = {
    commonTools: i18n.t('workflow:workflowOption.commonTools'),
    sixStepsWorkflow: i18n.t('workflow:workflowOption.sixStepsWorkflow'),
    featPlanUx: i18n.t('workflow:workflowOption.featPlanUx'),
    gitWorkflow: i18n.t('workflow:workflowOption.gitWorkflow'),
    bmadWorkflow: i18n.t('workflow:workflowOption.bmadWorkflow'),
  } as const

  const workflowName = WORKFLOW_OPTION_KEYS[config.id as keyof typeof WORKFLOW_OPTION_KEYS] || config.id
  console.log(ansis.cyan(`\n📦 ${i18n.t('workflow:installingWorkflow')}: ${workflowName}...`))

  for (const skillName of config.skills) {
    const skillSource = join(rootDir, 'templates', 'skills', configLang, skillName, 'SKILL.md')

    if (!existsSync(skillSource)) {
      const errorMsg = `${i18n.t('workflow:failedToInstallSkill')} ${skillName}: template not found`
      result.errors?.push(errorMsg)
      console.error(ansis.red(`  ✗ ${errorMsg}`))
      result.success = false
      continue
    }

    if (!skillNamesToInstall.has(skillName)) {
      skillNamesToInstall.add(skillName)
      result.installedSkills.push(skillName)
    }
  }

  if (config.autoInstallAgents && config.agents.length > 0) {
    const agentsCategoryDir = join(CLAUDE_DIR, 'agents', 'zcf', config.category)
    if (!existsSync(agentsCategoryDir))
      await mkdir(agentsCategoryDir, { recursive: true })

    for (const agent of config.agents) {
      const agentSource = join(
        rootDir,
        'templates',
        DEFAULT_CODE_TOOL_TEMPLATE,
        configLang,
        'workflow',
        config.category,
        'agents',
        agent.filename,
      )
      const agentDest = join(agentsCategoryDir, agent.filename)

      if (existsSync(agentSource)) {
        try {
          await copyFile(agentSource, agentDest)
          const agentContent = await readFile(agentDest, 'utf8')
          if (typeof agentContent === 'string' && !isZcfResourceContent(agentContent))
            await writeFile(agentDest, markZcfResourceContent(agentContent), 'utf8')
          result.installedAgents.push(agent.filename)
          console.log(ansis.gray(`  ✔ ${i18n.t('workflow:installedAgent')}: zcf/${config.category}/${agent.filename}`))
        }
        catch (error) {
          const errorMsg = `${i18n.t('workflow:failedToInstallAgent')} ${agent.filename}: ${error}`
          result.errors?.push(errorMsg)
          console.error(ansis.red(`  ✗ ${errorMsg}`))
          if (agent.required)
            result.success = false
        }
      }
    }
  }

  if (result.success)
    console.log(ansis.green(`✔ ${workflowName} ${i18n.t('workflow:workflowInstallSuccess')}`))
  else
    console.log(ansis.red(`✗ ${workflowName} ${i18n.t('workflow:workflowInstallError')}`))

  if (config.id === 'bmadWorkflow' && result.success)
    console.log(ansis.cyan(`\n${i18n.t('workflow:bmadInitPrompt')}`))

  return result
}

async function cleanupOldVersionFiles(): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.cyan(`\n🧹 ${i18n.t('workflow:cleaningOldFiles')}...`))

  const cleanupResult = await new ZcfUninstaller().removeZcfWorkflowArtifacts()
  for (const file of cleanupResult.removed)
    console.log(ansis.gray(`  ✔ ${i18n.t('workflow:removedOldFile')}: ${file}`))
  for (const warning of cleanupResult.warnings)
    console.error(ansis.yellow(`  ⚠ ${warning}`))
  for (const error of cleanupResult.errors)
    console.error(ansis.yellow(`  ⚠ ${error}`))
}
