import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  runCcrRestart,
  runCcrStart,
  runCcrStatus,
  runCcrStop,
  runCcrUi,
} from '../../../src/utils/ccr/commands'

// Use vi.hoisted to ensure mocks are set up before imports
const { mockExecAsync } = vi.hoisted(() => {
  const mockExecAsync = vi.fn()
  return { mockExecAsync }
})

vi.mock('child_process', () => ({
  exec: vi.fn(),
}))

vi.mock('util', () => ({
  promisify: vi.fn(() => mockExecAsync),
}))

describe('cCR Commands', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('runCcrUi', () => {
    it('should execute ccr ui command successfully', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'UI started', stderr: '' })

      await runCcrUi()

      expect(mockExecAsync).toHaveBeenCalledWith('ccr ui')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Starting CCR UI'))
    })

    it('should handle errors', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('Command failed'))

      await expect(runCcrUi()).rejects.toThrow('Command failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to execute CCR command'))
    })

    it('should display API key when provided', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'UI started', stderr: '' })

      await runCcrUi('test-api-key')

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test-api-key'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('CCR UI Login Key'))
    })
  })

  describe('runCcrStatus', () => {
    it('should execute ccr status command successfully', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Status: running', stderr: '' })

      await runCcrStatus()

      expect(mockExecAsync).toHaveBeenCalledWith('ccr status')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Checking CCR status'))
    })

    it('should handle status output correctly', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'CCR is running on port 3000', stderr: '' })

      await runCcrStatus()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Checking CCR status'))
      expect(consoleLogSpy).toHaveBeenCalledWith('CCR is running on port 3000')
    })
  })

  describe('runCcrRestart', () => {
    it('should execute ccr restart command successfully', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Restarted', stderr: '' })

      await runCcrRestart()

      expect(mockExecAsync).toHaveBeenCalledWith('ccr restart')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Restarting CCR'))
    })

    it('should handle restart with warnings', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Restarted', stderr: 'Warning: port changed' })

      await runCcrRestart()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Restarting CCR'))
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: port changed'))
    })
  })

  describe('runCcrStart', () => {
    it('should execute ccr start command successfully', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Started', stderr: '' })

      await runCcrStart()

      expect(mockExecAsync).toHaveBeenCalledWith('ccr start')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Starting CCR'))
    })

    it('should handle already running scenario', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: '', stderr: 'CCR is already running' })

      await runCcrStart()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Starting CCR'))
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('CCR is already running'))
    })
  })

  describe('runCcrStop', () => {
    it('should execute ccr stop command successfully', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Stopped', stderr: '' })

      await runCcrStop()

      expect(mockExecAsync).toHaveBeenCalledWith('ccr stop')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Stopping CCR'))
    })

    it('should display stderr as warning', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: '', stderr: 'Warning message' })

      await runCcrStop()

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Warning message'))
    })

    it('should handle stop when not running', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'CCR was not running', stderr: '' })

      await runCcrStop()

      expect(consoleLogSpy).toHaveBeenCalledWith('CCR was not running')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Stopping CCR'))
    })
  })
})
