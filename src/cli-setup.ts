import type { CAC } from 'cac'
import type { SupportedLang } from './constants'
import ansis from 'ansis'
import { version } from '../package.json'
import { checkUpdates } from './commands/check-updates'
import { configSwitchCommand } from './commands/config-switch'
import { showMainMenu } from './commands/menu'
import { uninstall } from './commands/uninstall'
import { changeLanguage, i18n, initI18n } from './i18n'
import { selectScriptLanguage } from './utils/prompts'
import { readZcfConfigAsync } from './utils/zcf-config'

export interface CliOptions {
  lang?: 'zh-CN' | 'en'
  allLang?: string
  skipPrompt?: boolean
}

//  Interface for language-related options extraction
interface LanguageOptions {
  lang?: string
  allLang?: string
  skipPrompt?: boolean
}

//  Helper function to resolve and switch language if needed
async function resolveAndSwitchLanguage(
  lang?: string,
  options?: { lang?: string, allLang?: string },
  skipPrompt: boolean = false,
): Promise<SupportedLang> {
  const zcfConfig = await readZcfConfigAsync()

  // Determine target language with priority: allLang > lang > config > prompt
  const targetLang
    = (options?.allLang as SupportedLang)
      || (lang as SupportedLang)
      || (options?.lang as SupportedLang)
      || zcfConfig?.preferredLang
      || (skipPrompt ? 'en' : await selectScriptLanguage()) as SupportedLang

  // Only switch if different from current language
  if (i18n.isInitialized && i18n.language !== targetLang) {
    await changeLanguage(targetLang)
  }

  return targetLang
}

//  Command wrapper function to handle language resolution before action execution
export async function withLanguageResolution<T extends any[]>(
  action: (...args: T) => Promise<void>,
  skipPrompt: boolean = false,
): Promise<(...args: T) => Promise<void>> {
  return async (...args: T) => {
    // Extract language options from the first argument (assuming it's options object)
    const options = args[0]
    const languageOptions = extractLanguageOptions(options)

    // Resolve and switch language before executing the action
    await resolveAndSwitchLanguage(undefined, languageOptions, skipPrompt || languageOptions.skipPrompt)

    // Execute the original action
    return await action(...args)
  }
}

//  Utility function to extract language-related options from command options
function extractLanguageOptions(options: unknown): LanguageOptions {
  if (!options || typeof options !== 'object' || options === null) {
    return {}
  }

  const obj = options as Record<string, unknown>

  return {
    lang: typeof obj.lang === 'string' ? obj.lang : undefined,
    allLang: typeof obj.allLang === 'string' ? obj.allLang : undefined,
    skipPrompt: typeof obj.skipPrompt === 'boolean' ? obj.skipPrompt : undefined,
  }
}

//  Internationalized help system using i18n translations
export function customizeHelp(sections: any[]): any[] {
  // Add custom header
  sections.unshift({
    title: '',
    body: ansis.cyan.bold(`ccs - Claude Code Switch v${version}`),
  })

  // Add commands section with aliases
  sections.push({
    title: ansis.yellow(i18n.t('cli:help.commands')),
    body: [
      `  ${ansis.cyan('ccs')}                      ${i18n.t('cli:help.commandDescriptions.showInteractiveMenuDefault')}`,
      `  ${ansis.cyan('ccs config-switch')} | ${ansis.cyan('cs')}  ${i18n.t('cli:help.commandDescriptions.switchConfiguration')}`,
      `  ${ansis.cyan('ccs check-updates')} | ${ansis.cyan('check')}  ${i18n.t('cli:help.commandDescriptions.checkUpdateVersions')}`,
      `  ${ansis.cyan('ccs uninstall')}            ${i18n.t('cli:help.commandDescriptions.uninstallConfigurations')}`,
    ].join('\n'),
  })

  // Add options section
  sections.push({
    title: ansis.yellow(i18n.t('cli:help.options')),
    body: [
      `  ${ansis.green('--lang, -l')} <lang>      ${i18n.t('cli:help.optionDescriptions.displayLanguage')} (zh-CN, en)`,
      `  ${ansis.green('--all-lang, -g')} <lang>  ${i18n.t('cli:help.optionDescriptions.setAllLanguageParams')}`,
      `  ${ansis.green('--list, -l')}             ${i18n.t('cli:help.optionDescriptions.listConfigurations')}`,
      `  ${ansis.green('--help, -h')}             ${i18n.t('cli:help.optionDescriptions.displayHelp')}`,
      `  ${ansis.green('--version, -v')}          ${i18n.t('cli:help.optionDescriptions.displayVersion')}`,
    ].join('\n'),
  })

  // Add examples section
  sections.push({
    title: ansis.yellow(i18n.t('cli:help.examples')),
    body: [
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.showInteractiveMenu')}`),
      `  ${ansis.cyan('npx @xwm111/ccs')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.switchConfiguration')}`),
      `  ${ansis.cyan('ccs config-switch --list')}`,
      `  ${ansis.cyan('ccs cs my-endpoint')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.checkAndUpdateTools')}`),
      `  ${ansis.cyan('ccs check-updates')}`,
      `  ${ansis.cyan('ccs check')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.uninstallConfigurations')}`),
      `  ${ansis.cyan('ccs uninstall')}`,
      '',
    ].join('\n'),
  })

  return sections
}

export async function setupCommands(cli: CAC): Promise<void> {
  // Use async initialization to ensure help text displays correctly
  try {
    // Try to get language from existing config for help system
    const zcfConfig = await readZcfConfigAsync()
    const defaultLang = zcfConfig?.preferredLang || 'en'

    // Initialize i18n for help system using imported function
    await initI18n(defaultLang)
  }
  catch {
  }

  // Default command - show menu
  cli
    .command('', 'Show interactive menu (default)')
    .option('--lang, -l <lang>', 'Display language (zh-CN, en)')
    .option('--all-lang, -g <lang>', 'Set all language parameters to this value')
    .action(await withLanguageResolution(async () => {
      await showMainMenu()
    }))

  // Config switch command - Switch Claude Code API configuration
  cli
    .command('config-switch [target]', 'Switch Claude Code API configuration, or list available configurations')
    .alias('cs')
    .option('--lang <lang>', 'Display language (zh-CN, en)')
    .option('--all-lang, -g <lang>', 'Set all language parameters to this value')
    .option('--list, -l', 'List available configurations')
    .action(await withLanguageResolution(async (target, options) => {
      await configSwitchCommand({
        target,
        list: options.list,
      })
    }))

  // Uninstall command - Remove ccs configurations and tools
  cli
    .command('uninstall', 'Remove ccs configurations and tools')
    .option('--lang, -l <lang>', 'Display language (zh-CN, en)')
    .option('--all-lang, -g <lang>', 'Set all language parameters to this value')
    .option('--mode, -m <mode>', 'Uninstall mode (complete/custom/interactive), default: interactive')
    .option('--items, -i <items>', 'Comma-separated items for custom uninstall mode')
    .action(await withLanguageResolution(async (options) => {
      await uninstall(options)
    }))

  // Check updates command
  cli
    .command('check-updates', 'Check and update Claude Code and ccs to latest versions')
    .alias('check')
    .option('--lang, -l <lang>', 'Display language (zh-CN, en)')
    .option('--all-lang, -g <lang>', 'Set all language parameters to this value')
    .option('--skip-prompt, -s', 'Skip all interactive prompts (non-interactive mode)')
    .action(await withLanguageResolution(async (options) => {
      await checkUpdates(options)
    }))

  // Custom help
  cli.help(sections => customizeHelp(sections))
  cli.version(version)
}
