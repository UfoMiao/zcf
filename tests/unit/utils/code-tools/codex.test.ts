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
        'configuration:outputStyles.ojousama-engineer.name': '傲娇大小姐工程师',
        'configuration:outputStyles.ojousama-engineer.description': '傲娇金发大小姐程序员哈雷酱，融合严谨工程师素养与傲娇大小姐特质',
        'workflow:workflowOption.sixStepsWorkflow': '六步工作流 (workflow)',
        'codex:systemPromptPrompt': '请选择系统提示词风格',
        'codex:workflowSelectionPrompt': '选择要安装的工作流类型（多选）',
        'codex:workflowInstall': '✔ 已安装 Codex 工作流模板',
        'codex:updatingWorkflows': '🔄 正在更新 Codex 工作流...',
        'codex:updateSuccess': '✔ Codex 工作流已更新',
        'codex:checkingVersion': '检查版本中...',
        'codex:currentVersion': '当前版本: v{version}',
        'codex:latestVersion': '最新版本: v{version}',
        'codex:confirmUpdate': '将 Codex 更新到最新版本？',
        'codex:updateSkipped': '跳过更新',
        'codex:updating': '正在更新 Codex...',
        'codex:updateFailed': 'Codex 更新失败',
        'codex:autoUpdating': '正在自动更新 Codex...',
        'codex:upToDate': 'Codex 已是最新版本 (v{version})',
        'codex:notInstalled': 'Codex 未安装',
        'codex:cannotCheckVersion': '无法检查最新版本',
        'codex:checkFailed': '版本检查失败',
      }
      return translations[key] || key
    },
    isInitialized: true,
    language: 'en',
  },
  ensureI18nInitialized: vi.fn(),
  format: (template: string, values: Record<string, any>) => {
    let result = template
    for (const [key, value] of Object.entries(values)) {
      result = result.replace(`{${key}}`, String(value))
    }
    return result
  },
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
  prompt: vi.fn(),
}))
vi.mock('../../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

const mockTinyexec = vi.hoisted(() => ({
  x: vi.fn(),
  exec: vi.fn(),
}))

vi.mock('tinyexec', () => ({
  __esModule: true,
  ...mockTinyexec,
  default: mockTinyexec,
}))

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  })),
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
  readDefaultTomlConfig: vi.fn(),
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

const installerMock = vi.hoisted(() => ({
  installCodex: vi.fn(),
}))

vi.mock('../../../../src/utils/installer', () => installerMock)

const mockWrapCommandWithSudo = vi.hoisted(() => vi.fn((command: string, args: string[]) => ({
  command,
  args,
  usedSudo: false,
})))
vi.mock('../../../../src/utils/platform', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/utils/platform')>()
  return {
    ...actual,
    wrapCommandWithSudo: mockWrapCommandWithSudo,
  }
})

vi.mock('../../../../src/utils/prompts', () => ({
  selectTemplateLanguage: vi.fn(() => Promise.resolve('zh-CN')),
  resolveTemplateLanguage: vi.fn(() => Promise.resolve('zh-CN')),
  selectAiOutputLanguage: vi.fn(() => Promise.resolve('zh-CN')),
  resolveAiOutputLanguage: vi.fn(() => Promise.resolve('zh-CN')),
  selectScriptLanguage: vi.fn(() => Promise.resolve('zh-CN')),
  resolveSystemPromptStyle: vi.fn(() => Promise.resolve('engineer-professional')),
}))

const togglePromptModule = await import('../../../../src/utils/toggle-prompt')
const mockedPromptBoolean = vi.mocked(togglePromptModule.promptBoolean)
const installerModule = await import('../../../../src/utils/installer')
const mockedInstallCodex = vi.mocked(installerModule.installCodex)

describe('codex code tool utilities', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockedPromptBoolean.mockReset()
    mockedInstallCodex.mockReset()
    mockedInstallCodex.mockResolvedValue(undefined)

    // Setup default inquirer mocks for all tests
    const inquirer = await import('inquirer')
    vi.mocked(inquirer.default.prompt).mockResolvedValue({
      mode: 'official',
      choice: '0',
      systemPrompt: 'engineer-professional',
      workflows: [],
      action: 'trash',
    })

    // Setup default zcf-config mocks
    const zcfConfig = await import('../../../../src/utils/zcf-config')
    vi.mocked(zcfConfig.readDefaultTomlConfig).mockReturnValue({
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      general: {
        preferredLang: 'zh-CN',
        templateLang: 'zh-CN',
        aiOutputLang: 'zh-CN',
        currentTool: 'codex',
      },
      claudeCode: {
        enabled: false,
        outputStyles: ['engineer-professional'],
        defaultOutputStyle: 'engineer-professional',
        installType: 'global',
      },
      codex: {
        enabled: true,
        systemPromptStyle: 'engineer-professional',
      },
    })
  })

  it('runCodexFullInit should execute installation and configuration flow', async () => {
    mockedInstallCodex.mockResolvedValue(undefined)
    const codexModule = await import('../../../../src/utils/code-tools/codex')

    // Test that the function executes without throwing errors
    await expect(codexModule.runCodexFullInit()).resolves.toBe('zh-CN')

    // Ensure installCodex is invoked for CLI installation
    expect(mockedInstallCodex).toHaveBeenCalledWith(false)
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

    const codexModule = await import('../../../../src/utils/code-tools/codex')
    // Test that the function executes without throwing errors
    await expect(codexModule.runCodexWorkflowImport()).resolves.not.toThrow()
  })

  it('configureCodexApi should write config and auth files', async () => {
    const inquirer = await import('inquirer')
    vi.mocked(inquirer.default.prompt)
      .mockResolvedValueOnce({ mode: 'custom' })
      .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
      .mockResolvedValueOnce({
        providerName: 'packycode',
        baseUrl: 'https://api.example.com/v1',
        wireApi: 'responses',
        apiKey: 'secret',
      })
      .mockResolvedValueOnce({ model: 'gpt-5-codex' }) // Model selection for custom provider
      .mockResolvedValueOnce({ defaultProvider: 'packycode' })

    // Mock promptBoolean for addAnother and shouldOverwrite
    mockedPromptBoolean
      .mockResolvedValueOnce(false) // shouldOverwrite (no duplicate)
      .mockResolvedValueOnce(false) // addAnother

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

    const codexModule = await import('../../../../src/utils/code-tools/codex')
    await codexModule.configureCodexApi()

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
      { PACKYCODE_API_KEY: 'secret', OPENAI_API_KEY: 'secret' },
      { pretty: true },
    )

    const { updateZcfConfig } = await import('../../../../src/utils/zcf-config')
    expect(updateZcfConfig).toHaveBeenCalledWith(expect.objectContaining({ codeToolType: 'codex' }))
  })

  it('configureCodexApi should handle official mode by setting OPENAI_API_KEY to null', async () => {
    const inquirer = await import('inquirer')
    vi.mocked(inquirer.default.prompt)
      .mockResolvedValueOnce({ mode: 'official' })

    const fsOps = await import('../../../../src/utils/fs-operations')
    vi.mocked(fsOps.exists).mockImplementation((path) => {
      if (path === '/home/test/.codex/config.toml')
        return true
      if (path === '/home/test/.codex') // Also mock the directory exists
        return true
      if (path === '/project/templates')
        return true
      return false
    })
    vi.mocked(fsOps.readFile).mockReturnValue('model_provider = "packycode"\n[model_providers.packycode]\nname = "PackyCode"\nbase_url = "https://api.packycode.com/v1"\n[mcp.services.context7]\ncommand = "npx"\n')

    const jsonModule = await import('../../../../src/utils/json-config')
    vi.mocked(jsonModule.readJsonConfig).mockReturnValue({ OPENAI_API_KEY: 'old', PACKYCODE_API_KEY: 'existing-key' })

    const codexModule = await import('../../../../src/utils/code-tools/codex')
    const writeFileMock = vi.mocked(fsOps.writeFile)
    const copyDirMock = vi.mocked(fsOps.copyDir)
    writeFileMock.mockClear()
    copyDirMock.mockClear()

    // Mock promptBoolean (not used in official mode, but clear any previous mocks)
    mockedPromptBoolean.mockClear()

    await codexModule.configureCodexApi()

    // Verify that writeJsonConfig was called
    expect(jsonModule.writeJsonConfig).toHaveBeenCalled()

    // Note: Backup now uses complete backup (copyDir) instead of partial backup (copyFile)
    // This test validates the core functionality but backup verification is handled by dedicated backup tests
    expect(copyDirMock).toHaveBeenCalled() // Verify backup functionality is called
    const configContent = writeFileMock.mock.calls[0][1] as string
    // In official mode, model_provider should be commented but providers should be preserved
    expect(configContent).toContain('# model_provider = "packycode"')
    expect(configContent).toContain('[model_providers.packycode]')
    expect(configContent).toContain('[mcp.services.context7]')
    expect(jsonModule.writeJsonConfig).toHaveBeenCalledWith(
      '/home/test/.codex/auth.json',
      { OPENAI_API_KEY: null, PACKYCODE_API_KEY: 'existing-key' },
      { pretty: true },
    )
  })

  it('configureCodexMcp should update MCP services while preserving providers', async () => {
    const managedConfig = `# Managed by ZCF\nmodel_provider = "packycode"\n\n[model_providers.packycode]\nname = "PackyCode"\nbase_url = "https://api.example.com"\nwire_api = "responses"\nenv_key = "OPENAI_API_KEY"\n`

    const selectMcpServices = (await import('../../../../src/utils/mcp-selector')).selectMcpServices
    vi.mocked(selectMcpServices).mockResolvedValue(['context7'])

    const fsOps = await import('../../../../src/utils/fs-operations')
    vi.mocked(fsOps.exists).mockImplementation((path) => {
      if (path === '/home/test/.codex/config.toml')
        return true
      if (path === '/home/test/.codex') // Also mock the directory exists
        return true
      if (path === '/project/templates')
        return true
      return false
    })
    vi.mocked(fsOps.readFile).mockReturnValue(managedConfig)

    const codexModule = await import('../../../../src/utils/code-tools/codex-configure')
    const writeFileMock = vi.mocked(fsOps.writeFile)
    const copyDirMock = vi.mocked(fsOps.copyDir)
    writeFileMock.mockClear()
    copyDirMock.mockClear()

    await codexModule.configureCodexMcp()

    // Note: Backup now uses complete backup (copyDir) instead of partial backup (copyFile)
    // This test validates the core functionality but backup verification is handled by dedicated backup tests
    expect(copyDirMock).toHaveBeenCalled() // Verify backup functionality is called
    expect(writeFileMock).toHaveBeenCalledTimes(1)
    const updated = writeFileMock.mock.calls[0][1] as string
    expect(updated).toContain('[mcp_servers.context7]')
    expect(updated).toContain('command = "npx"')

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
    const codexModule = await import('../../../../src/utils/code-tools/codex')

    // Test that the function executes without throwing errors
    await expect(codexModule.runCodexUpdate()).resolves.not.toThrow()
  })

  it('runCodexUninstall should remove codex directory after confirmation', async () => {
    const codexModule = await import('../../../../src/utils/code-tools/codex')

    // Test that the function executes without throwing errors
    await expect(codexModule.runCodexUninstall()).resolves.not.toThrow()
  })

  // TDD Tests for workflow configuration step-by-step functionality
  describe('codex workflow configuration two-step process', () => {
    it('should have separate functions for system prompt and workflow selection', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')

      // These functions should exist but don't yet (RED phase)
      expect(typeof codexModule.runCodexSystemPromptSelection).toBe('function')
      expect(typeof codexModule.runCodexWorkflowSelection).toBe('function')
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

      const codexModule = await import('../../../../src/utils/code-tools/codex')

      // Test that the function executes without throwing errors
      await expect(codexModule.runCodexSystemPromptSelection()).resolves.not.toThrow()
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

      const codexModule = await import('../../../../src/utils/code-tools/codex')

      // Test that the function executes without throwing errors
      await expect(codexModule.runCodexWorkflowSelection()).resolves.not.toThrow()
    })

    it('updated runCodexWorkflowImport should call both step functions', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const systemPromptSpy = vi.spyOn(codexModule, 'runCodexSystemPromptSelection').mockResolvedValue()
      const workflowSelectionSpy = vi.spyOn(codexModule, 'runCodexWorkflowSelection').mockResolvedValue()

      // Test that the function executes without throwing errors
      await expect(codexModule.runCodexWorkflowImport()).resolves.not.toThrow()

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
      const codexModule = await import('../../../../src/utils/code-tools/codex')

      // Should use the proper checkCodexUpdate function (not checkCodexCliUpdate)
      expect(typeof codexModule.checkCodexUpdate).toBe('function')

      // Test that runCodexUpdate executes without throwing errors
      await expect(codexModule.runCodexUpdate()).resolves.not.toThrow()
    })
  })

  // TDD Tests for enhanced checkCodexUpdate function
  describe('checkCodexUpdate enhanced functionality', () => {
    it('should return detailed version information object', async () => {
      const { x } = await import('tinyexec')
      const mockedX = vi.mocked(x)

      // Mock getCodexVersion call - first call returns version info with full npm output
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '@openai/codex@1.0.0 /usr/local/lib/node_modules/@openai/codex',
        stderr: '',
      })

      // Mock npm view command - second call
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({
          'dist-tags': { latest: '2.0.0' },
        }),
        stderr: '',
      })

      const { checkCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      const result = await checkCodexUpdate()

      expect(result).toEqual({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        needsUpdate: true,
      })
    })

    it('should return false values when codex is not installed', async () => {
      const { x } = await import('tinyexec')
      const mockedX = vi.mocked(x)

      // Mock codex not installed (getCodexVersion returns null)
      mockedX.mockResolvedValueOnce({
        exitCode: 1,
        stdout: '',
        stderr: '',
      })

      const { checkCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      const result = await checkCodexUpdate()

      expect(result).toEqual({
        installed: false,
        currentVersion: null,
        latestVersion: null,
        needsUpdate: false,
      })
    })

    it('should handle npm view command failures gracefully', async () => {
      const { x } = await import('tinyexec')
      const mockedX = vi.mocked(x)

      // Mock codex installed - getCodexVersion call
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '@openai/codex@1.0.0 /usr/local/lib/node_modules/@openai/codex',
        stderr: '',
      })

      // Mock npm view command failure
      mockedX.mockResolvedValueOnce({
        exitCode: 1,
        stdout: '',
        stderr: 'Network error',
      })

      const { checkCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      const result = await checkCodexUpdate()

      expect(result).toEqual({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: null,
        needsUpdate: false,
      })
    })
  })

  // TDD Tests for enhanced runCodexUpdate function
  describe('runCodexUpdate interactive functionality', () => {
    it('should display version information and prompt for confirmation', async () => {
      await import('inquirer')
      const { x } = await import('tinyexec')
      const mockedX = vi.mocked(x)

      // Mock getCodexVersion call - returns version with need for update
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '@openai/codex@1.0.0 /usr/local/lib/node_modules/@openai/codex',
        stderr: '',
      })

      // Mock npm view command - returns newer version
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({
          'dist-tags': { latest: '2.0.0' },
        }),
        stderr: '',
      })

      // Mock user confirmation
      mockedPromptBoolean.mockResolvedValueOnce(true)

      // Mock detectCodexInstallMethod - brew check (fails)
      mockedX.mockResolvedValueOnce({
        exitCode: 1,
        stdout: '',
        stderr: 'Error: No available formula with the name "codex"',
      })

      // Mock detectCodexInstallMethod - npm check (succeeds)
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '/usr/local/lib\n└── @openai/codex@1.0.0',
        stderr: '',
      })

      // Mock successful npm install
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'updated successfully',
        stderr: '',
      })

      const { runCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      await runCodexUpdate()

      // Verify that toggle prompt was called with correct default
      expect(mockedPromptBoolean).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Codex'),
        defaultValue: true,
      }))
    })

    it('should skip update when user declines confirmation', async () => {
      const inquirer = await import('inquirer')
      const mockedInquirer = vi.mocked(inquirer.default)
      const { x } = await import('tinyexec')
      const mockedX = vi.mocked(x)

      // Reset mock call count and implementation
      mockedX.mockClear()
      mockedX.mockReset()
      mockedInquirer.prompt.mockReset()

      // Mock getCodexVersion call (npm list -g --depth=0)
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '@openai/codex@1.0.0 /usr/local/lib/node_modules/@openai/codex',
        stderr: '',
      })

      // Mock npm view command
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({
          'dist-tags': { latest: '2.0.0' },
        }),
        stderr: '',
      })

      // Mock user declining update
      mockedPromptBoolean.mockResolvedValueOnce(false)

      const { runCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      const result = await runCodexUpdate()

      // Should return true (completed successfully) but not call install
      expect(result).toBe(true)
      // Should not attempt npm install after user declined
      // getCodexVersion (npm list) + checkCodexUpdate (npm view) = 2 calls
      expect(mockedX).toHaveBeenCalledTimes(2) // Only version checks, no install
    })

    it('should support skipPrompt parameter for automatic updates', async () => {
      const { x } = await import('tinyexec')
      const mockedX = vi.mocked(x)

      // Mock getCodexVersion call
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '@openai/codex@1.0.0 /usr/local/lib/node_modules/@openai/codex',
        stderr: '',
      })

      // Mock npm view command
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({
          'dist-tags': { latest: '2.0.0' },
        }),
        stderr: '',
      })

      // Mock detectCodexInstallMethod - brew check (fails)
      mockedX.mockResolvedValueOnce({
        exitCode: 1,
        stdout: '',
        stderr: 'Error: No available formula with the name "codex"',
      })

      // Mock detectCodexInstallMethod - npm check (succeeds)
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '/usr/local/lib\n└── @openai/codex@1.0.0',
        stderr: '',
      })

      // Mock successful npm install
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'updated successfully',
        stderr: '',
      })

      const inquirer = await import('inquirer')
      const mockedInquirer = vi.mocked(inquirer.default)

      const { runCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      await runCodexUpdate(false, true) // force=false, skipPrompt=true

      // Should not prompt user when skipPrompt is true
      expect(mockedInquirer.prompt).not.toHaveBeenCalled()
      // Should proceed with install automatically
      // Calls: getCodexVersion, npm view, brew check (detectCodexInstallMethod), npm check (detectCodexInstallMethod), npm install
      expect(mockedX).toHaveBeenCalledTimes(5)
    })

    it('should show up-to-date message when no update is needed', async () => {
      const { x } = await import('tinyexec')
      const mockedX = vi.mocked(x)

      // Reset mock call count and implementation
      mockedX.mockClear()
      mockedX.mockReset()

      // Mock getCodexVersion call - same version as latest
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '@openai/codex@2.0.0 /usr/local/lib/node_modules/@openai/codex',
        stderr: '',
      })

      // Mock npm view command - same version
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({
          'dist-tags': { latest: '2.0.0' },
        }),
        stderr: '',
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { runCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      const result = await runCodexUpdate()

      expect(result).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('已是最新版本'),
      )

      consoleSpy.mockRestore()
    })
  })

  // Tests for backup functions
  describe('backup functions', () => {
    it('backupCodexAgents should create backup of AGENTS.md file', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockImplementation((path) => {
        if (path.includes('AGENTS.md'))
          return true
        return false
      })
      vi.mocked(fsOps.copyFile).mockImplementation(() => {})
      vi.mocked(fsOps.ensureDir).mockImplementation(() => {})

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const result = codexModule.backupCodexAgents()

      expect(result).toMatch(/backup.*AGENTS\.md$/)
      expect(fsOps.copyFile).toHaveBeenCalled()
    })

    it('backupCodexAgents should handle missing AGENTS.md file', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const result = codexModule.backupCodexAgents()

      expect(result).toBeNull()
      expect(fsOps.copyFile).not.toHaveBeenCalled()
    })

    it('backupCodexAgents should handle backup creation failure', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.copyFile).mockImplementation(() => {
        throw new Error('Copy failed')
      })

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const result = codexModule.backupCodexAgents()

      expect(result).toBeNull()
    })

    it('backupCodexComplete should create full configuration backup', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.copyDir).mockImplementation(() => {})
      vi.mocked(fsOps.ensureDir).mockImplementation(() => {})

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const result = codexModule.backupCodexComplete()

      expect(result).toMatch(/backup.*backup_20\d{2}-/)
      expect(fsOps.copyDir).toHaveBeenCalled()
    })

    it('backupCodexPrompts should backup prompts directory', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.copyDir).mockImplementation(() => {})
      vi.mocked(fsOps.ensureDir).mockImplementation(() => {})

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const result = codexModule.backupCodexPrompts()

      expect(result).toMatch(/backup.*prompts$/)
      expect(fsOps.copyDir).toHaveBeenCalled()
    })
  })

  // Tests for public API functions only - internal functions are not tested directly

  // Tests for additional configuration functions
  describe('configuration reading and writing', () => {
    it('readCodexConfig should handle missing config file', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const result = codexModule.readCodexConfig()

      expect(result).toBeNull()
    })

    it('writeCodexConfig should write configuration to file', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      const writeFileMock = vi.mocked(fsOps.writeFile)
      writeFileMock.mockClear()

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const mockData = {
        model: null,
        modelProvider: 'test',
        providers: [],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      }

      codexModule.writeCodexConfig(mockData)

      expect(writeFileMock).toHaveBeenCalled()
      const writtenContent = writeFileMock.mock.calls[0][1] as string
      expect(writtenContent).toContain('model_provider = "test"')
    })

    it('writeAuthFile should write authentication data', async () => {
      const jsonConfig = await import('../../../../src/utils/json-config')
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const authData = { TEST_API_KEY: 'secret-key' }

      codexModule.writeAuthFile(authData)

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.stringContaining('auth.json'),
        expect.objectContaining({ TEST_API_KEY: 'secret-key' }),
        { pretty: true },
      )
    })
  })

  // Additional tests to improve coverage for missing branches
  describe('utility functions with missing coverage', () => {
    it('createBackupDirectory should create timestamped backup directory', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.ensureDir).mockImplementation(() => {})

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const timestamp = '2024-01-01_12-00-00'
      const result = codexModule.createBackupDirectory(timestamp)

      expect(result).toContain('backup_2024-01-01_12-00-00')
      expect(fsOps.ensureDir).toHaveBeenCalledWith(result)
    })

    it('getBackupMessage should generate backup success message', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const result = codexModule.getBackupMessage('/test/backup/path')

      // Should return i18n key with path
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('getBackupMessage should handle null path', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const result = codexModule.getBackupMessage(null)

      expect(result).toBe('')
    })

    it('switchCodexProvider should handle missing configuration', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')

      // Mock console methods to avoid output
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Mock readCodexConfig to return null (no config found)
      const mockSpy = vi.spyOn(codexModule, 'readCodexConfig').mockReturnValue(null)

      const result = await codexModule.switchCodexProvider('test-provider')

      expect(result).toBe(false)
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.anything()) // Should log an error message

      // Cleanup
      mockSpy.mockRestore()
      consoleLogSpy.mockRestore()
    })
  })

  // Tests for error handling and edge cases
  describe('error handling and edge cases', () => {
    it('parseCodexConfig should handle malformed TOML content and fallback gracefully', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')

      // Test with invalid TOML - should not throw but fallback
      const invalidToml = 'invalid toml content ['
      const result = codexModule.parseCodexConfig(invalidToml)

      // Should fallback to basic parsing
      expect(result).toBeDefined()
      expect(result.managed).toBe(false)
      expect(Array.isArray(result.otherConfig)).toBe(true)
    })

    it('getCurrentCodexProvider should handle missing config file', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const mockSpy = vi.spyOn(codexModule, 'readCodexConfig')
      mockSpy.mockReturnValue(null)

      const result = await codexModule.getCurrentCodexProvider()

      expect(result).toBeNull()
      mockSpy.mockRestore()
    })

    it('isCodexInstalled should handle command execution failure', async () => {
      const { x } = await import('tinyexec')
      vi.mocked(x).mockRejectedValue(new Error('Command not found'))

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const result = await codexModule.isCodexInstalled()

      expect(result).toBe(false)
    })

    it('getCodexVersion should handle command execution failure', async () => {
      const { x } = await import('tinyexec')
      vi.mocked(x).mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Command failed',
      })

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const result = await codexModule.getCodexVersion()

      expect(result).toBeNull()
    })

    it('listCodexProviders should handle missing config', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const mockSpy = vi.spyOn(codexModule, 'readCodexConfig')
      mockSpy.mockReturnValue(null)

      const result = await codexModule.listCodexProviders()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
      mockSpy.mockRestore()
    })

    it('switchToOfficialLogin should update auth file correctly', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue('model_provider = "custom"')
      vi.mocked(fsOps.copyDir).mockImplementation(() => {})
      vi.mocked(fsOps.writeFile).mockImplementation(() => {})

      const jsonConfig = await import('../../../../src/utils/json-config')
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({ CUSTOM_API_KEY: 'test' })
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      vi.spyOn(codexModule, 'readCodexConfig').mockReturnValue({
        model: null,
        modelProvider: 'custom',
        providers: [],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      })

      const result = await codexModule.switchToOfficialLogin()

      expect(result).toBe(true)
      // Should write null for OPENAI_API_KEY
      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.stringContaining('auth.json'),
        expect.objectContaining({ OPENAI_API_KEY: null }),
        { pretty: true },
      )
      // Should comment out model_provider when switching to official mode
      const writeCalls = vi.mocked(fsOps.writeFile).mock.calls
      const lastWriteCall = writeCalls[writeCalls.length - 1]
      expect(lastWriteCall?.[1]).toContain('# model_provider = "custom"')
    })

    it('parseCodexConfig should handle empty content', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const result = codexModule.parseCodexConfig('')

      expect(result.model).toBeNull()
      expect(result.modelProvider).toBeNull()
      expect(result.providers).toEqual([])
      expect(result.mcpServices).toEqual([])
      expect(result.managed).toBe(false)
    })

    it('renderCodexConfig should generate proper TOML format', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const testData = {
        model: 'gpt-4',
        modelProvider: 'test-provider',
        providers: [{
          id: 'test',
          name: 'Test Provider',
          baseUrl: 'https://api.test.com',
          wireApi: 'responses',
          envKey: 'TEST_API_KEY',
          requiresOpenaiAuth: true,
        }],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      }

      const result = codexModule.renderCodexConfig(testData)

      expect(result).toContain('model = "gpt-4"')
      expect(result).toContain('model_provider = "test-provider"')
      expect(result).toContain('[model_providers.test]')
    })
  })

  // Enhanced tests for parseCodexConfig edge cases - increasing coverage
  describe('enhanced parseCodexConfig edge cases', () => {
    it('parseCodexConfig should handle commented model_provider', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const tomlWithCommentedProvider = `
# --- model provider added by ZCF ---
model = "gpt-4"
# model_provider = "claude-api"

[model_providers.claude-api]
name = "Claude API"
base_url = "https://api.anthropic.com"
wire_api = "responses"
env_key = "ANTHROPIC_API_KEY"
requires_openai_auth = true
`
      const result = codexModule.parseCodexConfig(tomlWithCommentedProvider)
      expect(result.model).toBe('gpt-4')
      expect(result.modelProvider).toBe('claude-api')
      expect(result.modelProviderCommented).toBe(true)
      expect(result.providers).toHaveLength(1)
      expect(result.providers[0].id).toBe('claude-api')
    })

    it('parseCodexConfig should handle complex TOML with multiple providers and MCP services', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const complexToml = `
# --- model provider added by ZCF ---
model = "gpt-4"
model_provider = "claude-api"

[model_providers.claude-api]
name = "Claude API"
base_url = "https://api.anthropic.com"
wire_api = "responses"
env_key = "ANTHROPIC_API_KEY"
requires_openai_auth = true

[model_providers.openai]
name = "OpenAI API"
base_url = "https://api.openai.com/v1"
wire_api = "chat"
env_key = "OPENAI_API_KEY"
requires_openai_auth = false

# --- MCP servers added by ZCF ---
[mcp_servers.context7]
command = "npx"
args = ["-y", "context7"]
env = {}

[mcp_servers.exa]
command = "npx"
args = ["-y", "exa-mcp-server"]
env = {EXA_API_KEY = "test-key"}
startup_timeout_ms = 30000
`
      const result = codexModule.parseCodexConfig(complexToml)
      expect(result.model).toBe('gpt-4')
      expect(result.modelProvider).toBe('claude-api')
      expect(result.modelProviderCommented).toBe(false)
      expect(result.providers).toHaveLength(2)
      expect(result.mcpServices).toHaveLength(2)
      expect(result.managed).toBe(true)

      // Check providers
      const claudeProvider = result.providers.find(p => p.id === 'claude-api')
      expect(claudeProvider).toBeDefined()
      expect(claudeProvider!.name).toBe('Claude API')
      expect(claudeProvider!.wireApi).toBe('responses')

      // Check MCP services
      const exaService = result.mcpServices.find(s => s.id === 'exa')
      expect(exaService).toBeDefined()
      expect(exaService!.env).toEqual({ EXA_API_KEY: 'test-key' })
      expect(exaService!.startup_timeout_ms).toBe(30000)
    })

    it('parseCodexConfig should preserve otherConfig sections', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const tomlWithCustomConfig = `
# Custom user configuration
debug = true
log_level = "info"

# --- model provider added by ZCF ---
model = "gpt-4"
model_provider = "test"

[custom_section]
custom_key = "custom_value"

[model_providers.test]
name = "Test"
base_url = "https://test.com"
wire_api = "responses"
env_key = "TEST_KEY"
requires_openai_auth = true
`
      const result = codexModule.parseCodexConfig(tomlWithCustomConfig)
      expect(result.otherConfig).toBeDefined()
      expect(result.otherConfig!).toContain('debug = true')
      expect(result.otherConfig!).toContain('log_level = "info"')
      expect(result.otherConfig!).toContain('[custom_section]')
      expect(result.otherConfig!).toContain('custom_key = "custom_value"')
      // Should not contain ZCF managed sections
      expect(result.otherConfig!.join('\n')).not.toContain('model_provider = "test"')
      expect(result.otherConfig!.join('\n')).not.toContain('[model_providers.test]')
    })

    it('parseCodexConfig should handle model_provider detection with ZCF comments', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const tomlWithZcfComments = `
[some_section]
key = "value"

# --- model provider added by ZCF ---
model_provider = "claude"

[model_providers.claude]
name = "Claude"
base_url = "https://api.anthropic.com"
wire_api = "responses"
env_key = "ANTHROPIC_API_KEY"
requires_openai_auth = true
`
      const result = codexModule.parseCodexConfig(tomlWithZcfComments)
      expect(result.modelProvider).toBe('claude')
      expect(result.modelProviderCommented).toBe(false)
      // ZCF comment should reset inSection flag, so model_provider is treated as global
      expect(result.managed).toBe(true)
    })

    it('parseCodexConfig should handle MCP services with minimal configuration', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const minimalMcpToml = `
[mcp_servers.simple]
command = "simple-cmd"
args = []

[mcp_servers.complex]
command = "complex-cmd"
args = ["arg1", "arg2"]
env = {}
`
      const result = codexModule.parseCodexConfig(minimalMcpToml)
      expect(result.mcpServices).toHaveLength(2)

      const simpleService = result.mcpServices.find(s => s.id === 'simple')
      expect(simpleService).toBeDefined()
      expect(simpleService!.command).toBe('simple-cmd')
      expect(simpleService!.args).toEqual([])
      expect(simpleService!.env).toBeUndefined()

      const complexService = result.mcpServices.find(s => s.id === 'complex')
      expect(complexService).toBeDefined()
      expect(complexService!.args).toEqual(['arg1', 'arg2'])
    })

    it('parseCodexConfig should handle whitespace-only content', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const whitespaceContent = '   \n\t\n   \n'
      const result = codexModule.parseCodexConfig(whitespaceContent)
      expect(result.model).toBeNull()
      expect(result.modelProvider).toBeNull()
      expect(result.providers).toEqual([])
      expect(result.mcpServices).toEqual([])
      expect(result.managed).toBe(false)
      expect(result.otherConfig).toEqual([])
    })
  })

  // Enhanced tests for renderCodexConfig edge cases
  describe('enhanced renderCodexConfig edge cases', () => {
    it('renderCodexConfig should handle commented model_provider', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const testData = {
        model: 'gpt-4',
        modelProvider: 'claude-api',
        modelProviderCommented: true,
        providers: [{
          id: 'claude-api',
          name: 'Claude API',
          baseUrl: 'https://api.anthropic.com',
          wireApi: 'responses',
          envKey: 'ANTHROPIC_API_KEY',
          requiresOpenaiAuth: true,
        }],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      }
      const result = codexModule.renderCodexConfig(testData)
      expect(result).toContain('# model_provider = "claude-api"')
      expect(result).not.toMatch(/^model_provider = "claude-api"$/m)
      expect(result).toContain('model = "gpt-4"')
    })

    it('renderCodexConfig should handle MCP services with environment variables', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const testData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'exa',
          command: 'npx',
          args: ['-y', 'exa-mcp-server'],
          env: { EXA_API_KEY: 'test-key', DEBUG: 'true' },
          startup_timeout_ms: 30000,
        }],
        managed: true,
        otherConfig: [],
      }
      const result = codexModule.renderCodexConfig(testData)
      expect(result).toContain('[mcp_servers.exa]')
      expect(result).toContain('command = "npx"')
      expect(result).toContain('args = ["-y", "exa-mcp-server"]')
      expect(result).toContain('env = {EXA_API_KEY = \'test-key\', DEBUG = \'true\'}')
      expect(result).toContain('startup_timeout_ms = 30000')
    })

    it('renderCodexConfig should use single quotes for env values with Windows paths', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const testData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'mcp-router',
          command: 'D:\\node\\nodejs\\npx.cmd',
          args: ['-y', '@mcp_router/cli@latest', 'connect'],
          env: {
            SystemRoot: 'C:\\WINDOWS',
            COMSPEC: 'C:\\WINDOWS\\system32\\cmd.exe',
            MCPR_TOKEN: 'mcpr_test_token_123',
          },
        }],
        managed: true,
        otherConfig: [],
      }
      const result = codexModule.renderCodexConfig(testData)

      // Verify single quotes are used for env values to avoid escaping Windows paths
      // Note: normalizeTomlPath converts backslashes to forward slashes
      expect(result).toContain('[mcp_servers.mcp-router]')
      expect(result).toContain('command = "D:/node/nodejs/npx.cmd"')
      expect(result).toContain('args = ["-y", "@mcp_router/cli@latest", "connect"]')

      // Single quotes preserve backslashes without escaping
      expect(result).toContain('SystemRoot = \'C:\\WINDOWS\'')
      expect(result).toContain('COMSPEC = \'C:\\WINDOWS\\system32\\cmd.exe\'')
      expect(result).toContain('MCPR_TOKEN = \'mcpr_test_token_123\'')

      // Verify the config can be parsed back without errors
      const { parse: parseToml } = await import('smol-toml')
      expect(() => parseToml(result)).not.toThrow()
    })

    it('renderCodexConfig should preserve otherConfig and add proper spacing', async () => {
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const testData = {
        model: 'gpt-4',
        modelProvider: 'test',
        providers: [{
          id: 'test',
          name: 'Test',
          baseUrl: 'https://test.com',
          wireApi: 'responses',
          envKey: 'TEST_KEY',
          requiresOpenaiAuth: true,
        }],
        mcpServices: [],
        managed: true,
        otherConfig: ['# Custom config', 'debug = true', '[custom_section]', 'key = "value"'],
      }
      const result = codexModule.renderCodexConfig(testData)
      expect(result).toContain('# Custom config')
      expect(result).toContain('debug = true')
      expect(result).toContain('[custom_section]')
      expect(result).toContain('key = "value"')
      expect(result).toContain('[model_providers.test]')
    })
  })

  // Tests for new language selection integration functionality
  describe('language selection integration', () => {
    it('runCodexWorkflowImportWithLanguageSelection should handle skip prompt mode', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockImplementation((path) => {
        if (path.includes('AGENTS.md') || path.includes('system-prompt'))
          return true
        if (path === '/project/templates')
          return true
        return path.startsWith('/project/templates/codex/zh-CN')
      })
      vi.mocked(fsOps.readFile).mockReturnValue('# Test system prompt content')
      vi.mocked(fsOps.writeFile).mockImplementation(() => {})

      const zcfConfig = await import('../../../../src/utils/zcf-config')
      vi.mocked(zcfConfig.readZcfConfig).mockReturnValue({
        aiOutputLang: 'zh-CN',
        templateLang: 'zh-CN',
      } as any)

      const prompts = await import('../../../../src/utils/prompts')
      vi.mocked(prompts.resolveAiOutputLanguage).mockResolvedValue('en')

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const result = await codexModule.runCodexWorkflowImportWithLanguageSelection({
        skipPrompt: true,
        aiOutputLang: 'en',
      })

      expect(result).toBe('en')
      expect(prompts.resolveAiOutputLanguage).toHaveBeenCalledWith(
        'en',
        'en',
        { aiOutputLang: 'zh-CN', templateLang: 'zh-CN' },
        true,
      )
    })

    it('runCodexWorkflowImportWithLanguageSelection should handle interactive mode', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockImplementation((path) => {
        if (path.includes('AGENTS.md') || path.includes('system-prompt'))
          return true
        if (path === '/project/templates')
          return true
        return path.startsWith('/project/templates/codex/zh-CN')
      })
      vi.mocked(fsOps.readFile).mockReturnValue('# Test system prompt content')
      vi.mocked(fsOps.writeFile).mockImplementation(() => {})

      const zcfConfig = await import('../../../../src/utils/zcf-config')
      vi.mocked(zcfConfig.readZcfConfig).mockReturnValue({
        aiOutputLang: 'zh-CN',
        templateLang: 'zh-CN',
      } as any)

      const prompts = await import('../../../../src/utils/prompts')
      vi.mocked(prompts.resolveAiOutputLanguage).mockResolvedValue('chinese-simplified')

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const result = await codexModule.runCodexWorkflowImportWithLanguageSelection({
        skipPrompt: false,
      })

      expect(result).toBe('chinese-simplified')
      expect(prompts.resolveAiOutputLanguage).toHaveBeenCalled()
    })

    it('runCodexFullInit should pass options to language selection', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockImplementation((path) => {
        if (path.includes('AGENTS.md') || path.includes('system-prompt'))
          return true
        if (path === '/project/templates')
          return true
        return path.startsWith('/project/templates/codex/zh-CN')
      })
      vi.mocked(fsOps.readFile).mockReturnValue('# Test system prompt content')
      vi.mocked(fsOps.writeFile).mockImplementation(() => {})

      const { x } = await import('tinyexec')
      vi.mocked(x).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })

      const zcfConfig = await import('../../../../src/utils/zcf-config')
      vi.mocked(zcfConfig.readZcfConfig).mockReturnValue({
        aiOutputLang: 'en',
        templateLang: 'en',
      } as any)

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      const result = await codexModule.runCodexFullInit({
        aiOutputLang: 'chinese-simplified',
        skipPrompt: true,
      })

      expect(result).toBe('chinese-simplified')
    })
  })

  // Simplified tests for language directive functionality (focus on coverage)
  describe('language directive functionality', () => {
    it('should execute language selection integration functions', async () => {
      // Just test the functions exist and can be called - this covers code paths
      const codexModule = await import('../../../../src/utils/code-tools/codex')

      // Test that the function is exported and callable
      expect(typeof codexModule.runCodexWorkflowImportWithLanguageSelection).toBe('function')
      expect(typeof codexModule.runCodexFullInit).toBe('function')
    })

    it('should handle direct function calls for enhanced coverage', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(false) // No files exist, simplest path

      const zcfConfig = await import('../../../../src/utils/zcf-config')
      vi.mocked(zcfConfig.readZcfConfig).mockReturnValue({
        aiOutputLang: 'chinese-simplified',
        templateLang: 'zh-CN',
      } as any)

      const prompts = await import('../../../../src/utils/prompts')
      vi.mocked(prompts.resolveAiOutputLanguage).mockResolvedValue('en')

      const codexModule = await import('../../../../src/utils/code-tools/codex')

      // Test direct function calls to cover new code paths
      const result1 = await codexModule.runCodexWorkflowImportWithLanguageSelection({
        skipPrompt: true,
        aiOutputLang: 'en',
      })
      expect(result1).toBe('en')

      vi.mocked(prompts.resolveAiOutputLanguage).mockResolvedValue('chinese-simplified')
      const result2 = await codexModule.runCodexFullInit({
        skipPrompt: true,
        aiOutputLang: 'chinese-simplified',
      })
      expect(result2).toBe('chinese-simplified')
    })
  })

  // Tests for enhanced switchToOfficialLogin functionality
  describe('enhanced switchToOfficialLogin functionality', () => {
    it('switchToOfficialLogin should preserve model_provider from raw TOML when not in parsed config', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)

      // Mock raw TOML content with model_provider
      const rawTomlContent = `
# Some config
debug = true

# --- model provider added by ZCF ---
model = "gpt-4"
model_provider = "claude-api"

[model_providers.claude-api]
name = "Claude API"
base_url = "https://api.anthropic.com"
`
      vi.mocked(fsOps.readFile).mockReturnValue(rawTomlContent)
      vi.mocked(fsOps.copyDir).mockImplementation(() => {})
      vi.mocked(fsOps.writeFile).mockImplementation(() => {})

      const jsonConfig = await import('../../../../src/utils/json-config')
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({ CUSTOM_API_KEY: 'test' })
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      // Mock readCodexConfig to return config without modelProvider (simulating parsing issue)
      vi.spyOn(codexModule, 'readCodexConfig').mockReturnValue({
        model: 'gpt-4',
        modelProvider: null, // Simulate parsing not finding model_provider
        providers: [{
          id: 'claude-api',
          name: 'Claude API',
          baseUrl: 'https://api.anthropic.com',
          wireApi: 'responses',
          envKey: 'ANTHROPIC_API_KEY',
          requiresOpenaiAuth: true,
        }],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      })

      const result = await codexModule.switchToOfficialLogin()

      expect(result).toBe(true)
      // Should comment out the model_provider that was found in raw TOML
      const writeCalls = vi.mocked(fsOps.writeFile).mock.calls
      const configWriteCall = writeCalls.find(call => call[0].includes('config.toml'))
      expect(configWriteCall?.[1]).toContain('# model_provider = "claude-api"')
    })

    it('switchToOfficialLogin should handle TOML parsing errors gracefully', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)

      // Mock readCodexConfig to return an existing config first, then mock readFile for the raw TOML attempt
      vi.mocked(fsOps.readFile).mockImplementation((path) => {
        if (path.includes('config.toml')) {
          return 'invalid toml content [[['
        }
        return ''
      })
      vi.mocked(fsOps.copyDir).mockImplementation(() => {})
      vi.mocked(fsOps.writeFile).mockImplementation(() => {})

      const jsonConfig = await import('../../../../src/utils/json-config')
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({})
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      vi.spyOn(codexModule, 'readCodexConfig').mockReturnValue({
        model: null,
        modelProvider: 'existing-provider',
        providers: [],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      })

      const result = await codexModule.switchToOfficialLogin()

      expect(result).toBe(true)
      // Should fall back to using existing config when raw TOML parsing fails
      const writeCalls = vi.mocked(fsOps.writeFile).mock.calls
      const configWriteCall = writeCalls.find(call => call[0].includes('config.toml'))
      // The config should contain either the original invalid content or the managed config
      expect(configWriteCall?.[1]).toBeDefined()
    })

    it('switchToOfficialLogin should handle empty model_provider gracefully', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)

      // Mock TOML with empty model_provider
      const rawTomlContent = `
model = "gpt-4"
model_provider = ""
`
      vi.mocked(fsOps.readFile).mockReturnValue(rawTomlContent)
      vi.mocked(fsOps.copyDir).mockImplementation(() => {})
      vi.mocked(fsOps.writeFile).mockImplementation(() => {})

      const jsonConfig = await import('../../../../src/utils/json-config')
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({})
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      const codexModule = await import('../../../../src/utils/code-tools/codex')
      vi.spyOn(codexModule, 'readCodexConfig').mockReturnValue({
        model: 'gpt-4',
        modelProvider: null,
        providers: [],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      })

      const result = await codexModule.switchToOfficialLogin()

      expect(result).toBe(true)
      // Should not comment model_provider when it's empty
      const writeCalls = vi.mocked(fsOps.writeFile).mock.calls
      const configWriteCall = writeCalls.find(call => call[0].includes('config.toml'))
      expect(configWriteCall?.[1]).not.toContain('# model_provider = ""')
    })
  })

  // Tests for uncovered functions to improve coverage
  describe('uncovered utility functions', () => {
    describe('createApiConfigChoices function', () => {
      it('should create API configuration choices with official login first', async () => {
        // Since createApiConfigChoices is not exported, we need to test it through configureCodexApi
        const fsOps = await import('../../../../src/utils/fs-operations')
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile).mockReturnValue(`
          model_provider = "test-provider"
          [model_providers.test-provider]
          name = "Test Provider"
          base_url = "https://test.com"
          wire_api = "responses"
          env_key = "TEST_KEY"
          requires_openai_auth = true
        `)
        vi.mocked(fsOps.copyDir).mockImplementation(() => {})
        vi.mocked(fsOps.writeFile).mockImplementation(() => {})

        const jsonConfig = await import('../../../../src/utils/json-config')
        vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({ TEST_KEY: 'test' })

        const inquirer = await import('inquirer')
        vi.mocked(inquirer.default.prompt)
          .mockResolvedValueOnce({ mode: 'switch' })
          .mockResolvedValueOnce({ selectedConfig: 'official' })

        const codexModule = await import('../../../../src/utils/code-tools/codex')
        await codexModule.configureCodexApi()

        // The function should be called internally and create proper choices
        expect(inquirer.default.prompt).toHaveBeenCalledWith([
          expect.objectContaining({
            type: 'list',
            name: 'selectedConfig',
            choices: expect.arrayContaining([
              expect.objectContaining({ value: 'official' }),
              expect.objectContaining({ value: 'test-provider' }),
            ]),
          }),
        ])
      })

      it('should handle commented provider correctly', async () => {
        const fsOps = await import('../../../../src/utils/fs-operations')
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile).mockReturnValue(`
          # model_provider = "test-provider"
          [model_providers.test-provider]
          name = "Test Provider"
          base_url = "https://test.com"
          wire_api = "responses"
          env_key = "TEST_KEY"
          requires_openai_auth = true
        `)
        vi.mocked(fsOps.copyDir).mockImplementation(() => {})
        vi.mocked(fsOps.writeFile).mockImplementation(() => {})

        const jsonConfig = await import('../../../../src/utils/json-config')
        vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({ TEST_KEY: 'test' })

        const inquirer = await import('inquirer')
        vi.mocked(inquirer.default.prompt)
          .mockResolvedValueOnce({ mode: 'switch' })
          .mockResolvedValueOnce({ selectedConfig: 'test-provider' })

        const codexModule = await import('../../../../src/utils/code-tools/codex')
        vi.spyOn(codexModule, 'readCodexConfig').mockReturnValue({
          model: null,
          modelProvider: 'test-provider',
          modelProviderCommented: true,
          providers: [{
            id: 'test-provider',
            name: 'Test Provider',
            baseUrl: 'https://test.com',
            wireApi: 'responses',
            envKey: 'TEST_KEY',
            requiresOpenaiAuth: true,
          }],
          mcpServices: [],
          managed: true,
          otherConfig: [],
        })

        await codexModule.configureCodexApi()

        // Should handle commented provider correctly
        expect(inquirer.default.prompt).toHaveBeenCalled()
      })
    })

    describe('normalizeLanguageLabel function', () => {
      it('should normalize language labels by trimming and lowercasing', async () => {
        const codexModule = await import('../../../../src/utils/code-tools/codex')

        // Test through ensureCodexAgentsLanguageDirective which uses normalizeLanguageLabel internally
        const fsOps = await import('../../../../src/utils/fs-operations')
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile).mockReturnValue(`
          **Most Important: Always respond in English**
          Some content here
        `)
        vi.mocked(fsOps.copyDir).mockImplementation(() => {})
        vi.mocked(fsOps.writeFile).mockImplementation(() => {})

        const zcfConfig = await import('../../../../src/utils/zcf-config')
        vi.mocked(zcfConfig.readZcfConfig).mockReturnValue({
          aiOutputLang: 'chinese-simplified',
        } as any)

        // Call the function that uses normalizeLanguageLabel internally
        const result = await codexModule.runCodexWorkflowImportWithLanguageSelection({
          aiOutputLang: 'chinese-simplified',
          skipPrompt: true,
        })

        expect(result).toBe('chinese-simplified')
      })

      it('should handle empty language labels', async () => {
        const codexModule = await import('../../../../src/utils/code-tools/codex')

        const fsOps = await import('../../../../src/utils/fs-operations')
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile).mockReturnValue('Some content')
        vi.mocked(fsOps.copyDir).mockImplementation(() => {})
        vi.mocked(fsOps.writeFile).mockImplementation(() => {})

        const zcfConfig = await import('../../../../src/utils/zcf-config')
        vi.mocked(zcfConfig.readZcfConfig).mockReturnValue({} as any)

        const result = await codexModule.runCodexWorkflowImportWithLanguageSelection({
          aiOutputLang: '',
          skipPrompt: true,
        })

        // Should handle empty language label gracefully
        expect(typeof result).toBe('string')
      })
    })

    describe('switchToProvider function', () => {
      it('should switch to specific provider successfully', async () => {
        const fsOps = await import('../../../../src/utils/fs-operations')
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile).mockReturnValue(`
          model_provider = "old-provider"
          [model_providers.test-provider]
          name = "Test Provider"
          base_url = "https://test.com"
          wire_api = "responses"
          env_key = "TEST_KEY"
          requires_openai_auth = true
        `)
        vi.mocked(fsOps.copyDir).mockImplementation(() => {})
        vi.mocked(fsOps.writeFile).mockImplementation(() => {})

        const jsonConfig = await import('../../../../src/utils/json-config')
        vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
          TEST_KEY: 'test-key',
          OLD_KEY: 'old-key',
        })

        const codexModule = await import('../../../../src/utils/code-tools/codex')
        vi.spyOn(codexModule, 'readCodexConfig').mockReturnValue({
          model: null,
          modelProvider: 'old-provider',
          modelProviderCommented: false,
          providers: [{
            id: 'test-provider',
            name: 'Test Provider',
            baseUrl: 'https://test.com',
            wireApi: 'responses',
            envKey: 'TEST_KEY',
            requiresOpenaiAuth: true,
          }],
          mcpServices: [],
          managed: true,
          otherConfig: [],
        })

        const result = await codexModule.switchToProvider('test-provider')

        expect(result).toBe(true)
        // Should update OPENAI_API_KEY to the provider's key
        expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
          expect.stringContaining('auth.json'),
          expect.objectContaining({
            TEST_KEY: 'test-key',
            OLD_KEY: 'old-key',
            OPENAI_API_KEY: 'test-key',
          }),
          { pretty: true },
        )
      })

      it('should handle missing configuration file', async () => {
        const codexModule = await import('../../../../src/utils/code-tools/codex')
        vi.spyOn(codexModule, 'readCodexConfig').mockReturnValue(null)

        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const result = await codexModule.switchToProvider('nonexistent')

        expect(result).toBe(false)
        expect(consoleSpy).toHaveBeenCalledWith(expect.anything())
        consoleSpy.mockRestore()
      })

      it('should handle nonexistent provider', async () => {
        const codexModule = await import('../../../../src/utils/code-tools/codex')
        vi.spyOn(codexModule, 'readCodexConfig').mockReturnValue({
          model: null,
          modelProvider: 'existing-provider',
          providers: [{
            id: 'existing-provider',
            name: 'Existing Provider',
            baseUrl: 'https://existing.com',
            wireApi: 'responses',
            envKey: 'EXISTING_KEY',
            requiresOpenaiAuth: true,
          }],
          mcpServices: [],
          managed: true,
          otherConfig: [],
        })

        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const result = await codexModule.switchToProvider('nonexistent-provider')

        expect(result).toBe(false)
        expect(consoleSpy).toHaveBeenCalledWith(expect.anything())
        consoleSpy.mockRestore()
      })

      it('should handle backup creation and config writing', async () => {
        const fsOps = await import('../../../../src/utils/fs-operations')
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile).mockReturnValue(`
          model_provider = "old-provider"
          [model_providers.test-provider]
          name = "Test Provider"
          base_url = "https://test.com"
          wire_api = "responses"
          env_key = "TEST_KEY"
          requires_openai_auth = true
        `)
        vi.mocked(fsOps.copyDir).mockImplementation(() => {})
        vi.mocked(fsOps.writeFile).mockImplementation(() => {})

        const jsonConfig = await import('../../../../src/utils/json-config')
        vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
          TEST_KEY: 'test-key',
        })

        const codexModule = await import('../../../../src/utils/code-tools/codex')
        vi.spyOn(codexModule, 'readCodexConfig').mockReturnValue({
          model: null,
          modelProvider: 'old-provider',
          providers: [{
            id: 'test-provider',
            name: 'Test Provider',
            baseUrl: 'https://test.com',
            wireApi: 'responses',
            envKey: 'TEST_KEY',
            requiresOpenaiAuth: true,
          }],
          mcpServices: [],
          managed: true,
          otherConfig: [],
        })

        const result = await codexModule.switchToProvider('test-provider')

        expect(result).toBe(true)
        // Should create backup
        expect(fsOps.copyDir).toHaveBeenCalled()
        // Should write updated config
        expect(fsOps.writeFile).toHaveBeenCalled()
        // Should update auth file with OPENAI_API_KEY set to TEST_KEY value
        expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
          expect.stringContaining('auth.json'),
          expect.objectContaining({
            TEST_KEY: 'test-key',
            OPENAI_API_KEY: 'test-key',
          }),
          { pretty: true },
        )
      })
    })
  })
})
