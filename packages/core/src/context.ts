import { homedir } from 'node:os'
import process from 'node:process'

import type { AdapterContext } from './adapters/types'
import { processRunner } from './exec/runner'
import { readTextIfExists } from './io/fs'

export function createContext(overrides: Partial<AdapterContext> = {}): AdapterContext {
  return {
    home: homedir(),
    platform: process.platform,
    env: process.env,
    runner: processRunner,
    readFile: readTextIfExists,
    ...overrides,
  }
}
