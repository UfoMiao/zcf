import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadExternalAdapters } from '../../../src/adapters/loader'

describe('loadExternalAdapters', () => {
  let adaptersDir: string
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    adaptersDir = mkdtempSync(join(tmpdir(), 'zcf-adapters-'))
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    rmSync(adaptersDir, { recursive: true, force: true })
  })

  it('returns an empty array when the adapters directory does not exist', async () => {
    const result = await loadExternalAdapters(join(adaptersDir, 'missing'))
    expect(result).toEqual([])
  })

  it('loads an adapter from a local module referenced by a TOML manifest', async () => {
    const moduleDir = join(adaptersDir, 'custom')
    mkdirSync(moduleDir)
    const modulePath = join(moduleDir, 'adapter.mjs')
    writeFileSync(
      modulePath,
      `export default { id: 'custom', displayName: 'Custom', aliases: ['c'], homeDir: '/tmp/custom', configFiles: [], templateDir: 'templates/custom', skillSpec: { skillsDir: '/tmp/custom/skills', manifestName: 'SKILL.md', scopes: ['global'] }, isInstalled: async () => true, install: async () => {}, update: async () => {}, uninstall: async () => {}, backup: async () => null };`,
    )

    writeFileSync(
      join(adaptersDir, 'custom.toml'),
      `id = "custom"\ndisplayName = "Custom"\naliases = ["c"]\nmain = "custom/adapter.mjs"\n`,
    )

    const adapters = await loadExternalAdapters(adaptersDir)
    expect(adapters).toHaveLength(1)
    expect(adapters[0].id).toBe('custom')
    expect(adapters[0].aliases).toContain('c')
  })

  it('loads an adapter exported as a factory function', async () => {
    const moduleDir = join(adaptersDir, 'factory')
    mkdirSync(moduleDir)
    const modulePath = join(moduleDir, 'adapter.mjs')
    writeFileSync(
      modulePath,
      `export const createAdapter = (manifest) => ({ id: manifest.id, displayName: manifest.displayName, aliases: manifest.aliases || [], homeDir: '/tmp/factory', configFiles: [], templateDir: 'templates/factory', skillSpec: { skillsDir: '/tmp/factory/skills', manifestName: 'SKILL.md', scopes: ['global'] }, isInstalled: async () => false, install: async () => {}, update: async () => {}, uninstall: async () => {}, backup: async () => null });`,
    )

    writeFileSync(
      join(adaptersDir, 'factory.toml'),
      `id = "factory"\ndisplayName = "Factory"\nmain = "factory/adapter.mjs"\nexport = "createAdapter"\n`,
    )

    const adapters = await loadExternalAdapters(adaptersDir)
    expect(adapters).toHaveLength(1)
    expect(adapters[0].id).toBe('factory')
  })

  it('skips invalid manifests and logs a warning', async () => {
    writeFileSync(join(adaptersDir, 'invalid.toml'), `displayName = "Missing ID"\n`)

    const adapters = await loadExternalAdapters(adaptersDir)
    expect(adapters).toEqual([])
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping invalid adapter manifest'))
  })

  it('skips adapters with broken modules and logs a warning', async () => {
    writeFileSync(
      join(adaptersDir, 'broken.toml'),
      `id = "broken"\ndisplayName = "Broken"\nmain = "broken/adapter.mjs"\n`,
    )

    const adapters = await loadExternalAdapters(adaptersDir)
    expect(adapters).toEqual([])
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load external adapter'))
  })
})
