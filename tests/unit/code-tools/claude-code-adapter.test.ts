import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTimestampedBackup } from '../../../src/code-tools/backup'
import { claudeCodeAdapter } from '../../../src/code-tools/claude-code/adapter'
import { runClaudeCodeInit } from '../../../src/code-tools/claude-code/init'
import { createClaudeCodeProviderProfile, importClaudeProviderDefinitions } from '../../../src/code-tools/claude-code/legacy-init'
import { runClaudeCodeUninstall } from '../../../src/code-tools/claude-code/uninstall'
import {
  handleClaudeCodeDirectSwitch,
  handleClaudeCodeInteractiveSwitch,
  listClaudeCodeProfiles,
} from '../../../src/code-tools/configuration-ui'
import { checkAndUpdateTools } from '../../../src/utils/auto-updater'
import { ClaudeCodeConfigManager } from '../../../src/utils/claude-code-config-manager'
import { updatePromptOnly } from '../../../src/utils/config-operations'
import { isClaudeCodeInstalled } from '../../../src/utils/installer'
import { resolveAiOutputLanguage, resolveTemplateLanguage } from '../../../src/utils/prompts'
import { checkClaudeCodeVersionAndPrompt } from '../../../src/utils/version-checker'
import { selectAndInstallWorkflows } from '../../../src/utils/workflow-installer'
import { readZcfConfig, updateZcfConfig } from '../../../src/utils/zcf-config'

vi.mock('../../../src/utils/installer', () => ({
  isClaudeCodeInstalled: vi.fn(),
}))
vi.mock('../../../src/code-tools/claude-code/init', () => ({
  runClaudeCodeInit: vi.fn(),
}))
vi.mock('../../../src/code-tools/claude-code/uninstall', () => ({
  runClaudeCodeUninstall: vi.fn(),
}))
vi.mock('../../../src/code-tools/backup', () => ({
  createTimestampedBackup: vi.fn(),
}))
vi.mock('../../../src/utils/auto-updater', () => ({
  checkAndUpdateTools: vi.fn(),
}))
vi.mock('../../../src/code-tools/claude-code/legacy-init', () => ({
  importClaudeProviderDefinitions: vi.fn(),
  createClaudeCodeProviderProfile: vi.fn(),
}))
vi.mock('../../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    readConfig: vi.fn(),
  },
}))
vi.mock('../../../src/code-tools/configuration-ui', () => ({
  handleClaudeCodeDirectSwitch: vi.fn(),
  handleClaudeCodeInteractiveSwitch: vi.fn(),
  listClaudeCodeProfiles: vi.fn(),
}))
vi.mock('../../../src/utils/config-operations', () => ({
  updatePromptOnly: vi.fn(),
}))
vi.mock('../../../src/utils/prompts', () => ({
  resolveAiOutputLanguage: vi.fn(),
  resolveTemplateLanguage: vi.fn(),
}))
vi.mock('../../../src/utils/version-checker', () => ({
  checkClaudeCodeVersionAndPrompt: vi.fn(),
}))
vi.mock('../../../src/utils/workflow-installer', () => ({
  selectAndInstallWorkflows: vi.fn(),
}))
vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
}))
vi.mock('../../../src/i18n', () => ({
  i18n: {
    language: 'en',
    t: vi.fn((key: string) => key),
  },
}))

describe('claude Code adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resolveTemplateLanguage).mockResolvedValue('en')
    vi.mocked(resolveAiOutputLanguage).mockResolvedValue('en')
    vi.mocked(readZcfConfig).mockReturnValue(null)
  })

  it('delegates initialization and uninstallation with their shared context', async () => {
    const context = { lang: 'en' as const, skipPrompt: true }
    const initOptions = { skipPrompt: true }
    const uninstallOptions = { mode: 'complete' as const }

    await claudeCodeAdapter.init(initOptions, context)
    await claudeCodeAdapter.uninstall(uninstallOptions, context)

    expect(runClaudeCodeInit).toHaveBeenCalledWith(initOptions, context)
    expect(runClaudeCodeUninstall).toHaveBeenCalledWith(uninstallOptions, context)
  })

  it('runs the complete prompt update pipeline through the adapter', async () => {
    await claudeCodeAdapter.update({
      configLang: 'en',
      aiOutputLang: 'zh-CN',
      skipPrompt: true,
    }, { lang: 'en' })

    expect(updatePromptOnly).toHaveBeenCalledWith('en')
    expect(selectAndInstallWorkflows).toHaveBeenCalledWith('en', undefined, 'claude-code')
    expect(checkClaudeCodeVersionAndPrompt).toHaveBeenCalledWith(false)
    expect(updateZcfConfig).toHaveBeenCalledWith(expect.objectContaining({
      templateLang: 'en',
      aiOutputLang: 'en',
      codeToolType: 'claude-code',
    }))
  })

  it('delegates detection, backup, providers, tools and configurations', async () => {
    vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true)
    vi.mocked(createTimestampedBackup).mockReturnValue('/tmp/backup')
    vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue({
      currentProfileId: 'one',
      profiles: {
        one: { id: 'one', name: 'One', authType: 'api_key' },
        two: { name: 'Two', authType: 'official' },
      },
    } as any)

    await expect(claudeCodeAdapter.detectInstalled()).resolves.toBe(true)
    const configFile = claudeCodeAdapter.definition.paths.configFiles[0]!
    const context = { lang: 'en' as const }
    await expect(claudeCodeAdapter.backup?.(configFile)).resolves.toBe('/tmp/backup')
    await claudeCodeAdapter.updateTools?.(true, context)
    await claudeCodeAdapter.providers?.importDefinitions([], context)
    await expect(claudeCodeAdapter.configurations?.list(context)).resolves.toEqual([
      {
        id: 'one',
        name: 'One',
        isActive: true,
        description: 'api_key',
      },
      {
        id: 'two',
        name: 'Two',
        isActive: false,
        description: 'official',
      },
    ])
    await claudeCodeAdapter.configurations?.switch('one', context)
    await claudeCodeAdapter.configurations?.displayList?.(context)
    await claudeCodeAdapter.configurations?.interactiveSwitch?.(context)

    expect(createTimestampedBackup).toHaveBeenCalledWith(configFile, claudeCodeAdapter.definition.paths.homeDir)
    expect(checkAndUpdateTools).toHaveBeenCalledWith(true)
    expect(importClaudeProviderDefinitions).toHaveBeenCalledWith([])
    vi.mocked(createClaudeCodeProviderProfile).mockResolvedValue({ id: 'one', name: 'One' } as any)
    await expect(claudeCodeAdapter.providers?.toProfiles([{ name: 'One' }])).resolves.toEqual([{ id: 'one', name: 'One' }])
    expect(createClaudeCodeProviderProfile).toHaveBeenCalledWith({ name: 'One' })
    expect(handleClaudeCodeDirectSwitch).toHaveBeenCalledWith('one')
    expect(listClaudeCodeProfiles).toHaveBeenCalled()
    expect(handleClaudeCodeInteractiveSwitch).toHaveBeenCalled()
  })
})
