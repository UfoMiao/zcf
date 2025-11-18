import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { ensureI18nInitialized, i18n } from '../../i18n'
import {
  runCcrRestart,
  runCcrStart,
  runCcrStatus,
  runCcrStop,
  runCcrUi,
} from '../ccr/commands'
import { configureCcrFeature, readCcrConfig } from '../ccr/config'
import { installCcr, isCcrInstalled } from '../ccr/installer'
import { handleExitPromptError, handleGeneralError } from '../error-handler'
import { promptBoolean } from '../toggle-prompt'

// Helper function to check if CCR is properly configured
function isCcrConfigured(): boolean {
  const CCR_CONFIG_FILE = join(homedir(), '.claude-code-router', 'config.json')
  if (!existsSync(CCR_CONFIG_FILE)) {
    return false
  }

  const config = readCcrConfig()
  return config !== null
}

export async function showCcrMenu(): Promise<boolean> {
  try {
    // Initialize i18next
    ensureI18nInitialized()

    // Display CCR menu title
    console.log(`\n${ansis.cyan('═'.repeat(50))}`)
    console.log(ansis.bold.cyan(`  ${i18n.t('ccr:ccrMenuTitle')}`))
    console.log(`${ansis.cyan('═'.repeat(50))}\n`)

    // Display menu options
    console.log(`  ${ansis.cyan('1.')} ${i18n.t('ccr:ccrMenuOptions.initCcr')} ${ansis.gray(`- ${i18n.t('ccr:ccrMenuDescriptions.initCcr')}`)}`)
    console.log(`  ${ansis.cyan('2.')} ${i18n.t('ccr:ccrMenuOptions.startUi')} ${ansis.gray(`- ${i18n.t('ccr:ccrMenuDescriptions.startUi')}`)}`)
    console.log(`  ${ansis.cyan('3.')} ${i18n.t('ccr:ccrMenuOptions.checkStatus')} ${ansis.gray(`- ${i18n.t('ccr:ccrMenuDescriptions.checkStatus')}`)}`)
    console.log(`  ${ansis.cyan('4.')} ${i18n.t('ccr:ccrMenuOptions.restart')} ${ansis.gray(`- ${i18n.t('ccr:ccrMenuDescriptions.restart')}`)}`)
    console.log(`  ${ansis.cyan('5.')} ${i18n.t('ccr:ccrMenuOptions.start')} ${ansis.gray(`- ${i18n.t('ccr:ccrMenuDescriptions.start')}`)}`)
    console.log(`  ${ansis.cyan('6.')} ${i18n.t('ccr:ccrMenuOptions.stop')} ${ansis.gray(`- ${i18n.t('ccr:ccrMenuDescriptions.stop')}`)}`)
    console.log(`  ${ansis.yellow('0.')} ${i18n.t('ccr:ccrMenuOptions.back')}`)
    console.log('')

    // Get user choice
    const { choice } = await inquirer.prompt<{ choice: string }>({
      type: 'input',
      name: 'choice',
      message: i18n.t('common:enterChoice'),
      validate: (value) => {
        const valid = ['1', '2', '3', '4', '5', '6', '0']
        return valid.includes(value) || i18n.t('common:invalidChoice')
      },
    })

    // Handle menu selection
    switch (choice) {
      case '1': {
        // Initialize CCR
        const ccrStatus = await isCcrInstalled()
        if (!ccrStatus.hasCorrectPackage) {
          await installCcr()
        }
        else {
          console.log(ansis.green(`✔ ${i18n.t('ccr:ccrAlreadyInstalled')}`))
        }
        await configureCcrFeature()
        console.log(ansis.green(`\n✔ ${i18n.t('ccr:ccrSetupComplete')}`))
        break
      }

      case '2':
        // Start CCR UI - Check if CCR is configured first
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`\n⚠️  ${i18n.t('ccr:ccrNotConfigured')}`))
          console.log(ansis.cyan(`   ${i18n.t('ccr:pleaseInitFirst')}\n`))
        }
        else {
          // Get CCR config to show API key
          const config = readCcrConfig()
          await runCcrUi(config?.APIKEY)
        }
        break

      case '3':
        // Check CCR Status - Check if CCR is configured first
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`\n⚠️  ${i18n.t('ccr:ccrNotConfigured')}`))
          console.log(ansis.cyan(`   ${i18n.t('ccr:pleaseInitFirst')}\n`))
        }
        else {
          await runCcrStatus()
        }
        break

      case '4':
        // Restart CCR - Check if CCR is configured first
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`\n⚠️  ${i18n.t('ccr:ccrNotConfigured')}`))
          console.log(ansis.cyan(`   ${i18n.t('ccr:pleaseInitFirst')}\n`))
        }
        else {
          await runCcrRestart()
        }
        break

      case '5':
        // Start CCR - Check if CCR is configured first
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`\n⚠️  ${i18n.t('ccr:ccrNotConfigured')}`))
          console.log(ansis.cyan(`   ${i18n.t('ccr:pleaseInitFirst')}\n`))
        }
        else {
          await runCcrStart()
        }
        break

      case '6':
        // Stop CCR - Check if CCR is configured first
        if (!isCcrConfigured()) {
          console.log(ansis.yellow(`\n⚠️  ${i18n.t('ccr:ccrNotConfigured')}`))
          console.log(ansis.cyan(`   ${i18n.t('ccr:pleaseInitFirst')}\n`))
        }
        else {
          await runCcrStop()
        }
        break

      case '0':
        // Back to main menu
        return false
    }

    // Ask if user wants to continue in CCR menu
    if (choice !== '0') {
      console.log(`\n${ansis.dim('─'.repeat(50))}\n`)
      const continueInCcr = await promptBoolean({
        message: i18n.t('common:returnToMenu'),
        defaultValue: true,
      })

      if (continueInCcr) {
        return await showCcrMenu()
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
