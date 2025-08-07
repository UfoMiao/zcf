import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exec } from 'tinyexec';
import ansis from 'ansis';
import {
  isClaudeCodeInstalled,
  installClaudeCode,
} from '../../../src/utils/installer';
import * as platform from '../../../src/utils/platform';

vi.mock('tinyexec');
vi.mock('../../../src/utils/platform');

describe('installer utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isClaudeCodeInstalled', () => {
    it('should return true when claude command exists', async () => {
      vi.mocked(platform.commandExists).mockResolvedValue(true);
      
      const result = await isClaudeCodeInstalled();
      
      expect(result).toBe(true);
      expect(platform.commandExists).toHaveBeenCalledWith('claude');
    });

    it('should return false when claude command does not exist', async () => {
      vi.mocked(platform.commandExists).mockResolvedValue(false);
      
      const result = await isClaudeCodeInstalled();
      
      expect(result).toBe(false);
      expect(platform.commandExists).toHaveBeenCalledWith('claude');
    });
  });

  describe('installClaudeCode', () => {
    it('should install successfully using npm', async () => {
      vi.mocked(platform.isTermux).mockReturnValue(false);
      vi.mocked(exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'Installation successful',
        stderr: '',
      } as any);
      
      await installClaudeCode('en');
      
      expect(exec).toHaveBeenCalledWith('npm', ['install', '-g', '@anthropic-ai/claude-code']);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✔'));
    });

    it('should show Termux-specific messages when in Termux', async () => {
      vi.mocked(platform.isTermux).mockReturnValue(true);
      vi.mocked(platform.getTermuxPrefix).mockReturnValue('/data/data/com.termux/files/usr');
      vi.mocked(exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'Installation successful',
        stderr: '',
      } as any);
      
      await installClaudeCode('en');
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Termux'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/data/data/com.termux/files/usr'));
    });

    it('should handle installation failure', async () => {
      vi.mocked(platform.isTermux).mockReturnValue(false);
      vi.mocked(exec).mockRejectedValue(new Error('Installation failed'));
      
      await expect(installClaudeCode('en')).rejects.toThrow('Installation failed');
      
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('✖'));
    });

    it('should show Termux hints on installation failure in Termux', async () => {
      vi.mocked(platform.isTermux).mockReturnValue(true);
      vi.mocked(exec).mockRejectedValue(new Error('Installation failed'));
      
      await expect(installClaudeCode('en')).rejects.toThrow('Installation failed');
      
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('✖'));
      expect(console.error).toHaveBeenCalledTimes(2); // Error message + Termux hint
    });

    it('should install with Chinese messages', async () => {
      vi.mocked(platform.isTermux).mockReturnValue(false);
      vi.mocked(exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'Installation successful',
        stderr: '',
      } as any);
      
      await installClaudeCode('zh-CN');
      
      expect(exec).toHaveBeenCalledWith('npm', ['install', '-g', '@anthropic-ai/claude-code']);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✔'));
    });
  });
});