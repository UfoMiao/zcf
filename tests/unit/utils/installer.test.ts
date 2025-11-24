import { exec } from 'tinyexec'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fsOps from '../../../src/utils/fs-operations'
import {
  getInstallationStatus,
  installClaudeCode,
  isClaudeCodeInstalled,
  isLocalClaudeCodeInstalled,
  removeLocalClaudeCode,
} from '../../../src/utils/installer'
import * as platform from '../../../src/utils/platform'

vi.mock('tinyexec')
vi.mock('../../../src/utils/platform')
vi.mock('../../../src/utils/fs-operations')

// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    // Only mock initialization functions to avoid setup issues in tests
    ensureI18nInitialized: vi.fn(),
  }
})

describe('installer utilities', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(platform.isTermux).mockReturnValue(false)
    vi.mocked(platform.getPlatform).mockReturnValue('macos')
    vi.mocked(platform.getRecommendedInstallMethods).mockReturnValue(['npm'])
    vi.mocked(platform.isWSL).mockReturnValue(false)
    vi.mocked(platform.getWSLInfo).mockReturnValue(null)
    vi.mocked(platform.getTermuxPrefix).mockReturnValue('/data/data/com.termux/files/usr')
    vi.mocked(platform.wrapCommandWithSudo).mockImplementation((command, args) => ({
      command,
      args,
      usedSudo: false,
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isClaudeCodeInstalled', () => {
    it('should return true when claude command exists', async () => {
      vi.mocked(platform.commandExists).mockResolvedValue(true)

      const result = await isClaudeCodeInstalled()

      expect(result).toBe(true)
      expect(platform.commandExists).toHaveBeenCalledWith('claude')
    })

    it('should return false when claude command does not exist', async () => {
      vi.mocked(platform.commandExists).mockResolvedValue(false)

      const result = await isClaudeCodeInstalled()

      expect(result).toBe(false)
      expect(platform.commandExists).toHaveBeenCalledWith('claude')
    })
  })

  describe('isLocalClaudeCodeInstalled', () => {
    it('should return true when local claude installation exists', async () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.isExecutable).mockResolvedValue(true)

      const result = await isLocalClaudeCodeInstalled()

      expect(result).toBe(true)
      expect(fsOps.exists).toHaveBeenCalledWith(expect.stringContaining('/.claude/local/claude'))
      expect(fsOps.isExecutable).toHaveBeenCalledWith(expect.stringContaining('/.claude/local/claude'))
    })

    it('should return false when local claude installation does not exist', async () => {
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const result = await isLocalClaudeCodeInstalled()

      expect(result).toBe(false)
      expect(fsOps.exists).toHaveBeenCalledWith(expect.stringContaining('/.claude/local/claude'))
      expect(fsOps.isExecutable).not.toHaveBeenCalled()
    })

    it('should return false when local claude file exists but is not executable', async () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.isExecutable).mockResolvedValue(false)

      const result = await isLocalClaudeCodeInstalled()

      expect(result).toBe(false)
      expect(fsOps.isExecutable).toHaveBeenCalledWith(expect.stringContaining('/.claude/local/claude'))
    })
  })

  describe('getInstallationStatus', () => {
    it('should return both global and local when both installations exist', async () => {
      vi.mocked(platform.commandExists).mockResolvedValue(true)
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.isExecutable).mockResolvedValue(true)

      const result = await getInstallationStatus()

      expect(result).toEqual({
        hasGlobal: true,
        hasLocal: true,
        localPath: expect.stringContaining('/.claude/local/claude'),
      })
    })

    it('should return only global when only global installation exists', async () => {
      vi.mocked(platform.commandExists).mockResolvedValue(true)
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const result = await getInstallationStatus()

      expect(result).toEqual({
        hasGlobal: true,
        hasLocal: false,
        localPath: expect.stringContaining('/.claude/local/claude'),
      })
    })

    it('should return only local when only local installation exists', async () => {
      vi.mocked(platform.commandExists).mockResolvedValue(false)
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.isExecutable).mockResolvedValue(true)

      const result = await getInstallationStatus()

      expect(result).toEqual({
        hasGlobal: false,
        hasLocal: true,
        localPath: expect.stringContaining('/.claude/local/claude'),
      })
    })

    it('should return neither when no installations exist', async () => {
      vi.mocked(platform.commandExists).mockResolvedValue(false)
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const result = await getInstallationStatus()

      expect(result).toEqual({
        hasGlobal: false,
        hasLocal: false,
        localPath: expect.stringContaining('/.claude/local/claude'),
      })
    })
  })

  describe('removeLocalClaudeCode', () => {
    it('should remove local claude installation directory successfully', async () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.remove).mockResolvedValue(undefined)

      await removeLocalClaudeCode()

      expect(fsOps.remove).toHaveBeenCalledWith(expect.stringContaining('/.claude/local'))
    })

    it('should handle removal when directory does not exist', async () => {
      vi.mocked(fsOps.exists).mockReturnValue(false)

      await removeLocalClaudeCode()

      expect(fsOps.remove).not.toHaveBeenCalled()
    })

    it('should throw error when removal fails', async () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.remove).mockRejectedValue(new Error('Permission denied'))

      await expect(removeLocalClaudeCode()).rejects.toThrow('Permission denied')
    })
  })

  describe('installClaudeCode', () => {
    it('should install successfully using npm', async () => {
      vi.mocked(platform.isTermux).mockReturnValue(false)
      vi.mocked(exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'Installation successful',
        stderr: '',
      } as any)

      await installClaudeCode(true)

      expect(exec).toHaveBeenCalledWith('npm', ['install', '-g', '@anthropic-ai/claude-code'])
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✔'))
    })

    it('should use sudo when installing globally on linux as non-root user', async () => {
      const originalGetuid = (process as any).getuid
      let getuidSpy: any
      if (typeof originalGetuid === 'function') {
        getuidSpy = vi.spyOn(process as any, 'getuid').mockReturnValue(1000)
      }
      else {
        getuidSpy = vi.fn().mockReturnValue(1000)
        ;(process as any).getuid = getuidSpy
      }

      vi.mocked(platform.commandExists).mockResolvedValue(false)
      vi.mocked(platform.getPlatform).mockReturnValue('linux')
      vi.mocked(platform.wrapCommandWithSudo).mockImplementation((command, args) => ({
        command: 'sudo',
        args: [command, ...args],
        usedSudo: true,
      }))
      vi.mocked(exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'Installation successful',
        stderr: '',
      } as any)

      await installClaudeCode(true)

      expect(exec).toHaveBeenCalledWith('sudo', ['npm', 'install', '-g', '@anthropic-ai/claude-code'])

      if (typeof originalGetuid === 'function') {
        getuidSpy.mockRestore()
      }
      else {
        delete (process as NodeJS.Process & { getuid?: () => number }).getuid
      }
    })

    it('should show Termux-specific messages when in Termux', async () => {
      vi.mocked(platform.isTermux).mockReturnValue(true)
      vi.mocked(platform.getTermuxPrefix).mockReturnValue('/data/data/com.termux/files/usr')
      vi.mocked(exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'Installation successful',
        stderr: '',
      } as any)

      await installClaudeCode(true)

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Termux environment detected'))
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/data/data/com.termux/files/usr'))
    })

    it('should handle installation failure', async () => {
      vi.mocked(platform.isTermux).mockReturnValue(false)
      vi.mocked(exec).mockRejectedValue(new Error('Installation failed'))

      await expect(installClaudeCode(true)).rejects.toThrow('Installation failed')

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('✖'))
    })

    it('should show Termux hints on installation failure in Termux', async () => {
      vi.mocked(platform.isTermux).mockReturnValue(true)
      vi.mocked(exec).mockRejectedValue(new Error('Installation failed'))

      await expect(installClaudeCode(true)).rejects.toThrow('Installation failed')

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('✖'))
      expect(console.error).toHaveBeenCalledTimes(2) // Error message + Termux hint
    })

    it('should install with Chinese messages', async () => {
      vi.mocked(platform.isTermux).mockReturnValue(false)
      vi.mocked(exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'Installation successful',
        stderr: '',
      } as any)

      await installClaudeCode(true)

      expect(exec).toHaveBeenCalledWith('npm', ['install', '-g', '@anthropic-ai/claude-code'])
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✔'))
    })
  })
})
