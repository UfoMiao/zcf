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
export function builtinSkillsDir(from: string = dirname(fileURLToPath(import.meta.url))): string | undefined {
  for (const candidate of [join(from, 'templates', 'skills'), join(from, '..', 'templates', 'skills')])
    if (existsSync(candidate)) return candidate
  return undefined
}

export function createContext(overrides: Partial<AdapterContext> = {}): AdapterContext {
  const env = overrides.env ?? process.env
  return {
    home: homedir(),
    platform: process.platform,
    env,
    runner: processRunner,
    readFile: readTextIfExists,
    builtinSkillsDir: builtinSkillsDir(),
    ...overrides,
  }
}
