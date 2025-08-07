import { describe, it, expect, vi, beforeEach } from 'vitest';
import inquirer from 'inquirer';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  }
}));

vi.mock('../../../src/utils/installer', () => ({
  checkClaudeInstalled: vi.fn(),
  installClaudeCode: vi.fn(),
  isClaudeCodeInstalled: vi.fn()
}));

vi.mock('../../../src/utils/config', () => ({
  checkExistingConfig: vi.fn(),
  backupExistingConfig: vi.fn(),
  copyConfigFiles: vi.fn(),
  configureApi: vi.fn(),
  applyAiLanguageDirective: vi.fn(),
  getExistingApiConfig: vi.fn(),
  ensureClaudeDir: vi.fn()
}));

vi.mock('../../../src/utils/config-operations', () => ({
  configureApiCompletely: vi.fn(),
  modifyApiConfigPartially: vi.fn()
}));

vi.mock('../../../src/utils/prompts', () => ({
  selectScriptLanguage: vi.fn(),
  selectAiOutputLanguage: vi.fn(),
  resolveAiOutputLanguage: vi.fn()
}));

vi.mock('../../../src/utils/mcp', () => ({
  configureMcpServers: vi.fn(),
  addCompletedOnboarding: vi.fn(),
  backupMcpConfig: vi.fn(),
  buildMcpServerConfig: vi.fn(),
  fixWindowsMcpConfig: vi.fn(),
  mergeMcpServers: vi.fn(),
  readMcpConfig: vi.fn(),
  writeMcpConfig: vi.fn()
}));

vi.mock('../../../src/utils/banner', () => ({
  showBanner: vi.fn(),
  displayBannerWithInfo: vi.fn()
}));

vi.mock('../../../src/utils/ai-personality', () => ({
  configureAiPersonality: vi.fn()
}));

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn()
}));

vi.mock('../../../src/utils/mcp-selector', () => ({
  selectMcpServices: vi.fn()
}));

vi.mock('../../../src/utils/platform', () => ({
  isWindows: vi.fn().mockReturnValue(false),
  isTermux: vi.fn().mockReturnValue(false)
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn()
}));

describe('init command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  it('should load init module', async () => {
    const module = await import('../../../src/commands/init');
    expect(module).toBeDefined();
    expect(module.init).toBeDefined();
    expect(typeof module.init).toBe('function');
  });

  describe('init function', () => {
    it('should handle full initialization flow', async () => {
      const { init } = await import('../../../src/commands/init');
      const { selectScriptLanguage, resolveAiOutputLanguage } = await import('../../../src/utils/prompts');
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer');
      const { copyConfigFiles, applyAiLanguageDirective } = await import('../../../src/utils/config');
      const { selectMcpServices } = await import('../../../src/utils/mcp-selector');
      const { existsSync } = await import('node:fs');
      
      vi.mocked(selectScriptLanguage).mockResolvedValue('zh-CN');
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true);
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: 'zh-CN' });
      vi.mocked(resolveAiOutputLanguage).mockResolvedValue('chinese-simplified');
      vi.mocked(selectMcpServices).mockResolvedValue([]);
      vi.mocked(copyConfigFiles).mockResolvedValue(undefined);
      vi.mocked(applyAiLanguageDirective).mockResolvedValue(undefined);
      
      await init({ skipBanner: true });
      
      expect(selectScriptLanguage).toHaveBeenCalled();
      expect(isClaudeCodeInstalled).toHaveBeenCalled();
      expect(copyConfigFiles).toHaveBeenCalled();
    });

    it('should handle options correctly', async () => {
      const { init } = await import('../../../src/commands/init');
      const { selectScriptLanguage, resolveAiOutputLanguage } = await import('../../../src/utils/prompts');
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer');
      const { copyConfigFiles, applyAiLanguageDirective } = await import('../../../src/utils/config');
      const { selectMcpServices } = await import('../../../src/utils/mcp-selector');
      const { existsSync } = await import('node:fs');
      
      vi.mocked(selectScriptLanguage).mockResolvedValue('en');
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true);
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(resolveAiOutputLanguage).mockResolvedValue('english');
      vi.mocked(selectMcpServices).mockResolvedValue([]);
      vi.mocked(copyConfigFiles).mockResolvedValue(undefined);
      vi.mocked(applyAiLanguageDirective).mockResolvedValue(undefined);
      
      await init({ lang: 'en', configLang: 'en', force: true, skipBanner: true });
      
      expect(selectScriptLanguage).toHaveBeenCalledWith('en');
      expect(copyConfigFiles).toHaveBeenCalled();
    });

    it('should handle Claude Code not installed', async () => {
      const { init } = await import('../../../src/commands/init');
      const { isClaudeCodeInstalled, installClaudeCode } = await import('../../../src/utils/installer');
      const { selectScriptLanguage } = await import('../../../src/utils/prompts');
      const { existsSync } = await import('node:fs');
      
      vi.mocked(selectScriptLanguage).mockResolvedValue('zh-CN');
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(false);
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ lang: 'zh-CN' })
        .mockResolvedValueOnce({ shouldInstall: true });
      vi.mocked(installClaudeCode).mockResolvedValue(true);
      
      await init({ skipBanner: true });
      
      expect(isClaudeCodeInstalled).toHaveBeenCalled();
      expect(installClaudeCode).toHaveBeenCalled();
    });

    it('should handle existing config', async () => {
      const { init } = await import('../../../src/commands/init');
      const { selectScriptLanguage } = await import('../../../src/utils/prompts');
      const { isClaudeCodeInstalled } = await import('../../../src/utils/installer');
      const { existsSync } = await import('node:fs');
      
      vi.mocked(selectScriptLanguage).mockResolvedValue('zh-CN');
      vi.mocked(isClaudeCodeInstalled).mockResolvedValue(true);
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ lang: 'zh-CN' })
        .mockResolvedValueOnce({ action: 'skip' });
      
      await init({ skipBanner: true });
      
      expect(selectScriptLanguage).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const { init } = await import('../../../src/commands/init');
      const { selectScriptLanguage } = await import('../../../src/utils/prompts');
      
      const error = new Error('Test error');
      vi.mocked(selectScriptLanguage).mockRejectedValue(error);
      
      await init({ skipBanner: true });
      
      expect(console.error).toHaveBeenCalled();
    });

    // Removed skipped integration tests that need major refactoring
    // These tests were testing implementation details rather than behavior
    // and would require significant mock setup that doesn't add value
  });
});