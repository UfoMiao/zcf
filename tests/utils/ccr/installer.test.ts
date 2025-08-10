import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as installerModule from '../../../src/utils/ccr/installer';
import * as i18n from '../../../src/i18n';

const { isCcrInstalled, getCcrVersion, installCcr, startCcrService } = installerModule;

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
  })
}));
vi.mock('../../../src/i18n');

describe('CCR installer', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(i18n.getTranslation).mockReturnValue({
      ccr: {
        ccrAlreadyInstalled: 'CCR is already installed',
        installingCcr: 'Installing CCR...',
        ccrInstallSuccess: 'CCR installed successfully',
        ccrInstallFailed: 'Failed to install CCR',
        failedToStartCcrService: 'Failed to start CCR service',
        errorStartingCcrService: 'Error starting CCR service'
      }
    } as any);
  });

  afterEach(() => {
    consoleLogSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });

  describe('isCcrInstalled', () => {
    it('should return true when ccr version command succeeds', async () => {
      const mockExec = vi.mocked(exec);
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version') {
            callback(null, 'CCR version 1.0.0', '');
          } else {
            callback(new Error('command not found'), '', '');
          }
        }
      });

      const result = await isCcrInstalled();
      expect(result).toBe(true);
    });

    it('should return true when which ccr succeeds', async () => {
      const mockExec = vi.mocked(exec);
      let callCount = 0;
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        callCount++;
        if (cmd === 'ccr version') {
          callback(new Error('command not found'), '', '');
        } else if (cmd === 'which ccr') {
          callback(null, '/usr/local/bin/ccr', '');
        }
      });

      const result = await isCcrInstalled();
      expect(result).toBe(true);
    });

    it('should return false when both commands fail', async () => {
      const mockExec = vi.mocked(exec);
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('command not found'), '', '');
        }
      });

      const result = await isCcrInstalled();
      expect(result).toBe(false);
    });
  });

  describe('getCcrVersion', () => {
    it('should extract version from ccr version output', async () => {
      const mockExec = vi.mocked(exec);
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version') {
            callback(null, 'CCR version 1.2.3', '');
          } else {
            callback(new Error('command not found'), '', '');
          }
        }
      });

      const version = await getCcrVersion();
      expect(version).toBe('1.2.3');
    });

    it('should handle version with additional text', async () => {
      const mockExec = vi.mocked(exec);
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version') {
            callback(null, 'Claude Code Router v2.0.1-beta', '');
          } else {
            callback(new Error('command not found'), '', '');
          }
        }
      });

      const version = await getCcrVersion();
      expect(version).toBe('2.0.1');
    });

    it('should return null when version pattern not found', async () => {
      const mockExec = vi.mocked(exec);
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version') {
            callback(null, 'No version info', '');
          } else {
            callback(new Error('command not found'), '', '');
          }
        }
      });

      const version = await getCcrVersion();
      expect(version).toBeNull();
    });

    it('should return null when command fails', async () => {
      const mockExec = vi.mocked(exec);
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('command not found'), '', '');
        }
      });

      const version = await getCcrVersion();
      expect(version).toBeNull();
    });
  });

  describe('installCcr', () => {
    it('should skip installation if already installed', async () => {
      // Mock isCcrInstalled to return true
      vi.spyOn(installerModule, 'isCcrInstalled').mockResolvedValue(true);
      
      // Also need to mock exec for any potential checks
      const mockExec = vi.mocked(exec);
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'CCR version 1.0.0', '');
        }
      });
      
      await installCcr('en');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('CCR is already installed')
      );
      
      // Restore the spy
      vi.mocked(installerModule.isCcrInstalled).mockRestore();
    });

    it('should install CCR when not installed', async () => {
      // Mock isCcrInstalled to return false
      vi.spyOn(installerModule, 'isCcrInstalled').mockResolvedValue(false);
      const mockExec = vi.mocked(exec);
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version' || cmd === 'which ccr') {
            callback(new Error('not found'), '', '');
          } else if (cmd === 'npm install -g claude-code-router --force') {
            callback(null, 'added 1 package', '');
          } else {
            callback(new Error('command not found'), '', '');
          }
        }
      });

      await installCcr('zh-CN');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Installing CCR')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('CCR installed successfully')
      );
      
      // Restore the spy
      vi.mocked(installerModule.isCcrInstalled).mockRestore();
    });

    it('should handle EEXIST error gracefully', async () => {
      // Mock isCcrInstalled to return false
      vi.spyOn(installerModule, 'isCcrInstalled').mockResolvedValue(false);
      const mockExec = vi.mocked(exec);
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version' || cmd === 'which ccr') {
            callback(new Error('not found'), '', '');
          } else if (cmd === 'npm install -g claude-code-router --force') {
            const error = new Error('EEXIST: file already exists');
            callback(error, '', '');
          } else {
            callback(new Error('command not found'), '', '');
          }
        }
      });

      await installCcr('en');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('CCR is already installed')
      );
      
      // Restore the spy
      vi.mocked(installerModule.isCcrInstalled).mockRestore();
    });

    it('should throw error for non-EEXIST installation failures', async () => {
      // Mock isCcrInstalled to return false
      vi.spyOn(installerModule, 'isCcrInstalled').mockResolvedValue(false);
      const mockExec = vi.mocked(exec);
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version' || cmd === 'which ccr') {
            callback(new Error('not found'), '', '');
          } else if (cmd === 'npm install -g claude-code-router --force') {
            callback(new Error('Permission denied'), '', '');
          } else {
            callback(new Error('command not found'), '', '');
          }
        }
      });

      await expect(installCcr('en')).rejects.toThrow('Permission denied');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to install CCR')
      );
      
      // Restore the spy
      vi.mocked(installerModule.isCcrInstalled).mockRestore();
    });
  });

  describe('startCcrService', () => {
    it('should start CCR service successfully', async () => {
      const mockExec = vi.mocked(exec);
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        if (cmd === 'ccr') {
          // Simulate successful start (no error)
          setTimeout(() => callback(null, '', ''), 10);
        }
      });

      await startCcrService('en');

      // Service should be called
      expect(mockExec).toHaveBeenCalledWith('ccr', expect.any(Function));
    });

    it('should handle service start failure', async () => {
      const mockExec = vi.mocked(exec);
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        if (cmd === 'ccr') {
          // Call the callback asynchronously to simulate real behavior
          setTimeout(() => callback(new Error('Service failed'), '', ''), 0);
        }
      });

      await startCcrService('zh-CN');

      // Wait a bit for the async callback to be processed
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to start CCR service'),
        expect.any(Error)
      );
    });

    it('should use default language when not specified', async () => {
      const mockExec = vi.mocked(exec);
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        if (cmd === 'ccr') {
          setTimeout(() => callback(null, '', ''), 10);
        }
      });

      await startCcrService();

      expect(i18n.getTranslation).toHaveBeenCalledWith('zh-CN');
    });

    it('should wait for service to start', async () => {
      const mockExec = vi.mocked(exec);
      // @ts-ignore
      mockExec.mockImplementation((cmd, callback) => {
        if (cmd === 'ccr') {
          setTimeout(() => callback(null, '', ''), 10);
        }
      });

      const startTime = Date.now();
      await startCcrService('en');
      const endTime = Date.now();

      // Should wait at least 2000ms
      expect(endTime - startTime).toBeGreaterThanOrEqual(2000);
    });
  });
});