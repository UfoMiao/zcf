/**
 * Type definitions for Claude Code multi-configuration management
 */

export interface ClaudeCodeProfile {
  name: string // Display name
  authType: 'api_key' | 'auth_token' | 'ccr_proxy'
  apiKey?: string // API key (stored in plain text)
  baseUrl?: string // Custom API URL
  primaryModel?: string // Primary model (e.g., claude-sonnet-4-5)
  fastModel?: string // Fast model (e.g., claude-haiku-4-5)
  /**
   * Derived at runtime, not persisted to config file
   */
  id?: string
}

export interface ClaudeCodeConfigData {
  currentProfileId: string // Currently active profile ID
  profiles: Record<string, ClaudeCodeProfile> // Profile collection (key is profile name/slug)
}

export interface ApiConfigDefinition {
  name: string // Profile name (required)
  type: 'api_key' | 'auth_token' | 'ccr_proxy' // Auth type (required)
  key?: string // API key (required for api_key and auth_token)
  url?: string // Custom URL (optional)
  default?: boolean // Set as default profile (optional)
  primaryModel?: string // Primary model (optional, e.g., claude-sonnet-4-5)
  fastModel?: string // Fast model (optional, e.g., claude-haiku-4-5)
}

// Operation result type
export interface OperationResult {
  success: boolean
  error?: string
  backupPath?: string
  addedProfile?: ClaudeCodeProfile
  updatedProfile?: ClaudeCodeProfile
  deletedProfiles?: string[]
  remainingProfiles?: ClaudeCodeProfile[]
  newCurrentProfileId?: string
}

// Config validation error type
export interface ConfigValidationError {
  field: string
  message: string
  value?: any
}

// Config operation type
export type ConfigOperationType = 'add' | 'update' | 'delete' | 'switch' | 'list' | 'sync'
