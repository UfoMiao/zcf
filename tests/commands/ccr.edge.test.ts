import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ccr } from '../../src/commands/ccr';
import * as ccrMenu from '../../src/utils/tools/ccr-menu';
import * as errorHandler from '../../src/utils/error-handler';
import * as zcfConfig from '../../src/utils/zcf-config';
import * as prompts from '../../src/utils/prompts';
import * as banner from '../../src/utils/banner';
import * as menu from '../../src/commands/menu';

vi.mock('../../src/utils/tools/ccr-menu');
vi.mock('../../src/utils/error-handler');
vi.mock('../../src/utils/zcf-config');
vi.mock('../../src/utils/prompts');
vi.mock('../../src/utils/banner');
vi.mock('../../src/commands/menu');

describe('ccr command - edge cases', () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.mocked(banner.displayBannerWithInfo).mockImplementation(() => {});
    vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue({
      preferredLang: 'en',
    } as any);
    vi.mocked(prompts.selectScriptLanguage).mockResolvedValue('en');
    vi.mocked(ccrMenu.showCcrMenu).mockResolvedValue(false);
    vi.mocked(menu.showMainMenu).mockResolvedValue();
    vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);
    vi.mocked(errorHandler.handleGeneralError).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('boundary conditions', () => {
    it('should handle empty options object', async () => {
      vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue(null);
      vi.mocked(prompts.selectScriptLanguage).mockResolvedValue('zh-CN');

      await ccr({});

      expect(ccrMenu.showCcrMenu).toHaveBeenCalledWith('zh-CN');
    });

    it('should handle undefined options', async () => {
      vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue(null);
      vi.mocked(prompts.selectScriptLanguage).mockResolvedValue('zh-CN');

      await ccr(undefined);

      expect(ccrMenu.showCcrMenu).toHaveBeenCalledWith('zh-CN');
    });

    it('should handle invalid language in options', async () => {
      // @ts-ignore - testing invalid input
      await ccr({ lang: 'invalid-lang' });

      // Should still call showCcrMenu with the provided value
      expect(ccrMenu.showCcrMenu).toHaveBeenCalledWith('invalid-lang');
    });

    it('should handle concurrent executions', async () => {
      let callCount = 0;
      vi.mocked(ccrMenu.showCcrMenu).mockImplementation(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return false;
      });

      const promises = [
        ccr({ lang: 'en' }),
        ccr({ lang: 'zh-CN' }),
        ccr({ lang: 'en' })
      ];

      await Promise.all(promises);

      expect(callCount).toBe(3);
      expect(ccrMenu.showCcrMenu).toHaveBeenCalledTimes(3);
    });
  });

  describe('error recovery', () => {
    it('should handle menu errors gracefully', async () => {
      vi.mocked(ccrMenu.showCcrMenu).mockRejectedValue(new Error('Menu error'));
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);

      await ccr({ lang: 'en' });

      expect(errorHandler.handleGeneralError).toHaveBeenCalledWith(
        expect.any(Error),
        'en'
      );
    });

    it('should handle mixed error types', async () => {
      const customError = new Error('Custom error');
      customError.name = 'CustomError';
      
      vi.mocked(ccrMenu.showCcrMenu).mockRejectedValue(customError);
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);

      await ccr({ lang: 'en' });

      expect(errorHandler.handleExitPromptError).toHaveBeenCalledWith(customError);
      expect(errorHandler.handleGeneralError).toHaveBeenCalledWith(customError, 'en');
    });

    it('should handle null config gracefully', async () => {
      vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue(null);
      vi.mocked(prompts.selectScriptLanguage).mockResolvedValue('en');

      await ccr({ skipBanner: true });

      expect(prompts.selectScriptLanguage).toHaveBeenCalled();
      expect(ccrMenu.showCcrMenu).toHaveBeenCalledWith('en');
    });

    it('should handle undefined preferredLang in config', async () => {
      vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue({
        // preferredLang is undefined
      } as any);
      vi.mocked(prompts.selectScriptLanguage).mockResolvedValue('zh-CN');

      await ccr({});

      expect(prompts.selectScriptLanguage).toHaveBeenCalled();
      expect(ccrMenu.showCcrMenu).toHaveBeenCalledWith('zh-CN');
    });
  });

  describe('integration scenarios', () => {
    it('should handle full flow with all options', async () => {
      vi.mocked(ccrMenu.showCcrMenu).mockResolvedValue(true);

      await ccr({ 
        lang: 'zh-CN',
        skipBanner: false
      });

      expect(banner.displayBannerWithInfo).toHaveBeenCalled();
      expect(ccrMenu.showCcrMenu).toHaveBeenCalledWith('zh-CN');
      expect(menu.showMainMenu).not.toHaveBeenCalled();
    });

    it('should handle menu navigation back', async () => {
      vi.mocked(ccrMenu.showCcrMenu).mockResolvedValue(false);

      await ccr({ lang: 'en' });

      expect(menu.showMainMenu).toHaveBeenCalled();
    });

    it('should handle exit during menu', async () => {
      const exitError = new Error('User exited');
      exitError.name = 'ExitPromptError';
      
      vi.mocked(ccrMenu.showCcrMenu).mockRejectedValue(exitError);
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(true);

      await ccr({ lang: 'en' });

      expect(errorHandler.handleExitPromptError).toHaveBeenCalledWith(exitError);
      expect(menu.showMainMenu).not.toHaveBeenCalled();
    });
  });

  describe('performance scenarios', () => {
    it('should handle rapid successive calls', async () => {
      let executionCount = 0;
      vi.mocked(ccrMenu.showCcrMenu).mockImplementation(async () => {
        executionCount++;
        return false;
      });

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(ccr({ lang: i % 2 === 0 ? 'en' : 'zh-CN' }));
      }

      await Promise.all(promises);

      expect(executionCount).toBe(10);
    });

    it('should handle slow config read', async () => {
      vi.mocked(zcfConfig.readZcfConfigAsync).mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({ preferredLang: 'en' } as any), 100)
        )
      );

      const startTime = Date.now();
      await ccr({});
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(95);
      expect(ccrMenu.showCcrMenu).toHaveBeenCalledWith('en');
    });
  });
});