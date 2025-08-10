import ansis from 'ansis';
import type { CAC } from 'cac';
import { version } from '../package.json';
import { init } from './commands/init';
import { showMainMenu } from './commands/menu';
import { update } from './commands/update';
import { executeCcusage } from './commands/ccu';
import { ccr } from './commands/ccr';

export interface CliOptions {
  init?: boolean;
  lang?: 'zh-CN' | 'en';
  configLang?: 'zh-CN' | 'en';
  aiOutputLang?: string;
  force?: boolean;
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
      `  ${ansis.cyan('zcf ccr')}          Configure Claude Code Router / 配置模型代理`,
      `  ${ansis.cyan('zcf ccu')} [args]   Run Claude Code usage analysis / 运行 Claude Code 用量分析`,
      '',
      ansis.gray('  Shortcuts / 快捷方式:'),
      `  ${ansis.cyan('zcf i')}            Quick init / 快速初始化`,
      `  ${ansis.cyan('zcf u')}            Quick update / 快速更新`,
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
      ansis.gray('  # Run Claude Code usage analysis / 运行 Claude Code 用量分析'),
      `  ${ansis.cyan('npx zcf ccu')}               ${ansis.gray('# Daily usage (default)')}`,
      `  ${ansis.cyan('npx zcf ccu monthly --json')}`,
      '',
      ansis.gray('  # Force overwrite with Chinese config / 强制使用中文配置覆盖'),
      `  ${ansis.cyan('npx zcf --init -c zh-CN -f')}`,
      `  ${ansis.cyan('npx zcf --init --config-lang zh-CN --force')}`,
    ].join('\n'),
  });

  return sections;
}