/**
 * Claude Code settings.json configuration types
 */

/**
 * StatusLine configuration for Claude Code
 */
export interface StatusLineConfig {
  type: 'command'
  command: string
  padding?: number
}

export interface ClaudeSettings {
  /** Model configuration: opus, sonnet, sonnet[1m], or custom. Custom models should use env variables instead. */
  model?: 'opus' | 'sonnet' | 'sonnet[1m]' | 'custom'
  env?: {
    ANTHROPIC_API_KEY?: string
    ANTHROPIC_AUTH_TOKEN?: string
    ANTHROPIC_BASE_URL?: string
    [key: string]: string | undefined
  }
  permissions?: {
    allow?: string[]
  }
  chat?: {
    alwaysApprove?: string[]
  }
  experimental?: {
    [key: string]: any
  }
  statusLine?: StatusLineConfig
  outputStyle?: string
  [key: string]: any
}

/**
 * API configuration for Claude Code
 */
export interface ApiConfig {
  url: string
  key: string
  authType?: 'auth_token' | 'api_key'
}

/**
 * Installation method types for code tools
 */
export type InstallMethod = 'npm' | 'homebrew' | 'curl' | 'powershell' | 'cmd'

/**
 * Installation method option with metadata
 */
export interface InstallMethodOption {
  method: InstallMethod
  label: string
  description: string
  command: string
  args?: string[]
  platforms: ('windows' | 'macos' | 'linux' | 'wsl')[]
  recommended?: boolean
}
