import { describe, expect, it } from 'vitest'
import {
  COMETIX_COMMAND_NAME,
  COMETIX_COMMANDS,
  COMETIX_PACKAGE_NAME,
} from '../../../../src/utils/cometix/common'

describe('cometix/common', () => {
  describe('constants', () => {
    it('should define correct package name', () => {
      expect(COMETIX_PACKAGE_NAME).toBe('@cometix/ccline')
    })

    it('should define correct command name', () => {
      expect(COMETIX_COMMAND_NAME).toBe('ccline')
    })
  })

  describe('cOMETIX_COMMANDS', () => {
    it('should define check install command', () => {
      expect(COMETIX_COMMANDS.CHECK_INSTALL).toBe('npm list -g @cometix/ccline')
    })

    it('should define install command', () => {
      expect(COMETIX_COMMANDS.INSTALL).toBe('npm install -g @cometix/ccline')
    })

    it('should define update command', () => {
      expect(COMETIX_COMMANDS.UPDATE).toBe('npm update -g @cometix/ccline')
    })

    it('should define print config command', () => {
      expect(COMETIX_COMMANDS.PRINT_CONFIG).toBe('ccline --print')
    })

    it('should define TUI config command', () => {
      expect(COMETIX_COMMANDS.TUI_CONFIG).toBe('ccline -c')
    })
  })

  describe('command structure validation', () => {
    it('should have all expected command properties', () => {
      const expectedCommands = [
        'CHECK_INSTALL',
        'INSTALL',
        'UPDATE',
        'PRINT_CONFIG',
        'TUI_CONFIG',
      ]

      expectedCommands.forEach((commandKey) => {
        expect(COMETIX_COMMANDS).toHaveProperty(commandKey)
        expect(typeof COMETIX_COMMANDS[commandKey as keyof typeof COMETIX_COMMANDS]).toBe('string')
      })
    })

    it('should use consistent package name across commands', () => {
      expect(COMETIX_COMMANDS.CHECK_INSTALL).toContain(COMETIX_PACKAGE_NAME)
      expect(COMETIX_COMMANDS.INSTALL).toContain(COMETIX_PACKAGE_NAME)
      expect(COMETIX_COMMANDS.UPDATE).toContain(COMETIX_PACKAGE_NAME)
    })

    it('should use consistent command name for CLI operations', () => {
      expect(COMETIX_COMMANDS.PRINT_CONFIG.startsWith(COMETIX_COMMAND_NAME)).toBe(true)
      expect(COMETIX_COMMANDS.TUI_CONFIG.startsWith(COMETIX_COMMAND_NAME)).toBe(true)
    })

    it('should have valid npm command formats', () => {
      // Check install and update commands follow npm global pattern
      expect(COMETIX_COMMANDS.CHECK_INSTALL).toMatch(/^npm list -g/)
      expect(COMETIX_COMMANDS.INSTALL).toMatch(/^npm install -g/)
      expect(COMETIX_COMMANDS.UPDATE).toMatch(/^npm update -g/)
    })

    it('should have valid CLI command formats', () => {
      // Check CLI commands follow expected pattern
      expect(COMETIX_COMMANDS.PRINT_CONFIG).toMatch(/^ccline --\w+/)
      expect(COMETIX_COMMANDS.TUI_CONFIG).toMatch(/^ccline -\w+/)
    })
  })

  describe('constants structure', () => {
    it('should be a readonly constants object', () => {
      // Check that COMETIX_COMMANDS is properly structured as const assertion
      expect(typeof COMETIX_COMMANDS).toBe('object')
      expect(COMETIX_COMMANDS).not.toBeNull()
    })

    it('should have correct number of commands', () => {
      const commandKeys = Object.keys(COMETIX_COMMANDS)
      expect(commandKeys).toHaveLength(5)
    })

    it('should maintain consistent naming convention', () => {
      // All command keys should be UPPER_CASE
      const commandKeys = Object.keys(COMETIX_COMMANDS)
      commandKeys.forEach((key) => {
        expect(key).toMatch(/^[A-Z_]+$/)
      })
    })
  })

  describe('package and command name validation', () => {
    it('should have valid npm package name format', () => {
      // @scope/package format
      expect(COMETIX_PACKAGE_NAME).toMatch(/^@[a-z]+\/[a-z]+$/)
    })

    it('should have valid command name format', () => {
      // Simple lowercase command name
      expect(COMETIX_COMMAND_NAME).toMatch(/^[a-z]+$/)
    })

    it('should have consistent scoped package and command relationship', () => {
      // The command name should be derivable from the package name
      const expectedCommandName = COMETIX_PACKAGE_NAME.split('/')[1]
      expect(COMETIX_COMMAND_NAME).toBe(expectedCommandName)
    })
  })
})
