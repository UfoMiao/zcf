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
  /** Model configuration: opus, sonnet, opusplan, or custom. Custom models should use env variables instead. */
  model?: 'opus' | 'sonnet' | 'opusplan' | 'custom'
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
