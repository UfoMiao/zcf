import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

export const ISOLATED_HOME_ENV_KEYS = [
  'HOME',
  'USERPROFILE',
  'CODEX_HOME',
  'CLAUDE_CONFIG_DIR',
  'XDG_CONFIG_HOME',
  'XDG_CACHE_HOME',
  'npm_config_cache',
  'NPM_CONFIG_CACHE',
  'npm_config_prefix',
  'NPM_CONFIG_PREFIX',
  'npm_config_userconfig',
  'NPM_CONFIG_USERCONFIG',
  'HOMEBREW_CACHE',
  'HOMEBREW_TEMP',
  'HOMEBREW_NO_AUTO_UPDATE',
  'ZCF_TEST_HOME',
] as const

export const TEST_HOME_BOOKKEEPING_KEYS = [
  'ZCF_TEST_REAL_HOME',
  'ZCF_TEST_RUN_HOME',
] as const

export function snapshotProcessEnv(keys: readonly string[]): Map<string, string | undefined> {
  return new Map(keys.map(key => [key, process.env[key]]))
}

export function restoreProcessEnv(snapshot: ReadonlyMap<string, string | undefined>): void {
  for (const [key, value] of snapshot) {
    if (value === undefined)
      delete process.env[key]
    else
      process.env[key] = value
  }
}

export function applyIsolatedHome(testHome: string): Record<string, string> {
  mkdirSync(testHome, { recursive: true })

  const isolatedEnvironment = {
    HOME: testHome,
    USERPROFILE: testHome,
    CODEX_HOME: join(testHome, '.codex'),
    CLAUDE_CONFIG_DIR: join(testHome, '.claude'),
    XDG_CONFIG_HOME: join(testHome, '.config'),
    XDG_CACHE_HOME: join(testHome, '.cache'),
    npm_config_cache: join(testHome, '.npm', 'cache'),
    NPM_CONFIG_CACHE: join(testHome, '.npm', 'cache'),
    npm_config_prefix: join(testHome, '.npm-global'),
    NPM_CONFIG_PREFIX: join(testHome, '.npm-global'),
    npm_config_userconfig: join(testHome, '.npmrc'),
    NPM_CONFIG_USERCONFIG: join(testHome, '.npmrc'),
    HOMEBREW_CACHE: join(testHome, '.cache', 'Homebrew'),
    HOMEBREW_TEMP: join(testHome, '.cache', 'Homebrew', 'tmp'),
    HOMEBREW_NO_AUTO_UPDATE: '1',
    ZCF_TEST_HOME: testHome,
  }

  for (const [key, value] of Object.entries(isolatedEnvironment))
    process.env[key] = value

  return isolatedEnvironment
}
