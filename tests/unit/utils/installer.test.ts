import { exec } from 'tinyexec'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fsOps from '../../../src/utils/fs-operations'
import * as installerModule from '../../../src/utils/installer'
import * as platform from '../../../src/utils/platform'

const {
  getInstallationStatus,
  installClaudeCode,
  installCodex,
  isClaudeCodeInstalled,
  isLocalClaudeCodeInstalled,
  removeLocalClaudeCode,
  selectInstallMethod,
  executeInstallMethod,
  handleInstallFailure,
  detectInstalledVersion,
  uninstallCodeTool,
  setInstallMethod,
} = installerModule

const mockInquirer = vi.hoisted(() => ({
  prompt: vi.fn(),
}))

const spinnerStore = vi.hoisted(() => ({
  instances: [] as Array<{
    start: ReturnType<typeof vi.fn>
    succeed: ReturnType<typeof vi.fn>
    fail: ReturnType<typeof vi.fn>
    info: ReturnType<typeof vi.fn>
    warn: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
  }>,
}))

function createSpinner() {
  const spinner: any = {
    succeed: vi.fn(),
    fail: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    stop: vi.fn(),
  }
  spinner.start = vi.fn().mockReturnValue(spinner)
  return spinner
}

const mockOra = vi.hoisted(() => vi.fn(() => {
  const spinner = createSpinner()
  spinnerStore.instances.push(spinner)
  return spinner
}))

const claudeConfigMock = vi.hoisted(() => ({
  readMcpConfig: vi.fn(),
  writeMcpConfig: vi.fn(),
}))

vi.mock('tinyexec')
vi.mock('../../../src/utils/platform')
vi.mock('../../../src/utils/fs-operations')
vi.mock('../../../src/utils/auto-updater', () => ({
  updateClaudeCode: vi.fn(),
}))
vi.mock('inquirer', () => ({
  __esModule: true,
  default: mockInquirer,
}))
vi.mock('ora', () => ({
  __esModule: true,
  default: mockOra,
}))
vi.mock('../../../src/utils/claude-config', () => ({
  __esModule: true,
  ...claudeConfigMock,
}))

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
    spinnerStore.instances.length = 0
    mockInquirer.prompt.mockReset()
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
    it('should log detected version when already installed and skip reinstall', async () => {
      const updateSpy = vi.mocked((await import('../../../src/utils/auto-updater')).updateClaudeCode)
      vi.mocked(platform.commandExists).mockResolvedValue(true)
      vi.mocked(exec).mockResolvedValue({ exitCode: 0, stdout: 'claude 1.2.3' } as any)

      await installClaudeCode()

      expect(exec).toHaveBeenCalledWith('claude', ['--version'])
      expect(updateSpy).toHaveBeenCalled()
      expect(exec).not.toHaveBeenCalledWith('npm', expect.anything())
    })

    it('should show WSL hints during installation', async () => {
      vi.mocked(platform.commandExists).mockResolvedValueOnce(false)
      vi.mocked(platform.isWSL).mockReturnValue(true)
      vi.mocked(platform.getWSLInfo).mockReturnValue({ isWSL: true, distro: 'Ubuntu', version: '1.0' } as any)
      vi.mocked(exec).mockResolvedValue({ exitCode: 0 } as any)

      await installClaudeCode(true)

      expect(platform.getWSLInfo).toHaveBeenCalled()
      expect(exec).toHaveBeenCalledWith('npm', ['install', '-g', '@anthropic-ai/claude-code'])
    })

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

    it('should short-circuit when Claude Code is already installed and trigger update check', async () => {
      const updateSpy = vi.mocked((await import('../../../src/utils/auto-updater')).updateClaudeCode)
      vi.mocked(platform.commandExists).mockResolvedValueOnce(true)
      mockInquirer.prompt.mockResolvedValue({ method: 'npm' })

      await installClaudeCode()

      expect(updateSpy).toHaveBeenCalled()
      expect(exec).toHaveBeenCalledWith('claude', ['--version'])
    })

    it('should surface failure when interactive install method fails and retries are declined', async () => {
      vi.mocked(platform.commandExists).mockResolvedValueOnce(false)
      mockInquirer.prompt
        .mockResolvedValueOnce({ method: 'homebrew' })
        .mockResolvedValueOnce({ retry: false })
      vi.mocked(exec).mockRejectedValue(new Error('brew failed'))

      await expect(installClaudeCode()).rejects.toThrow('Failed to install Claude Code')
    })
  })

  describe('installCodex', () => {
    it('should return early when Codex is already installed and log detected version', async () => {
      vi.mocked(platform.commandExists).mockResolvedValueOnce(true)

      await installCodex()

      expect(exec).toHaveBeenCalledWith('codex', ['--version'])
    })

    it('should log detected version details when Codex is installed', async () => {
      vi.mocked(platform.commandExists).mockResolvedValue(true)
      vi.mocked(exec).mockResolvedValue({ exitCode: 0, stdout: 'codex 0.2.0' } as any)

      await installCodex()

      expect(exec).toHaveBeenCalledWith('codex', ['--version'])
    })

    it('should install Codex via npm when skipping method selection', async () => {
      vi.mocked(platform.commandExists).mockResolvedValueOnce(false)
      vi.spyOn(installerModule, 'isCodexInstalled').mockResolvedValueOnce(false)
      vi.mocked(exec).mockResolvedValue({ exitCode: 0 } as any)
      vi.mocked(platform.wrapCommandWithSudo).mockReturnValue({
        command: 'npm',
        args: ['install', '-g', '@openai/codex'],
        usedSudo: false,
      })

      await installCodex(true)

      expect(exec).toHaveBeenCalledWith('npm', ['install', '-g', '@openai/codex'])
    })

    it('should honor selected install method in interactive flow', async () => {
      vi.mocked(platform.commandExists).mockResolvedValueOnce(false)
      mockInquirer.prompt.mockResolvedValue({ method: 'homebrew' })
      vi.mocked(exec).mockResolvedValue({ exitCode: 0 } as any)

      await installCodex()

      expect(exec).toHaveBeenCalledWith('brew', ['install', 'codex'])
    })

    it('should fall back to npm when config read fails during uninstall method detection', async () => {
      claudeConfigMock.readMcpConfig.mockImplementation(() => {
        throw new Error('read fail')
      })
      vi.mocked(exec)
        .mockRejectedValueOnce(new Error('brew missing'))
        .mockResolvedValue({ exitCode: 0 } as any)

      const success = await uninstallCodeTool('claude-code')

      expect(success).toBe(true)
      expect(exec).toHaveBeenCalledWith('npm', ['uninstall', '-g', '@anthropic-ai/claude-code'])
    })
  })

  describe('selectInstallMethod', () => {
    it('should return selected method with recommended label applied', async () => {
      mockInquirer.prompt.mockResolvedValue({ method: 'homebrew' })
      vi.mocked(platform.getRecommendedInstallMethods).mockReturnValue(['homebrew', 'npm'])
      vi.mocked(platform.getPlatform).mockReturnValue('macos')

      const method = await selectInstallMethod('claude-code')

      expect(method).toBe('homebrew')
      expect(mockInquirer.prompt).toHaveBeenCalled()
      const promptArgs = mockInquirer.prompt.mock.calls[0][0] as any
      const choiceValues = promptArgs.choices.map((choice: any) => choice.value)
      expect(choiceValues).toContain('homebrew')
      expect(choiceValues).toContain('npm')
    })

    it('should return null when no methods remain after exclusions', async () => {
      vi.mocked(platform.getRecommendedInstallMethods).mockReturnValue(['npm'])
      vi.mocked(platform.getPlatform).mockReturnValue('linux')

      const method = await selectInstallMethod('codex', ['npm', 'homebrew'])

      expect(method).toBeNull()
      expect(mockInquirer.prompt).not.toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No more installation methods available'))
    })
  })

  describe('executeInstallMethod', () => {
    beforeEach(() => {
      vi.mocked(exec).mockReset()
    })

    it('should install Claude Code via npm and record the method', async () => {
      vi.mocked(exec).mockResolvedValue({ exitCode: 0 } as any)
      vi.mocked(platform.wrapCommandWithSudo).mockReturnValue({
        command: 'npm',
        args: ['install', '-g', '@anthropic-ai/claude-code'],
        usedSudo: false,
      })
      claudeConfigMock.readMcpConfig.mockReturnValue({})

      const success = await executeInstallMethod('npm', 'claude-code')

      expect(success).toBe(true)
      expect(exec).toHaveBeenCalledWith('npm', ['install', '-g', '@anthropic-ai/claude-code'])
      expect(claudeConfigMock.writeMcpConfig).toHaveBeenCalledWith({ installMethod: 'npm-global' })
    })

    it('should install Codex via Homebrew', async () => {
      vi.mocked(exec).mockResolvedValue({ exitCode: 0 } as any)
      const success = await executeInstallMethod('homebrew', 'codex')

      expect(success).toBe(true)
      expect(exec).toHaveBeenCalledWith('brew', ['install', 'codex'])
    })

    it('should fall back to npm for Codex when method is unsupported', async () => {
      vi.mocked(exec).mockResolvedValue({ exitCode: 0 } as any)
      vi.mocked(platform.wrapCommandWithSudo).mockReturnValue({
        command: 'npm',
        args: ['install', '-g', '@openai/codex'],
        usedSudo: false,
      })
      const success = await executeInstallMethod('curl', 'codex')

      expect(success).toBe(true)
      expect(exec).toHaveBeenCalledWith('npm', ['install', '-g', '@openai/codex'])
    })

    it('should return false when installation fails', async () => {
      vi.mocked(exec).mockRejectedValue(new Error('brew failed'))

      const success = await executeInstallMethod('homebrew', 'codex')

      expect(success).toBe(false)
      expect(exec).toHaveBeenCalledWith('brew', ['install', 'codex'])
    })
  })

  describe('handleInstallFailure', () => {
    it('should return false when user declines retry', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ retry: false })

      const result = await handleInstallFailure('claude-code', ['npm'])

      expect(result).toBe(false)
      expect(mockInquirer.prompt).toHaveBeenCalledTimes(1)
    })

    it('should retry with a new method when user confirms', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ retry: true })
        .mockResolvedValueOnce({ method: 'homebrew' })
      vi.mocked(exec).mockResolvedValue({ exitCode: 0 } as any)

      const result = await handleInstallFailure('claude-code', ['npm'])

      expect(result).toBe(true)
      expect(exec).toHaveBeenCalledWith('brew', ['install', '--cask', 'claude-code'])
    })

    it('should keep prompting until user cancels on repeated failures', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ retry: true })
        .mockResolvedValueOnce({ method: 'homebrew' })
        .mockResolvedValueOnce({ retry: false })
      vi.mocked(exec).mockRejectedValue(new Error('brew failed'))

      const result = await handleInstallFailure('claude-code', ['npm'])

      expect(result).toBe(false)
      expect(exec).toHaveBeenCalledWith('brew', ['install', '--cask', 'claude-code'])
    })
  })

  describe('detectInstalledVersion', () => {
    it('should extract semantic version from command output', async () => {
      vi.mocked(exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'Claude CLI version 1.2.3',
        stderr: '',
      } as any)

      const version = await detectInstalledVersion('claude-code')

      expect(version).toBe('1.2.3')
      expect(exec).toHaveBeenCalledWith('claude', ['--version'])
    })

    it('should fall back to trimmed stdout when version pattern missing', async () => {
      vi.mocked(exec).mockResolvedValue({
        exitCode: 0,
        stdout: 'codex beta',
        stderr: '',
      } as any)

      const version = await detectInstalledVersion('codex')

      expect(version).toBe('codex beta')
      expect(exec).toHaveBeenCalledWith('codex', ['--version'])
    })

    it('should return null when version command fails', async () => {
      vi.mocked(exec).mockRejectedValue(new Error('not installed'))

      const version = await detectInstalledVersion('codex')

      expect(version).toBeNull()
    })
  })

  describe('setInstallMethod', () => {
    beforeEach(() => {
      claudeConfigMock.readMcpConfig.mockReset()
      claudeConfigMock.writeMcpConfig.mockReset()
    })

    it('should write npm install method to Claude config', async () => {
      claudeConfigMock.readMcpConfig.mockReturnValue({})

      await setInstallMethod('npm', 'claude-code')

      expect(claudeConfigMock.writeMcpConfig).toHaveBeenCalledWith({ installMethod: 'npm-global' })
    })

    it('should mark non-npm installs as native', async () => {
      claudeConfigMock.readMcpConfig.mockReturnValue({ installMethod: 'npm-global' })

      await setInstallMethod('homebrew', 'claude-code')

      expect(claudeConfigMock.writeMcpConfig).toHaveBeenCalledWith({ installMethod: 'homebrew' })
    })

    it('should ignore codex install method persistence', async () => {
      await setInstallMethod('npm', 'codex')

      expect(claudeConfigMock.writeMcpConfig).not.toHaveBeenCalled()
    })
  })

  describe('uninstallCodeTool', () => {
    beforeEach(() => {
      claudeConfigMock.readMcpConfig.mockReset()
    })

    it('should uninstall Claude Code via npm when configured', async () => {
      claudeConfigMock.readMcpConfig.mockReturnValue({ installMethod: 'npm' })
      vi.mocked(exec).mockResolvedValue({ exitCode: 0 } as any)
      vi.mocked(platform.wrapCommandWithSudo).mockReturnValue({
        command: 'npm',
        args: ['uninstall', '-g', '@anthropic-ai/claude-code'],
        usedSudo: false,
      })

      const success = await uninstallCodeTool('claude-code')

      expect(success).toBe(true)
      expect(exec).toHaveBeenCalledWith('npm', ['uninstall', '-g', '@anthropic-ai/claude-code'])
    })

    it('should uninstall Claude Code via npm when installMethod is npm-global', async () => {
      claudeConfigMock.readMcpConfig.mockReturnValue({ installMethod: 'npm-global' })
      vi.mocked(exec).mockResolvedValue({ exitCode: 0 } as any)
      vi.mocked(platform.wrapCommandWithSudo).mockReturnValue({
        command: 'npm',
        args: ['uninstall', '-g', '@anthropic-ai/claude-code'],
        usedSudo: false,
      })

      const success = await uninstallCodeTool('claude-code')

      expect(success).toBe(true)
      expect(exec).toHaveBeenCalledWith('npm', ['uninstall', '-g', '@anthropic-ai/claude-code'])
    })

    it('should remove binaries manually on Windows native installs', async () => {
      claudeConfigMock.readMcpConfig.mockReturnValue({ installMethod: 'native' })
      vi.mocked(platform.getPlatform).mockReturnValue('windows')
      vi.mocked(exec)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'C:\\Program Files\\claude.exe\r\n',
          stderr: '',
        } as any)
        .mockResolvedValueOnce({ exitCode: 0 } as any)

      const success = await uninstallCodeTool('claude-code')

      expect(success).toBe(true)
      expect(exec).toHaveBeenNthCalledWith(1, 'where', ['claude'])
      expect(exec).toHaveBeenNthCalledWith(2, 'cmd', ['/c', 'del', '/f', '/q', '"C:\\Program Files\\claude.exe"'])
    })

    it('should return false when manual binary removal fails', async () => {
      claudeConfigMock.readMcpConfig.mockReturnValue({ installMethod: 'manual' })
      vi.mocked(platform.getPlatform).mockReturnValue('macos')
      vi.mocked(exec).mockRejectedValue(new Error('not found'))

      const success = await uninstallCodeTool('claude-code')

      expect(success).toBe(false)
      expect(exec).toHaveBeenCalledWith('which', ['claude'])
    })
  })
})
