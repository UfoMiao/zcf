import type { CAC } from 'cac'
import type { CodeToolType, SupportedLang } from './constants'
import ansis from 'ansis'
import { version } from '../package.json'
import { ccr } from './commands/ccr'
import { executeCcusage } from './commands/ccu'
import { checkUpdates } from './commands/check-updates'
import { configSwitchCommand } from './commands/config-switch'
import { init } from './commands/init'
import { showMainMenu } from './commands/menu'
import { uninstall } from './commands/uninstall'
import { update } from './commands/update'
import { changeLanguage, i18n, initI18n } from './i18n'
import { selectScriptLanguage } from './utils/prompts'
import { readZcfConfigAsync } from './utils/zcf-config'

export interface CliOptions {
  lang?: 'zh-CN' | 'en'
  configLang?: 'zh-CN' | 'en'
  aiOutputLang?: string
  force?: boolean
  skipPrompt?: boolean
  codeType?: CodeToolType
  // Non-interactive parameters
  configAction?: string // default: backup
  apiType?: string
  apiKey?: string // Used for both API key and auth token
  apiUrl?: string
  apiModel?: string // Primary API model (e.g., claude-sonnet-4-5)
  apiFastModel?: string // Fast API model (e.g., claude-haiku-4-5)
  mcpServices?: string // default: all non-key services, "skip" to skip all
  workflows?: string // default: all workflows, "skip" to skip all
  outputStyles?: string // default: all custom styles
  defaultOutputStyle?: string // default: engineer-professional
  allLang?: string // New: unified language parameter
  installCometixLine?: string | boolean // New: CCometixLine installation control, default: true
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
    body: ansis.cyan.bold(`ZCF - Zero-Config Code Flow v${version}`),
  })

  // Add commands section with aliases
  sections.push({
    title: ansis.yellow(i18n.t('cli:help.commands')),
    body: [
      `  ${ansis.cyan('zcf')}              ${i18n.t('cli:help.commandDescriptions.showInteractiveMenuDefault')}`,
      `  ${ansis.cyan('zcf init')} | ${ansis.cyan(
        'i',
      )}     ${i18n.t('cli:help.commandDescriptions.initClaudeCodeConfig')}`,
      `  ${ansis.cyan('zcf update')} | ${ansis.cyan('u')}   ${i18n.t('cli:help.commandDescriptions.updateWorkflowFiles')}`,
      `  ${ansis.cyan('zcf ccr')}          ${i18n.t('cli:help.commandDescriptions.configureCcrProxy')}`,
      `  ${ansis.cyan('zcf ccu')} [args]   ${i18n.t('cli:help.commandDescriptions.claudeCodeUsageAnalysis')}`,
      `  ${ansis.cyan('zcf uninstall')}     ${i18n.t('cli:help.commandDescriptions.uninstallConfigurations')}`,
      `  ${ansis.cyan('zcf check-updates')} ${i18n.t('cli:help.commandDescriptions.checkUpdateVersions')}`,
      '',
      ansis.gray(`  ${i18n.t('cli:help.shortcuts')}`),
      `  ${ansis.cyan('zcf i')}            ${i18n.t('cli:help.shortcutDescriptions.quickInit')}`,
      `  ${ansis.cyan('zcf u')}            ${i18n.t('cli:help.shortcutDescriptions.quickUpdate')}`,
      `  ${ansis.cyan('zcf check')}        ${i18n.t('cli:help.shortcutDescriptions.quickCheckUpdates')}`,
    ].join('\n'),
  })

  // Add options section
  sections.push({
    title: ansis.yellow(i18n.t('cli:help.options')),
    body: [
      `  ${ansis.green('--lang, -l')} <lang>         ${i18n.t('cli:help.optionDescriptions.displayLanguage')} (zh-CN, en)`,
      `  ${ansis.green('--config-lang, -c')} <lang>  ${i18n.t('cli:help.optionDescriptions.configurationLanguage')} (zh-CN, en)`,
      `  ${ansis.green('--force, -f')}               ${i18n.t('cli:help.optionDescriptions.forceOverwrite')}`,
      `  ${ansis.green('--help, -h')}                ${i18n.t('cli:help.optionDescriptions.displayHelp')}`,
      `  ${ansis.green('--version, -v')}             ${i18n.t('cli:help.optionDescriptions.displayVersion')}`,
      '',
      ansis.gray(`  ${i18n.t('cli:help.nonInteractiveMode')}`),
      `  ${ansis.green('--skip-prompt, -s')}         ${i18n.t('cli:help.optionDescriptions.skipAllPrompts')}`,
      `  ${ansis.green('--api-type, -t')} <type>      ${i18n.t('cli:help.optionDescriptions.apiType')} (auth_token, api_key, ccr_proxy, skip)`,
      `  ${ansis.green('--api-key, -k')} <key>       ${i18n.t('cli:help.optionDescriptions.apiKey')}`,
      `  ${ansis.green('--api-url, -u')} <url>       ${i18n.t('cli:help.optionDescriptions.customApiUrl')}`,
      `  ${ansis.green('--api-model, -M')} <model>   ${i18n.t('cli:help.optionDescriptions.apiModel')} (e.g., claude-sonnet-4-5)`,
      `  ${ansis.green('--api-fast-model, -F')} <model> ${i18n.t('cli:help.optionDescriptions.apiFastModel')} (e.g., claude-haiku-4-5)`,
      `  ${ansis.green('--ai-output-lang, -a')} <lang> ${i18n.t('cli:help.optionDescriptions.aiOutputLanguage')}`,
      `  ${ansis.green('--all-lang, -g')} <lang>     ${i18n.t('cli:help.optionDescriptions.setAllLanguageParams')}`,
      `  ${ansis.green('--config-action, -r')} <action> ${i18n.t('cli:help.optionDescriptions.configHandling')} (${i18n.t('cli:help.defaults.prefix')} backup)`,
      `  ${ansis.green('--mcp-services, -m')} <list>  ${i18n.t('cli:help.optionDescriptions.mcpServices')} (${i18n.t('cli:help.defaults.prefix')} all non-key services)`,
      `  ${ansis.green('--workflows, -w')} <list>    ${i18n.t('cli:help.optionDescriptions.workflows')} (${i18n.t('cli:help.defaults.prefix')} all workflows)`,
      `  ${ansis.green('--output-styles, -o')} <styles> ${i18n.t('cli:help.optionDescriptions.outputStyles')} (${i18n.t('cli:help.defaults.prefix')} all custom styles)`,
      `  ${ansis.green('--default-output-style, -d')} <style> ${i18n.t('cli:help.optionDescriptions.defaultOutputStyle')} (${i18n.t('cli:help.defaults.prefix')} engineer-professional)`,
      `  ${ansis.green('--code-type, -T')} <type>   ${i18n.t('cli:help.optionDescriptions.codeToolType')} (claude-code, codex, cc=claude-code, cx=codex)`,
      `  ${ansis.green('--install-cometix-line, -x')} <value> ${i18n.t('cli:help.optionDescriptions.installStatuslineTool')} (${i18n.t('cli:help.defaults.prefix')} true)`,
    ].join('\n'),
  })

  // Add examples section
  sections.push({
    title: ansis.yellow(i18n.t('cli:help.examples')),
    body: [
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.showInteractiveMenu')}`),
      `  ${ansis.cyan('npx zcf')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.runFullInitialization')}`),
      `  ${ansis.cyan('npx zcf init')}`,
      `  ${ansis.cyan('npx zcf i')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.updateWorkflowFilesOnly')}`),
      `  ${ansis.cyan('npx zcf u')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.configureClaudeCodeRouter')}`),
      `  ${ansis.cyan('npx zcf ccr')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.runClaudeCodeUsageAnalysis')}`),
      `  ${ansis.cyan('npx zcf ccu')}               ${ansis.gray(`# ${i18n.t('cli:help.defaults.dailyUsage')}`)}`,
      `  ${ansis.cyan('npx zcf ccu monthly --json')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.uninstallConfigurations')}`),
      `  ${ansis.cyan('npx zcf uninstall')}         ${ansis.gray(`# ${i18n.t('cli:help.defaults.interactiveUninstall')}`)}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.checkAndUpdateTools')}`),
      `  ${ansis.cyan('npx zcf check-updates')}     ${ansis.gray(`# ${i18n.t('cli:help.defaults.updateTools')}`)}`,
      `  ${ansis.cyan('npx zcf check')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.checkClaudeCode')}`),
      `  ${ansis.cyan('npx zcf check --code-type claude-code')}`,
      `  ${ansis.cyan('npx zcf check -T cc')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.checkCodex')}`),
      `  ${ansis.cyan('npx zcf check --code-type codex')}`,
      `  ${ansis.cyan('npx zcf check -T cx')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.nonInteractiveModeCicd')}`),
      `  ${ansis.cyan('npx zcf i --skip-prompt --api-type api_key --api-key "sk-ant-..."')}`,
      `  ${ansis.cyan('npx zcf i --skip-prompt --all-lang zh-CN --api-type api_key --api-key "key"')}`,
      `  ${ansis.cyan('npx zcf i --skip-prompt --api-type ccr_proxy')}`,
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
    .option('--lang, -l <lang>', 'ZCF display language (zh-CN, en)')
    .option('--all-lang, -g <lang>', 'Set all language parameters to this value')
    .option('--config-lang, -c <lang>', 'Configuration language (zh-CN, en)')
    .option('--force, -f', 'Force overwrite existing configuration')
    .option('--code-type, -T <codeType>', 'Select code tool type (claude-code, codex, cc, cx)')
    .action(await withLanguageResolution(async (options) => {
      await showMainMenu({ codeType: options.codeType })
    }))

  // Init command
  cli
    .command('init', 'Initialize Claude Code configuration')
    .alias('i')
    .option('--lang, -l <lang>', 'ZCF display language (zh-CN, en)')
    .option('--config-lang, -c <lang>', 'Configuration language (zh-CN, en)')
    .option('--ai-output-lang, -a <lang>', 'AI output language')
    .option('--force, -f', 'Force overwrite existing configuration')
    .option('--skip-prompt, -s', 'Skip all interactive prompts (non-interactive mode)')
    .option('--config-action, -r <action>', `Config handling (new/backup/merge/docs-only/skip), ${i18n.t('cli:help.defaults.prefix')} backup`)
    .option('--api-type, -t <type>', 'API type (auth_token/api_key/ccr_proxy/skip)')
    .option('--api-key, -k <key>', 'API key (used for both API key and auth token types)')
    .option('--api-url, -u <url>', 'Custom API URL')
    .option('--api-model, -M <model>', 'Primary API model (e.g., claude-sonnet-4-5)')
    .option('--api-fast-model, -F <model>', 'Fast API model (e.g., claude-haiku-4-5)')
    .option('--provider, -p <provider>', 'API provider preset (302ai, glm, minimax, kimi, custom)')
    .option('--mcp-services, -m <services>', `Comma-separated MCP services to install (context7,mcp-deepwiki,Playwright,exa), "skip" to skip all, "all" for all non-key services, ${i18n.t('cli:help.defaults.prefix')} all`)
    .option('--workflows, -w <workflows>', `Comma-separated workflows to install (sixStepsWorkflow,featPlanUx,gitWorkflow,bmadWorkflow), "skip" to skip all, "all" for all workflows, ${i18n.t('cli:help.defaults.prefix')} all`)
    .option('--output-styles, -o <styles>', `Comma-separated output styles (engineer-professional,nekomata-engineer,laowang-engineer,default,explanatory,learning), "skip" to skip all, "all" for all custom styles, ${i18n.t('cli:help.defaults.prefix')} all`)
    .option('--default-output-style, -d <style>', `Default output style, ${i18n.t('cli:help.defaults.prefix')} engineer-professional`)
    .option('--all-lang, -g <lang>', 'Set all language parameters to this value')
    .option('--code-type, -T <codeType>', 'Select code tool type (claude-code, codex, cc, cx)')
    .option('--install-cometix-line, -x <value>', `Install CCometixLine statusline tool (true/false), ${i18n.t('cli:help.defaults.prefix')} true`)
    .option('--api-configs <configs>', 'API configurations as JSON string for multiple profiles')
    .option('--api-configs-file <file>', 'Path to JSON file containing API configurations')
    .action(await withLanguageResolution(async (options) => {
      await init(options)
    }))

  // Update command
  cli
    .command('update', 'Update Claude Code prompts only')
    .alias('u')
    .option('--lang, -l <lang>', 'ZCF display language (zh-CN, en)')
    .option('--all-lang, -g <lang>', 'Set all language parameters to this value')
    .option('--config-lang, -c <lang>', 'Configuration language (zh-CN, en)')
    .action(await withLanguageResolution(async (options) => {
      await update(options)
    }))

  // CCR command - Configure Claude Code Router
  cli
    .command('ccr', 'Configure Claude Code Router for model proxy')
    .option('--lang, -l <lang>', 'ZCF display language (zh-CN, en)')
    .option('--all-lang, -g <lang>', 'Set all language parameters to this value')
    .action(await withLanguageResolution(async () => {
      await ccr()
    }))

  // CCU command - Claude Code usage analysis
  cli
    .command('ccu [...args]', 'Run Claude Code usage analysis tool')
    .option('--lang, -l <lang>', 'ZCF display language (zh-CN, en)')
    .option('--all-lang, -g <lang>', 'Set all language parameters to this value')
    .allowUnknownOptions()
    .action(await withLanguageResolution(async (args) => {
      await executeCcusage(args)
    }))

  // Config switch command - Switch Codex provider or Claude Code configuration
  cli
    .command('config-switch [target]', 'Switch Codex provider or Claude Code configuration, or list available configurations')
    .alias('cs')
    .option('--code-type, -T <type>', 'Code tool type (claude-code, codex, cc, cx)')
    .option('--lang <lang>', 'ZCF display language (zh-CN, en)')
    .option('--all-lang, -g <lang>', 'Set all language parameters to this value')
    .option('--list, -l', 'List available configurations')
    .action(await withLanguageResolution(async (target, options) => {
      await configSwitchCommand({
        target,
        codeType: options.codeType,
        list: options.list,
      })
    }))

  // Uninstall command - Remove ZCF configurations and tools
  cli
    .command('uninstall', 'Remove ZCF configurations and tools')
    .option('--lang, -l <lang>', 'ZCF display language (zh-CN, en)')
    .option('--all-lang, -g <lang>', 'Set all language parameters to this value')
    .option('--code-type, -T <codeType>', 'Select code tool type (claude-code, codex, cc, cx)')
    .option('--mode, -m <mode>', 'Uninstall mode (complete/custom/interactive), default: interactive')
    .option('--items, -i <items>', 'Comma-separated items for custom uninstall mode')
    .action(await withLanguageResolution(async (options) => {
      await uninstall(options)
    }))

  // Check updates command
  cli
    .command('check-updates', 'Check and update Claude Code and CCR to latest versions')
    .alias('check')
    .option('--lang, -l <lang>', 'ZCF display language (zh-CN, en)')
    .option('--all-lang, -g <lang>', 'Set all language parameters to this value')
    .option('--code-type, -T <codeType>', 'Select code tool type (claude-code, codex, cc, cx)')
    .option('--skip-prompt, -s', 'Skip all interactive prompts (non-interactive mode)')
    .action(await withLanguageResolution(async (options) => {
      await checkUpdates(options)
    }))

  // Custom help
  cli.help(sections => customizeHelp(sections))
  cli.version(version)
}
