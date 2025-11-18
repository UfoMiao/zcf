import ansis from 'ansis'
import inquirer from 'inquirer'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { handleExitPromptError, handleGeneralError } from '../error-handler'
import { promptBoolean } from '../toggle-prompt'
import { runCometixPrintConfig, runCometixTuiConfig } from './commands'
import { installCometixLine } from './installer'

export async function showCometixMenu(): Promise<boolean> {
  try {
    ensureI18nInitialized()

    // Display CCometixLine menu title
    console.log(`\n${ansis.cyan('═'.repeat(50))}`)
    console.log(ansis.bold.cyan(`  ${i18n.t('cometix:cometixMenuTitle')}`))
    console.log(`${ansis.cyan('═'.repeat(50))}\n`)

    // Display menu options
    console.log(`  ${ansis.cyan('1.')} ${i18n.t('cometix:cometixMenuOptions.installOrUpdate')} ${ansis.gray(`- ${i18n.t('cometix:cometixMenuDescriptions.installOrUpdate')}`)}`)
    console.log(`  ${ansis.cyan('2.')} ${i18n.t('cometix:cometixMenuOptions.printConfig')} ${ansis.gray(`- ${i18n.t('cometix:cometixMenuDescriptions.printConfig')}`)}`)
    console.log(`  ${ansis.cyan('3.')} ${i18n.t('cometix:cometixMenuOptions.customConfig')} ${ansis.gray(`- ${i18n.t('cometix:cometixMenuDescriptions.customConfig')}`)}`)
    console.log(`  ${ansis.yellow('0.')} ${i18n.t('cometix:cometixMenuOptions.back')}`)
    console.log('')

    // Get user choice
    const { choice } = await inquirer.prompt<{ choice: string }>({
      type: 'input',
      name: 'choice',
      message: i18n.t('common:enterChoice'),
      validate: async (value) => {
        const valid = ['1', '2', '3', '0']
        return valid.includes(value) || i18n.t('common:invalidChoice')
      },
    })

    // Handle menu selection
    switch (choice) {
      case '1':
        await installCometixLine()
        break

      case '2':
        await runCometixPrintConfig()
        break

      case '3':
        await runCometixTuiConfig()
        break

      case '0':
        // Back to main menu
        return false
    }

    // Ask if user wants to continue in CCometixLine menu
    if (choice !== '0') {
      console.log(`\n${ansis.dim('─'.repeat(50))}\n`)
      const continueInCometix = await promptBoolean({
        message: i18n.t('common:returnToMenu'),
        defaultValue: true,
      })

      if (continueInCometix) {
        return await showCometixMenu()
      }
    }

    return false
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
    return false
  }
}
