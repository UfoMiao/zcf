import { describe, it, expect, vi, beforeEach } from 'vitest';
import inquirer from 'inquirer';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  }
}));

vi.mock('../../../src/utils/config', () => ({
  applyAiLanguageDirective: vi.fn(),
  backupExistingConfig: vi.fn(),
  configureApi: vi.fn(),
  copyConfigFiles: vi.fn(),
  getExistingApiConfig: vi.fn()
}));

vi.mock('../../../src/utils/ai-personality', () => ({
  configureAiPersonality: vi.fn()
}));

vi.mock('../../../src/utils/validator', () => ({
  formatApiKeyDisplay: vi.fn(),
  validateApiKey: vi.fn()
}));

describe('config-operations utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should load config-operations module', async () => {
    const module = await import('../../../src/utils/config-operations');
    expect(module).toBeDefined();
  });

  it('should export all functions', async () => {
    const module = await import('../../../src/utils/config-operations');
    
    expect(module.configureApiCompletely).toBeDefined();
    expect(module.modifyApiConfigPartially).toBeDefined();
    expect(module.updatePromptOnly).toBeDefined();
    
    expect(typeof module.configureApiCompletely).toBe('function');
    expect(typeof module.modifyApiConfigPartially).toBe('function');
    expect(typeof module.updatePromptOnly).toBe('function');
  });

  describe('configureApiCompletely', () => {
    it('should configure API completely', async () => {
      const { configureApiCompletely } = await import('../../../src/utils/config-operations');
      const { I18N } = await import('../../../src/constants');
      
      vi.mocked(inquirer.prompt).mockResolvedValue({ authType: 'api_key' });
      
      const result = await configureApiCompletely(I18N['zh-CN'], 'zh-CN', 'api_key');
      
      expect(result).toBeDefined();
    });
  });

  describe('modifyApiConfigPartially', () => {
    it('should modify API config partially - single field', async () => {
      const { modifyApiConfigPartially } = await import('../../../src/utils/config-operations');
      const { getExistingApiConfig } = await import('../../../src/utils/config');
      const { validateApiKey } = await import('../../../src/utils/validator');
      const { I18N } = await import('../../../src/constants');
      
      vi.mocked(getExistingApiConfig).mockReturnValue({
        apiKey: 'old-key',
        apiUrl: 'old-url',
        modelId: 'old-model',
        prompt: 'old-prompt'
      } as any);
      
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'apiKey' })
        .mockResolvedValueOnce({ apiKey: 'new-key' });
      
      vi.mocked(validateApiKey).mockReturnValue(true);
      
      await modifyApiConfigPartially(I18N['zh-CN'], 'zh-CN');
      
      expect(inquirer.prompt).toHaveBeenCalled();
    });

    it('should modify API config partially - multiple fields', async () => {
      const { modifyApiConfigPartially } = await import('../../../src/utils/config-operations');
      const { getExistingApiConfig } = await import('../../../src/utils/config');
      const { I18N } = await import('../../../src/constants');
      
      vi.mocked(getExistingApiConfig).mockReturnValue({
        apiKey: 'old-key',
        apiUrl: 'old-url',
        modelId: 'old-model',
        prompt: 'old-prompt'
      } as any);
      
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'multiple' })
        .mockResolvedValueOnce({ items: ['apiKey', 'apiUrl'] })
        .mockResolvedValueOnce({ apiKey: 'new-key' })
        .mockResolvedValueOnce({ apiUrl: 'new-url' });
      
      await modifyApiConfigPartially(I18N['zh-CN'], 'zh-CN');
      
      expect(inquirer.prompt).toHaveBeenCalled();
    });

    it('should handle cancel action', async () => {
      const { modifyApiConfigPartially } = await import('../../../src/utils/config-operations');
      const { getExistingApiConfig } = await import('../../../src/utils/config');
      const { I18N } = await import('../../../src/constants');
      
      vi.mocked(getExistingApiConfig).mockReturnValue({
        apiKey: 'old-key'
      } as any);
      
      vi.mocked(inquirer.prompt).mockResolvedValue({ item: 'cancel' });
      
      await modifyApiConfigPartially(I18N['zh-CN'], 'zh-CN');
      
      expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    });
  });

  describe('updatePromptOnly', () => {
    it('should update prompt field only', async () => {
      const { updatePromptOnly } = await import('../../../src/utils/config-operations');
      const { I18N } = await import('../../../src/constants');
      
      await updatePromptOnly(I18N['zh-CN'], 'zh-CN');
      
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle no existing config', async () => {
      const { updatePromptOnly } = await import('../../../src/utils/config-operations');
      const { I18N } = await import('../../../src/constants');
      
      await updatePromptOnly(I18N['zh-CN'], 'zh-CN');
      
      expect(console.log).toHaveBeenCalled();
    });
  });
});