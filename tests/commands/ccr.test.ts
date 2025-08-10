import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ccr } from '../../src/commands/ccr';
import * as ccrInstaller from '../../src/utils/ccr/installer';
import * as ccrConfig from '../../src/utils/ccr/config';
import * as errorHandler from '../../src/utils/error-handler';
import { I18N } from '../../src/constants';
import ansis from 'ansis';

vi.mock('../../src/utils/ccr/installer');
vi.mock('../../src/utils/ccr/config');
vi.mock('../../src/utils/error-handler');

describe('ccr command', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });

  describe('basic functionality', () => {
    it('should configure CCR when already installed', async () => {
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(true);
      vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue();
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);

      await ccr({ lang: 'en' });

      expect(ccrInstaller.isCcrInstalled).toHaveBeenCalledTimes(1);
      expect(ccrInstaller.installCcr).not.toHaveBeenCalled();
      expect(ccrConfig.configureCcrFeature).toHaveBeenCalledWith('en');
      // Check actual messages from I18N
      const expectedInstalled = I18N['en'].ccr.ccrAlreadyInstalled;
      const expectedComplete = I18N['en'].ccr.ccrSetupComplete;
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(expectedInstalled)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(expectedComplete)
      );
    });

    it('should install and configure CCR when not installed', async () => {
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(false);
      vi.mocked(ccrInstaller.installCcr).mockResolvedValue();
      vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue();
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);

      await ccr({ lang: 'zh-CN' });

      expect(ccrInstaller.isCcrInstalled).toHaveBeenCalledTimes(1);
      expect(ccrInstaller.installCcr).toHaveBeenCalledWith('zh-CN');
      expect(ccrConfig.configureCcrFeature).toHaveBeenCalledWith('zh-CN');
      // Check actual messages from I18N
      const expectedInstalling = I18N['zh-CN'].ccr.installingCcr;
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(expectedInstalling)
      );
    });

    it('should use default language when not specified', async () => {
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(true);
      vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue();
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);

      await ccr();

      expect(ccrConfig.configureCcrFeature).toHaveBeenCalledWith('zh-CN');
    });

    it('should handle configuration success', async () => {
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(true);
      vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue();
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);

      await ccr({ lang: 'en' });

      const expectedComplete = I18N['en'].ccr.ccrSetupComplete;
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(expectedComplete)
      );
    });
  });

  describe('error handling', () => {
    it('should handle exit prompt error', async () => {
      const exitError = new Error('User cancelled');
      exitError.name = 'ExitPromptError';
      
      vi.mocked(ccrInstaller.isCcrInstalled).mockRejectedValue(exitError);
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(true);

      await ccr({ lang: 'en' });

      expect(errorHandler.handleExitPromptError).toHaveBeenCalledWith(exitError);
      expect(errorHandler.handleGeneralError).not.toHaveBeenCalled();
    });

    it('should handle general errors', async () => {
      const generalError = new Error('Network error');
      
      vi.mocked(ccrInstaller.isCcrInstalled).mockRejectedValue(generalError);
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);
      vi.mocked(errorHandler.handleGeneralError).mockImplementation(() => {});

      await ccr({ lang: 'en' });

      expect(errorHandler.handleExitPromptError).toHaveBeenCalledWith(generalError);
      expect(errorHandler.handleGeneralError).toHaveBeenCalledWith(generalError, 'en');
    });

    it('should handle installation errors', async () => {
      const installError = new Error('Permission denied');
      
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(false);
      vi.mocked(ccrInstaller.installCcr).mockRejectedValue(installError);
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);
      vi.mocked(errorHandler.handleGeneralError).mockImplementation(() => {});

      await ccr({ lang: 'en' });

      expect(errorHandler.handleGeneralError).toHaveBeenCalledWith(installError, 'en');
    });

    it('should handle configuration errors', async () => {
      const configError = new Error('Config write failed');
      
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(true);
      vi.mocked(ccrConfig.configureCcrFeature).mockRejectedValue(configError);
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);
      vi.mocked(errorHandler.handleGeneralError).mockImplementation(() => {});

      await ccr({ lang: 'zh-CN' });

      expect(errorHandler.handleGeneralError).toHaveBeenCalledWith(configError, 'zh-CN');
    });
  });

  describe('internationalization', () => {
    it('should display messages in English', async () => {
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(true);
      vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue();

      await ccr({ lang: 'en' });

      const expectedConfigure = I18N['en'].ccr.configureCcr;
      const expectedInstalled = I18N['en'].ccr.ccrAlreadyInstalled;
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(expectedConfigure)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(expectedInstalled)
      );
    });

    it('should display messages in Chinese', async () => {
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(false);
      vi.mocked(ccrInstaller.installCcr).mockResolvedValue();
      vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue();

      await ccr({ lang: 'zh-CN' });

      const expectedConfigure = I18N['zh-CN'].ccr.configureCcr;
      const expectedInstalling = I18N['zh-CN'].ccr.installingCcr;
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(expectedConfigure)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(expectedInstalling)
      );
    });
  });
});