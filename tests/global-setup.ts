import {
  mkdirSync,
  mkdtempSync,
  rmSync,
} from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import {
  applyIsolatedHome,
  ISOLATED_HOME_ENV_KEYS,
  restoreProcessEnv,
  snapshotProcessEnv,
  TEST_HOME_BOOKKEEPING_KEYS,
} from './helpers/isolated-home'

export default function setup(): () => void {
  const realHome = homedir()
  // Capture the host values before isolation; teardown must restore those, not the temp HOME we then delete.
  const originalEnvironment = snapshotProcessEnv([
    ...ISOLATED_HOME_ENV_KEYS,
    ...TEST_HOME_BOOKKEEPING_KEYS,
  ])

  const testRoot = mkdtempSync(join(tmpdir(), 'zcf-vitest-'))
  const testHome = join(testRoot, 'home')
  mkdirSync(testHome, { recursive: true })
  applyIsolatedHome(testHome)
  process.env.ZCF_TEST_REAL_HOME = realHome
  process.env.ZCF_TEST_RUN_HOME = testHome

  return () => {
    restoreProcessEnv(originalEnvironment)
    rmSync(testRoot, { recursive: true, force: true })
  }
}
