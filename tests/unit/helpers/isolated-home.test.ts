import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyIsolatedHome,
  ISOLATED_HOME_ENV_KEYS,
  restoreProcessEnv,
  snapshotProcessEnv,
  TEST_HOME_BOOKKEEPING_KEYS,
} from '../../helpers/isolated-home'

describe('isolated home environment snapshot', () => {
  const createdRoots: string[] = []

  afterEach(() => {
    for (const root of createdRoots.splice(0))
      rmSync(root, { recursive: true, force: true })
  })

  it('restores the exact values captured before isolation rewrites HOME', () => {
    const keys = [...ISOLATED_HOME_ENV_KEYS, ...TEST_HOME_BOOKKEEPING_KEYS]
    const originalHome = process.env.HOME
    const snapshot = snapshotProcessEnv(keys)
    const extraRoot = mkdtempSync(join(tmpdir(), 'zcf-isolated-home-'))
    createdRoots.push(extraRoot)

    applyIsolatedHome(join(extraRoot, 'home'))
    expect(process.env.HOME).not.toBe(originalHome)

    restoreProcessEnv(snapshot)
    expect(process.env.HOME).toBe(originalHome)
    for (const key of keys)
      expect(process.env[key]).toBe(snapshot.get(key))
  })
})
