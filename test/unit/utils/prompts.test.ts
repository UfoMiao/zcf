import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { selectAiOutputLanguage, selectScriptLanguage, resolveAiOutputLanguage } from '../../../src/utils/prompts';
import inquirer from 'inquirer';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  }
}));

vi.mock('ansis', () => ({
  default: {
    dim: (text: string) => text,
    yellow: (text: string) => text,
    gray: (text: string) => text
  }
}));

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn()
}));

// Mock version
vi.mock('../../../package.json', () => ({
  version: '2.3.0'
}));

describe('prompts utilities', () => {
  let exitSpy: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  describe('selectAiOutputLanguage', () => {
    it('should return selected AI output language', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: 'en' });

      const result = await selectAiOutputLanguage('zh-CN');

      expect(result).toBe('en');
      expect(inquirer.prompt).toHaveBeenCalled();
    });

    it('should use default language based on script language', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: 'zh-CN' });

      await selectAiOutputLanguage('zh-CN');

      const call = vi.mocked(inquirer.prompt).mock.calls[0][0] as any;
      expect(call.default).toBe('zh-CN');
    });

    it('should use provided default language', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: 'fr' });

      await selectAiOutputLanguage('en', 'fr');

      const call = vi.mocked(inquirer.prompt).mock.calls[0][0] as any;
      expect(call.default).toBe('fr');
    });

    it('should exit when cancelled', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: undefined });

      await expect(selectAiOutputLanguage('zh-CN')).rejects.toThrow('process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle custom language selection', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ lang: 'custom' })
        .mockResolvedValueOnce({ customLang: 'Español' });

      const result = await selectAiOutputLanguage('en');

      expect(result).toBe('Español');
      expect(inquirer.prompt).toHaveBeenCalledTimes(2);
    });

    it('should exit when custom language cancelled', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ lang: 'custom' })
        .mockResolvedValueOnce({ customLang: undefined });

      await expect(selectAiOutputLanguage('zh-CN')).rejects.toThrow('process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('should validate custom language input', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ lang: 'custom' })
        .mockResolvedValueOnce({ customLang: 'Japanese' });

      await selectAiOutputLanguage('en');

      const secondCall = vi.mocked(inquirer.prompt).mock.calls[1][0] as any;
      expect(secondCall.validate).toBeDefined();
      expect(secondCall.validate('')).not.toBe(true);
      expect(secondCall.validate('value')).toBe(true);
    });
  });

  describe('selectScriptLanguage', () => {
    it('should return saved language from config', async () => {
      const { readZcfConfig } = await import('../../../src/utils/zcf-config');
      vi.mocked(readZcfConfig).mockReturnValue({ 
        version: '2.3.0',
        preferredLang: 'en' 
      });

      const result = await selectScriptLanguage();

      expect(result).toBe('en');
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });

    it('should return provided current language', async () => {
      const { readZcfConfig } = await import('../../../src/utils/zcf-config');
      vi.mocked(readZcfConfig).mockReturnValue(null);

      const result = await selectScriptLanguage('zh-CN');

      expect(result).toBe('zh-CN');
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });

    it('should prompt user when no config and no current lang', async () => {
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config');
      vi.mocked(readZcfConfig).mockReturnValue(null);
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: 'en' });

      const result = await selectScriptLanguage();

      expect(result).toBe('en');
      expect(inquirer.prompt).toHaveBeenCalled();
      expect(updateZcfConfig).toHaveBeenCalledWith({
        version: '2.3.0',
        preferredLang: 'en'
      });
    });

    it('should exit when cancelled', async () => {
      const { readZcfConfig } = await import('../../../src/utils/zcf-config');
      vi.mocked(readZcfConfig).mockReturnValue(null);
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: undefined });

      await expect(selectScriptLanguage()).rejects.toThrow('process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle undefined config', async () => {
      const { readZcfConfig } = await import('../../../src/utils/zcf-config');
      vi.mocked(readZcfConfig).mockReturnValue(undefined as any);
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: 'zh-CN' });

      const result = await selectScriptLanguage();

      expect(result).toBe('zh-CN');
      expect(inquirer.prompt).toHaveBeenCalled();
    });
  });

  describe('resolveAiOutputLanguage', () => {
    it('should prioritize command line option', async () => {
      const result = await resolveAiOutputLanguage('zh-CN', 'fr', { 
        version: '2.3.0',
        preferredLang: 'zh-CN',
        aiOutputLang: 'en' 
      });

      expect(result).toBe('fr');
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });

    it('should use saved config when no command line option', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const result = await resolveAiOutputLanguage('zh-CN', undefined, {
        version: '2.3.0',
        preferredLang: 'zh-CN',
        aiOutputLang: 'en'
      });

      expect(result).toBe('en');
      expect(consoleSpy).toHaveBeenCalled();
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });

    it('should ask user when no command line option and no saved config', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: 'zh-CN' });

      const result = await resolveAiOutputLanguage('zh-CN', undefined, null);

      expect(result).toBe('zh-CN');
      expect(inquirer.prompt).toHaveBeenCalled();
    });

    it('should ask user when saved config has no aiOutputLang', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: 'en' });

      const result = await resolveAiOutputLanguage('en', undefined, {
        version: '2.3.0',
        preferredLang: 'en'
      });

      expect(result).toBe('en');
      expect(inquirer.prompt).toHaveBeenCalled();
    });

    it('should handle undefined command line option', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: 'zh-CN' });

      const result = await resolveAiOutputLanguage('zh-CN');

      expect(result).toBe('zh-CN');
      expect(inquirer.prompt).toHaveBeenCalled();
    });

    it('should use script language as default when asking user', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: 'zh-CN' });

      await resolveAiOutputLanguage('zh-CN', undefined, null);

      const call = vi.mocked(inquirer.prompt).mock.calls[0][0] as any;
      expect(call.default).toBe('zh-CN');
    });
  });
});