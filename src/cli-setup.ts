import type { CAC } from 'cac'
import type { SupportedLang } from './constants'
import ansis from 'ansis'
import { version } from '../package.json'
import { listAgents, registerAllAgents } from './adapters'
import { dispatchCheckUpdates, dispatchConfigSwitch, dispatchInstall, dispatchUninstall, dispatchUpdate } from './commands/agent-dispatch'
import { ccr } from './commands/ccr'
import { executeCcusage } from './commands/ccu'
import { showMainMenu } from './commands/menu'
import { i18n, initI18n } from './i18n'
import { selectScriptLanguage } from './utils/prompts'
import { readZcfConfigAsync } from './utils/zcf-config'

export interface CliOptions {
  lang?: 'zh-CN' | 'en'
  configLang?: 'zh-CN' | 'en'
  aiOutputLang?: string
  force?: boolean
  skipPrompt?: boolean
  agent?: string
  codeType?: string
  // Non-interactive parameters
  configAction?: string
  apiType?: string
  apiKey?: string
  apiUrl?: string
  apiModel?: string
  apiHaikuModel?: string
  apiSonnetModel?: string
  apiOpusModel?: string
  provider?: string
  mcpServices?: string
  workflows?: string
  outputStyles?: string
  defaultOutputStyle?: string
  allLang?: string
  installCometixLine?: string | boolean
  apiConfigs?: string
  apiConfigsFile?: string
}

interface LanguageOptions {
  lang?: string
  allLang?: string
  skipPrompt?: boolean
}

async function resolveAndSwitchLanguage(
  lang?: string,
  options?: { lang?: string, allLang?: string },
  skipPrompt: boolean = false,
): Promise<SupportedLang> {
  const zcfConfig = await readZcfConfigAsync()

  const targetLang
    = (options?.allLang as SupportedLang)
      || (lang as SupportedLang)
      || (options?.lang as SupportedLang)
      || zcfConfig?.preferredLang
      || (skipPrompt ? 'en' : await selectScriptLanguage()) as SupportedLang

  if (i18n.isInitialized && i18n.language !== targetLang) {
    await i18n.changeLanguage(targetLang)
  }

  return targetLang
}

export async function withLanguageResolution<T extends any[]>(
  action: (...args: T) => Promise<void>,
  skipPrompt: boolean = false,
): Promise<(...args: T) => Promise<void>> {
  return async (...args: T) => {
    const options = args[0]
    const languageOptions = extractLanguageOptions(options)
    await resolveAndSwitchLanguage(undefined, languageOptions, skipPrompt || languageOptions.skipPrompt)
    return await action(...args)
  }
}

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

/**
 * Build a human-readable list of supported agents from the registry.
 */
function buildAgentList(): string {
  return listAgents()
    .map((a) => {
      const aliases = a.aliases.length ? ` (${a.aliases.join(', ')})` : ''
      return `${a.id}${aliases}`
    })
    .join(', ')
}

/**
 * Generate CLI help sections dynamically from registered adapters.
 *
 * Adding a new adapter no longer requires editing this file: command
 * descriptions, option lists, and examples are assembled from generic i18n
 * keys and the adapter registry.
 */
export function customizeHelp(sections: any[]): any[] {
  const agentList = buildAgentList()
  const agents = listAgents()

  sections.unshift({
    title: '',
    body: ansis.cyan.bold(`ZCF - Zero-Config Code Flow v${version}`),
  })

  sections.push({
    title: ansis.yellow(i18n.t('cli:help.commands')),
    body: [
      `  ${ansis.cyan('zcf')}              ${i18n.t('cli:help.commandDescriptions.showInteractiveMenuDefault')}`,
      `  ${ansis.cyan('zcf init')} | ${ansis.cyan('i')}     ${i18n.t('cli:help.commandDescriptions.init')}`,
      `  ${ansis.cyan('zcf update')} | ${ansis.cyan('u')}   ${i18n.t('cli:help.commandDescriptions.update')}`,
      `  ${ansis.cyan('zcf config-switch')} | ${ansis.cyan('cs')} ${i18n.t('cli:help.commandDescriptions.configSwitch')}`,
      `  ${ansis.cyan('zcf ccr')}          ${i18n.t('cli:help.commandDescriptions.configureCcrProxy')}`,
      `  ${ansis.cyan('zcf ccu')} [args]   ${i18n.t('cli:help.commandDescriptions.claudeCodeUsageAnalysis')}`,
      `  ${ansis.cyan('zcf uninstall')}     ${i18n.t('cli:help.commandDescriptions.uninstall')}`,
      `  ${ansis.cyan('zcf check-updates')} ${i18n.t('cli:help.commandDescriptions.checkUpdateVersions')}`,
      '',
      ansis.gray(`  ${i18n.t('cli:help.shortcuts')}`),
      `  ${ansis.cyan('zcf i')}            ${i18n.t('cli:help.shortcutDescriptions.quickInit')}`,
      `  ${ansis.cyan('zcf u')}            ${i18n.t('cli:help.shortcutDescriptions.quickUpdate')}`,
      `  ${ansis.cyan('zcf check')}        ${i18n.t('cli:help.shortcutDescriptions.quickCheckUpdates')}`,
    ].join('\n'),
  })

  sections.push({
    title: ansis.yellow(i18n.t('cli:help.section.supportedAgents')),
    body: `  ${ansis.cyan(agentList)}`,
  })

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
      `  ${ansis.green('--api-model, -M')} <model>   ${i18n.t('cli:help.optionDescriptions.apiModel')}`,
      `  ${ansis.green('--api-haiku-model, -H')} <model> ${i18n.t('cli:help.optionDescriptions.apiHaikuModel')}`,
      `  ${ansis.green('--api-sonnet-model, -S')} <model> ${i18n.t('cli:help.optionDescriptions.apiSonnetModel')}`,
      `  ${ansis.green('--api-opus-model, -O')} <model> ${i18n.t('cli:help.optionDescriptions.apiOpusModel')}`,
      `  ${ansis.green('--ai-output-lang, -A')} <lang> ${i18n.t('cli:help.optionDescriptions.aiOutputLanguage')}`,
      `  ${ansis.green('--all-lang, -g')} <lang>     ${i18n.t('cli:help.optionDescriptions.setAllLanguageParams')}`,
      `  ${ansis.green('--config-action, -r')} <action> ${i18n.t('cli:help.optionDescriptions.configHandling')} (${i18n.t('cli:help.defaults.prefix')} backup)`,
      `  ${ansis.green('--mcp-services, -m')} <list>  ${i18n.t('cli:help.optionDescriptions.mcpServices')} (${i18n.t('cli:help.defaults.prefix')} all non-key services)`,
      `  ${ansis.green('--workflows, -w')} <list>    ${i18n.t('cli:help.optionDescriptions.workflows')} (${i18n.t('cli:help.defaults.prefix')} all workflows)`,
      `  ${ansis.green('--output-styles, -o')} <styles> ${i18n.t('cli:help.optionDescriptions.outputStyles')} (${i18n.t('cli:help.defaults.prefix')} all custom styles)`,
      `  ${ansis.green('--default-output-style, -d')} <style> ${i18n.t('cli:help.optionDescriptions.defaultOutputStyle')} (${i18n.t('cli:help.defaults.prefix')} engineer-professional)`,
      `  ${ansis.green('--agent, -a')} <agent>      ${i18n.t('cli:help.optionDescriptions.agent')} (${agentList})`,
      `  ${ansis.green('--code-type, -T')} <type>   ${i18n.t('cli:help.optionDescriptions.codeToolTypeAlias')} (${agentList})`,
      `  ${ansis.green('--install-cometix-line, -x')} <value> ${i18n.t('cli:help.optionDescriptions.installStatuslineTool')} (${i18n.t('cli:help.defaults.prefix')} true)`,
    ].join('\n'),
  })

  const exampleLines: string[] = [
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
  ]

  // Add per-agent examples that update automatically when a new adapter is registered.
  for (const agent of agents) {
    const firstAlias = agent.aliases[0] || agent.id
    exampleLines.push(
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.initAgent', { agent: agent.displayName })}`),
      `  ${ansis.cyan(`npx zcf init --agent ${agent.id}`)}`,
      `  ${ansis.cyan(`npx zcf init -a ${firstAlias}`)}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.updateAgent', { agent: agent.displayName })}`),
      `  ${ansis.cyan(`npx zcf update --agent ${agent.id}`)}`,
      `  ${ansis.cyan(`npx zcf update -a ${firstAlias}`)}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.checkAgent', { agent: agent.displayName })}`),
      `  ${ansis.cyan(`npx zcf check --agent ${agent.id}`)}`,
      `  ${ansis.cyan(`npx zcf check -a ${firstAlias}`)}`,
      '',
    )
  }

  exampleLines.push(
    ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.nonInteractiveModeCicd')}`),
    `  ${ansis.cyan('npx zcf i --skip-prompt --api-type api_key --api-key "sk-ant-..."')}`,
    `  ${ansis.cyan('npx zcf i --skip-prompt --all-lang zh-CN --api-type api_key --api-key "key"')}`,
    `  ${ansis.cyan('npx zcf i --skip-prompt --api-type ccr_proxy')}`,
    '',
  )

  sections.push({
    title: ansis.yellow(i18n.t('cli:help.examples')),
    body: exampleLines.join('\n'),
  })

  return sections
}

export async function setupCommands(cli: CAC): Promise<void> {
  await registerAllAgents()

  try {
    const zcfConfig = await readZcfConfigAsync()
    await initI18n(zcfConfig?.preferredLang || 'en')
  }
  catch {
  }

  const agentOption = `--agent, -a <agent>`
  const codeTypeOption = `--code-type, -T <codeType>`
  const langOption = `--lang, -l <lang>`
  const allLangOption = `--all-lang, -g <lang>`
  const configLangOption = `--config-lang, -c <lang>`

  cli
    .command('', 'Show interactive menu (default)')
    .option(langOption, 'ZCF display language (zh-CN, en)')
    .option(allLangOption, 'Set all language parameters to this value')
    .option(configLangOption, 'Configuration language (zh-CN, en)')
    .option('--force, -f', 'Force overwrite existing configuration')
    .option(agentOption, i18n.t('cli:help.optionDescriptions.agent'))
    .option(codeTypeOption, i18n.t('cli:help.optionDescriptions.codeToolTypeAlias'))
    .action(await withLanguageResolution(async (options) => {
      await showMainMenu({ codeType: options.agent || options.codeType })
    }))

  cli
    .command('init', 'Initialize agent configuration')
    .alias('i')
    .option(langOption, 'ZCF display language (zh-CN, en)')
    .option(configLangOption, 'Configuration language (zh-CN, en)')
    .option('--ai-output-lang, -A <lang>', 'AI output language')
    .option('--force, -f', 'Force overwrite existing configuration')
    .option('--skip-prompt, -s', 'Skip all interactive prompts (non-interactive mode)')
    .option('--config-action, -r <action>', `Config handling (new/backup/merge/docs-only/skip), ${i18n.t('cli:help.defaults.prefix')} backup`)
    .option('--api-type, -t <type>', 'API type (auth_token/api_key/ccr_proxy/skip)')
    .option('--api-key, -k <key>', 'API key (used for both API key and auth token types)')
    .option('--api-url, -u <url>', 'Custom API URL')
    .option('--api-model, -M <model>', 'Primary API model')
    .option('--api-haiku-model, -H <model>', 'Default Haiku model')
    .option('--api-sonnet-model, -S <model>', 'Default Sonnet model')
    .option('--api-opus-model, -O <model>', 'Default Opus model')
    .option('--provider, -p <provider>', 'API provider preset')
    .option('--mcp-services, -m <services>', `Comma-separated MCP services, "skip" to skip all, "all" for all non-key services`)
    .option('--workflows, -w <workflows>', `Comma-separated workflows, "skip" to skip all, "all" for all workflows`)
    .option('--output-styles, -o <styles>', `Comma-separated output styles, "skip" to skip all, "all" for all custom styles`)
    .option('--default-output-style, -d <style>', `Default output style`)
    .option(allLangOption, 'Set all language parameters to this value')
    .option(agentOption, i18n.t('cli:help.optionDescriptions.agent'))
    .option(codeTypeOption, i18n.t('cli:help.optionDescriptions.codeToolTypeAlias'))
    .option('--install-cometix-line, -x <value>', `Install CCometixLine statusline tool (true/false)`)
    .option('--api-configs, -C <configs>', 'API configurations as JSON string for multiple profiles')
    .option('--api-configs-file, -F <file>', 'Path to JSON file containing API configurations')
    .action(await withLanguageResolution(async (options) => {
      await dispatchInstall(options)
    }))

  cli
    .command('update', 'Update agent workflow files')
    .alias('u')
    .option(langOption, 'ZCF display language (zh-CN, en)')
    .option(allLangOption, 'Set all language parameters to this value')
    .option(configLangOption, 'Configuration language (zh-CN, en)')
    .option(agentOption, i18n.t('cli:help.optionDescriptions.agent'))
    .option(codeTypeOption, i18n.t('cli:help.optionDescriptions.codeToolTypeAlias'))
    .action(await withLanguageResolution(async (options) => {
      await dispatchUpdate(options)
    }))

  cli
    .command('ccr', 'Configure Claude Code Router for model proxy')
    .option(langOption, 'ZCF display language (zh-CN, en)')
    .option(allLangOption, 'Set all language parameters to this value')
    .action(await withLanguageResolution(async () => {
      await ccr()
    }))

  cli
    .command('ccu [...args]', 'Run Claude Code usage analysis tool')
    .option(langOption, 'ZCF display language (zh-CN, en)')
    .option(allLangOption, 'Set all language parameters to this value')
    .allowUnknownOptions()
    .action(await withLanguageResolution(async (args) => {
      await executeCcusage(args)
    }))

  cli
    .command('config-switch [target]', 'Switch agent configuration or list available configurations')
    .alias('cs')
    .option(agentOption, i18n.t('cli:help.optionDescriptions.agent'))
    .option(codeTypeOption, i18n.t('cli:help.optionDescriptions.codeToolTypeAlias'))
    .option('--lang, -L <lang>', 'ZCF display language (zh-CN, en)')
    .option(allLangOption, 'Set all language parameters to this value')
    .option('--list', 'List available configurations')
    .action(await withLanguageResolution(async (target, options) => {
      await dispatchConfigSwitch(target, options)
    }))

  cli
    .command('uninstall', 'Remove agent configurations and tools')
    .option(langOption, 'ZCF display language (zh-CN, en)')
    .option(allLangOption, 'Set all language parameters to this value')
    .option(agentOption, i18n.t('cli:help.optionDescriptions.agent'))
    .option(codeTypeOption, i18n.t('cli:help.optionDescriptions.codeToolTypeAlias'))
    .option('--mode, -m <mode>', 'Uninstall mode (complete/custom/interactive), default: interactive')
    .option('--items, -i <items>', 'Comma-separated items for custom uninstall mode')
    .action(await withLanguageResolution(async (options) => {
      await dispatchUninstall(options)
    }))

  cli
    .command('check-updates', 'Check and update agent tools to latest versions')
    .alias('check')
    .option(langOption, 'ZCF display language (zh-CN, en)')
    .option(allLangOption, 'Set all language parameters to this value')
    .option(agentOption, i18n.t('cli:help.optionDescriptions.agent'))
    .option(codeTypeOption, i18n.t('cli:help.optionDescriptions.codeToolTypeAlias'))
    .option('--skip-prompt, -s', 'Skip all interactive prompts (non-interactive mode)')
    .action(await withLanguageResolution(async (options) => {
      await dispatchCheckUpdates(options)
    }))

  cli.help(sections => customizeHelp(sections))
  cli.version(version)
}
