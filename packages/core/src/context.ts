import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { dirname, join } from 'pathe'

import type { AdapterContext } from './adapters/types'
import { processRunner } from './exec/runner'
import { readTextIfExists } from './io/fs'

/**
 * The built-in skill templates as an absolute folder: next to the running code when bundled
 * (`dist/templates/skills`), or one level up when running from source (`packages/core/templates/skills`).
 */
function builtinSkillsDir(): string | undefined {
  const here = dirname(fileURLToPath(import.meta.url))
  for (const candidate of [join(here, 'templates', 'skills'), join(here, '..', 'templates', 'skills')])
    if (existsSync(candidate)) return candidate
  return undefined
}

/**
 * The locale of the environment, by the same rule the CLI's interface follows: the first of
 * `LC_ALL`, `LC_MESSAGES` and `LANG` that is set, else the system locale, mapping Chinese to
 * `zh-CN` and everything else to `en`.
 */
function detectLocale(env: Record<string, string | undefined>): string {
  const locale = env.LC_ALL || env.LC_MESSAGES || env.LANG || new Intl.DateTimeFormat().resolvedOptions().locale
  return locale.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export function createContext(overrides: Partial<AdapterContext> = {}): AdapterContext {
  return {
    home: homedir(),
    platform: process.platform,
    env: process.env,
    runner: processRunner,
    readFile: readTextIfExists,
    builtinSkillsDir: builtinSkillsDir(),
    locale: detectLocale(process.env),
    ...overrides,
  }
}
