import type { ClaudeSettings, StatusLineConfig } from '../../src/types/config'

/**
 * Test helper functions for StatusLine configuration testing
 */

export function createMockTemplateSettings(statusLine?: StatusLineConfig): ClaudeSettings {
  return {
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    env: {
      DISABLE_TELEMETRY: '1',
      DISABLE_ERROR_REPORTING: '1',
    },
    permissions: {
      allow: ['Bash', 'Read', 'Write'],
    },
    ...(statusLine && { statusLine }),
  }
}

export function createMockExistingSettings(
  customStatusLine?: StatusLineConfig,
  customEnv?: Record<string, string>,
): ClaudeSettings {
  return {
    model: 'opus',
    env: {
      ANTHROPIC_API_KEY: 'user-secret-key',
      ...customEnv,
    },
    permissions: {
      allow: ['Bash', 'Read'],
    },
    ...(customStatusLine && { statusLine: customStatusLine }),
  }
}

export const MOCK_STATUS_LINE_CONFIGS = {
  unix: {
    type: 'command' as const,
    command: '~/.claude/ccline/ccline',
    padding: 0,
  },
  windows: {
    type: 'command' as const,
    command: '%USERPROFILE%\\.claude\\ccline\\ccline.exe',
    padding: 0,
  },
  custom: {
    type: 'command' as const,
    command: 'custom-statusline-command',
    padding: 2,
  },
}
