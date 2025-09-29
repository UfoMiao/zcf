import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    copyFileSync: vi.fn(),
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
  const newPath = join(newDir, 'config.toml')
  const claudeLegacy = join(home, '.claude', '.zcf-config.json')
  const legacyJson = join(home, '.zcf.json')

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.mocked(renameSync).mockImplementation(() => undefined)
    vi.mocked(copyFileSync).mockImplementation(() => undefined)
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
    const result = migrateZcfConfigIfNeeded()

    expect(mkdirSync).toHaveBeenCalledWith(newDir, { recursive: true })
    expect(renameSync).toHaveBeenCalledWith(claudeLegacy, newPath)
    expect(result).toEqual({ migrated: true, source: claudeLegacy, target: newPath, removed: [] })
    expect(rmSync).not.toHaveBeenCalled()
  })

  it('falls back to copy when rename fails with EXDEV', async () => {
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

    vi.mocked(renameSync).mockImplementation(() => {
      const error = new Error('exdev') as NodeJS.ErrnoException
      error.code = 'EXDEV'
      throw error
    })

    const { migrateZcfConfigIfNeeded } = await import('../../../src/utils/zcf-config')
    const result = migrateZcfConfigIfNeeded()

    expect(mkdirSync).toHaveBeenCalledWith(newDir, { recursive: true })
    expect(renameSync).toHaveBeenCalledWith(claudeLegacy, newPath)
    expect(copyFileSync).toHaveBeenCalledWith(claudeLegacy, newPath)
    expect(rmSync).toHaveBeenCalledWith(claudeLegacy, { force: true })
    expect(result).toEqual({ migrated: true, source: claudeLegacy, target: newPath, removed: [] })
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
    const result = migrateZcfConfigIfNeeded()

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
    const result = migrateZcfConfigIfNeeded()

    expect(renameSync).toHaveBeenCalledWith(legacyJson, newPath)
    expect(result).toEqual({ migrated: true, source: legacyJson, target: newPath, removed: [] })
  })
})
