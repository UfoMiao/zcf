import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { afterAll, beforeAll } from 'vitest'
import { initI18n } from '../src/i18n'
import { applyIsolatedHome } from './helpers/isolated-home'

if (!process.env.ZCF_TEST_HOME)
  throw new Error('ZCF_TEST_HOME must be provided by tests/global-setup.ts')

const fileRoot = mkdtempSync(join(tmpdir(), 'zcf-file-'))
const fileHome = join(fileRoot, 'home')
mkdirSync(fileHome, { recursive: true })
applyIsolatedHome(fileHome)

afterAll(() => {
  rmSync(fileRoot, { recursive: true, force: true })
})

/**
 * Global test setup for i18n initialization
 * This ensures all tests have access to initialized i18n system
 */
beforeAll(async () => {
  // Initialize i18n system for test environment with English locale
  await initI18n('en')
})
