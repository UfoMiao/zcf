import type { InstallMethod } from './utils/platform'

export interface McpService {
  id: string
  name: string
  description: string
  requiresApiKey: boolean
  apiKeyPrompt?: string
  apiKeyPlaceholder?: string
  apiKeyEnvVar?: string
  config: McpServerConfig
}

export interface McpServerConfig {
  type: 'stdio' | 'sse'
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  startup_timeout_ms?: number
}

export interface ClaudeConfiguration {
  mcpServers: Record<string, McpServerConfig>
  hasCompletedOnboarding?: boolean
  customApiKeyResponses?: {
    approved: string[]
    rejected: string[]
  }
  env?: Record<string, string>
  primaryApiKey?: string
  installMethod?: InstallMethod
}
