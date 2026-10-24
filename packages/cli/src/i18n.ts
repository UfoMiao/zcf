import process from 'node:process'

export const LANGS = ['en', 'zh-CN'] as const
export type Lang = (typeof LANGS)[number]

const en = {
  'cli.description': "One config for all your AI coding tools, written as each tool's own settings",
  'cli.option.file': 'Path to the ZCF config file',
  'cli.option.tools':
    'Comma-separated tools to work on, overriding the config (claude-code, codex, gemini-cli, opencode)',
  'cli.option.lang': 'Display language (en, zh-CN)',
  'cli.option.yes': 'Apply without asking',
  'cli.option.help': 'Display this message',
  'cli.option.version': 'Display version number',
  'cli.help.usage': 'Usage',
  'cli.help.commands': 'Commands',
  'cli.help.options': 'Options',
  'cli.help.moreInfo': 'For more info, run any command with the `--help` flag',
  'cli.command.plan': 'Show what applying the config would change',
  'cli.command.apply': 'Install the selected tools and write their native config',
  'cli.command.update': 'Update installed tools with their own updaters',
  'cli.configMissing': 'No ZCF config at {path}. Create one, or pass --file.',
  'cli.configInvalid': 'The ZCF config at {path} is not valid:',
  'cli.fileInvalid': '{path} is not valid {format} (line {line}, column {column}). Fix it and run again.',
  'configIssue.syntax': 'JSON syntax error at line {line}, column {column}',
  'configIssue.expected': 'must be {expected}',
  'configIssue.missing': 'is required',
  'configIssue.empty': 'must not be empty',
  'configIssue.url': 'must be a valid URL',
  'configIssue.mcpServerName': 'MCP server names may only contain letters, digits, "_" and "-"',
  'configIssue.invalid': 'is not valid',
  'cli.unknownTools': 'Unknown tools: {tools}. Choose from {known}.',
  'cli.unknownOption': 'Unknown option {option}. Run zcf --help to see the options.',
  'cli.optionValueMissing': 'The option {option} needs a value.',
  'cli.unusedArgs': 'Unexpected arguments: {args}. Run zcf --help to see the usage.',
  'cli.badArguments': '{message}. Run zcf --help to see the usage.',
  'cli.unexpectedError': 'Unexpected error: {message}',
  'cli.noTools': 'No tools selected. List them under "tools" in the config, or pass --tools.',
  'cli.nothingToDo': 'Everything is already up to date.',
  'cli.confirmHint': 'Nothing was changed. Run again with --yes to apply.',
  'cli.applyDone': 'Done. {done} steps applied, {unchanged} already up to date.',
  'cli.applyFailed': 'Not every tool finished ({count} failed). See the errors above.',
  'cli.backups': 'Previous versions of changed files are in {path}',
  'cli.unchanged': 'already up to date',
  'cli.skipped': 'skipped after an earlier failure',
  'cli.newFile': 'new file',
  'step.install': 'Install {tool}',
  'step.update': 'Update {tool}',
  'step.provider': 'Use provider "{provider}"',
  'step.mcpAdd': 'Add MCP server "{name}"',
  'step.mcpRemove': 'Remove the old MCP server "{name}" before adding it again',
  'step.skillsAdd': 'Install skills from {source}',
  'notice.toolNotSupported': '{tool} is not supported yet.',
  'notice.notInstalled': '{tool} is not installed.',
  'notice.providerMissingProtocol': 'The provider has no "{protocol}" settings, so {tool} keeps its current provider.',
} as const

export type MessageKey = keyof typeof en

const zhCN: Record<MessageKey, string> = {
  'cli.description': '一份配置，写入所有 AI 编程工具各自的原生设置',
  'cli.option.file': 'ZCF 配置文件路径',
  'cli.option.tools': '要处理的工具，用逗号分隔，会覆盖配置里的选择（claude-code, codex, gemini-cli, opencode）',
  'cli.option.lang': '显示语言（en, zh-CN）',
  'cli.option.yes': '不再确认，直接应用',
  'cli.option.help': '显示帮助信息',
  'cli.option.version': '显示版本号',
  'cli.help.usage': '用法',
  'cli.help.commands': '命令',
  'cli.help.options': '选项',
  'cli.help.moreInfo': '在任一命令后加上 `--help` 查看详情',
  'cli.command.plan': '预览应用配置后会改动的内容',
  'cli.command.apply': '安装所选工具，并写入它们的原生配置',
  'cli.command.update': '用各工具自带的更新命令更新已安装的工具',
  'cli.configMissing': '在 {path} 找不到 ZCF 配置。请先创建，或用 --file 指定。',
  'cli.configInvalid': '{path} 的 ZCF 配置有误：',
  'cli.fileInvalid': '{path} 不是有效的 {format}（第 {line} 行，第 {column} 列）。修复后再运行。',
  'configIssue.syntax': 'JSON 语法错误：第 {line} 行，第 {column} 列',
  'configIssue.expected': '应为 {expected}',
  'configIssue.missing': '缺少此项',
  'configIssue.empty': '不能为空',
  'configIssue.url': '必须是有效的 URL',
  'configIssue.mcpServerName': 'MCP 服务名只能包含字母、数字、"_" 和 "-"',
  'configIssue.invalid': '无效',
  'cli.unknownTools': '无法识别的工具：{tools}。可选：{known}。',
  'cli.unknownOption': '未知选项 {option}。运行 zcf --help 查看可用选项。',
  'cli.optionValueMissing': '选项 {option} 缺少值。',
  'cli.unusedArgs': '多余的参数：{args}。运行 zcf --help 查看用法。',
  'cli.badArguments': '{message}。运行 zcf --help 查看用法。',
  'cli.unexpectedError': '意外错误：{message}',
  'cli.noTools': '没有选择工具。请在配置的 "tools" 中列出，或使用 --tools。',
  'cli.nothingToDo': '所有内容都已是最新。',
  'cli.confirmHint': '尚未做任何改动。加上 --yes 再运行一次即可应用。',
  'cli.applyDone': '完成。已应用 {done} 步，{unchanged} 步本来就是最新。',
  'cli.applyFailed': '有 {count} 个工具没有完成，请查看上方的错误。',
  'cli.backups': '改动前的文件已备份到 {path}',
  'cli.unchanged': '已是最新',
  'cli.skipped': '前一步失败，已跳过',
  'cli.newFile': '新文件',
  'step.install': '安装 {tool}',
  'step.update': '更新 {tool}',
  'step.provider': '使用供应商「{provider}」',
  'step.mcpAdd': '添加 MCP 服务「{name}」',
  'step.mcpRemove': '先移除旧的 MCP 服务「{name}」再重新添加',
  'step.skillsAdd': '从 {source} 安装技能',
  'notice.toolNotSupported': '暂不支持 {tool}。',
  'notice.notInstalled': '{tool} 尚未安装。',
  'notice.providerMissingProtocol': '供应商没有 "{protocol}" 配置，{tool} 将保留当前的供应商。',
}

const english: Record<string, string> = en
const dictionaries: Record<Lang, Record<string, string>> = { en: english, 'zh-CN': zhCN }

export function isLang(value: unknown): value is Lang {
  return LANGS.some(lang => lang === value)
}

/** `--lang` wins, then ZCF_LANG, then the system locale. */
export function detectLang(argv: readonly string[], env: NodeJS.ProcessEnv = process.env): Lang {
  const index = argv.findIndex(arg => arg === '--lang' || arg.startsWith('--lang='))
  const flag = index === -1 ? undefined : argv[index]!.includes('=') ? argv[index]!.split('=')[1] : argv[index + 1]
  if (isLang(flag)) return flag
  if (isLang(env.ZCF_LANG)) return env.ZCF_LANG
  const locale = env.LC_ALL || env.LC_MESSAGES || env.LANG || new Intl.DateTimeFormat().resolvedOptions().locale
  return locale.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export type Translate = (key: string, params?: Record<string, string | number>) => string

export function createTranslator(lang: Lang): Translate {
  const dictionary = dictionaries[lang]
  return (key, params = {}) => {
    const template = dictionary[key] ?? english[key] ?? key
    return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
  }
}
