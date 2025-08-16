import { exec } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as i18n from '../../../src/i18n';
import * as installerModule from '../../../src/utils/cometix/installer';

// Don't destructure to allow proper mocking
const { isCometixLineInstalled, installCometixLine } = installerModule;

vi.mock('node:child_process');
vi.mock('node:util', () => ({
  promisify: vi.fn((fn) => {
    return (...args: any[]) => {
      return new Promise((resolve, reject) => {
        fn(...args, (err: any, stdout: any, stderr: any) => {
          if (err) reject(err);
          else resolve({ stdout, stderr });
        });
      });
    };
  }),
}));
vi.mock('../../../src/i18n');

describe('CCometixLine installer', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(i18n.getTranslation).mockReturnValue({
      cometix: {
        installingCometix: 'Installing CCometixLine...',
        cometixInstallSuccess: 'CCometixLine installed successfully',
        cometixInstallFailed: 'Failed to install CCometixLine',
        cometixAlreadyInstalled: 'CCometixLine is already installed',
      },
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('isCometixLineInstalled', () => {
    it('should return true when CCometixLine is installed', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((command, callback: any) => {
        callback(null, 'ccline@1.0.0', '');
      });

      const result = await isCometixLineInstalled();
      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalledWith('npm list -g @cometix/ccline', expect.any(Function));
    });

    it('should return false when CCometixLine is not installed', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((command, callback: any) => {
        const error = new Error('Package not found');
        callback(error, '', 'npm ERR! 404 Not Found');
      });

      const result = await isCometixLineInstalled();
      expect(result).toBe(false);
    });

    it('should handle npm command errors gracefully', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((command, callback: any) => {
        const error = new Error('npm command not found');
        callback(error, '', 'command not found: npm');
      });

      const result = await isCometixLineInstalled();
      expect(result).toBe(false);
    });
  });

  describe('installCometixLine', () => {
    it('should install CCometixLine successfully', async () => {
      const mockExec = vi.mocked(exec);
      mockExec
        .mockImplementationOnce((command, callback: any) => {
          // First call to check if installed - return error (not installed)
          const error = new Error('Package not found');
          callback(error, '', 'npm ERR! 404 Not Found');
        })
        .mockImplementationOnce((command, callback: any) => {
          // Second call to install
          callback(null, 'added 1 package', '');
        });

      await installCometixLine('en');

      expect(mockExec).toHaveBeenCalledTimes(2);
      expect(mockExec).toHaveBeenNthCalledWith(1, 'npm list -g @cometix/ccline', expect.any(Function));
      expect(mockExec).toHaveBeenNthCalledWith(2, 'npm install -g @cometix/ccline', expect.any(Function));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Installing CCometixLine...'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('CCometixLine installed successfully'));
    });

    it('should handle installation failure', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((command, callback: any) => {
        const error = new Error('Installation failed');
        callback(error, '', 'npm ERR! Failed to install');
      });

      await expect(installCometixLine('en')).rejects.toThrow('Installation failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to install CCometixLine'));
    });

    it('should skip installation if already installed', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((command, callback: any) => {
        // Mock successful check - package is installed
        callback(null, 'ccline@1.0.0', '');
      });

      await installCometixLine('en');

      expect(mockExec).toHaveBeenCalledTimes(1);
      expect(mockExec).toHaveBeenCalledWith('npm list -g @cometix/ccline', expect.any(Function));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('CCometixLine is already installed'));
    });
  });
});