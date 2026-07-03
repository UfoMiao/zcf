export const MODEL_ENV_KEYS = [
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  // Deprecated but still cleaned to avoid stale values
  'ANTHROPIC_SMALL_FAST_MODEL',
] as const

export type ModelEnvKey = typeof MODEL_ENV_KEYS[number]

export function clearModelEnv(env: Record<string, string | undefined>): void {
  for (const key of MODEL_ENV_KEYS) {
    delete env[key]
  }
}

export const CODEBUDDY_ENV_KEYS = [
  'CODEBUDDY_API_KEY',
  'CODEBUDDY_AUTH_TOKEN',
  'CODEBUDDY_BASE_URL',
  'CODEBUDDY_MODEL',
  'CODEBUDDY_SMALL_FAST_MODEL',
  'CODEBUDDY_BIG_SLOW_MODEL',
  'CODEBUDDY_CODE_SUBAGENT_MODEL',
] as const

export type CodeBuddyEnvKey = typeof CODEBUDDY_ENV_KEYS[number]

export function clearCodeBuddyEnv(env: Record<string, string | undefined>): void {
  for (const key of CODEBUDDY_ENV_KEYS) {
    delete env[key]
  }
}
