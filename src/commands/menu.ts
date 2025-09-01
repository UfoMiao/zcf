import type { SupportedLang } from '../constants'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { i18n } from '../i18n'
import { displayBannerWithInfo } from '../utils/banner'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import {
  changeScriptLanguageFeature,
  clearZcfCacheFeature,
  configureAiMemoryFeature,
  configureApiFeature,
  configureDefaultModelFeature,
  configureEnvPermissionFeature,
  configureMcpFeature,
} from '../utils/features'
import { runCcrMenuFeature, runCcusageFeature, runCometixMenuFeature } from '../utils/tools'
import { checkUpdates } from './check-updates'
import { init } from './init'
import { update } from './update'

export async function showMainMenu() {
  try {
    // Display banner
    displayBannerWithInfo()

    // Menu loop
    let exitMenu = false
    while (!exitMenu) {
      // Display menu options
      console.log(ansis.cyan(i18n.t('menu:selectFunction')))
      console.log('  -------- Claude Code --------')
      console.log(
        `  ${ansis.cyan('1.')} ${i18n.t('menu:menuOptions.fullInit')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.fullInit')}`)}`,
      )
      console.log(
        `  ${ansis.cyan('2.')} ${i18n.t('menu:menuOptions.importWorkflow')} ${ansis.gray(
          `- ${i18n.t('menu:menuDescriptions.importWorkflow')}`,
        )}`,
      )
      console.log(
        `  ${ansis.cyan('3.')} ${i18n.t('menu:menuOptions.configureApiOrCcr')} ${ansis.gray(
          `- ${i18n.t('menu:menuDescriptions.configureApiOrCcr')}`,
        )}`,
      )
      console.log(
        `  ${ansis.cyan('4.')} ${i18n.t('menu:menuOptions.configureMcp')} ${ansis.gray(
          `- ${i18n.t('menu:menuDescriptions.configureMcp')}`,
        )}`,
      )
      console.log(
        `  ${ansis.cyan('5.')} ${i18n.t('menu:menuOptions.configureModel')} ${ansis.gray(
          `- ${i18n.t('menu:menuDescriptions.configureModel')}`,
        )}`,
      )
      console.log(
        `  ${ansis.cyan('6.')} ${i18n.t('menu:menuOptions.configureAiMemory')} ${ansis.gray(
          `- ${i18n.t('menu:menuDescriptions.configureAiMemory')}`,
        )}`,
      )
      console.log(
        `  ${ansis.cyan('7.')} ${i18n.t('menu:menuOptions.configureEnvPermission')} ${ansis.gray(
          `- ${i18n.t('menu:menuDescriptions.configureEnvPermission')}`,
        )}`,
      )
      console.log('')
      console.log(`  --------- ${i18n.t('menu:menuSections.otherTools')} ----------`)
      console.log(
        `  ${ansis.cyan('R.')} ${i18n.t('menu:menuOptions.ccrManagement')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.ccrManagement')}`)}`,
      )
      console.log(
        `  ${ansis.cyan('U.')} ${i18n.t('menu:menuOptions.ccusage')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.ccusage')}`)}`,
      )
      console.log(
        `  ${ansis.cyan('L.')} ${i18n.t('menu:menuOptions.cometixLine')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.cometixLine')}`)}`,
      )
      console.log('')
      console.log('  ------------ ZCF ------------')
      console.log(
        `  ${ansis.cyan('0.')} ${i18n.t('menu:menuOptions.changeLanguage')} ${ansis.gray(
          `- ${i18n.t('menu:menuDescriptions.changeLanguage')}`,
        )}`,
      )
      console.log(
        `  ${ansis.cyan('-.')} ${i18n.t('menu:menuOptions.clearCache')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.clearCache')}`)}`,
      )
      console.log(
        `  ${ansis.cyan('+.')} ${i18n.t('menu:menuOptions.checkUpdates')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.checkUpdates')}`)}`,
      )
      console.log(`  ${ansis.red('Q.')} ${ansis.red(i18n.t('menu:menuOptions.exit'))}`)
      console.log('')

      // Get user input
      const { choice } = await inquirer.prompt<{ choice: string }>({
        type: 'input',
        name: 'choice',
        message: i18n.t('common:enterChoice'),
        validate: (value) => {
          const valid = ['1', '2', '3', '4', '5', '6', '7', 'r', 'R', 'u', 'U', 'l', 'L', '0', '-', '+', 'q', 'Q']
          return valid.includes(value) || i18n.t('common:invalidChoice')
        },
      })

      if (!choice) {
        console.log(ansis.yellow(i18n.t('common:cancelled')))
        exitMenu = true
        break
      }

      // Handle menu selection
      switch (choice.toLowerCase()) {
        case '1':
          await init({ skipBanner: true })
          break
        case '2':
          await update({ skipBanner: true })
          break
        case '3':
          await configureApiFeature()
          break
        case '4':
          await configureMcpFeature()
          break
        case '5':
          await configureDefaultModelFeature()
          break
        case '6':
          await configureAiMemoryFeature()
          break
        case '7':
          await configureEnvPermissionFeature()
          break
        case 'r':
        case 'R':
          await runCcrMenuFeature()
          break
        case 'u':
        case 'U':
          await runCcusageFeature()
          break
        case 'l':
        case 'L':
          await runCometixMenuFeature()
          break
        case '0': {
          const currentLang = i18n.language as SupportedLang
          await changeScriptLanguageFeature(currentLang)
          break
        }
        case '-':
          await clearZcfCacheFeature()
          break
        case '+':
          await checkUpdates()
          break
        case 'q':
          exitMenu = true
          console.log(ansis.cyan(i18n.t('common:goodbye')))
          break
      }

      // Add spacing between operations
      if (!exitMenu && choice.toLowerCase() !== 'q') {
        // Skip confirmation for ZCF configuration options (0, -, +, u, r, l)
        if (choice === '0' || choice === '-' || choice === '+' || choice.toLowerCase() === 'u' || choice.toLowerCase() === 'r' || choice.toLowerCase() === 'l') {
          console.log(`\n${ansis.dim('─'.repeat(50))}\n`)
          continue // Directly return to menu
        }

        console.log(`\n${ansis.dim('─'.repeat(50))}\n`)

        // Ask if user wants to continue for other options
        const { continue: shouldContinue } = await inquirer.prompt<{ continue: boolean }>({
          type: 'confirm',
          name: 'continue',
          message: i18n.t('common:returnToMenu'),
          default: true,
        })

        if (!shouldContinue) {
          exitMenu = true
          console.log(ansis.cyan(i18n.t('common:goodbye')))
        }
      }
    }
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}
