/**
 * Type definitions for Claude Code multi-configuration management
 */

export interface ClaudeCodeProfile {
  name: string // Display name
  authType: 'api_key' | 'auth_token' | 'ccr_proxy'
  apiKey?: string // API key (stored in plain text)
  baseUrl?: string // Custom API URL
  // Model configuration
  primaryModel?: string // Default model (maps to ANTHROPIC_MODEL)
  defaultHaikuModel?: string // Maps to ANTHROPIC_DEFAULT_HAIKU_MODEL
  defaultSonnetModel?: string // Maps to ANTHROPIC_DEFAULT_SONNET_MODEL
  defaultOpusModel?: string // Maps to ANTHROPIC_DEFAULT_OPUS_MODEL
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
  name?: string // Profile name (optional - auto-generated from provider if not provided)
  type?: 'api_key' | 'auth_token' | 'ccr_proxy' // Auth type (optional - defaults to api_key when provider is specified)
  key?: string // API key (required for api_key and auth_token, or when provider is custom)
  url?: string // Custom URL (optional - auto-filled from provider preset)
  default?: boolean // Set as default profile (optional)
  primaryModel?: string // Primary model (optional - auto-filled from provider preset, e.g., claude-sonnet-4-5)
  defaultHaikuModel?: string // Maps to ANTHROPIC_DEFAULT_HAIKU_MODEL
  defaultSonnetModel?: string // Maps to ANTHROPIC_DEFAULT_SONNET_MODEL
  defaultOpusModel?: string // Maps to ANTHROPIC_DEFAULT_OPUS_MODEL
  provider?: string // API provider preset name (optional - 302ai, packycode, glm, minimax, kimi, custom)
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
