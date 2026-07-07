import { existsSync, rmSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTimestampedBackup } from '../../../src/adapters/backup'
import { opencodeAdapter } from '../../../src/adapters/opencode'
import { TemplateEngine } from '../../../src/core/template-engine'
import { exists, isDirectory, isFile, readDir } from '../../../src/utils/fs-operations'
import { commandExists } from '../../../src/utils/platform'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  rmSync: vi.fn(),
  copyFileSync: vi.fn(),
  lstatSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  rmdirSync: vi.fn(),
  statSync: vi.fn(),
  unlinkSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

vi.mock('../../../src/utils/platform', () => ({
  commandExists: vi.fn(),
}))

vi.mock('../../../src/utils/fs-operations', () => ({
  exists: vi.fn(),
  readDir: vi.fn(),
  isDirectory: vi.fn(),
  isFile: vi.fn(),
  ensureDir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  copyFile: vi.fn(),
}))

vi.mock('../../../src/core/template-engine', () => ({
  TemplateEngine: vi.fn().mockImplementation(() => ({
    renderConfigFile: vi.fn().mockResolvedValue({ changed: true }),
    renderCommon: vi.fn().mockResolvedValue([{ changed: true }]),
    renderSkill: vi.fn().mockResolvedValue({ changed: true }),
  })),
}))

vi.mock('../../../src/adapters/backup', () => ({
  createTimestampedBackup: vi.fn().mockReturnValue('/home/.opencode/backup/config.json.backup_2026-01-01_00-00-00'),
}))

vi.mock('../../../src/i18n', () => ({
  i18n: { t: vi.fn((key: string) => key) },
}))

const mockedCommandExists = vi.mocked(commandExists)
const mockedExists = vi.mocked(exists)
const mockedReadDir = vi.mocked(readDir)
const mockedIsDirectory = vi.mocked(isDirectory)
const mockedIsFile = vi.mocked(isFile)
const mockedTemplateEngine = vi.mocked(TemplateEngine)
const mockedBackup = vi.mocked(createTimestampedBackup)
const mockedExistsSync = vi.mocked(existsSync)
const mockedRmSync = vi.mocked(rmSync)

describe('opencodeAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedCommandExists.mockResolvedValue(true)
    mockedExists.mockReturnValue(false)
    mockedReadDir.mockReturnValue([])
    mockedIsDirectory.mockReturnValue(false)
    mockedIsFile.mockReturnValue(false)
    mockedExistsSync.mockReturnValue(false)
  })

  it('exposes expected metadata', () => {
    expect(opencodeAdapter.id).toBe('opencode')
    expect(opencodeAdapter.displayName).toBe('OpenCode')
    expect(opencodeAdapter.aliases).toContain('oc')
    expect(opencodeAdapter.templateDir).toBe('templates/opencode')
    expect(opencodeAdapter.configFiles).toHaveLength(1)
    expect(opencodeAdapter.skillSpec.manifestName).toBe('SKILL.md')
  })

  it('reports installed when command exists', async () => {
    mockedCommandExists.mockResolvedValue(true)
    await expect(opencodeAdapter.isInstalled()).resolves.toBe(true)
    expect(mockedCommandExists).toHaveBeenCalledWith('opencode')
  })

  it('reports not installed when command is missing', async () => {
    mockedCommandExists.mockResolvedValue(false)
    await expect(opencodeAdapter.isInstalled()).resolves.toBe(false)
  })

  it('warns on install when opencode CLI is not installed', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockedCommandExists.mockResolvedValue(false)

    await opencodeAdapter.install({ force: false }, { lang: 'en' })

    expect(warnSpy).toHaveBeenCalledWith('opencode:notInstalled')
    warnSpy.mockRestore()
  })

  it('install renders config files, common templates, and skills', async () => {
    mockedExists.mockImplementation((p: string) => p.includes('templates/opencode/skills'))
    mockedReadDir.mockImplementation((p: string) => {
      if (p.includes('templates/opencode/skills'))
        return ['zcf']
      if (p.includes('templates/opencode/skills/zcf'))
        return ['init-project']
      return []
    })
    mockedIsDirectory.mockImplementation((p: string) =>
      p.includes('skills/zcf/init-project') || p.includes('skills/zcf') || p.includes('skills'),
    )
    mockedIsFile.mockImplementation((p: string) => p.includes('SKILL.md'))

    await opencodeAdapter.install({ force: true }, { lang: 'en' })

    const engine = mockedTemplateEngine.mock.results[mockedTemplateEngine.mock.results.length - 1]?.value as any
    expect(mockedTemplateEngine).toHaveBeenCalledWith({ force: true })
    expect(engine.renderConfigFile).toHaveBeenCalledTimes(1)
    expect(engine.renderCommon).toHaveBeenCalledWith('templates/common', opencodeAdapter)
    expect(engine.renderSkill).toHaveBeenCalledTimes(1)
  })

  it('update renders templates without force', async () => {
    await opencodeAdapter.update({}, { lang: 'en' })

    expect(mockedTemplateEngine).toHaveBeenCalledWith({ force: false })
  })

  it('uninstall removes config file and zcf skills when present', async () => {
    mockedExistsSync.mockReturnValue(true)

    await opencodeAdapter.uninstall({}, { lang: 'en' })

    expect(mockedBackup).toHaveBeenCalled()
    expect(mockedRmSync).toHaveBeenCalledWith(opencodeAdapter.configFiles[0].path, { force: true })
    expect(mockedRmSync).toHaveBeenCalledWith(expect.stringContaining('skills/zcf'), { recursive: true, force: true })
  })

  it('uninstall reports skipped when nothing to remove', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockedExistsSync.mockReturnValue(false)

    await opencodeAdapter.uninstall({}, { lang: 'en' })

    expect(logSpy).toHaveBeenCalledWith('opencode:skippedNoConfig')
    logSpy.mockRestore()
  })

  it('backup delegates to createTimestampedBackup', async () => {
    const file = { id: 'config', path: '/home/.opencode/config.json', format: 'json' as const, mergeStrategy: 'merge' as const }
    const result = await opencodeAdapter.backup(file)
    expect(result).toContain('backup_')
    expect(mockedBackup).toHaveBeenCalledWith(file, expect.any(String))
  })
})
