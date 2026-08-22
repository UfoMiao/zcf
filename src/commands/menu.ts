import type { CodeToolMenuAction } from '../code-tools'
import type { CodeToolType, SupportedLang } from '../constants'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { getCodeToolRegistry } from '../code-tools'
import { CODE_TOOL_DEFINITIONS } from '../code-tools/definitions'
import { getCodeToolBanner, getCodeToolDisplayName } from '../code-tools/presentation'
import { DEFAULT_CODE_TOOL_TYPE, isCodeToolType } from '../constants'
import { i18n } from '../i18n'
import { displayBannerWithInfo } from '../utils/banner'
import { resolveCodeType } from '../utils/code-type-resolver'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { changeScriptLanguageFeature } from '../utils/features'
import { addNumbersToChoices } from '../utils/prompt-helpers'
import { promptBoolean } from '../utils/toggle-prompt'
import { readZcfConfig, updateZcfConfig } from '../utils/zcf-config'
import { checkUpdates } from './check-updates'
import { init } from './init'
import { uninstall } from './uninstall'
import { update } from './update'

type MenuResult = 'exit' | 'switch' | undefined

function getCurrentCodeTool(): CodeToolType {
  const config = readZcfConfig()
  if (config?.codeToolType && isCodeToolType(config.codeToolType)) {
    return config.codeToolType
  }
  return DEFAULT_CODE_TOOL_TYPE
}

function printSeparator(): void {
  console.log(`\n${ansis.dim('─'.repeat(50))}\n`)
}

function getCodeToolLabel(codeTool: CodeToolType): string {
  return getCodeToolDisplayName(codeTool)
}

async function promptCodeToolSelection(current: CodeToolType): Promise<CodeToolType | null> {
  const choices = addNumbersToChoices(CODE_TOOL_DEFINITIONS.map(definition => ({
    name: getCodeToolLabel(definition.id),
    value: definition.id,
    short: getCodeToolLabel(definition.id),
  })))

  const { tool } = await inquirer.prompt<{ tool: CodeToolType | '' }>({
    type: 'list',
    name: 'tool',
    message: i18n.t('menu:switchCodeToolPrompt'),
    default: current,
    choices,
  })

  if (!tool) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return null
  }

  return tool
}

async function handleCodeToolSwitch(current: CodeToolType): Promise<boolean> {
  const newTool = await promptCodeToolSelection(current)
  if (!newTool || newTool === current) {
    return false
  }

  updateZcfConfig({ codeToolType: newTool })
  console.log(ansis.green(`✔ ${i18n.t('menu:codeToolSwitched', { tool: getCodeToolLabel(newTool) })}`))
  return true
}

function printZcfSection(options: {
  uninstallOption: string
  uninstallDescription: string
  updateOption: string
  updateDescription: string
}): void {
  console.log('  ------------ ZCF ------------')
  console.log(
    `  ${ansis.cyan('0.')} ${i18n.t('menu:menuOptions.changeLanguage')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.changeLanguage')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('S.')} ${i18n.t('menu:menuOptions.switchCodeTool')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.switchCodeTool')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('-.')} ${options.uninstallOption} ${ansis.gray(`- ${options.uninstallDescription}`)}`,
  )
  console.log(
    `  ${ansis.cyan('+.')} ${options.updateOption} ${ansis.gray(`- ${options.updateDescription}`)}`,
  )
  console.log(`  ${ansis.red('Q.')} ${ansis.red(i18n.t('menu:menuOptions.exit'))}`)
  console.log('')
}

// Shared command actions only. Adapter-owned `+` actions (e.g. Codex update-tools) go through menu.run.
const CORE_MENU_ACTIONS = new Set<CodeToolMenuAction>(['init', 'update', 'uninstall', 'check-updates'])

async function dispatchCoreMenuAction(action: CodeToolMenuAction, codeTool: CodeToolType): Promise<void> {
  switch (action) {
    case 'init':
      await init({ codeType: codeTool, skipBanner: true })
      return
    case 'update':
      await update({ codeType: codeTool, skipBanner: true })
      return
    case 'uninstall':
      await uninstall({ codeType: codeTool })
      return
    case 'check-updates':
      await checkUpdates({ codeType: codeTool })
      return
    default:
      throw new Error(i18n.t('errors:unsupportedMenuAction', { action }))
  }
}

async function showAdapterMenu(codeTool: CodeToolType): Promise<MenuResult> {
  const adapter = getCodeToolRegistry().get(codeTool)
  const menu = adapter.menu
  const tool = getCodeToolLabel(codeTool)
  const contributed = [...menu.items, ...(menu.extras ?? [])]
  const validChoices = [
    ...contributed.map(item => item.key),
    ...contributed.map(item => item.key.toUpperCase()),
    '0',
    '-',
    '+',
    's',
    'S',
    'q',
    'Q',
  ]

  console.log(ansis.cyan(i18n.t('menu:selectFunction')))
  console.log(`  -------- ${tool} --------`)
  for (const item of menu.items) {
    const label = i18n.t(item.labelKey, { tool })
    const description = item.descriptionKey ? i18n.t(item.descriptionKey, { tool }) : ''
    console.log(
      `  ${ansis.cyan(`${item.key.toUpperCase()}.`)} ${label}${description ? ansis.gray(` - ${description}`) : ''}`,
    )
  }
  console.log('')

  if (menu.extras?.length) {
    console.log(`  --------- ${i18n.t('menu:menuSections.otherTools')} ----------`)
    for (const item of menu.extras) {
      const label = i18n.t(item.labelKey, { tool })
      const description = item.descriptionKey ? i18n.t(item.descriptionKey, { tool }) : ''
      console.log(
        `  ${ansis.cyan(`${item.key.toUpperCase()}.`)} ${label}${description ? ansis.gray(` - ${description}`) : ''}`,
      )
    }
    console.log('')
  }

  printZcfSection({
    uninstallOption: i18n.t(menu.uninstallLabelKey, { tool }),
    uninstallDescription: i18n.t(menu.uninstallDescriptionKey, { tool }),
    updateOption: i18n.t(menu.updateLabelKey, { tool }),
    updateDescription: i18n.t(menu.updateDescriptionKey, { tool }),
  })

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('common:enterChoice'),
    validate: value => validChoices.includes(value) || i18n.t('common:invalidChoice'),
  })

  if (!choice) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return 'exit'
  }

  const normalized = choice.toLowerCase()
  if (normalized === 'q') {
    console.log(ansis.cyan(i18n.t('common:goodbye')))
    return 'exit'
  }
  if (normalized === 's')
    return await handleCodeToolSwitch(codeTool) ? 'switch' : undefined
  if (normalized === '0') {
    await changeScriptLanguageFeature(i18n.language as SupportedLang)
    printSeparator()
    return undefined
  }
  if (normalized === '-') {
    await uninstall({ codeType: codeTool })
    printSeparator()
    return undefined
  }
  if (normalized === '+') {
    if (CORE_MENU_ACTIONS.has(menu.updateAction))
      await dispatchCoreMenuAction(menu.updateAction, codeTool)
    else
      await menu.run(menu.updateAction)
    printSeparator()
    return undefined
  }

  const item = contributed.find(entry => entry.key.toLowerCase() === normalized)
  if (!item)
    return undefined

  if (CORE_MENU_ACTIONS.has(item.action))
    await dispatchCoreMenuAction(item.action, codeTool)
  else
    await menu.run(item.action)

  if (item.promptToReturn) {
    printSeparator()
    const shouldContinue = await promptBoolean({
      message: i18n.t('common:returnToMenu'),
      defaultValue: true,
    })
    if (!shouldContinue) {
      console.log(ansis.cyan(i18n.t('common:goodbye')))
      return 'exit'
    }
    return undefined
  }

  printSeparator()
  return undefined
}

export async function showMainMenu(options: { codeType?: string } = {}): Promise<void> {
  try {
    // Handle code type parameter if provided
    if (options.codeType) {
      try {
        const resolvedType = await resolveCodeType(options.codeType)
        const currentType = getCurrentCodeTool()

        if (resolvedType !== currentType) {
          updateZcfConfig({ codeToolType: resolvedType })
          console.log(ansis.green(`✔ ${i18n.t('menu:codeToolSwitched', { tool: getCodeToolLabel(resolvedType) })}`))
        }
      }
      catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error(ansis.yellow(errorMessage))
      }
    }

    // Menu loop
    let exitMenu = false
    while (!exitMenu) {
      const codeTool = getCurrentCodeTool()
      displayBannerWithInfo(getCodeToolBanner(codeTool))

      const result = await showAdapterMenu(codeTool)

      if (result === 'exit') {
        exitMenu = true
      }
      else if (result === 'switch') {
        // Loop will read updated config and refresh banner
        continue
      }
    }
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}
