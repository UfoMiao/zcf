import { beforeEach, describe, expect, it, vi } from 'vitest'
import { codexAdapter } from '../../../src/adapters/codex'
import * as codex from '../../../src/utils/code-tools/codex'

vi.mock('../../../src/utils/code-tools/codex', () => ({
  runCodexFullInit: vi.fn(),
  runCodexUpdate: vi.fn(),
  runCodexUninstall: vi.fn(),
  isCodexInstalled: vi.fn(),
  listCodexProviders: vi.fn(),
  switchCodexProvider: vi.fn(),
  checkCodexUpdate: vi.fn(),
}))

const runCodexFullInit = vi.mocked(codex.runCodexFullInit)
const runCodexUpdate = vi.mocked(codex.runCodexUpdate)
const runCodexUninstall = vi.mocked(codex.runCodexUninstall)
const isCodexInstalled = vi.mocked(codex.isCodexInstalled)
const listCodexProviders = vi.mocked(codex.listCodexProviders)
const switchCodexProvider = vi.mocked(codex.switchCodexProvider)
const checkCodexUpdate = vi.mocked(codex.checkCodexUpdate)

describe('codexAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    runCodexFullInit.mockResolvedValue('en')
    runCodexUpdate.mockResolvedValue(true)
    runCodexUninstall.mockResolvedValue(undefined)
    isCodexInstalled.mockResolvedValue(true)
    listCodexProviders.mockResolvedValue([{ id: 'openai', name: 'OpenAI' }] as any)
    switchCodexProvider.mockResolvedValue(true)
    checkCodexUpdate.mockResolvedValue({
      installed: true,
      currentVersion: '1.0.0',
      latestVersion: '1.1.0',
      needsUpdate: true,
    })
  })

  it('exposes expected metadata', () => {
    expect(codexAdapter.id).toBe('codex')
    expect(codexAdapter.displayName).toBe('Codex')
    expect(codexAdapter.aliases).toContain('cx')
    expect(codexAdapter.templateDir).toBe('templates/codex')
  })

  it('reports installation status', async () => {
    const result = await codexAdapter.isInstalled()
    expect(result).toBe(true)
  })

  it('delegates install to runCodexFullInit with mapped options', async () => {
    await codexAdapter.install(
      { skipPrompt: true, apiType: 'api_key', apiKey: 'sk-xxx', apiModel: 'gpt-5' },
      { lang: 'en' },
    )

    expect(runCodexFullInit).toHaveBeenCalledWith(
      expect.objectContaining({
        skipPrompt: true,
        apiMode: 'custom',
        customApiConfig: expect.objectContaining({ token: 'sk-xxx', model: 'gpt-5' }),
      }),
    )
  })

  it('delegates update to runCodexUpdate', async () => {
    await codexAdapter.update({ skipPrompt: true }, { lang: 'en' })
    expect(runCodexUpdate).toHaveBeenCalledWith(false, true)
  })

  it('delegates uninstall to runCodexUninstall', async () => {
    await codexAdapter.uninstall({}, { lang: 'en' })
    expect(runCodexUninstall).toHaveBeenCalled()
  })

  it('lists providers as configurations', async () => {
    const configs = await codexAdapter.listConfigurations?.()
    expect(configs).toEqual([{ id: 'openai', name: 'OpenAI' }])
  })

  it('switches provider configuration', async () => {
    await codexAdapter.switchConfiguration?.('openai', { lang: 'en' })
    expect(switchCodexProvider).toHaveBeenCalledWith('openai')
  })

  it('checks for updates', async () => {
    const result = await codexAdapter.checkUpdates?.({ lang: 'en' })
    expect(result).toEqual({
      hasUpdate: true,
      currentVersion: '1.0.0',
      latestVersion: '1.1.0',
    })
  })
})
