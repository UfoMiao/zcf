import type { SupportedLang } from '../constants'
import type { WorkflowConfig, WorkflowInstallResult, WorkflowType } from '../types/workflow'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import { getOrderedWorkflows, getWorkflowConfig } from '../config/workflows'
import { CLAUDE_DIR } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'

function getRootDir(): string {
  const currentFilePath = fileURLToPath(import.meta.url)
  const distDir = dirname(dirname(currentFilePath))
  return dirname(distDir)
}

const DEFAULT_CODE_TOOL_TEMPLATE = 'claude-code'

export async function selectAndInstallWorkflows(
  configLang: SupportedLang,
  preselectedWorkflows?: string[],
): Promise<void> {
  ensureI18nInitialized()
  const workflows = getOrderedWorkflows()

  // Build choices from configuration
  const choices = workflows.map((workflow) => {
    return {
      name: workflow.name,
      value: workflow.id,
      checked: workflow.defaultSelected,
    }
  })

  // Multi-select workflow types or use preselected
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

  // Clean up old version files before installation
  await cleanupOldVersionFiles()

  // Install selected workflows with their dependencies
  for (const workflowId of selectedWorkflows) {
    const config = getWorkflowConfig(workflowId)
    if (config) {
      await installWorkflowWithDependencies(config, configLang)
    }
  }
}

async function installWorkflowWithDependencies(
  config: WorkflowConfig,
  configLang: SupportedLang,
): Promise<WorkflowInstallResult> {
  const rootDir = getRootDir()
  ensureI18nInitialized()
  const result: WorkflowInstallResult = {
    workflow: config.id,
    success: true,
    installedCommands: [],
    installedAgents: [],
    errors: [],
  }

  // Create static workflow option keys for i18n-ally compatibility
  const WORKFLOW_OPTION_KEYS = {
    commonTools: i18n.t('workflow:workflowOption.commonTools'),
    sixStepsWorkflow: i18n.t('workflow:workflowOption.sixStepsWorkflow'),
    featPlanUx: i18n.t('workflow:workflowOption.featPlanUx'),
    gitWorkflow: i18n.t('workflow:workflowOption.gitWorkflow'),
    bmadWorkflow: i18n.t('workflow:workflowOption.bmadWorkflow'),
  } as const

  const workflowName = WORKFLOW_OPTION_KEYS[config.id as keyof typeof WORKFLOW_OPTION_KEYS] || config.id
  console.log(ansis.cyan(`\n📦 ${i18n.t('workflow:installingWorkflow')}: ${workflowName}...`))

  // Install commands to new structure
  const commandsDir = join(CLAUDE_DIR, 'commands', 'zcf')
  if (!existsSync(commandsDir)) {
    await mkdir(commandsDir, { recursive: true })
  }

  for (const commandFile of config.commands) {
    const commandSource = join(
      rootDir,
      'templates',
      DEFAULT_CODE_TOOL_TEMPLATE,
      configLang,
      'workflow',
      config.category,
      'commands',
      commandFile,
    )
    // Keep original file names for all commands
    const destFileName = commandFile
    const commandDest = join(commandsDir, destFileName)

    if (existsSync(commandSource)) {
      try {
        await copyFile(commandSource, commandDest)
        result.installedCommands.push(destFileName)
        console.log(ansis.gray(`  ✔ ${i18n.t('workflow:installedCommand')}: zcf/${destFileName}`))
      }
      catch (error) {
        const errorMsg = `${i18n.t('workflow:failedToInstallCommand')} ${commandFile}: ${error}`
        result.errors?.push(errorMsg)
        console.error(ansis.red(`  ✗ ${errorMsg}`))
        result.success = false
      }
    }
  }

  // Install agents if autoInstallAgents is true
  if (config.autoInstallAgents && config.agents.length > 0) {
    const agentsCategoryDir = join(CLAUDE_DIR, 'agents', 'zcf', config.category)
    if (!existsSync(agentsCategoryDir)) {
      await mkdir(agentsCategoryDir, { recursive: true })
    }

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
          result.installedAgents.push(agent.filename)
          console.log(ansis.gray(`  ✔ ${i18n.t('workflow:installedAgent')}: zcf/${config.category}/${agent.filename}`))
        }
        catch (error) {
          const errorMsg = `${i18n.t('workflow:failedToInstallAgent')} ${agent.filename}: ${error}`
          result.errors?.push(errorMsg)
          console.error(ansis.red(`  ✗ ${errorMsg}`))
          if (agent.required) {
            result.success = false
          }
        }
      }
    }
  }

  if (result.success) {
    console.log(ansis.green(`✔ ${workflowName} ${i18n.t('workflow:workflowInstallSuccess')}`))

    // Show special prompt for BMAD workflow
    if (config.id === 'bmadWorkflow') {
      console.log(ansis.cyan(`\n${i18n.t('workflow:bmadInitPrompt')}`))
    }
  }
  else {
    console.log(ansis.red(`✗ ${workflowName} ${i18n.t('workflow:workflowInstallError')}`))
  }

  return result
}

async function cleanupOldVersionFiles(): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.cyan(`\n🧹 ${i18n.t('workflow:cleaningOldFiles')}...`))

  // Old command files to remove
  const oldCommandFiles = [
    join(CLAUDE_DIR, 'commands', 'workflow.md'),
    join(CLAUDE_DIR, 'commands', 'feat.md'),
  ]

  // Old agent files to remove
  const oldAgentFiles = [
    join(CLAUDE_DIR, 'agents', 'planner.md'),
    join(CLAUDE_DIR, 'agents', 'ui-ux-designer.md'),
  ]

  // Clean up old command files
  for (const file of oldCommandFiles) {
    if (existsSync(file)) {
      try {
        await rm(file, { force: true })
        console.log(ansis.gray(`  ✔ ${i18n.t('workflow:removedOldFile')}: ${file.replace(CLAUDE_DIR, '~/.claude')}`))
      }
      catch {
        console.error(ansis.yellow(`  ⚠ ${i18n.t('errors:failedToRemoveFile')}: ${file.replace(CLAUDE_DIR, '~/.claude')}`))
      }
    }
  }

  // Clean up old agent files
  for (const file of oldAgentFiles) {
    if (existsSync(file)) {
      try {
        await rm(file, { force: true })
        console.log(ansis.gray(`  ✔ ${i18n.t('workflow:removedOldFile')}: ${file.replace(CLAUDE_DIR, '~/.claude')}`))
      }
      catch {
        console.error(ansis.yellow(`  ⚠ ${i18n.t('errors:failedToRemoveFile')}: ${file.replace(CLAUDE_DIR, '~/.claude')}`))
      }
    }
  }
}
