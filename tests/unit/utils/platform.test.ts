import { accessSync, existsSync, readFileSync } from 'node:fs'
import { platform } from 'node:os'
import { exec } from 'tinyexec'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as platformUtils from '../../../src/utils/platform'
import {
  commandExists,
  getMcpCommand,
  getPlatform,
  getRecommendedInstallMethods,
  getSystemRoot,
  getTermuxPrefix,
  getWSLDistro,
  getWSLInfo,
  isTermux,
  isWindows,
  isWSL,
  shouldUseSudoForGlobalInstall,
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
    it('should return cmd command for npx on Windows', () => {
      vi.mocked(platform).mockReturnValue('win32')
      expect(getMcpCommand('npx')).toEqual(['cmd', '/c', 'npx'])
    })

    it('should return cmd command for uvx on Windows', () => {
      vi.mocked(platform).mockReturnValue('win32')
      expect(getMcpCommand('uvx')).toEqual(['cmd', '/c', 'uvx'])
    })

    it('should return cmd command for uv on Windows', () => {
      vi.mocked(platform).mockReturnValue('win32')
      expect(getMcpCommand('uv')).toEqual(['cmd', '/c', 'uv'])
    })

    it('should return unwrapped command for node on Windows', () => {
      vi.mocked(platform).mockReturnValue('win32')
      expect(getMcpCommand('node')).toEqual(['node'])
    })

    it('should return unwrapped command for python on Windows', () => {
      vi.mocked(platform).mockReturnValue('win32')
      expect(getMcpCommand('python')).toEqual(['python'])
    })

    it('should return npx command on non-Windows (default parameter)', () => {
      vi.mocked(platform).mockReturnValue('darwin')
      expect(getMcpCommand()).toEqual(['npx'])
    })

    it('should return npx command on non-Windows (explicit parameter)', () => {
      vi.mocked(platform).mockReturnValue('darwin')
      expect(getMcpCommand('npx')).toEqual(['npx'])
    })

    it('should return uvx command on non-Windows', () => {
      vi.mocked(platform).mockReturnValue('darwin')
      expect(getMcpCommand('uvx')).toEqual(['uvx'])
    })

    it('should return uv command on non-Windows', () => {
      vi.mocked(platform).mockReturnValue('linux')
      expect(getMcpCommand('uv')).toEqual(['uv'])
    })

    it('should return node command on non-Windows', () => {
      vi.mocked(platform).mockReturnValue('linux')
      expect(getMcpCommand('node')).toEqual(['node'])
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

  describe('getSystemRoot', () => {
    beforeEach(() => {
      vi.mocked(platform).mockReturnValue('win32')
      delete process.env.SYSTEMROOT
      delete process.env.SystemRoot
    })

    it('should return null on non-Windows platforms', () => {
      vi.mocked(platform).mockReturnValue('darwin')
      expect(getSystemRoot()).toBeNull()
    })

    it('should return forward slash format for SYSTEMROOT env var', () => {
      process.env.SYSTEMROOT = 'C:\\Windows'
      expect(getSystemRoot()).toBe('C:/Windows')
    })

    it('should return forward slash format for SystemRoot env var', () => {
      process.env.SystemRoot = 'C:\\Windows'
      expect(getSystemRoot()).toBe('C:/Windows')
    })

    it('should convert double backslashes to forward slashes', () => {
      process.env.SYSTEMROOT = 'C:\\\\Windows'
      expect(getSystemRoot()).toBe('C:/Windows')
    })

    it('should convert mixed backslashes to forward slashes', () => {
      process.env.SYSTEMROOT = 'C:\\Windows\\\\System32'
      expect(getSystemRoot()).toBe('C:/Windows/System32')
    })

    it('should use default C:/Windows when no env vars are set', () => {
      expect(getSystemRoot()).toBe('C:/Windows')
    })

    it('should handle already forward slash paths correctly', () => {
      process.env.SYSTEMROOT = 'C:/Windows'
      expect(getSystemRoot()).toBe('C:/Windows')
    })

    it('should preserve forward slashes in mixed paths', () => {
      process.env.SYSTEMROOT = 'C:/Windows\\System32'
      expect(getSystemRoot()).toBe('C:/Windows/System32')
    })

    it('should prioritize SYSTEMROOT over SystemRoot', () => {
      process.env.SystemRoot = 'D:\\Windows'
      process.env.SYSTEMROOT = 'C:\\Windows'
      expect(getSystemRoot()).toBe('C:/Windows')
    })
  })

  describe('shouldUseSudoForGlobalInstall', () => {
    let originalGetuid: typeof process.getuid | undefined
    let execPathSpy: ReturnType<typeof vi.spyOn>
    let originalHome: string | undefined

    beforeEach(() => {
      vi.mocked(accessSync).mockImplementation(() => {})
      vi.mocked(platform).mockReturnValue('linux')
      originalHome = process.env.HOME
      process.env.HOME = '/home/test'
      delete process.env.npm_config_prefix
      delete process.env.NPM_CONFIG_PREFIX
      delete process.env.PREFIX
      originalGetuid = (process as any).getuid
      ;(process as NodeJS.Process & { getuid?: () => number }).getuid = vi.fn().mockReturnValue(1000)
      execPathSpy = vi.spyOn(process, 'execPath', 'get').mockReturnValue('/usr/bin/node')
    })

    afterEach(() => {
      if (originalHome === undefined)
        delete process.env.HOME
      else
        process.env.HOME = originalHome
      if (originalGetuid)
        (process as any).getuid = originalGetuid
      else
        delete (process as any).getuid
      execPathSpy.mockRestore()
    })

    it('should return false on non-Linux platforms', () => {
      vi.mocked(platform).mockReturnValue('darwin')
      expect(shouldUseSudoForGlobalInstall()).toBe(false)
    })

    it('should skip sudo when prefix resides inside the home directory', () => {
      execPathSpy.mockReturnValue('/home/test/.nvm/versions/node/v20.12.0/bin/node')
      expect(shouldUseSudoForGlobalInstall()).toBe(false)
      expect(accessSync).not.toHaveBeenCalled()
    })

    it('should skip sudo when prefix is writable without being in home', () => {
      execPathSpy.mockReturnValue('/opt/node/bin/node')
      expect(shouldUseSudoForGlobalInstall()).toBe(false)
      expect(accessSync).toHaveBeenCalledWith('/opt/node', expect.any(Number))
    })

    it('should require sudo when prefix is not writable and user is non-root', () => {
      execPathSpy.mockReturnValue('/usr/bin/node')
      vi.mocked(accessSync).mockImplementation(() => {
        const err = new Error('EACCES') as NodeJS.ErrnoException
        err.code = 'EACCES'
        throw err
      })
      expect(shouldUseSudoForGlobalInstall()).toBe(true)
    })

    it('should not require sudo when user is root even if prefix is not writable', () => {
      execPathSpy.mockReturnValue('/usr/bin/node')
      vi.mocked(accessSync).mockImplementation(() => {
        const err = new Error('EACCES') as NodeJS.ErrnoException
        err.code = 'EACCES'
        throw err
      })
      ;(process as NodeJS.Process & { getuid?: () => number }).getuid = vi.fn().mockReturnValue(0)
      expect(shouldUseSudoForGlobalInstall()).toBe(false)
    })

    it('should respect npm_config_prefix when provided', () => {
      process.env.npm_config_prefix = '/home/test/.asdf/installs/nodejs/20.11.0'
      execPathSpy.mockRestore()
      expect(shouldUseSudoForGlobalInstall()).toBe(false)
    })

    it('should return false when getuid throws error', () => {
      execPathSpy.mockReturnValue('/usr/bin/node')
      vi.mocked(accessSync).mockImplementation(() => {
        const err = new Error('EACCES') as NodeJS.ErrnoException
        err.code = 'EACCES'
        throw err
      })
      ;(process as NodeJS.Process & { getuid?: () => number }).getuid = vi.fn(() => {
        throw new Error('boom')
      })

      expect(shouldUseSudoForGlobalInstall()).toBe(false)
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

  describe('getRecommendedInstallMethods', () => {
    it('should prefer Homebrew then curl for Claude Code on macOS', () => {
      vi.mocked(platform).mockReturnValue('darwin')
      expect(getRecommendedInstallMethods('claude-code')).toEqual(['homebrew', 'curl', 'npm'])
    })

    it('should recommend Powershell first for Claude Code on Windows', () => {
      vi.mocked(platform).mockReturnValue('win32')
      expect(getRecommendedInstallMethods('claude-code')).toEqual(['powershell', 'npm'])
    })

    it('should return npm only for Codex on non-mac platforms', () => {
      vi.mocked(platform).mockReturnValue('linux')
      vi.mocked(existsSync).mockReturnValue(false as any)
      expect(getRecommendedInstallMethods('codex')).toEqual(['npm'])
    })
  })

  describe('wrapCommandWithSudo', () => {
    it('should wrap command with sudo when required', () => {
      vi.mocked(platform).mockReturnValue('linux')
      const originalHome = process.env.HOME
      process.env.HOME = '/home/test'
      vi.mocked(accessSync).mockImplementation(() => {
        const err = new Error('EACCES') as NodeJS.ErrnoException
        err.code = 'EACCES'
        throw err
      })
      ;(process as NodeJS.Process & { getuid?: () => number }).getuid = vi.fn(() => 1000)
      const result = platformUtils.wrapCommandWithSudo('npm', ['install'])
      expect(result).toEqual({ command: 'sudo', args: ['npm', 'install'], usedSudo: true })
      if (originalHome === undefined)
        delete process.env.HOME
      else
        process.env.HOME = originalHome
    })
  })
})
