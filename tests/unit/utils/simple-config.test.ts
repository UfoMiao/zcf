import * as fs from 'node:fs'
import { exec } from 'tinyexec'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { importRecommendedEnv, importRecommendedPermissions, openSettingsJson } from '../../../src/utils/simple-config'

vi.mock('node:fs')
vi.mock('tinyexec')
vi.mock('../../../src/utils/fs-operations', () => ({
  ensureDir: vi.fn(),
}))
vi.mock('../../../src/utils/platform', () => ({
  getPlatform: vi.fn().mockReturnValue('macos'),
}))
vi.mock('../../../src/utils/permission-cleaner', () => ({
  mergeAndCleanPermissions: vi.fn((template, existing) => {
    const result = [...(template || [])];
    (existing || []).forEach((p: string) => {
      if (!result.includes(p)) {
        result.push(p)
      }
    })
    return result
  }),
}))

describe('simple-config utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock file system operations
    vi.mocked(fs.existsSync).mockReturnValue(false)
    vi.mocked(fs.readFileSync).mockReturnValue('{}')
    vi.mocked(fs.writeFileSync).mockImplementation(() => {})
  })

  describe('importRecommendedEnv', () => {
    it('should merge template env variables with current settings', async () => {
      const templateSettings = {
        env: {
          TEST_VAR: 'value1',
          ANOTHER_VAR: 'value2',
        },
      }

      const currentSettings = {
        env: {
          EXISTING_VAR: 'existing',
        },
      }

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.toString().includes('templates/claude-code/common/settings.json')) {
          return JSON.stringify(templateSettings)
        }
        return JSON.stringify(currentSettings)
      })

      const writeSpy = vi.mocked(fs.writeFileSync)

      await importRecommendedEnv()

      expect(writeSpy).toHaveBeenCalled()
      const savedSettings = JSON.parse(writeSpy.mock.calls[0][1] as string)
      expect(savedSettings.env).toEqual({
        EXISTING_VAR: 'existing',
        TEST_VAR: 'value1',
        ANOTHER_VAR: 'value2',
      })
    })

    it('should handle missing current settings file', async () => {
      const templateSettings = {
        env: {
          TEST_VAR: 'value1',
        },
      }

      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.toString().includes('templates/claude-code/common/settings.json')) {
          return JSON.stringify(templateSettings)
        }
        throw new Error('File not found')
      })

      const writeSpy = vi.mocked(fs.writeFileSync)

      await importRecommendedEnv()

      expect(writeSpy).toHaveBeenCalled()
      const savedSettings = JSON.parse(writeSpy.mock.calls[0][1] as string)
      expect(savedSettings.env).toEqual({
        TEST_VAR: 'value1',
      })
    })

    it('should handle invalid JSON in current settings', async () => {
      const templateSettings = {
        env: {
          TEST_VAR: 'value1',
        },
      }

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.toString().includes('templates/claude-code/common/settings.json')) {
          return JSON.stringify(templateSettings)
        }
        return 'invalid json'
      })

      const writeSpy = vi.mocked(fs.writeFileSync)

      await importRecommendedEnv()

      expect(writeSpy).toHaveBeenCalled()
      const savedSettings = JSON.parse(writeSpy.mock.calls[0][1] as string)
      expect(savedSettings.env).toEqual({
        TEST_VAR: 'value1',
      })
    })
  })

  describe('importRecommendedPermissions', () => {
    it('should merge and clean permissions', async () => {
      const templateSettings = {
        permissions: {
          allow: ['Read', 'Write', 'Bash'],
        },
      }

      const currentSettings = {
        permissions: {
          allow: ['Execute', 'Bash(*)'],
        },
      }

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.toString().includes('templates/claude-code/common/settings.json')) {
          return JSON.stringify(templateSettings)
        }
        return JSON.stringify(currentSettings)
      })

      const writeSpy = vi.mocked(fs.writeFileSync)

      await importRecommendedPermissions()

      expect(writeSpy).toHaveBeenCalled()
      const savedSettings = JSON.parse(writeSpy.mock.calls[0][1] as string)
      expect(savedSettings.permissions.allow).toContain('Read')
      expect(savedSettings.permissions.allow).toContain('Write')
      expect(savedSettings.permissions.allow).toContain('Bash')
    })

    it('should handle missing permissions in template', async () => {
      const templateSettings = {}
      const currentSettings = {
        permissions: {
          allow: ['Execute'],
        },
      }

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.toString().includes('templates/claude-code/common/settings.json')) {
          return JSON.stringify(templateSettings)
        }
        return JSON.stringify(currentSettings)
      })

      const writeSpy = vi.mocked(fs.writeFileSync)

      await importRecommendedPermissions()

      expect(writeSpy).toHaveBeenCalled()
      const savedSettings = JSON.parse(writeSpy.mock.calls[0][1] as string)
      expect(savedSettings.permissions).toBeUndefined()
    })

    it('should handle permissions without allow array', async () => {
      const templateSettings = {
        permissions: {
          deny: ['DangerousOp'],
        },
      }

      const currentSettings = {}

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.toString().includes('templates/claude-code/common/settings.json')) {
          return JSON.stringify(templateSettings)
        }
        return JSON.stringify(currentSettings)
      })

      const writeSpy = vi.mocked(fs.writeFileSync)

      await importRecommendedPermissions()

      expect(writeSpy).toHaveBeenCalled()
      const savedSettings = JSON.parse(writeSpy.mock.calls[0][1] as string)
      expect(savedSettings.permissions).toEqual({
        deny: ['DangerousOp'],
      })
    })
  })

  describe('openSettingsJson', () => {
    it('should open settings file on macOS', async () => {
      const { getPlatform } = await import('../../../src/utils/platform')
      vi.mocked(getPlatform).mockReturnValue('macos')
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(exec).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })

      await openSettingsJson()

      expect(exec).toHaveBeenCalledWith('open', expect.any(Array))
    })

    it('should open settings file on Windows', async () => {
      const { getPlatform } = await import('../../../src/utils/platform')
      vi.mocked(getPlatform).mockReturnValue('windows')
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(exec).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })

      await openSettingsJson()

      expect(exec).toHaveBeenCalledWith('start', expect.any(Array))
    })

    it('should open settings file on Linux', async () => {
      const { getPlatform } = await import('../../../src/utils/platform')
      vi.mocked(getPlatform).mockReturnValue('linux')
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(exec).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })

      await openSettingsJson()

      expect(exec).toHaveBeenCalledWith('xdg-open', expect.any(Array))
    })

    it('should create settings file if it does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(exec).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
      const writeSpy = vi.mocked(fs.writeFileSync)

      await openSettingsJson()

      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('settings.json'),
        '{}',
      )
    })

    it('should fallback to code editor if primary command fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(exec)
        .mockRejectedValueOnce(new Error('open failed'))
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 })

      await openSettingsJson()

      expect(exec).toHaveBeenCalledWith('code', expect.any(Array))
    })

    it('should fallback to vim if code fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(exec)
        .mockRejectedValueOnce(new Error('open failed'))
        .mockRejectedValueOnce(new Error('code failed'))
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 })

      await openSettingsJson()

      expect(exec).toHaveBeenCalledWith('vim', expect.any(Array))
    })

    it('should fallback to nano if all others fail', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(exec)
        .mockRejectedValueOnce(new Error('open failed'))
        .mockRejectedValueOnce(new Error('code failed'))
        .mockRejectedValueOnce(new Error('vim failed'))
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 })

      await openSettingsJson()

      expect(exec).toHaveBeenCalledWith('nano', expect.any(Array))
    })
  })
})
