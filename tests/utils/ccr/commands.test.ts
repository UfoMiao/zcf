import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to ensure mocks are set up before imports
const { mockExecAsync } = vi.hoisted(() => {
  const mockExecAsync = vi.fn();
  return { mockExecAsync };
});

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn(() => mockExecAsync),
}));

import {
  runCcrUi,
  runCcrStatus,
  runCcrRestart,
  runCcrStart,
  runCcrStop,
} from '../../../src/utils/ccr/commands';

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

    it('should display API key when provided', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'UI started', stderr: '' });

      await runCcrUi('en', 'test-api-key');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test-api-key'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('CCR UI API Key'));
    });
  });

  describe('runCcrStatus', () => {
    it('should execute ccr status command successfully', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Status: running', stderr: '' });

      await runCcrStatus('zh-CN');

      expect(mockExecAsync).toHaveBeenCalledWith('ccr status');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('查询 CCR 状态'));
    });

    it('should handle status output correctly', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'CCR is running on port 3000', stderr: '' });

      await runCcrStatus('en');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('CCR Status'));
      expect(consoleLogSpy).toHaveBeenCalledWith('CCR is running on port 3000');
    });
  });

  describe('runCcrRestart', () => {
    it('should execute ccr restart command successfully', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Restarted', stderr: '' });

      await runCcrRestart('en');

      expect(mockExecAsync).toHaveBeenCalledWith('ccr restart');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Restarting CCR'));
    });

    it('should handle restart with warnings', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Restarted', stderr: 'Warning: port changed' });

      await runCcrRestart('zh-CN');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('重启 CCR'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: port changed'));
    });
  });

  describe('runCcrStart', () => {
    it('should execute ccr start command successfully', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Started', stderr: '' });

      await runCcrStart('en');

      expect(mockExecAsync).toHaveBeenCalledWith('ccr start');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Starting CCR'));
    });

    it('should handle already running scenario', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: '', stderr: 'CCR is already running' });

      await runCcrStart('zh-CN');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('启动 CCR'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('CCR is already running'));
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

    it('should handle stop when not running', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'CCR was not running', stderr: '' });

      await runCcrStop('en');

      expect(consoleLogSpy).toHaveBeenCalledWith('CCR was not running');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Stopping CCR'));
    });
  });
});