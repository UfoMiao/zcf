/**
 * Claude Code settings.json configuration types
 */

export interface ClaudeSettings {
  model?: 'opus' | 'sonnet';
  env?: {
    ANTHROPIC_API_KEY?: string;
    ANTHROPIC_AUTH_TOKEN?: string;
    ANTHROPIC_BASE_URL?: string;
    [key: string]: string | undefined;
  };
  permissions?: {
    allow?: string[];
  };
  chat?: {
    alwaysApprove?: string[];
  };
  experimental?: {
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * API configuration for Claude Code
 */
export interface ApiConfig {
  url: string;
  key: string;
  authType?: 'auth_token' | 'api_key';
}