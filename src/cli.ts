#!/usr/bin/env node
import cac from 'cac'
import ansis from 'ansis'
import { version } from '../package.json'
import { init } from './commands/init'
import { update } from './commands/update'
import { showMainMenu } from './commands/menu'

const cli = cac('zcf')

// Default command - show menu
cli
  .command('[lang]', 'Show interactive menu (default)')
  .option('--init', 'Run full initialization directly')
  .option('--config-lang, -c <lang>', 'Configuration language (zh-CN, en)')
  .option('--force, -f', 'Force overwrite existing configuration')
  .action(async (lang, options) => {
    if (options.init) {
      // Backward compatibility: run init directly
      await init({
        lang: lang || options.lang,
        configLang: options.configLang,
        force: options.force
      })
    } else {
      // Show menu by default
      await showMainMenu()
    }
  })

// Update command
cli
  .command('update', 'Update Claude Code prompts only')
  .alias('u')
  .option('--config-lang, -c <lang>', 'Configuration language (zh-CN, en)')
  .action(async (options) => {
    await update({ configLang: options.configLang })
  })

// Custom help with aliases
cli.help((sections) => {
  // Add custom header
  sections.unshift({
    title: '',
    body: ansis.cyan.bold(`ZCF - Zero-Config Claude-Code Flow v${version}`)
  })
  
  // Add commands section with aliases
  sections.push({
    title: ansis.yellow('Commands / 命令:'),
    body: [
      `  ${ansis.cyan('zcf')}              Show interactive menu (default) / 显示交互式菜单（默认）`,
      `  ${ansis.cyan('zcf update')} | ${ansis.cyan('u')}   Update workflow-related md files / 仅更新工作流相关md`,
      '',
      ansis.gray('  Shortcut / 快捷方式:'),
      `  ${ansis.cyan('zcf u')}            Quick update / 快速更新`
    ].join('\n')
  })
  
  // Add options section
  sections.push({
    title: ansis.yellow('Options / 选项:'),
    body: [
      `  ${ansis.green('--init')}                    Run full initialization directly / 直接运行完整初始化`,
      `  ${ansis.green('--config-lang, -c')} <lang>  Configuration language / 配置语言 (zh-CN, en)`,
      `  ${ansis.green('--force, -f')}               Force overwrite / 强制覆盖现有配置`,
      `  ${ansis.green('--help, -h')}                Display help / 显示帮助`,
      `  ${ansis.green('--version, -v')}             Display version / 显示版本`
    ].join('\n')
  })
  
  // Add examples section
  sections.push({
    title: ansis.yellow('Examples / 示例:'),
    body: [
      ansis.gray('  # Show interactive menu / 显示交互式菜单'),
      `  ${ansis.cyan('npx zcf')}`,
      '',
      ansis.gray('  # Run full initialization directly / 直接运行完整初始化'),
      `  ${ansis.cyan('npx zcf --init')}`,
      '',
      ansis.gray('  # Update workflow-related md files only / 仅更新工作流相关md文件'),
      `  ${ansis.cyan('npx zcf u')}`,
      '',
      ansis.gray('  # Force overwrite with Chinese config / 强制使用中文配置覆盖'),
      `  ${ansis.cyan('npx zcf --init -c zh-CN -f')}`,
      `  ${ansis.cyan('npx zcf --init --config-lang zh-CN --force')}`
    ].join('\n')
  })
  
  return sections
})

cli.version(version)
cli.parse()