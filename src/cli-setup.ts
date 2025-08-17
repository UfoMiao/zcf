import ansis from 'ansis';
import type { CAC } from 'cac';
import { version } from '../package.json';
import { init } from './commands/init';
import { showMainMenu } from './commands/menu';
import { update } from './commands/update';
import { executeCcusage } from './commands/ccu';
import { ccr } from './commands/ccr';
import { checkUpdates } from './commands/check-updates';

export interface CliOptions {
  init?: boolean;
  lang?: 'zh-CN' | 'en';
  configLang?: 'zh-CN' | 'en';
  aiOutputLang?: string;
  force?: boolean;
  skipPrompt?: boolean;
  // Non-interactive parameters
  configAction?: string; // default: backup
  apiType?: string;
  apiKey?: string; // Used for both API key and auth token
  apiUrl?: string;
  mcpServices?: string; // default: all non-key services, "skip" to skip all
  workflows?: string; // default: all workflows, "skip" to skip all
  aiPersonality?: string; // default: professional
  allLang?: string; // New: unified language parameter
  installCometixLine?: string | boolean; // New: CCometixLine installation control, default: true
}

export function setupCommands(cli: CAC) {
  // Default command - show menu
  cli
    .command('[lang]', 'Show interactive menu (default)')
    .option('--init', 'Run full initialization directly')
    .option('--config-lang, -c <lang>', 'Configuration language (zh-CN, en)')
    .option('--force, -f', 'Force overwrite existing configuration')
    .action(async (lang, options) => {
      await handleDefaultCommand(lang, options);
    });

  // Init command
  cli
    .command('init', 'Initialize Claude Code configuration')
    .alias('i')
    .option('--lang, -l <lang>', 'ZCF display language (zh-CN, en)')
    .option('--config-lang, -c <lang>', 'Configuration language (zh-CN, en)')
    .option('--ai-output-lang, -a <lang>', 'AI output language')
    .option('--force, -f', 'Force overwrite existing configuration')
    .option('--skip-prompt, -s', 'Skip all interactive prompts (non-interactive mode)')
    .option('--config-action, -o <action>', 'Config handling (new/backup/merge/docs-only/skip), default: backup')
    .option('--api-type, -t <type>', 'API type (auth_token/api_key/ccr_proxy/skip)')
    .option('--api-key, -k <key>', 'API key (used for both API key and auth token types)')
    .option('--api-url, -u <url>', 'Custom API URL')
    .option('--mcp-services, -m <services>', 'Comma-separated MCP services to install (context7,mcp-deepwiki,Playwright,exa), "skip" to skip all, "all" for all non-key services, default: all')
    .option('--workflows, -w <workflows>', 'Comma-separated workflows to install (sixStepsWorkflow,featPlanUx,gitWorkflow,bmadWorkflow), "skip" to skip all, "all" for all workflows, default: all')
    .option('--ai-personality, -p <type>', 'AI personality type (professional,catgirl,friendly,mentor,custom), default: professional')
    .option('--all-lang, -g <lang>', 'Set all language parameters to this value')
    .option('--install-cometix-line, -x <value>', 'Install CCometixLine statusline tool (true/false), default: true')
    .action(async (options) => {
      await handleInitCommand(options);
    });

  // Update command
  cli
    .command('update', 'Update Claude Code prompts only')
    .alias('u')
    .option('--config-lang, -c <lang>', 'Configuration language (zh-CN, en)')
    .action(async (options) => {
      await handleUpdateCommand(options);
    });

  // CCR command - Configure Claude Code Router
  cli
    .command('ccr', 'Configure Claude Code Router for model proxy')
    .option('--lang, -l <lang>', 'Display language (zh-CN, en)')
    .action(async (options) => {
      await ccr({ lang: options.lang });
    });

  // CCU command - Claude Code usage analysis
  cli
    .command('ccu [...args]', 'Run Claude Code usage analysis tool')
    .allowUnknownOptions()
    .action(async (args) => {
      await executeCcusage(args);
    });

  // Check updates command
  cli
    .command('check-updates', 'Check and update Claude Code and CCR to latest versions')
    .alias('check')
    .option('--lang, -l <lang>', 'Display language (zh-CN, en)')
    .action(async (options) => {
      await checkUpdates({ lang: options.lang });
    });

  // Custom help
  cli.help((sections) => customizeHelp(sections));
  cli.version(version);
}

export async function handleDefaultCommand(lang: string | undefined, options: CliOptions) {
  if (options.init) {
    // Backward compatibility: run init directly
    await init({
      lang: (lang || options.lang) as 'zh-CN' | 'en' | undefined,
      configLang: options.configLang,
      force: options.force,
    });
  } else {
    // Show menu by default
    await showMainMenu();
  }
}

export async function handleInitCommand(options: CliOptions) {
  await init({
    lang: options.lang,
    configLang: options.configLang,
    aiOutputLang: options.aiOutputLang,
    force: options.force,
    skipPrompt: options.skipPrompt,
    configAction: options.configAction as 'new' | 'backup' | 'merge' | 'docs-only' | 'skip' | undefined,
    apiType: options.apiType as 'auth_token' | 'api_key' | 'ccr_proxy' | 'skip' | undefined,
    apiKey: options.apiKey,
    apiUrl: options.apiUrl,
    mcpServices: options.mcpServices,
    workflows: options.workflows,
    aiPersonality: options.aiPersonality,
    allLang: options.allLang,
    installCometixLine: options.installCometixLine,
  });
}

export async function handleUpdateCommand(options: { configLang?: string }) {
  await update({ configLang: options.configLang as 'zh-CN' | 'en' | undefined });
}

export function customizeHelp(sections: any[]) {
  // Add custom header
  sections.unshift({
    title: '',
    body: ansis.cyan.bold(`ZCF - Zero-Config Claude-Code Flow v${version}`),
  });

  // Add commands section with aliases
  sections.push({
    title: ansis.yellow('Commands / 命令:'),
    body: [
      `  ${ansis.cyan('zcf')}              Show interactive menu (default) / 显示交互式菜单（默认）`,
      `  ${ansis.cyan('zcf init')} | ${ansis.cyan(
        'i'
      )}     Initialize Claude Code configuration / 初始化 Claude Code 配置`,
      `  ${ansis.cyan('zcf update')} | ${ansis.cyan('u')}   Update workflow-related md files / 仅更新工作流相关md`,
      `  ${ansis.cyan('zcf ccr')}          Configure Claude Code Router for model proxy / 配置模型路由代理`,
      `  ${ansis.cyan('zcf ccu')} [args]   Claude Code usage statistics analysis / Claude Code 用量统计分析`,
      `  ${ansis.cyan('zcf check-updates')} Check and update to latest versions / 检查并更新到最新版本`,
      '',
      ansis.gray('  Shortcuts / 快捷方式:'),
      `  ${ansis.cyan('zcf i')}            Quick init / 快速初始化`,
      `  ${ansis.cyan('zcf u')}            Quick update / 快速更新`,
      `  ${ansis.cyan('zcf check')}        Quick check updates / 快速检查更新`,
    ].join('\n'),
  });

  // Add options section
  sections.push({
    title: ansis.yellow('Options / 选项:'),
    body: [
      `  ${ansis.green('--init')}                    Run full initialization directly / 直接运行完整初始化`,
      `  ${ansis.green('--config-lang, -c')} <lang>  Configuration language / 配置语言 (zh-CN, en)`,
      `  ${ansis.green('--force, -f')}               Force overwrite / 强制覆盖现有配置`,
      `  ${ansis.green('--help, -h')}                Display help / 显示帮助`,
      `  ${ansis.green('--version, -v')}             Display version / 显示版本`,
      '',
      ansis.gray('  Non-interactive mode (for CI/CD) / 非交互模式（适用于CI/CD）:'),
      `  ${ansis.green('--skip-prompt, -s')}         Skip all prompts / 跳过所有交互提示`,
      `  ${ansis.green('--api-type, -t')} <type>      API type / API类型 (auth_token, api_key, ccr_proxy, skip)`,
      `  ${ansis.green('--api-key, -k')} <key>       API key (for both types) / API密钥（适用于所有类型）`,
      `  ${ansis.green('--api-url, -u')} <url>       Custom API URL / 自定义API地址`,
      `  ${ansis.green('--ai-output-lang, -a')} <lang> AI output language / AI输出语言`,
      `  ${ansis.green('--all-lang, -g')} <lang>     Set all language params / 统一设置所有语言参数`,
      `  ${ansis.green('--config-action, -o')} <action> Config handling / 配置处理 (default: backup)`,
      `  ${ansis.green('--mcp-services, -m')} <list>  MCP services / MCP服务 (default: all non-key services)`,
      `  ${ansis.green('--workflows, -w')} <list>    Workflows / 工作流 (default: all workflows)`,
      `  ${ansis.green('--ai-personality, -p')} <type> AI personality / AI个性 (default: professional)`,
      `  ${ansis.green('--install-cometix-line, -x')} <value> Install statusline tool / 安装状态栏工具 (default: true)`,
    ].join('\n'),
  });

  // Add examples section
  sections.push({
    title: ansis.yellow('Examples / 示例:'),
    body: [
      ansis.gray('  # Show interactive menu / 显示交互式菜单'),
      `  ${ansis.cyan('npx zcf')}`,
      '',
      ansis.gray('  # Run full initialization / 运行完整初始化'),
      `  ${ansis.cyan('npx zcf init')}`,
      `  ${ansis.cyan('npx zcf i')}`,
      `  ${ansis.cyan('npx zcf --init')}`,
      '',
      ansis.gray('  # Update workflow-related md files only / 仅更新工作流相关md文件'),
      `  ${ansis.cyan('npx zcf u')}`,
      '',
      ansis.gray('  # Configure Claude Code Router / 配置 Claude Code Router'),
      `  ${ansis.cyan('npx zcf ccr')}`,
      '',
      ansis.gray('  # Run Claude Code usage analysis / 运行 Claude Code 用量分析'),
      `  ${ansis.cyan('npx zcf ccu')}               ${ansis.gray('# Daily usage (default)')}`,
      `  ${ansis.cyan('npx zcf ccu monthly --json')}`,
      '',
      ansis.gray('  # Check and update tools / 检查并更新工具'),
      `  ${ansis.cyan('npx zcf check-updates')}     ${ansis.gray('# Update Claude Code, CCR and CCometixLine')}`,
      `  ${ansis.cyan('npx zcf check')}`,
      '',
      ansis.gray('  # Non-interactive mode (CI/CD) / 非交互模式（CI/CD）'),
      `  ${ansis.cyan('npx zcf i --skip-prompt --api-type api_key --api-key "sk-ant-..."')}`,
      `  ${ansis.cyan('npx zcf i --skip-prompt --all-lang zh-CN --api-type api_key --api-key "key"')}`,
      `  ${ansis.cyan('npx zcf i --skip-prompt --api-type ccr_proxy')}`,
      '',
      ansis.gray('  # Force overwrite with Chinese config / 强制使用中文配置覆盖'),
      `  ${ansis.cyan('npx zcf --init -c zh-CN -f')}`,
      `  ${ansis.cyan('npx zcf --init --config-lang zh-CN --force')}`,
    ].join('\n'),
  });

  return sections;
}
