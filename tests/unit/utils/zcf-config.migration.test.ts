import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    renameSync: vi.fn(),
    rmSync: vi.fn(),
  }
})

vi.mock('../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
}))

describe('zcf-config migration', () => {
  const home = homedir()
  const newDir = join(home, '.ufomiao', 'zcf')
  const newPath = join(newDir, 'config.json')
  const claudeLegacy = join(home, '.claude', '.zcf-config.json')
  const legacyJson = join(home, '.zcf.json')

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('migrates config from claude directory to new location', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === newPath)
        return false
      if (path === claudeLegacy)
        return true
      if (path === legacyJson)
        return false
      if (path === newDir)
        return false
      return false
    })

    const { migrateZcfConfigIfNeeded } = await import('../../../src/utils/zcf-config')
    const result = await migrateZcfConfigIfNeeded()

    expect(mkdirSync).toHaveBeenCalledWith(newDir, { recursive: true })
    expect(renameSync).toHaveBeenCalledWith(claudeLegacy, newPath)
    expect(result).toEqual({ migrated: true, source: claudeLegacy, target: newPath, removed: [] })
    expect(rmSync).not.toHaveBeenCalled()
  })

  it('removes legacy file when new config already exists', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === newPath)
        return true
      if (path === claudeLegacy)
        return true
      if (path === legacyJson)
        return false
      return false
    })

    const { migrateZcfConfigIfNeeded } = await import('../../../src/utils/zcf-config')
    const result = await migrateZcfConfigIfNeeded()

    expect(renameSync).not.toHaveBeenCalled()
    expect(rmSync).toHaveBeenCalledWith(claudeLegacy, { force: true })
    expect(result).toEqual({ migrated: false, target: newPath, removed: [claudeLegacy] })
  })

  it('migrates from legacy json when claude file missing', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === newPath)
        return false
      if (path === claudeLegacy)
        return false
      if (path === legacyJson)
        return true
      if (path === newDir)
        return false
      return false
    })

    const { migrateZcfConfigIfNeeded } = await import('../../../src/utils/zcf-config')
    const result = await migrateZcfConfigIfNeeded()

    expect(renameSync).toHaveBeenCalledWith(legacyJson, newPath)
    expect(result).toEqual({ migrated: true, source: legacyJson, target: newPath, removed: [] })
  })
})
