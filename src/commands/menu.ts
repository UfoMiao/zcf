import type { SupportedLang } from '../constants'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { CODE_TOOL_BANNERS } from '../constants'
import { i18n } from '../i18n'
import { displayBannerWithInfo } from '../utils/banner'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { changeScriptLanguageFeature, configureApiFeature } from '../utils/features'
import { promptBoolean } from '../utils/toggle-prompt'
import { checkUpdates } from './check-updates'
import { uninstall } from './uninstall'

type MenuResult = 'exit' | undefined

function printSeparator(): void {
  console.log(`\n${ansis.dim('─'.repeat(50))}\n`)
}

async function showMenu(): Promise<MenuResult> {
  console.log(ansis.cyan(i18n.t('menu:selectFunction')))
  console.log('')
  console.log(
    `  ${ansis.cyan('1.')} ${i18n.t('menu:menuOptions.configureApiOrCcr')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureApiOrCcr')}`)}`,
  )
  console.log('')
  console.log(
    `  ${ansis.cyan('0.')} ${i18n.t('menu:menuOptions.changeLanguage')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.changeLanguage')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('-.')} ${i18n.t('menu:menuOptions.uninstall')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.uninstall')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('+.')} ${i18n.t('menu:menuOptions.checkUpdates')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.checkUpdates')}`)}`,
  )
  console.log(`  ${ansis.red('Q.')} ${ansis.red(i18n.t('menu:menuOptions.exit'))}`)
  console.log('')

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('common:enterChoice'),
    validate: (value) => {
      const valid = ['1', '0', '-', '+', 'q', 'Q']
      return valid.includes(value) || i18n.t('common:invalidChoice')
    },
  })

  if (!choice) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return 'exit'
  }

  const normalized = choice.toLowerCase()

  switch (normalized) {
    case '1':
      await configureApiFeature()
      break
    case '0': {
      const currentLang = i18n.language as SupportedLang
      await changeScriptLanguageFeature(currentLang)
      printSeparator()
      return undefined
    }
    case '-':
      await uninstall()
      printSeparator()
      return undefined
    case '+':
      await checkUpdates()
      printSeparator()
      return undefined
    case 'q':
      console.log(ansis.cyan(i18n.t('common:goodbye')))
      return 'exit'
    default:
      return undefined
  }

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

export async function showMainMenu(): Promise<void> {
  try {
    let exitMenu = false
    while (!exitMenu) {
      displayBannerWithInfo(CODE_TOOL_BANNERS['claude-code'] || 'ccs')

      const result = await showMenu()

      if (result === 'exit') {
        exitMenu = true
      }
    }
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}
