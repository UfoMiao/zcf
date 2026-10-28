import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { dirname, join } from 'pathe'

import type { AdapterContext } from './adapters/types'
import { processRunner } from './exec/runner'
import { readTextIfExists } from './io/fs'

/**
 * The built-in templates as an absolute folder: next to the running code when bundled
 * (`dist/templates`), or one level up when running from source (`packages/core/templates`).
 */
export function builtinTemplatesRoot(from: string = dirname(fileURLToPath(import.meta.url))): string | undefined {
  for (const candidate of [join(from, 'templates'), join(from, '..', 'templates')])
    if (existsSync(candidate)) return candidate
  return undefined
}

/** The built-in skill templates, such as `<templates>/skills`, when ZCF ships them. */
export function builtinSkillsDir(from: string = dirname(fileURLToPath(import.meta.url))): string | undefined {
  const root = builtinTemplatesRoot(from)
  return root === undefined ? undefined : join(root, 'skills')
}

/** The built-in agent templates, such as `<templates>/agents`, when ZCF ships them. */
export function builtinAgentsDir(from: string = dirname(fileURLToPath(import.meta.url))): string | undefined {
  const root = builtinTemplatesRoot(from)
  return root === undefined ? undefined : join(root, 'agents')
}

/** The built-in output-style templates, such as `<templates>/output-styles`, when ZCF ships them. */
export function builtinOutputStylesDir(from: string = dirname(fileURLToPath(import.meta.url))): string | undefined {
  const root = builtinTemplatesRoot(from)
  return root === undefined ? undefined : join(root, 'output-styles')
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
    builtinAgentsDir: builtinAgentsDir(),
    builtinOutputStylesDir: builtinOutputStylesDir(),
    ...overrides,
  }
}
