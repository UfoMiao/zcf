import { existsSync } from 'node:fs'
import { platform } from 'node:os'
import { exec } from 'tinyexec'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  commandExists,
  getMcpCommand,
  getPlatform,
  getTermuxPrefix,
  isTermux,
  isWindows,
} from '../../../src/utils/platform'

vi.mock('node:os')
vi.mock('node:fs')
vi.mock('tinyexec')

describe('platform utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.PREFIX
    delete process.env.TERMUX_VERSION
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getPlatform', () => {
    it('should return "windows" for win32', () => {
      vi.mocked(platform).mockReturnValue('win32')
      expect(getPlatform()).toBe('windows')
    })

    it('should return "macos" for darwin', () => {
      vi.mocked(platform).mockReturnValue('darwin')
      expect(getPlatform()).toBe('macos')
    })

    it('should return "linux" for linux', () => {
      vi.mocked(platform).mockReturnValue('linux')
      expect(getPlatform()).toBe('linux')
    })

    it('should return "linux" for other platforms', () => {
      vi.mocked(platform).mockReturnValue('freebsd' as any)
      expect(getPlatform()).toBe('linux')
    })
  })

  describe('isTermux', () => {
    it('should return true when PREFIX contains com.termux', () => {
      process.env.PREFIX = '/data/data/com.termux/files/usr'
      expect(isTermux()).toBe(true)
    })

    it('should return true when TERMUX_VERSION is set', () => {
      process.env.TERMUX_VERSION = '0.118.0'
      expect(isTermux()).toBe(true)
    })

    it('should return true when termux directory exists', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      expect(isTermux()).toBe(true)
    })

    it('should return false when not in Termux', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      expect(isTermux()).toBe(false)
    })
  })

  describe('getTermuxPrefix', () => {
    it('should return PREFIX env when set', () => {
      process.env.PREFIX = '/custom/prefix'
      expect(getTermuxPrefix()).toBe('/custom/prefix')
    })

    it('should return default termux prefix when PREFIX not set', () => {
      delete process.env.PREFIX
      expect(getTermuxPrefix()).toBe('/data/data/com.termux/files/usr')
    })
  })

  describe('isWindows', () => {
    it('should return true on Windows', () => {
      vi.mocked(platform).mockReturnValue('win32')
      expect(isWindows()).toBe(true)
    })

    it('should return false on non-Windows', () => {
      vi.mocked(platform).mockReturnValue('darwin')
      expect(isWindows()).toBe(false)
    })
  })

  describe('getMcpCommand', () => {
    it('should return cmd command on Windows', () => {
      vi.mocked(platform).mockReturnValue('win32')
      expect(getMcpCommand()).toEqual(['cmd', '/c', 'npx'])
    })

    it('should return npx command on non-Windows', () => {
      vi.mocked(platform).mockReturnValue('darwin')
      expect(getMcpCommand()).toEqual(['npx'])
    })
  })

  describe('commandExists', () => {
    it('should return true when which/where command succeeds', async () => {
      vi.mocked(platform).mockReturnValue('darwin')
      vi.mocked(exec).mockResolvedValue({
        exitCode: 0,
        stdout: '/usr/local/bin/claude',
        stderr: '',
      } as any)

      const result = await commandExists('claude')
      expect(result).toBe(true)
      expect(exec).toHaveBeenCalledWith('which', ['claude'])
    })

    it('should use where command on Windows', async () => {
      vi.mocked(platform).mockReturnValue('win32')
      vi.mocked(exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'C:\\Program Files\\claude.exe',
        stderr: '',
      } as any)

      const result = await commandExists('claude')
      expect(result).toBe(true)
      expect(exec).toHaveBeenCalledWith('where', ['claude'])
    })

    it('should check Termux paths when in Termux environment', async () => {
      process.env.PREFIX = '/data/data/com.termux/files/usr'
      vi.mocked(platform).mockReturnValue('linux')
      vi.mocked(exec).mockRejectedValue(new Error('Command not found'))
      vi.mocked(existsSync).mockImplementation((path) => {
        return path === '/data/data/com.termux/files/usr/bin/claude'
      })

      const result = await commandExists('claude')
      expect(result).toBe(true)
    })

    it('should check common Linux/Mac paths as fallback', async () => {
      vi.mocked(platform).mockReturnValue('linux')
      vi.mocked(exec).mockRejectedValue(new Error('Command not found'))
      vi.mocked(existsSync).mockImplementation((path) => {
        return path === '/usr/local/bin/claude'
      })

      const result = await commandExists('claude')
      expect(result).toBe(true)
    })

    it('should return false when command not found anywhere', async () => {
      vi.mocked(platform).mockReturnValue('linux')
      vi.mocked(exec).mockRejectedValue(new Error('Command not found'))
      vi.mocked(existsSync).mockReturnValue(false)

      const result = await commandExists('nonexistent')
      expect(result).toBe(false)
    })

    it('should handle exec errors gracefully', async () => {
      vi.mocked(platform).mockReturnValue('darwin')
      vi.mocked(exec).mockRejectedValue(new Error('Permission denied'))
      vi.mocked(existsSync).mockReturnValue(false)

      const result = await commandExists('claude')
      expect(result).toBe(false)
    })
  })
})
