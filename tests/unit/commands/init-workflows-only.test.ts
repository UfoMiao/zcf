import type { InitOptions } from '../../../src/commands/init'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { init } from '../../../src/commands/init'

// Mock all side-effect-producing dependencies so we can assert which were
// invoked when workflowsOnly is set vs unset. The init flow normally:
//  - checks/installs Claude Code (installer.getInstallationStatus + installClaudeCode)
//  - prompts a Claude Code version update (version-checker.checkClaudeCodeVersionAndPrompt)
//  - merges settings.json (config.copyConfigFiles + configureApi)
//  - writes the AI language directive into ~/.claude/CLAUDE.md (config.applyAiLanguageDirective)
//  - configures output styles (output-style.configureOutputStyle)
//  - installs CCometixLine (cometix/installer.installCometixLine)
//  - persists user language preferences (zcf-config.updateZcfConfig)
// In workflowsOnly mode we expect every one of those to be skipped, with
// only selectAndInstallWorkflows + a version-only updateZcfConfig firing.

vi.mock('../../../src/utils/installer', () => ({
  getInstallationStatus: vi.fn().mockResolvedValue({
    hasGlobal: true,
    hasLocal: false,
  }),
  installClaudeCode: vi.fn().mockResolvedValue(undefined),
  verifyInstallation: vi.fn().mockResolvedValue({ success: true, symlinkCreated: false }),
  displayVerificationResult: vi.fn(),
  removeLocalClaudeCode: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/installation-manager', () => ({
  handleMultipleInstallations: vi.fn().mockResolvedValue('global'),
}))

vi.mock('../../../src/utils/config', () => ({
  ensureClaudeDir: vi.fn(),
  backupExistingConfig: vi.fn().mockReturnValue('/test/backup'),
  copyConfigFiles: vi.fn(),
  configureApi: vi.fn(),
  applyAiLanguageDirective: vi.fn(),
  getExistingApiConfig: vi.fn().mockReturnValue(null),
  promptApiConfigurationAction: vi.fn(),
  switchToOfficialLogin: vi.fn().mockReturnValue(true),
}))

vi.mock('../../../src/utils/prompts', () => ({
  resolveAiOutputLanguage: vi.fn().mockResolvedValue('en'),
  resolveTemplateLanguage: vi.fn().mockResolvedValue('en'),
}))

vi.mock('../../../src/utils/workflow-installer', () => ({
  selectAndInstallWorkflows: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../src/utils/output-style', () => ({
  configureOutputStyle: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/mcp-selector', () => ({
  selectMcpServices: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../src/utils/version-checker', () => ({
  checkClaudeCodeVersionAndPrompt: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/cometix/installer', () => ({
  isCometixLineInstalled: vi.fn().mockResolvedValue(false),
  installCometixLine: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn().mockReturnValue({
    version: '0.0.0',
    preferredLang: 'zh-CN',
    templateLang: 'zh-CN',
    aiOutputLang: 'zh-CN',
    codeToolType: 'claude-code',
  }),
  readZcfConfigAsync: vi.fn().mockResolvedValue({
    version: '0.0.0',
    preferredLang: 'zh-CN',
    templateLang: 'zh-CN',
    aiOutputLang: 'zh-CN',
    codeToolType: 'claude-code',
  }),
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../../src/utils/banner', () => ({
  displayBannerWithInfo: vi.fn(),
}))

vi.mock('../../../src/utils/platform', () => ({
  isTermux: vi.fn().mockReturnValue(false),
  isWindows: vi.fn().mockReturnValue(false),
}))

vi.mock('../../../src/config/workflows', () => ({
  WORKFLOW_CONFIG_BASE: [
    { id: 'workflow1', name: 'Workflow 1' },
    { id: 'workflow2', name: 'Workflow 2' },
  ],
}))

vi.mock('../../../src/config/mcp-services', () => ({
  MCP_SERVICE_CONFIGS: [
    { id: 'service1', requiresApiKey: false },
  ],
  getMcpServices: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../src/utils/code-type-resolver', () => ({
  resolveCodeType: vi.fn().mockResolvedValue('claude-code'),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
}))

vi.mock('ansis', () => ({
  default: {
    yellow: (text: string) => text,
    green: (text: string) => text,
    blue: (text: string) => text,
    gray: (text: string) => text,
    cyan: (text: string) => text,
    red: (text: string) => text,
  },
}))

describe('init --workflows-only', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('skips Claude Code install/version checks and the AI language directive', async () => {
    const { getInstallationStatus, installClaudeCode } = await import('../../../src/utils/installer')
    const { checkClaudeCodeVersionAndPrompt } = await import('../../../src/utils/version-checker')
    const { applyAiLanguageDirective } = await import('../../../src/utils/config')

    const options: InitOptions = {
      skipPrompt: true,
      workflowsOnly: true,
    }

    await init(options)

    expect(getInstallationStatus).not.toHaveBeenCalled()
    expect(installClaudeCode).not.toHaveBeenCalled()
    expect(checkClaudeCodeVersionAndPrompt).not.toHaveBeenCalled()
    expect(applyAiLanguageDirective).not.toHaveBeenCalled()
  })

  it('skips CCometixLine, MCP and output-style configuration', async () => {
    const { installCometixLine } = await import('../../../src/utils/cometix/installer')
    const { configureOutputStyle } = await import('../../../src/utils/output-style')
    const { configureApi } = await import('../../../src/utils/config')

    const options: InitOptions = {
      skipPrompt: true,
      workflowsOnly: true,
    }

    await init(options)

    expect(installCometixLine).not.toHaveBeenCalled()
    expect(configureOutputStyle).not.toHaveBeenCalled()
    expect(configureApi).not.toHaveBeenCalled()
  })

  it('still installs workflow files', async () => {
    const { selectAndInstallWorkflows } = await import('../../../src/utils/workflow-installer')

    const options: InitOptions = {
      skipPrompt: true,
      workflowsOnly: true,
    }

    await init(options)

    expect(selectAndInstallWorkflows).toHaveBeenCalledTimes(1)
  })

  it('persists only version metadata and preserves existing language prefs', async () => {
    const { updateZcfConfig } = await import('../../../src/utils/zcf-config')

    const options: InitOptions = {
      skipPrompt: true,
      workflowsOnly: true,
    }

    await init(options)

    // Final updateZcfConfig must be a version-only patch
    const calls = (updateZcfConfig as any).mock.calls
    expect(calls.length).toBeGreaterThanOrEqual(1)
    const lastCall = calls[calls.length - 1][0]
    expect(Object.keys(lastCall)).toEqual(['version'])
    // Crucially: do not overwrite preferredLang/templateLang/aiOutputLang
    expect(lastCall).not.toHaveProperty('preferredLang')
    expect(lastCall).not.toHaveProperty('templateLang')
    expect(lastCall).not.toHaveProperty('aiOutputLang')
  })

  it('runs the full flow when workflowsOnly is not set', async () => {
    const { getInstallationStatus } = await import('../../../src/utils/installer')
    const { applyAiLanguageDirective } = await import('../../../src/utils/config')

    const options: InitOptions = {
      skipPrompt: true,
      apiType: 'skip',
    }

    await init(options)

    expect(getInstallationStatus).toHaveBeenCalled()
    expect(applyAiLanguageDirective).toHaveBeenCalled()
  })
})
