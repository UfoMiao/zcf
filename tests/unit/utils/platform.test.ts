import { existsSync, readFileSync } from 'node:fs'
import { platform } from 'node:os'
import { exec } from 'tinyexec'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  commandExists,
  getMcpCommand,
  getPlatform,
  getTermuxPrefix,
  getWSLDistro,
  getWSLInfo,
  isTermux,
  isWindows,
  isWSL,
} from '../../../src/utils/platform'

vi.mock('node:os')
vi.mock('node:fs')
vi.mock('tinyexec')

describe('platform utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.PREFIX
    delete process.env.TERMUX_VERSION
    delete process.env.WSL_DISTRO_NAME
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

  describe('isWSL', () => {
    it('should return true when WSL_DISTRO_NAME environment variable is set', () => {
      process.env.WSL_DISTRO_NAME = 'Ubuntu'
      expect(isWSL()).toBe(true)
    })

    it('should return true when /proc/version contains Microsoft', () => {
      vi.mocked(existsSync).mockImplementation(path => path === '/proc/version')
      vi.mocked(readFileSync).mockReturnValue('Linux version 5.4.0-Microsoft-standard #1 SMP Wed Nov 23 01:01:46 UTC 2022 x86_64 x86_64 x86_64 GNU/Linux')
      expect(isWSL()).toBe(true)
    })

    it('should return true when /proc/version contains WSL', () => {
      vi.mocked(existsSync).mockImplementation(path => path === '/proc/version')
      vi.mocked(readFileSync).mockReturnValue('Linux version 5.15.90.1-WSL2-standard #1 SMP Fri Jan 27 02:56:13 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux')
      expect(isWSL()).toBe(true)
    })

    it('should return true when /mnt/c exists (Windows mount)', () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === '/proc/version')
          return false
        if (path === '/mnt/c')
          return true
        return false
      })
      expect(isWSL()).toBe(true)
    })

    it('should return false when not in WSL environment', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(readFileSync).mockReturnValue('Linux version 5.15.0-generic #72-Ubuntu SMP Fri Aug 5 10:38:12 UTC 2022 x86_64 x86_64 x86_64 GNU/Linux')
      expect(isWSL()).toBe(false)
    })

    it('should handle /proc/version read errors gracefully', () => {
      vi.mocked(existsSync).mockImplementation(path => path === '/proc/version')
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })
      expect(isWSL()).toBe(false)
    })
  })

  describe('getWSLDistro', () => {
    it('should return distro name from WSL_DISTRO_NAME environment variable', () => {
      process.env.WSL_DISTRO_NAME = 'Ubuntu-22.04'
      expect(getWSLDistro()).toBe('Ubuntu-22.04')
    })

    it('should return distro name from /etc/os-release when WSL_DISTRO_NAME not set', () => {
      vi.mocked(existsSync).mockImplementation(path => path === '/etc/os-release')
      vi.mocked(readFileSync).mockReturnValue(`PRETTY_NAME="Ubuntu 22.04.3 LTS"
NAME="Ubuntu"
VERSION_ID="22.04"
VERSION="22.04.3 LTS (Jammy Jellyfish)"
ID=ubuntu`)
      expect(getWSLDistro()).toBe('Ubuntu 22.04.3 LTS')
    })

    it('should return null when no distro information available', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      expect(getWSLDistro()).toBe(null)
    })

    it('should handle /etc/os-release read errors gracefully', () => {
      vi.mocked(existsSync).mockImplementation(path => path === '/etc/os-release')
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('File not found')
      })
      expect(getWSLDistro()).toBe(null)
    })
  })

  describe('getWSLInfo', () => {
    it('should return complete WSL info when in WSL environment', () => {
      process.env.WSL_DISTRO_NAME = 'Ubuntu-22.04'
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === '/proc/version')
          return true
        if (path === '/etc/os-release')
          return true
        return false
      })
      vi.mocked(readFileSync).mockImplementation((path) => {
        if (path === '/proc/version')
          return 'Linux version 5.4.0-Microsoft-standard'
        if (path === '/etc/os-release')
          return 'PRETTY_NAME="Ubuntu 22.04.3 LTS"'
        return ''
      })

      const info = getWSLInfo()
      expect(info).toEqual({
        isWSL: true,
        distro: 'Ubuntu-22.04',
        version: 'Linux version 5.4.0-Microsoft-standard',
      })
    })

    it('should return null when not in WSL environment', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      expect(getWSLInfo()).toBe(null)
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
