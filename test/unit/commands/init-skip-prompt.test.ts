import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { init } from '../../../src/commands/init';
import type { InitOptions } from '../../../src/commands/init';
import { existsSync } from 'node:fs';

// Mock all dependencies
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  }
}));

vi.mock('../../../src/utils/installer', () => ({
  isClaudeCodeInstalled: vi.fn(),
  installClaudeCode: vi.fn()
}));

vi.mock('../../../src/utils/config', () => ({
  ensureClaudeDir: vi.fn(),
  backupExistingConfig: vi.fn(),
  copyConfigFiles: vi.fn(),
  configureApi: vi.fn(),
  applyAiLanguageDirective: vi.fn(),
  getExistingApiConfig: vi.fn()
}));

vi.mock('../../../src/utils/config-operations', () => ({
  configureApiCompletely: vi.fn(),
  modifyApiConfigPartially: vi.fn()
}));

vi.mock('../../../src/utils/prompts', () => ({
  selectScriptLanguage: vi.fn(),
  resolveAiOutputLanguage: vi.fn()
}));

vi.mock('../../../src/utils/ai-personality', () => ({
  configureAiPersonality: vi.fn()
}));

vi.mock('../../../src/utils/mcp', () => ({
  addCompletedOnboarding: vi.fn(),
  backupMcpConfig: vi.fn(),
  buildMcpServerConfig: vi.fn(),
  fixWindowsMcpConfig: vi.fn(),
  mergeMcpServers: vi.fn(),
  readMcpConfig: vi.fn(),
  writeMcpConfig: vi.fn()
}));

vi.mock('../../../src/utils/mcp-selector', () => ({
  selectMcpServices: vi.fn()
}));

vi.mock('../../../src/utils/workflow-installer', () => ({
  selectAndInstallWorkflows: vi.fn()
}));

vi.mock('../../../src/config/workflows', () => ({
  WORKFLOW_CONFIGS: [
    { id: 'sixStepsWorkflow', nameKey: 'workflowOption.sixStepsWorkflow', defaultSelected: true },
    { id: 'featPlanUx', nameKey: 'workflowOption.featPlanUx', defaultSelected: true },
    { id: 'gitWorkflow', nameKey: 'workflowOption.gitWorkflow', defaultSelected: true },
    { id: 'bmadWorkflow', nameKey: 'workflowOption.bmadWorkflow', defaultSelected: true }
  ]
}));

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn().mockReturnValue({}),
  updateZcfConfig: vi.fn()
}));

vi.mock('../../../src/utils/banner', () => ({
  displayBannerWithInfo: vi.fn()
}));

vi.mock('../../../src/utils/platform', () => ({
  isWindows: vi.fn().mockReturnValue(false),
  isTermux: vi.fn().mockReturnValue(false)
}));

vi.mock('../../../src/utils/ccr/installer', () => ({
  isCcrInstalled: vi.fn(),
  installCcr: vi.fn()
}));

vi.mock('../../../src/utils/ccr/config', () => ({
  setupCcrConfiguration: vi.fn()
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn()
}));

describe('init command with --skip-prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('skip-prompt mode', () => {
    it('should skip all prompts when skipPrompt is true', async () => {
      const inquirer = await import('inquirer');
      const { isClaudeCodeInstalled, installClaudeCode } = await import('../../../src/utils/installer');
      const { copyConfigFiles, configureApi, applyAiLanguageDirective } = await import('../../../src/utils/config');
      const { selectAndInstallWorkflows } = await import('../../../src/utils/workflow-installer');
      const { updateZcfConfig } = await import('../../../src/utils/zcf-config');

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(false);

      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        aiOutputLang: 'en',
        installClaude: 'yes',
        configAction: 'new',
        apiType: 'skip',
        skipBanner: true
      };

      await init(options);

      // Should not call any prompts
      expect(inquirer.default.prompt).not.toHaveBeenCalled();
      
      // Should install Claude Code when installClaude is 'yes'
      expect(installClaudeCode).toHaveBeenCalledWith('en');
      
      // Should copy config files
      expect(copyConfigFiles).toHaveBeenCalled();
      
      // Should apply language directive
      expect(applyAiLanguageDirective).toHaveBeenCalledWith('en');
      
      // Should update zcf config
      expect(updateZcfConfig).toHaveBeenCalled();
    });

    it('should configure API with auth token when provided', async () => {
      const { configureApi } = await import('../../../src/utils/config');
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer');

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true);

      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        apiType: 'auth_token',
        authToken: 'test-auth-token',
        skipBanner: true
      };

      await init(options);

      expect(configureApi).toHaveBeenCalledWith({
        authType: 'auth_token',
        key: 'test-auth-token',
        url: 'https://api.anthropic.com'
      });
    });

    it('should configure API with API key when provided', async () => {
      const { configureApi } = await import('../../../src/utils/config');
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer');

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true);

      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        apiType: 'api_key',
        apiKey: 'sk-ant-test-key',
        apiUrl: 'https://custom.api.com',
        skipBanner: true
      };

      await init(options);

      expect(configureApi).toHaveBeenCalledWith({
        authType: 'api_key',
        key: 'sk-ant-test-key',
        url: 'https://custom.api.com'
      });
    });

    it('should configure CCR proxy when selected', async () => {
      const { isCcrInstalled, installCcr } = await import('../../../src/utils/ccr/installer');
      const { setupCcrConfiguration } = await import('../../../src/utils/ccr/config');
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer');

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true);
      vi.mocked(isCcrInstalled).mockResolvedValue(false);
      vi.mocked(setupCcrConfiguration).mockResolvedValue(true);

      const options: InitOptions = {
        skipPrompt: true,
        lang: 'zh-CN',
        configLang: 'zh-CN',
        apiType: 'ccr_proxy',
        skipBanner: true
      };

      await init(options);

      expect(installCcr).toHaveBeenCalledWith('zh-CN');
      expect(setupCcrConfiguration).toHaveBeenCalledWith('zh-CN');
    });

    it('should configure MCP services when provided', async () => {
      const { writeMcpConfig, mergeMcpServers, readMcpConfig } = await import('../../../src/utils/mcp');
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer');

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true);
      vi.mocked(readMcpConfig).mockReturnValue({ mcpServers: {} });
      vi.mocked(mergeMcpServers).mockReturnValue({ mcpServers: { context7: {} } });

      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        mcpServices: ['context7', 'mcp-deepwiki'],
        skipBanner: true
      };

      await init(options);

      expect(mergeMcpServers).toHaveBeenCalled();
      expect(writeMcpConfig).toHaveBeenCalled();
    });

    it('should configure workflows when provided', async () => {
      const { selectAndInstallWorkflows } = await import('../../../src/utils/workflow-installer');
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer');

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true);

      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        workflows: ['sixStepsWorkflow', 'featPlanUx'],
        skipBanner: true
      };

      await init(options);

      expect(selectAndInstallWorkflows).toHaveBeenCalledWith('en', 'en', ['sixStepsWorkflow', 'featPlanUx']);
    });

    it('should configure AI personality when provided', async () => {
      const { configureAiPersonality } = await import('../../../src/utils/ai-personality');
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer');

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true);

      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        aiPersonality: 'professional',
        skipBanner: true
      };

      await init(options);

      expect(configureAiPersonality).toHaveBeenCalledWith('en', 'professional');
    });

    it('should handle existing config with backup action', async () => {
      const { backupExistingConfig, copyConfigFiles } = await import('../../../src/utils/config');
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true);
      vi.mocked(backupExistingConfig).mockReturnValue('/backup/path');

      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        configAction: 'backup',
        skipBanner: true
      };

      await init(options);

      expect(backupExistingConfig).toHaveBeenCalled();
      expect(copyConfigFiles).toHaveBeenCalled();
    });

    it('should validate required parameters in skip-prompt mode', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        apiType: 'api_key',
        // Missing apiKey which is required for api_key type
        skipBanner: true
      };

      await expect(init(options)).rejects.toThrow('API key is required when apiType is "api_key"');
    });

    it('should validate MCP service IDs', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        mcpServices: ['invalid-service'],
        skipBanner: true
      };

      await expect(init(options)).rejects.toThrow('Invalid MCP service: invalid-service');
    });

    it('should not install Claude Code when installClaude is "skip"', async () => {
      const { installClaudeCode, isClaudeCodeInstalled } = await import('../../../src/utils/installer');

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(false);

      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        installClaude: 'skip',
        skipBanner: true
      };

      await init(options);

      expect(installClaudeCode).not.toHaveBeenCalled();
    });

    it('should handle MCP services with API keys', async () => {
      const { writeMcpConfig, buildMcpServerConfig } = await import('../../../src/utils/mcp');
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer');

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true);
      vi.mocked(buildMcpServerConfig).mockReturnValue({
        type: 'stdio',
        command: 'npx',
        args: ['-y', 'mcp-service'],
        env: { API_KEY: 'test-key' }
      });

      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        mcpServices: ['exa'],
        mcpApiKeys: {
          exa: 'test-exa-key'
        },
        skipBanner: true
      };

      await init(options);

      expect(buildMcpServerConfig).toHaveBeenCalled();
      expect(writeMcpConfig).toHaveBeenCalled();
    });
  });

  describe('parameter validation', () => {
    it('should validate installClaude values', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        installClaude: 'invalid' as any,
        skipBanner: true
      };

      await expect(init(options)).rejects.toThrow('Invalid installClaude value: invalid');
    });

    it('should validate configAction values', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        configAction: 'invalid' as any,
        skipBanner: true
      };

      await expect(init(options)).rejects.toThrow('Invalid configAction value: invalid');
    });

    it('should validate apiType values', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        apiType: 'invalid' as any,
        skipBanner: true
      };

      await expect(init(options)).rejects.toThrow('Invalid apiType value: invalid');
    });

    it('should validate workflow IDs', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        workflows: ['invalid-workflow'],
        skipBanner: true
      };

      await expect(init(options)).rejects.toThrow('Invalid workflow: invalid-workflow');
    });

    it('should require authToken when apiType is auth_token', async () => {
      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        apiType: 'auth_token',
        skipBanner: true
      };

      await expect(init(options)).rejects.toThrow('Auth token is required when apiType is "auth_token"');
    });

    it('should use default API URL when not provided', async () => {
      const { configureApi } = await import('../../../src/utils/config');
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer');

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true);

      const options: InitOptions = {
        skipPrompt: true,
        lang: 'en',
        configLang: 'en',
        apiType: 'api_key',
        apiKey: 'sk-ant-test',
        skipBanner: true
      };

      await init(options);

      expect(configureApi).toHaveBeenCalledWith({
        authType: 'api_key',
        key: 'sk-ant-test',
        url: 'https://api.anthropic.com'
      });
    });
  });
});