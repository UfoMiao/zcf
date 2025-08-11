import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process module before importing commands
vi.mock('util', () => ({
  promisify: vi.fn(() => vi.fn()),
}));

import {
  runCcrUi,
  runCcrStatus,
  runCcrRestart,
  runCcrStart,
  runCcrStop,
} from '../../../src/utils/ccr/commands';
import { promisify } from 'util';

const mockExecAsync = vi.mocked(promisify(vi.fn()));

describe('CCR Commands', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('runCcrUi', () => {
    it('should execute ccr ui command successfully', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'UI started', stderr: '' });

      await runCcrUi('en');

      expect(mockExecAsync).toHaveBeenCalledWith('ccr ui');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Starting CCR UI'));
    });

    it('should handle errors', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('Command failed'));

      await expect(runCcrUi('en')).rejects.toThrow('Command failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to execute CCR command'));
    });
  });

  describe('runCcrStatus', () => {
    it('should execute ccr status command successfully', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Status: running', stderr: '' });

      await runCcrStatus('zh-CN');

      expect(mockExecAsync).toHaveBeenCalledWith('ccr status');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('查询 CCR 状态'));
    });
  });

  describe('runCcrRestart', () => {
    it('should execute ccr restart command successfully', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Restarted', stderr: '' });

      await runCcrRestart('en');

      expect(mockExecAsync).toHaveBeenCalledWith('ccr restart');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Restarting CCR'));
    });
  });

  describe('runCcrStart', () => {
    it('should execute ccr start command successfully', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Started', stderr: '' });

      await runCcrStart('en');

      expect(mockExecAsync).toHaveBeenCalledWith('ccr start');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Starting CCR'));
    });
  });

  describe('runCcrStop', () => {
    it('should execute ccr stop command successfully', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Stopped', stderr: '' });

      await runCcrStop('zh-CN');

      expect(mockExecAsync).toHaveBeenCalledWith('ccr stop');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('停止 CCR'));
    });

    it('should display stderr as warning', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: '', stderr: 'Warning message' });

      await runCcrStop('en');

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Warning message'));
    });
  });
});