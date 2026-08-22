import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTimestampedBackup } from '../../../src/code-tools/backup'
import { codexAdapter } from '../../../src/code-tools/codex/adapter'
import { importCodexProviderDefinitions } from '../../../src/code-tools/codex/providers'
import { handleCodexInteractiveSwitch, listCodexProvidersWithDisplay } from '../../../src/code-tools/configuration-ui'
import {
  checkCodexUpdate,
  isCodexInstalled,
  listCodexProviders,
  readCodexConfig,
  runCodexFullInit,
  runCodexUninstall,
  runCodexUpdate,
  switchCodexProvider,
} from '../../../src/utils/code-tools/codex'
import { readZcfConfig, updateZcfConfig } from '../../../src/utils/zcf-config'

vi.mock('../../../src/utils/code-tools/codex', () => ({
  checkCodexUpdate: vi.fn(),
  isCodexInstalled: vi.fn(),
  listCodexProviders: vi.fn(),
  readCodexConfig: vi.fn(),
  runCodexFullInit: vi.fn(),
  runCodexUninstall: vi.fn(),
  runCodexUpdate: vi.fn(),
  switchCodexProvider: vi.fn(),
}))
vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
}))
vi.mock('../../../src/code-tools/backup', () => ({
  createTimestampedBackup: vi.fn(),
}))
vi.mock('../../../src/code-tools/codex/providers', () => ({
  importCodexProviderDefinitions: vi.fn(),
}))
vi.mock('../../../src/code-tools/configuration-ui', () => ({
  handleCodexInteractiveSwitch: vi.fn(),
  listCodexProvidersWithDisplay: vi.fn(),
}))
vi.mock('../../../src/code-tools/multi-config', () => ({
  handleMultiConfigurations: vi.fn(),
}))
vi.mock('../../../src/i18n', () => ({
  i18n: {
    language: 'en',
    t: vi.fn((key: string) => key),
  },
}))

describe('codex adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(readZcfConfig).mockReturnValue(null)
    vi.mocked(runCodexFullInit).mockResolvedValue('en')
  })

  it('maps each CLI API mode and workflow shape into the legacy initializer', async () => {
    await codexAdapter.init({
      apiConfigs: [{ id: 'one' }] as any,
      workflows: true,
      skipPrompt: true,
    }, { lang: 'en' })
    await codexAdapter.init({
      apiType: 'auth_token',
      workflows: 'workflow-a',
    }, { lang: 'en' })
    await codexAdapter.init({
      apiType: 'api_key',
      apiKey: 'secret',
      apiUrl: 'https://example.test',
      apiModel: 'model-a',
      workflows: ['workflow-b'],
      outputStyles: false,
    }, { lang: 'en' })
    await codexAdapter.init({
      apiType: 'skip',
      workflows: false,
    }, { lang: 'en' })

    expect(runCodexFullInit).toHaveBeenNthCalledWith(1, expect.objectContaining({
      apiMode: 'skip',
      workflows: [],
    }))
    expect(runCodexFullInit).toHaveBeenNthCalledWith(2, expect.objectContaining({
      apiMode: 'official',
      workflows: ['workflow-a'],
    }))
    expect(runCodexFullInit).toHaveBeenNthCalledWith(3, expect.objectContaining({
      apiMode: 'custom',
      customApiConfig: {
        type: 'api_key',
        token: 'secret',
        baseUrl: 'https://example.test',
        model: 'model-a',
      },
      workflows: ['workflow-b'],
      systemPromptStyle: false,
    }))
    expect(runCodexFullInit).toHaveBeenNthCalledWith(4, expect.objectContaining({
      apiMode: 'skip',
      workflows: false,
    }))
    expect(updateZcfConfig).toHaveBeenCalledTimes(4)
  })

  it('keeps Codex -o skip from writing a system prompt and ignores explicit styles', async () => {
    await expect(codexAdapter.validateInitOptions({
      skipPrompt: true,
      outputStyles: 'skip',
    })).resolves.toBeUndefined()
    await expect(codexAdapter.validateInitOptions({
      skipPrompt: true,
      outputStyles: 'engineer-professional',
      defaultOutputStyle: 'engineer-professional',
      installCometixLine: true,
    })).resolves.toBeUndefined()

    await codexAdapter.init({ skipPrompt: true, outputStyles: 'skip' }, { lang: 'en' })
    await codexAdapter.init({
      skipPrompt: true,
      outputStyles: 'engineer-professional',
      defaultOutputStyle: 'engineer-professional',
    }, { lang: 'en' })

    expect(runCodexFullInit).toHaveBeenNthCalledWith(1, expect.objectContaining({
      systemPromptStyle: false,
    }))
    expect(runCodexFullInit).toHaveBeenNthCalledWith(2, expect.objectContaining({
      systemPromptStyle: undefined,
    }))
  })

  it('pins skip-prompt init to a single backup and restores the env afterward', async () => {
    vi.mocked(runCodexFullInit).mockImplementation(async () => {
      expect(process.env.ZCF_CODEX_SKIP_PROMPT_SINGLE_BACKUP).toBe('true')
      return 'en'
    })

    await codexAdapter.init({ skipPrompt: true }, { lang: 'en' })

    expect(process.env.ZCF_CODEX_SKIP_PROMPT_SINGLE_BACKUP).toBeUndefined()
    expect(runCodexFullInit).toHaveBeenCalledTimes(1)
  })

  it('does not pin a backup when skip-prompt is off', async () => {
    vi.mocked(runCodexFullInit).mockImplementation(async () => {
      expect(process.env.ZCF_CODEX_SKIP_PROMPT_SINGLE_BACKUP).toBeUndefined()
      return 'en'
    })

    await codexAdapter.init({}, { lang: 'en' })

    expect(process.env.ZCF_CODEX_SKIP_PROMPT_SINGLE_BACKUP).toBeUndefined()
  })

  it('uses persisted language fallbacks and records resolved output language', async () => {
    vi.mocked(readZcfConfig).mockReturnValue({
      templateLang: 'zh-CN',
      aiOutputLang: 'zh-CN',
    } as any)
    vi.mocked(runCodexFullInit).mockResolvedValue(undefined as any)

    await codexAdapter.init({}, { lang: 'en' })

    expect(updateZcfConfig).toHaveBeenCalledWith(expect.objectContaining({
      templateLang: 'zh-CN',
      aiOutputLang: 'zh-CN',
      codeToolType: 'codex',
    }))
  })

  it('delegates lifecycle, backup, providers, updates and configuration operations', async () => {
    vi.mocked(isCodexInstalled).mockResolvedValue(true)
    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en' } as any)
    vi.mocked(createTimestampedBackup).mockReturnValue('/tmp/backup')
    vi.mocked(checkCodexUpdate).mockResolvedValue({
      needsUpdate: true,
      currentVersion: '1.0.0',
      latestVersion: '2.0.0',
    } as any)
    vi.mocked(readCodexConfig).mockReturnValue({
      modelProvider: 'provider-a',
      modelProviderCommented: false,
    } as any)
    vi.mocked(listCodexProviders).mockResolvedValue([{
      id: 'provider-a',
      name: 'Provider A',
      baseUrl: 'https://example.test',
    }] as any)

    await expect(codexAdapter.detectInstalled()).resolves.toBe(true)
    await codexAdapter.update({ skipPrompt: true }, { lang: 'en' })
    await codexAdapter.uninstall({}, { lang: 'en' })
    const configFile = codexAdapter.definition.paths.configFiles[0]!
    const context = { lang: 'en' as const }
    await expect(codexAdapter.backup?.(configFile)).resolves.toBe('/tmp/backup')
    await expect(codexAdapter.checkUpdates?.(context)).resolves.toEqual({
      hasUpdate: true,
      currentVersion: '1.0.0',
      latestVersion: '2.0.0',
    })
    await codexAdapter.updateTools?.(true, { lang: 'en' })
    await codexAdapter.providers?.importDefinitions([], context)
    await expect(codexAdapter.configurations?.list(context)).resolves.toEqual([{
      id: 'provider-a',
      name: 'Provider A',
      description: 'https://example.test',
      isActive: true,
    }])
    await codexAdapter.configurations?.switch('provider-a', context)
    await codexAdapter.configurations?.displayList?.(context)
    await codexAdapter.configurations?.interactiveSwitch?.(context)

    expect(runCodexUpdate).toHaveBeenNthCalledWith(1, false, true)
    expect(runCodexUpdate).toHaveBeenNthCalledWith(2, false, true)
    expect(runCodexUninstall).toHaveBeenCalled()
    expect(createTimestampedBackup).toHaveBeenCalledWith(configFile, codexAdapter.definition.paths.homeDir)
    expect(importCodexProviderDefinitions).toHaveBeenCalledWith([])
    expect(switchCodexProvider).toHaveBeenCalledWith('provider-a')
    expect(listCodexProvidersWithDisplay).toHaveBeenCalled()
    expect(handleCodexInteractiveSwitch).toHaveBeenCalled()
  })
})
