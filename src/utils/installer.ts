import { exec } from 'tinyexec'
import ansis from 'ansis'
import { commandExists, isTermux, getTermuxPrefix } from './platform'
import type { SupportedLang } from '../constants'
import { getTranslation } from '../i18n'

export async function isClaudeCodeInstalled(): Promise<boolean> {
  return await commandExists('claude')
}

export async function installClaudeCode(lang: SupportedLang): Promise<void> {
  const i18n = getTranslation(lang)
  
  // Check if running in Termux
  if (isTermux()) {
    console.log(ansis.yellow(`ℹ ${i18n.installation.termuxDetected}`))
    const termuxPrefix = getTermuxPrefix()
    console.log(ansis.gray(i18n.installation.termuxPathInfo.replace('{path}', termuxPrefix)))
    console.log(ansis.gray(`Node.js: ${termuxPrefix}/bin/node`))
    console.log(ansis.gray(`npm: ${termuxPrefix}/bin/npm`))
  }
  
  console.log(i18n.installation.installing)
  
  try {
    // Always use npm for installation to ensure automatic updates work
    // Note: If the user can run 'npx zcf', npm is already available
    await exec('npm', ['install', '-g', '@anthropic-ai/claude-code'])
    console.log(`✔ ${i18n.installation.installSuccess}`)
    
    // Additional hint for Termux users
    if (isTermux()) {
      console.log(ansis.gray(`\nClaude Code installed to: ${getTermuxPrefix()}/bin/claude`))
    }
  } catch (error) {
    console.error(`✖ ${i18n.installation.installFailed}`)
    if (isTermux()) {
      console.error(ansis.yellow(`\n${i18n.installation.termuxInstallHint}\n`))
    }
    throw error
  }
}
