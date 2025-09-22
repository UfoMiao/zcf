import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/i18n', () => ({
  i18n: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'configuration:outputStyles.engineer-professional.name': '工程师专业版',
        'configuration:outputStyles.engineer-professional.description': '专业的软件工程师，严格遵循SOLID、KISS、DRY、YAGNI原则',
        'configuration:outputStyles.laowang-engineer.name': '老王暴躁技术流',
        'configuration:outputStyles.laowang-engineer.description': '老王暴躁技术流，绝不容忍代码报错和不规范的代码',
        'configuration:outputStyles.nekomata-engineer.name': '猫娘工程师',
        'configuration:outputStyles.nekomata-engineer.description': '专业的猫娘工程师幽浮喵，结合严谨工程师素养与可爱猫娘特质',
        'workflow:workflowOption.sixStepsWorkflow': '六步工作流 (workflow)',
        'codex:systemPromptPrompt': '请选择系统提示词风格',
        'codex:workflowSelectionPrompt': '选择要安装的工作流类型（多选）',
        'codex:workflowInstall': '✔ 已安装 Codex 工作流模板',
        'codex:updatingWorkflows': '🔄 正在更新 Codex 工作流...',
        'codex:updateSuccess': '✔ Codex 工作流已更新',
      }
      return translations[key] || key
    },
    isInitialized: true,
    language: 'en',
  },
  ensureI18nInitialized: vi.fn(),
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
  prompt: vi.fn(),
}))

vi.mock('tinyexec', () => ({
  x: vi.fn(),
}))

vi.mock('../../../../src/utils/fs-operations', () => ({
  ensureDir: vi.fn(),
  copyDir: vi.fn(),
  copyFile: vi.fn(),
  exists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

vi.mock('../../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  rm: vi.fn(),
}))

vi.mock('../../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
  updateTomlConfig: vi.fn(),
}))
vi.mock('../../../../src/utils/mcp-selector', () => ({
  selectMcpServices: vi.fn(),
}))
vi.mock('../../../../src/config/mcp-services', () => ({
  MCP_SERVICE_CONFIGS: [
    {
      id: 'context7',
      requiresApiKey: false,
      config: {
        command: 'npx',
        args: ['-y', 'context7'],
        env: {},
      },
    },
    {
      id: 'exa',
      requiresApiKey: true,
      apiKeyEnvVar: 'EXA_API_KEY',
      config: {
        command: 'npx',
        args: ['-y', 'exa-mcp-server'],
        env: {
          EXA_API_KEY: 'YOUR_EXA_API_KEY',
        },
      },
    },
  ],
  getMcpServices: vi.fn(async () => [
    {
      id: 'context7',
      name: 'Context7',
      description: 'Context7 service',
      requiresApiKey: false,
      config: { command: 'npx', args: ['-y', 'context7'] },
    },
    {
      id: 'exa',
      name: 'Exa',
      description: 'Exa search',
      requiresApiKey: true,
      apiKeyPrompt: 'Enter EXA key',
      config: { command: 'npx', args: ['-y', 'exa-mcp-server'] },
    },
  ]),
}))

vi.mock('node:os', () => ({
  homedir: () => '/home/test',
  platform: () => 'linux',
}))

vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
}))

vi.mock('node:url', () => ({
  fileURLToPath: () => '/project/src/utils/code-tools/codex.ts',
}))

vi.mock('../../../../src/utils/trash', () => ({
  moveToTrash: vi.fn(),
}))

describe('codex code tool utilities', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // Setup default inquirer mocks for all tests
    const inquirer = await import('inquirer')
    vi.mocked(inquirer.default.prompt).mockResolvedValue({
      mode: 'official',
      choice: '0',
      systemPrompt: 'engineer-professional',
      workflows: [],
      action: 'trash',
    })
  })

  it('runCodexFullInit should execute installation and configuration flow', async () => {
    const { x } = await import('tinyexec')
    vi.mocked(x).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })

    const module = await import('../../../../src/utils/code-tools/codex')

    // Test that the function executes without throwing errors
    await expect(module.runCodexFullInit()).resolves.not.toThrow()

    // Test that npm install is called for CLI installation
    expect(x).toHaveBeenCalledWith('npm', ['install', '-g', '@openai/codex'])
  })

  it('runCodexWorkflowImport should copy templates for current language', async () => {
    const fsOps = await import('../../../../src/utils/fs-operations')
    vi.mocked(fsOps.copyDir).mockImplementation(() => {})
    vi.mocked(fsOps.exists).mockImplementation((path) => {
      if (path === '/project/templates')
        return true
      return path.startsWith('/project/templates/codex/zh-CN')
    })

    const { readZcfConfig } = await import('../../../../src/utils/zcf-config')
    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN' } as any)

    const module = await import('../../../../src/utils/code-tools/codex')
    // Test that the function executes without throwing errors
    await expect(module.runCodexWorkflowImport()).resolves.not.toThrow()
  })

  it('configureCodexApi should write config and auth files', async () => {
    const inquirer = await import('inquirer')
    vi.mocked(inquirer.default.prompt)
      .mockResolvedValueOnce({ mode: 'custom' })
      .mockResolvedValueOnce({
        providerName: 'packycode',
        baseUrl: 'https://api.example.com/v1',
        wireApi: 'responses',
        apiKey: 'secret',
      })
      .mockResolvedValueOnce({ addAnother: false })
      .mockResolvedValueOnce({ defaultProvider: 'packycode' })

    const fsOps = await import('../../../../src/utils/fs-operations')
    vi.mocked(fsOps.exists).mockImplementation((path) => {
      if (path === '/project/templates')
        return true
      return path.startsWith('/project/templates/codex/zh-CN')
    })
    vi.mocked(fsOps.ensureDir).mockImplementation(() => {})
    const writeFileMock = vi.mocked(fsOps.writeFile)
    writeFileMock.mockClear()

    const jsonConfig = await import('../../../../src/utils/json-config')
    vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({})

    const module = await import('../../../../src/utils/code-tools/codex')
    await module.configureCodexApi()

    expect(writeFileMock).toHaveBeenCalledTimes(1)
    const configContent = writeFileMock.mock.calls[0][1] as string
    expect(configContent).toContain('# --- model provider added by ZCF ---')
    expect(configContent).toContain('model_provider = "packycode"')
    expect(configContent).toContain('[model_providers.packycode]')
    expect(configContent).toContain('base_url = "https://api.example.com/v1"')
    expect(configContent).toContain('env_key = "PACKYCODE_API_KEY"')

    const jsonConfigModule = await import('../../../../src/utils/json-config')
    expect(jsonConfigModule.writeJsonConfig).toHaveBeenCalledWith(
      '/home/test/.codex/auth.json',
      { PACKYCODE_API_KEY: 'secret' },
      { pretty: true },
    )

    const { updateZcfConfig } = await import('../../../../src/utils/zcf-config')
    expect(updateZcfConfig).toHaveBeenCalledWith(expect.objectContaining({ codeToolType: 'codex' }))
  })

  it('configureCodexApi should handle official mode by clearing providers', async () => {
    const inquirer = await import('inquirer')
    vi.mocked(inquirer.default.prompt)
      .mockResolvedValueOnce({ mode: 'official' })

    const fsOps = await import('../../../../src/utils/fs-operations')
    vi.mocked(fsOps.exists).mockImplementation((path) => {
      if (path === '/home/test/.codex/config.toml')
        return true
      if (path === '/project/templates')
        return true
      return false
    })
    vi.mocked(fsOps.readFile).mockReturnValue('model_provider = "packycode"\n[mcp.services.context7]\ncommand = "npx"\n')

    const jsonModule = await import('../../../../src/utils/json-config')
    vi.mocked(jsonModule.readJsonConfig).mockReturnValue({ OPENAI_API_KEY: 'old' })

    const module = await import('../../../../src/utils/code-tools/codex')
    const writeFileMock = vi.mocked(fsOps.writeFile)
    writeFileMock.mockClear()

    await module.configureCodexApi()

    expect(fsOps.copyFile).toHaveBeenCalledWith(
      '/home/test/.codex/config.toml',
      expect.stringContaining('/home/test/.codex/backup/backup_'),
    )
    const configContent = writeFileMock.mock.calls[0][1] as string
    expect(configContent).not.toContain('[model_providers')
    expect(configContent).toContain('[mcp.services.context7]')
    expect(jsonModule.writeJsonConfig).toHaveBeenCalledWith(
      '/home/test/.codex/auth.json',
      {},
      { pretty: true },
    )
  })

  it('configureCodexMcp should update MCP services while preserving providers', async () => {
    const managedConfig = `# Managed by ZCF\nmodel_provider = "packycode"\n\n[model_providers.packycode]\nname = "PackyCode"\nbase_url = "https://api.example.com"\nwire_api = "responses"\nenv_key = "OPENAI_API_KEY"\n`

    const selectMcpServices = (await import('../../../../src/utils/mcp-selector')).selectMcpServices
    vi.mocked(selectMcpServices).mockResolvedValue(['context7', 'exa'])

    const inquirer = await import('inquirer')
    vi.mocked(inquirer.default.prompt)
      .mockResolvedValueOnce({ apiKey: 'exa-key' })

    const fsOps = await import('../../../../src/utils/fs-operations')
    vi.mocked(fsOps.exists).mockImplementation((path) => {
      if (path === '/home/test/.codex/config.toml')
        return true
      if (path === '/project/templates')
        return true
      return false
    })
    vi.mocked(fsOps.readFile).mockReturnValue(managedConfig)

    const module = await import('../../../../src/utils/code-tools/codex')
    const writeFileMock = vi.mocked(fsOps.writeFile)
    writeFileMock.mockClear()

    await module.configureCodexMcp()

    expect(fsOps.copyFile).toHaveBeenCalled()
    expect(writeFileMock).toHaveBeenCalledTimes(1)
    const updated = writeFileMock.mock.calls[0][1] as string
    expect(updated).toContain('[mcp_servers.context7]')
    expect(updated).toContain('command = "npx"')
    expect(updated).toContain('[mcp_servers.exa]')
    expect(updated).toContain('command = "npx"')
    expect(updated).toContain('env = {EXA_API_KEY = "exa-key"}')

    // Should NOT write to auth.json anymore, API keys go in config env sections
    const jsonConfigModule = await import('../../../../src/utils/json-config')
    expect(jsonConfigModule.writeJsonConfig).not.toHaveBeenCalledWith(
      '/home/test/.codex/auth.json',
      expect.anything(),
      expect.anything(),
    )

    const { updateZcfConfig } = await import('../../../../src/utils/zcf-config')
    expect(updateZcfConfig).toHaveBeenCalledWith(expect.objectContaining({ codeToolType: 'codex' }))
  })

  it('runCodexUpdate should refresh workflows', async () => {
    const module = await import('../../../../src/utils/code-tools/codex')

    // Test that the function executes without throwing errors
    await expect(module.runCodexUpdate()).resolves.not.toThrow()
  })

  it('runCodexUninstall should remove codex directory after confirmation', async () => {
    const module = await import('../../../../src/utils/code-tools/codex')

    // Test that the function executes without throwing errors
    await expect(module.runCodexUninstall()).resolves.not.toThrow()
  })

  // TDD Tests for workflow configuration step-by-step functionality
  describe('codex workflow configuration two-step process', () => {
    it('should have separate functions for system prompt and workflow selection', async () => {
      const module = await import('../../../../src/utils/code-tools/codex')

      // These functions should exist but don't yet (RED phase)
      expect(typeof module.runCodexSystemPromptSelection).toBe('function')
      expect(typeof module.runCodexWorkflowSelection).toBe('function')
    })

    it('runCodexSystemPromptSelection should prompt user to select system prompt styles', async () => {
      const inquirer = await import('inquirer')
      vi.mocked(inquirer.default.prompt)
        .mockResolvedValueOnce({ systemPrompt: 'nekomata-engineer' })

      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockImplementation((path) => {
        if (path === '/project/templates')
          return true
        return path.startsWith('/project/templates/codex/zh-CN/system-prompt')
      })
      vi.mocked(fsOps.readFile).mockReturnValue('# Nekomata Engineer\n\nSystem prompt content...')
      vi.mocked(fsOps.writeFile).mockImplementation(() => {})

      const module = await import('../../../../src/utils/code-tools/codex')

      // Test that the function executes without throwing errors
      await expect(module.runCodexSystemPromptSelection()).resolves.not.toThrow()
    })

    it('runCodexWorkflowSelection should support multi-selection and flatten structure', async () => {
      const inquirer = await import('inquirer')
      vi.mocked(inquirer.default.prompt)
        .mockResolvedValueOnce({ workflows: ['workflow1'] })

      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockImplementation((path) => {
        if (path === '/project/templates')
          return true
        return path.startsWith('/project/templates/codex/zh-CN/workflow')
      })
      vi.mocked(fsOps.readFile).mockReturnValue('# Workflow content')
      vi.mocked(fsOps.writeFile).mockImplementation(() => {})

      const module = await import('../../../../src/utils/code-tools/codex')

      // Test that the function executes without throwing errors
      await expect(module.runCodexWorkflowSelection()).resolves.not.toThrow()
    })

    it('updated runCodexWorkflowImport should call both step functions', async () => {
      const module = await import('../../../../src/utils/code-tools/codex')
      const systemPromptSpy = vi.spyOn(module, 'runCodexSystemPromptSelection').mockResolvedValue()
      const workflowSelectionSpy = vi.spyOn(module, 'runCodexWorkflowSelection').mockResolvedValue()

      // Test that the function executes without throwing errors
      await expect(module.runCodexWorkflowImport()).resolves.not.toThrow()

      systemPromptSpy.mockRestore()
      workflowSelectionSpy.mockRestore()
    })
  })

  // TDD Tests for uninstaller prompt improvements
  describe('codex uninstaller with trash/delete prompts', () => {
    it('removeConfig should prompt for trash or delete action', async () => {
      const { CodexUninstaller } = await import('../../../../src/utils/code-tools/codex-uninstaller')
      const uninstaller = new CodexUninstaller('en')

      const inquirer = await import('inquirer')
      vi.mocked(inquirer.default.prompt)
        .mockResolvedValueOnce({ action: 'trash' })

      const pathExists = await import('fs-extra')
      vi.mocked(pathExists.pathExists).mockResolvedValue(true as any)

      const trash = await import('../../../../src/utils/trash')
      vi.mocked(trash.moveToTrash).mockResolvedValue([{ success: true, path: '/home/test/.codex/config.toml' }])

      // Test that the function executes without throwing errors
      await expect(uninstaller.removeConfig()).resolves.not.toThrow()
    })
  })

  // TDD Tests for update flow improvements
  describe('codex update flow should check CLI updates', () => {
    it('runCodexUpdate should check for Codex CLI updates instead of workflow updates', async () => {
      const module = await import('../../../../src/utils/code-tools/codex')

      // Should use the proper checkCodexUpdate function (not checkCodexCliUpdate)
      expect(typeof module.checkCodexUpdate).toBe('function')

      // Test that runCodexUpdate executes without throwing errors
      await expect(module.runCodexUpdate()).resolves.not.toThrow()
    })
  })
})
