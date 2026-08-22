import type { CodeToolDefinition } from './types'
import { homedir } from 'node:os'
import { join } from 'pathe'

export const CODE_TOOL_DEFINITIONS = [
  {
    id: 'claude-code',
    displayName: 'Claude Code',
    displayNameKey: 'common:claudeCode',
    aliases: ['cc'],
    paths: {
      homeDir: join(homedir(), '.claude'),
      configFiles: [
        { id: 'settings', path: join(homedir(), '.claude', 'settings.json'), format: 'json', mergeStrategy: 'merge' },
        { id: 'claude-json', path: join(homedir(), '.claude.json'), format: 'json', mergeStrategy: 'merge' },
      ],
      memoryFile: join(homedir(), '.claude', 'CLAUDE.md'),
      skillsDir: join(homedir(), '.claude', 'skills'),
      templateDir: 'templates/claude-code',
      agentsDir: join(homedir(), '.claude', 'agents'),
      legacyWorkflowPaths: [
        join(homedir(), '.claude', 'commands', 'workflow.md'),
        join(homedir(), '.claude', 'commands', 'feat.md'),
        join(homedir(), '.claude', 'commands', 'zcf'),
        join(homedir(), '.claude', 'agents', 'planner.md'),
        join(homedir(), '.claude', 'agents', 'ui-ux-designer.md'),
      ],
    },
    skillsAgents: ['claude-code', 'universal'],
    installation: {
      command: 'claude',
      npmPackage: '@anthropic-ai/claude-code',
      homebrewCask: 'claude-code',
      supportedMethods: ['npm', 'homebrew', 'curl', 'powershell', 'cmd'],
      recommendedMethods: {
        macos: ['homebrew', 'curl', 'npm'],
        linux: ['curl', 'npm'],
        windows: ['powershell', 'npm'],
      },
      nativeCommands: {
        curl: {
          command: 'bash',
          args: ['-c', 'curl -fsSL https://claude.ai/install.sh | bash'],
        },
        powershell: {
          command: 'powershell',
          args: ['-Command', 'irm https://claude.ai/install.ps1 | iex'],
        },
        cmd: {
          command: 'cmd',
          args: ['/c', 'curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd'],
        },
      },
      storesInstallMethodInMcpConfig: true,
    },
  },
  {
    id: 'codex',
    displayName: 'Codex',
    displayNameKey: 'common:codex',
    aliases: ['cx'],
    paths: {
      homeDir: join(homedir(), '.codex'),
      configFiles: [
        { id: 'config', path: join(homedir(), '.codex', 'config.toml'), format: 'toml', mergeStrategy: 'merge' },
        { id: 'auth', path: join(homedir(), '.codex', 'auth.json'), format: 'json', mergeStrategy: 'merge' },
      ],
      memoryFile: join(homedir(), '.codex', 'AGENTS.md'),
      skillsDir: join(homedir(), '.codex', 'skills'),
      templateDir: 'templates/codex',
    },
    skillsAgents: ['codex'],
    installation: {
      command: 'codex',
      npmPackage: '@openai/codex',
      homebrewCask: 'codex',
      supportedMethods: ['npm', 'homebrew'],
      recommendedMethods: {
        macos: ['homebrew', 'npm'],
        linux: ['npm'],
        windows: ['npm'],
      },
    },
  },
] as const

export type CodeToolType = (typeof CODE_TOOL_DEFINITIONS)[number]['id']

export const DEFAULT_CODE_TOOL_TYPE: CodeToolType = 'claude-code'

export function getCodeToolDefinition(id: CodeToolType): CodeToolDefinition {
  return CODE_TOOL_DEFINITIONS.find(definition => definition.id === id)!
}
