import { exec } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as i18n from '../../../src/i18n';
import * as commandsModule from '../../../src/utils/cometix/commands';

// Don't destructure to allow proper mocking
const { runCometixInstallOrUpdate, runCometixPrintConfig } = commandsModule;

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

describe('CCometixLine commands', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(i18n.getTranslation).mockReturnValue({
      cometix: {
        installingOrUpdating: 'Installing/updating CCometixLine...',
        installUpdateSuccess: 'CCometixLine install/update completed',
        installUpdateFailed: 'Failed to install/update CCometixLine',
        printingConfig: 'Printing CCometixLine configuration...',
        printConfigSuccess: 'Configuration printed successfully',
        printConfigFailed: 'Failed to print configuration',
        commandNotFound: 'ccline command not found. Please install CCometixLine first.',
      },
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('runCometixInstallOrUpdate', () => {
    it('should run install command successfully', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((command, callback: any) => {
        callback(null, 'added 1 package', '');
      });

      await runCometixInstallOrUpdate('en');

      expect(mockExec).toHaveBeenCalledWith('npm install -g @cometix/ccline', expect.any(Function));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Installing/updating CCometixLine...'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('CCometixLine install/update completed'));
    });

    it('should run update command when package exists', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((command, callback: any) => {
        if (command.includes('npm update')) {
          callback(null, 'updated 1 package', '');
        } else {
          callback(null, 'added 1 package', '');
        }
      });

      await runCometixInstallOrUpdate('en');

      expect(mockExec).toHaveBeenCalledWith('npm install -g @cometix/ccline', expect.any(Function));
    });

    it('should handle command execution failure', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((command, callback: any) => {
        const error = new Error('Command failed');
        callback(error, '', 'npm ERR! Command failed');
      });

      await expect(runCometixInstallOrUpdate('en')).rejects.toThrow('Command failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to install/update CCometixLine'));
    });
  });

  describe('runCometixPrintConfig', () => {
    it('should print default configuration successfully', async () => {
      const mockExec = vi.mocked(exec);
      const configOutput = JSON.stringify(
        {
          segments: ['path', 'git', 'model', 'context'],
          theme: 'default',
        },
        null,
        2
      );

      mockExec.mockImplementation((command, callback: any) => {
        callback(null, configOutput, '');
      });

      await runCometixPrintConfig('en');

      expect(mockExec).toHaveBeenCalledWith('ccline --print', expect.any(Function));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Printing CCometixLine configuration...'));
      expect(consoleLogSpy).toHaveBeenCalledWith(configOutput);
    });

    it('should handle ccline command not found', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((command, callback: any) => {
        const error = new Error('command not found: ccline');
        callback(error, '', 'command not found: ccline');
      });

      await expect(runCometixPrintConfig('en')).rejects.toThrow('command not found: ccline');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ccline command not found. Please install CCometixLine first.')
      );
    });

    it('should handle configuration print failure', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((command, callback: any) => {
        const error = new Error('Config file not found');
        callback(error, '', 'Error: Configuration file not found');
      });

      await expect(runCometixPrintConfig('en')).rejects.toThrow('Config file not found');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to print configuration'));
    });
  });
});
