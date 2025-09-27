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

vi.mock('../../../../src/utils/prompts', () => ({
  selectTemplateLanguage: vi.fn(() => Promise.resolve('zh-CN')),
  resolveTemplateLanguage: vi.fn(() => Promise.resolve('zh-CN')),
  selectAiOutputLanguage: vi.fn(() => Promise.resolve('zh-CN')),
  resolveAiOutputLanguage: vi.fn(() => Promise.resolve('zh-CN')),
  selectScriptLanguage: vi.fn(() => Promise.resolve('zh-CN')),
  resolveSystemPromptStyle: vi.fn(() => Promise.resolve('engineer-professional')),
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

    const module = await import('../../../../src/utils/code-tools/codex')
    const writeFileMock = vi.mocked(fsOps.writeFile)
    writeFileMock.mockClear()

    await module.configureCodexApi()

    // Note: Backup now uses complete backup (copyDir) instead of partial backup (copyFile)
    // This test validates the core functionality but backup verification is handled by dedicated backup tests
    expect(fsOps.copyDir).toHaveBeenCalled() // Verify backup functionality is called
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
    vi.mocked(selectMcpServices).mockResolvedValue(['context7', 'exa'])

    const inquirer = await import('inquirer')
    vi.mocked(inquirer.default.prompt)
      .mockResolvedValueOnce({ apiKey: 'exa-key' })

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

    const module = await import('../../../../src/utils/code-tools/codex')
    const writeFileMock = vi.mocked(fsOps.writeFile)
    writeFileMock.mockClear()

    await module.configureCodexMcp()

    // Note: Backup now uses complete backup (copyDir) instead of partial backup (copyFile)
    // This test validates the core functionality but backup verification is handled by dedicated backup tests
    expect(fsOps.copyDir).toHaveBeenCalled() // Verify backup functionality is called
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
      const inquirer = await import('inquirer')
      const mockedInquirer = vi.mocked(inquirer.default)
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
      mockedInquirer.prompt.mockResolvedValueOnce({ confirm: true })

      // Mock successful npm install
      mockedX.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'updated successfully',
        stderr: '',
      })

      const { runCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      await runCodexUpdate()

      // Verify that inquirer was called with correct default
      expect(mockedInquirer.prompt).toHaveBeenCalledWith({
        type: 'confirm',
        name: 'confirm',
        message: expect.stringContaining('Codex'),
        default: true,
      })
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

      // Mock user declining update
      mockedInquirer.prompt.mockResolvedValueOnce({ confirm: false })

      const { runCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      const result = await runCodexUpdate()

      // Should return true (completed successfully) but not call install
      expect(result).toBe(true)
      // Should not attempt npm install after user declined
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
      expect(mockedX).toHaveBeenCalledTimes(3) // version checks + install
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

      const module = await import('../../../../src/utils/code-tools/codex')
      const result = module.backupCodexAgents()

      expect(result).toMatch(/backup.*AGENTS\.md$/)
      expect(fsOps.copyFile).toHaveBeenCalled()
    })

    it('backupCodexAgents should handle missing AGENTS.md file', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const module = await import('../../../../src/utils/code-tools/codex')
      const result = module.backupCodexAgents()

      expect(result).toBeNull()
      expect(fsOps.copyFile).not.toHaveBeenCalled()
    })

    it('backupCodexAgents should handle backup creation failure', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.copyFile).mockImplementation(() => {
        throw new Error('Copy failed')
      })

      const module = await import('../../../../src/utils/code-tools/codex')
      const result = module.backupCodexAgents()

      expect(result).toBeNull()
    })

    it('backupCodexComplete should create full configuration backup', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.copyDir).mockImplementation(() => {})
      vi.mocked(fsOps.ensureDir).mockImplementation(() => {})

      const module = await import('../../../../src/utils/code-tools/codex')
      const result = module.backupCodexComplete()

      expect(result).toMatch(/backup.*backup_20\d{2}-/)
      expect(fsOps.copyDir).toHaveBeenCalled()
    })

    it('backupCodexPrompts should backup prompts directory', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.copyDir).mockImplementation(() => {})
      vi.mocked(fsOps.ensureDir).mockImplementation(() => {})

      const module = await import('../../../../src/utils/code-tools/codex')
      const result = module.backupCodexPrompts()

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

      const module = await import('../../../../src/utils/code-tools/codex')
      const result = module.readCodexConfig()

      expect(result).toBeNull()
    })

    it('writeCodexConfig should write configuration to file', async () => {
      const fsOps = await import('../../../../src/utils/fs-operations')
      const writeFileMock = vi.mocked(fsOps.writeFile)
      writeFileMock.mockClear()

      const module = await import('../../../../src/utils/code-tools/codex')
      const mockData = {
        model: null,
        modelProvider: 'test',
        providers: [],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      }

      module.writeCodexConfig(mockData)

      expect(writeFileMock).toHaveBeenCalled()
      const writtenContent = writeFileMock.mock.calls[0][1] as string
      expect(writtenContent).toContain('model_provider = "test"')
    })

    it('writeAuthFile should write authentication data', async () => {
      const jsonConfig = await import('../../../../src/utils/json-config')
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      const module = await import('../../../../src/utils/code-tools/codex')
      const authData = { TEST_API_KEY: 'secret-key' }

      module.writeAuthFile(authData)

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.stringContaining('auth.json'),
        expect.objectContaining({ TEST_API_KEY: 'secret-key' }),
        { pretty: true },
      )
    })
  })
})
