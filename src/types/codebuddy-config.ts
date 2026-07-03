/**
 * Type definitions for CodeBuddy configuration
 */

export interface CodeBuddyProfile {
  name: string
  authType: 'api_key' | 'auth_token'
  apiKey?: string
  baseUrl?: string
  // Model configuration (CodeBuddy-specific keys)
  primaryModel?: string // Maps to CODEBUDDY_MODEL
  smallFastModel?: string // Maps to CODEBUDDY_SMALL_FAST_MODEL
  bigSlowModel?: string // Maps to CODEBUDDY_BIG_SLOW_MODEL
  codeSubagentModel?: string // Maps to CODEBUDDY_CODE_SUBAGENT_MODEL
  /**
   * Derived at runtime, not persisted to config file
   */
  id?: string
}
