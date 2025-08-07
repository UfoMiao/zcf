import { describe, it, expect, vi, beforeEach } from 'vitest';
import inquirer from 'inquirer';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  }
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  unlinkSync: vi.fn()
}));

vi.mock('../../../src/utils/config', () => ({
  applyAiLanguageDirective: vi.fn(),
  configureApi: vi.fn(),
  updateDefaultModel: vi.fn(),
  getExistingApiConfig: vi.fn()
}));

vi.mock('../../../src/utils/config-operations', () => ({
  configureApiCompletely: vi.fn(),
  modifyApiConfigPartially: vi.fn()
}));

vi.mock('../../../src/utils/mcp', () => ({
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

vi.mock('../../../src/utils/simple-config', () => ({
  importRecommendedEnv: vi.fn(),
  importRecommendedPermissions: vi.fn(),
  openSettingsJson: vi.fn()
}));

vi.mock('../../../src/utils/prompts', () => ({
  resolveAiOutputLanguage: vi.fn()
}));

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn()
}));

vi.mock('../../../src/utils/ai-personality', () => ({
  configureAiPersonality: vi.fn()
}));

vi.mock('../../../src/utils/platform', () => ({
  isWindows: vi.fn()
}));

describe('features utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should load features module', async () => {
    const module = await import('../../../src/utils/features');
    expect(module).toBeDefined();
  });

  it('should export all feature functions', async () => {
    const module = await import('../../../src/utils/features');
    
    expect(module.configureApiFeature).toBeDefined();
    expect(module.configureMcpFeature).toBeDefined();
    expect(module.configureDefaultModelFeature).toBeDefined();
    expect(module.configureAiMemoryFeature).toBeDefined();
    expect(module.clearZcfCacheFeature).toBeDefined();
    expect(module.changeScriptLanguageFeature).toBeDefined();
    expect(module.configureEnvPermissionFeature).toBeDefined();
    
    expect(typeof module.configureApiFeature).toBe('function');
    expect(typeof module.configureMcpFeature).toBe('function');
    expect(typeof module.configureDefaultModelFeature).toBe('function');
    expect(typeof module.configureAiMemoryFeature).toBe('function');
    expect(typeof module.clearZcfCacheFeature).toBe('function');
    expect(typeof module.changeScriptLanguageFeature).toBe('function');
    expect(typeof module.configureEnvPermissionFeature).toBe('function');
  });

  describe('configureApiFeature', () => {
    it('should configure API completely when no existing config', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features');
      const { getExistingApiConfig, configureApi } = await import('../../../src/utils/config');
      
      vi.mocked(getExistingApiConfig).mockReturnValue(null);
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ apiChoice: 'api_key' })
        .mockResolvedValueOnce({ url: 'https://api.test.com' })
        .mockResolvedValueOnce({ key: 'test-key' });
      vi.mocked(configureApi).mockReturnValue({ url: 'https://api.test.com', key: 'test-key', authType: 'api_key' });
      
      await configureApiFeature('zh-CN');
      
      expect(getExistingApiConfig).toHaveBeenCalled();
      expect(configureApi).toHaveBeenCalledWith({ url: 'https://api.test.com', key: 'test-key', authType: 'api_key' });
    });

    it('should modify API partially when existing config', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features');
      const { getExistingApiConfig } = await import('../../../src/utils/config');
      const { modifyApiConfigPartially } = await import('../../../src/utils/config-operations');
      const { I18N } = await import('../../../src/constants');
      
      vi.mocked(getExistingApiConfig).mockReturnValue({ url: 'https://api.test.com', key: 'test-key', authType: 'api_key' });
      vi.mocked(inquirer.prompt).mockResolvedValue({ action: 'modify-partial' });
      vi.mocked(modifyApiConfigPartially).mockResolvedValue(undefined);
      
      await configureApiFeature('zh-CN');
      
      expect(modifyApiConfigPartially).toHaveBeenCalledWith({ url: 'https://api.test.com', key: 'test-key', authType: 'api_key' }, I18N['zh-CN'], 'zh-CN');
    });
  });

  describe('configureMcpFeature', () => {
    it('should configure MCP servers', async () => {
      const { configureMcpFeature } = await import('../../../src/utils/features');
      const { selectMcpServices } = await import('../../../src/utils/mcp-selector');
      const { readMcpConfig, writeMcpConfig, mergeMcpServers } = await import('../../../src/utils/mcp');
      
      vi.mocked(selectMcpServices).mockResolvedValue(['fs']);
      vi.mocked(readMcpConfig).mockReturnValue({ mcpServers: {} });
      vi.mocked(mergeMcpServers).mockReturnValue({ mcpServers: { fs: {} } } as any);
      vi.mocked(writeMcpConfig).mockResolvedValue(undefined);
      
      await configureMcpFeature('zh-CN');
      
      expect(selectMcpServices).toHaveBeenCalled();
      expect(writeMcpConfig).toHaveBeenCalled();
    });
  });

  describe('configureDefaultModelFeature', () => {
    it('should update default model', async () => {
      const { configureDefaultModelFeature } = await import('../../../src/utils/features');
      const { updateDefaultModel } = await import('../../../src/utils/config');
      
      vi.mocked(inquirer.prompt).mockResolvedValue({ model: 'opus' });
      vi.mocked(updateDefaultModel).mockResolvedValue(undefined);
      
      await configureDefaultModelFeature('zh-CN');
      
      expect(updateDefaultModel).toHaveBeenCalledWith('opus');
    });
  });

  describe('configureAiMemoryFeature', () => {
    it('should configure AI memory', async () => {
      const { configureAiMemoryFeature } = await import('../../../src/utils/features');
      const { applyAiLanguageDirective } = await import('../../../src/utils/config');
      const { configureAiPersonality } = await import('../../../src/utils/ai-personality');
      const { resolveAiOutputLanguage } = await import('../../../src/utils/prompts');
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config');
      
      vi.mocked(readZcfConfig).mockReturnValue({} as any);
      vi.mocked(inquirer.prompt).mockResolvedValue({ 
        option: 'language'
      });
      vi.mocked(resolveAiOutputLanguage).mockResolvedValue('chinese-simplified');
      vi.mocked(applyAiLanguageDirective).mockResolvedValue(undefined);
      vi.mocked(updateZcfConfig).mockResolvedValue(undefined);
      
      await configureAiMemoryFeature('zh-CN');
      
      expect(applyAiLanguageDirective).toHaveBeenCalledWith('chinese-simplified');
      expect(updateZcfConfig).toHaveBeenCalledWith({ aiOutputLang: 'chinese-simplified' });
    });
  });

  describe('clearZcfCacheFeature', () => {
    it('should clear ZCF cache', async () => {
      const { clearZcfCacheFeature } = await import('../../../src/utils/features');
      const { existsSync, unlinkSync } = await import('node:fs');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(unlinkSync).mockImplementation(() => {});
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true });
      
      await clearZcfCacheFeature('zh-CN');
      
      expect(unlinkSync).toHaveBeenCalled();
    });
  });

  describe('changeScriptLanguageFeature', () => {
    it('should change script language', async () => {
      const { changeScriptLanguageFeature } = await import('../../../src/utils/features');
      const { updateZcfConfig } = await import('../../../src/utils/zcf-config');
      
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: 'en' });
      vi.mocked(updateZcfConfig).mockResolvedValue(undefined);
      
      const result = await changeScriptLanguageFeature('zh-CN');
      
      expect(result).toBe('en');
      expect(updateZcfConfig).toHaveBeenCalledWith({ preferredLang: 'en' });
    });
  });

  describe('configureEnvPermissionFeature', () => {
    it('should configure environment permissions', async () => {
      const { configureEnvPermissionFeature } = await import('../../../src/utils/features');
      const { importRecommendedEnv } = await import('../../../src/utils/simple-config');
      
      vi.mocked(inquirer.prompt).mockResolvedValue({ 
        choice: 'env'
      });
      vi.mocked(importRecommendedEnv).mockResolvedValue(undefined);
      
      await configureEnvPermissionFeature('zh-CN');
      
      expect(importRecommendedEnv).toHaveBeenCalled();
    });
  });
});