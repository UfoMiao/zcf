import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ccr } from '../../src/commands/ccr';
import * as ccrInstaller from '../../src/utils/ccr/installer';
import * as ccrConfig from '../../src/utils/ccr/config';
import * as errorHandler from '../../src/utils/error-handler';

vi.mock('../../src/utils/ccr/installer');
vi.mock('../../src/utils/ccr/config');
vi.mock('../../src/utils/error-handler');

describe('ccr command - edge cases', () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('boundary conditions', () => {
    it('should handle empty options object', async () => {
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(true);
      vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue();

      await ccr({});

      expect(ccrConfig.configureCcrFeature).toHaveBeenCalledWith('zh-CN');
    });

    it('should handle undefined options', async () => {
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(true);
      vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue();

      await ccr(undefined);

      expect(ccrConfig.configureCcrFeature).toHaveBeenCalledWith('zh-CN');
    });

    it('should handle invalid language fallback', async () => {
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(true);
      vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue();
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);
      vi.mocked(errorHandler.handleGeneralError).mockImplementation(() => {});

      // @ts-ignore - testing invalid input
      await ccr({ lang: 'invalid-lang' });

      // Should handle the error due to undefined i18n
      expect(errorHandler.handleGeneralError).toHaveBeenCalled();
    });
  });

  describe('concurrent execution', () => {
    it('should handle multiple concurrent ccr calls', async () => {
      let callCount = 0;
      vi.mocked(ccrInstaller.isCcrInstalled).mockImplementation(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return true;
      });
      vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue();

      const promises = [
        ccr({ lang: 'en' }),
        ccr({ lang: 'zh-CN' }),
        ccr({ lang: 'en' })
      ];

      await Promise.all(promises);

      expect(callCount).toBe(3);
      expect(ccrConfig.configureCcrFeature).toHaveBeenCalledTimes(3);
    });
  });

  describe('error recovery', () => {
    it('should handle installation retry scenario', async () => {
      let attemptCount = 0;
      vi.mocked(ccrInstaller.isCcrInstalled).mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) return false;
        return true;
      });
      vi.mocked(ccrInstaller.installCcr).mockResolvedValue();
      vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue();

      await ccr({ lang: 'en' });

      expect(ccrInstaller.installCcr).toHaveBeenCalledTimes(1);
      expect(ccrConfig.configureCcrFeature).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed error types', async () => {
      const customError = new Error('Custom error');
      customError.name = 'CustomError';
      
      vi.mocked(ccrInstaller.isCcrInstalled).mockRejectedValue(customError);
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);
      vi.mocked(errorHandler.handleGeneralError).mockImplementation(() => {});

      await ccr({ lang: 'en' });

      expect(errorHandler.handleExitPromptError).toHaveBeenCalledWith(customError);
      expect(errorHandler.handleGeneralError).toHaveBeenCalledWith(customError, 'en');
    });

    it('should handle configuration partial failure', async () => {
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(true);
      vi.mocked(ccrConfig.configureCcrFeature).mockImplementation(async () => {
        throw new Error('Partial config failure');
      });
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);
      vi.mocked(errorHandler.handleGeneralError).mockImplementation(() => {});

      await ccr({ lang: 'en' });

      expect(errorHandler.handleGeneralError).toHaveBeenCalled();
    });
  });

  describe('state management', () => {
    it('should maintain state consistency on error', async () => {
      const error = new Error('State error');
      vi.mocked(ccrInstaller.isCcrInstalled).mockRejectedValue(error);
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);
      vi.mocked(errorHandler.handleGeneralError).mockImplementation(() => {});

      await ccr({ lang: 'en' });

      // Verify no partial operations were completed
      expect(ccrInstaller.installCcr).not.toHaveBeenCalled();
      expect(ccrConfig.configureCcrFeature).not.toHaveBeenCalled();
    });

    it('should handle cleanup on installation failure', async () => {
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(false);
      vi.mocked(ccrInstaller.installCcr).mockRejectedValue(new Error('Install failed'));
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);
      vi.mocked(errorHandler.handleGeneralError).mockImplementation(() => {});

      await ccr({ lang: 'en' });

      // Configuration should not be attempted after installation failure
      expect(ccrConfig.configureCcrFeature).not.toHaveBeenCalled();
    });
  });

  describe('special characters and encoding', () => {
    it('should handle special characters in error messages', async () => {
      const specialError = new Error('Error with 特殊字符 and émojis 🚀');
      vi.mocked(ccrInstaller.isCcrInstalled).mockRejectedValue(specialError);
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false);
      vi.mocked(errorHandler.handleGeneralError).mockImplementation(() => {});

      await ccr({ lang: 'zh-CN' });

      expect(errorHandler.handleGeneralError).toHaveBeenCalledWith(specialError, 'zh-CN');
    });
  });

  describe('timeout and performance', () => {
    it('should handle slow installation process', async () => {
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(false);
      vi.mocked(ccrInstaller.installCcr).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue();

      const startTime = Date.now();
      await ccr({ lang: 'en' });
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(ccrInstaller.installCcr).toHaveBeenCalled();
    });

    it('should handle slow configuration process', async () => {
      vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(true);
      vi.mocked(ccrConfig.configureCcrFeature).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const startTime = Date.now();
      await ccr({ lang: 'en' });
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(50);
    });
  });
});