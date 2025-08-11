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

describe('ccr command', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
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
    consoleLogSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });

  describe('basic functionality', () => {
    it('should show CCR menu with provided language', async () => {
      await ccr({ lang: 'en' });

      expect(banner.displayBannerWithInfo).toHaveBeenCalled();
      expect(ccrMenu.showCcrMenu).toHaveBeenCalledWith('en');
      expect(menu.showMainMenu).toHaveBeenCalled();
    });

    it('should show CCR menu with config language', async () => {
      vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue({
        preferredLang: 'zh-CN',
      } as any);

      await ccr({});

      expect(ccrMenu.showCcrMenu).toHaveBeenCalledWith('zh-CN');
    });

    it('should prompt for language when not configured', async () => {
      vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue(null);
      vi.mocked(prompts.selectScriptLanguage).mockResolvedValue('zh-CN');

      await ccr({});

      expect(prompts.selectScriptLanguage).toHaveBeenCalled();
      expect(ccrMenu.showCcrMenu).toHaveBeenCalledWith('zh-CN');
    });

    it('should skip banner when skipBanner is true', async () => {
      await ccr({ skipBanner: true, lang: 'en' });

      expect(banner.displayBannerWithInfo).not.toHaveBeenCalled();
    });

    it('should not show main menu when continueInCcr is true', async () => {
      vi.mocked(ccrMenu.showCcrMenu).mockResolvedValue(true);

      await ccr({ lang: 'en' });

      expect(menu.showMainMenu).not.toHaveBeenCalled();
    });

    it('should not show main menu when skipBanner is true', async () => {
      vi.mocked(ccrMenu.showCcrMenu).mockResolvedValue(false);

      await ccr({ skipBanner: true, lang: 'en' });

      expect(menu.showMainMenu).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle exit prompt errors', async () => {
      const exitError = new Error('User exited');
      exitError.name = 'ExitPromptError';
      
      vi.mocked(ccrMenu.showCcrMenu).mockRejectedValue(exitError);
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(true);

      await ccr({ lang: 'en' });

      expect(errorHandler.handleExitPromptError).toHaveBeenCalledWith(exitError);
      expect(errorHandler.handleGeneralError).not.toHaveBeenCalled();
    });

    it('should handle general errors', async () => {
      const generalError = new Error('Something went wrong');
      
      vi.mocked(ccrMenu.showCcrMenu).mockRejectedValue(generalError);
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);

      await ccr({ lang: 'en' });

      expect(errorHandler.handleExitPromptError).toHaveBeenCalledWith(generalError);
      expect(errorHandler.handleGeneralError).toHaveBeenCalledWith(generalError, 'en');
    });

    it('should handle config read errors', async () => {
      const configError = new Error('Config error');
      vi.mocked(zcfConfig.readZcfConfigAsync).mockRejectedValue(configError);
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);

      await ccr({});

      // Should handle the error
      expect(errorHandler.handleExitPromptError).toHaveBeenCalledWith(configError);
      expect(errorHandler.handleGeneralError).toHaveBeenCalledWith(configError, undefined);
      // Should not call menu since error occurred
      expect(ccrMenu.showCcrMenu).not.toHaveBeenCalled();
    });
  });

  describe('internationalization', () => {
    it('should use English language', async () => {
      await ccr({ lang: 'en' });

      expect(ccrMenu.showCcrMenu).toHaveBeenCalledWith('en');
    });

    it('should use Chinese language', async () => {
      await ccr({ lang: 'zh-CN' });

      expect(ccrMenu.showCcrMenu).toHaveBeenCalledWith('zh-CN');
    });

    it('should use default language when not specified', async () => {
      vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue(null);
      vi.mocked(prompts.selectScriptLanguage).mockResolvedValue('zh-CN');

      await ccr({});

      expect(ccrMenu.showCcrMenu).toHaveBeenCalledWith('zh-CN');
    });
  });
});