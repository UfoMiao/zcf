import { describe, expect, it } from 'vitest'
import {
  CometixCommandError,
  CometixError,
  CometixInstallationError,
  CometixNotInstalledError,
  isCommandNotFoundError,
  isPackageNotFoundError,
} from '../../../../src/utils/cometix/errors'

describe('cometix/errors', () => {
  describe('cometixError base class', () => {
    it('should create CometixError with message and code', () => {
      const error = new CometixError('Test error', 'TEST_CODE')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(CometixError)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.name).toBe('CometixError')
      expect(error.cause).toBeUndefined()
    })

    it('should create CometixError with cause', () => {
      const originalError = new Error('Original error')
      const error = new CometixError('Test error', 'TEST_CODE', originalError)

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.cause).toBe(originalError)
    })

    it('should have proper error stack', () => {
      const error = new CometixError('Test error', 'TEST_CODE')

      expect(error.stack).toBeDefined()
      expect(typeof error.stack).toBe('string')
    })
  })

  describe('cometixInstallationError', () => {
    it('should create installation error with correct properties', () => {
      const error = new CometixInstallationError('Installation failed')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(CometixError)
      expect(error).toBeInstanceOf(CometixInstallationError)
      expect(error.message).toBe('Installation failed')
      expect(error.code).toBe('INSTALLATION_FAILED')
      expect(error.name).toBe('CometixInstallationError')
    })

    it('should create installation error with cause', () => {
      const originalError = new Error('Network timeout')
      const error = new CometixInstallationError('Installation failed', originalError)

      expect(error.message).toBe('Installation failed')
      expect(error.code).toBe('INSTALLATION_FAILED')
      expect(error.cause).toBe(originalError)
    })

    it('should inherit from CometixError', () => {
      const error = new CometixInstallationError('Installation failed')

      expect(error instanceof CometixError).toBe(true)
      expect(error instanceof CometixInstallationError).toBe(true)
    })
  })

  describe('cometixCommandError', () => {
    it('should create command error with correct properties', () => {
      const error = new CometixCommandError('Command execution failed')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(CometixError)
      expect(error).toBeInstanceOf(CometixCommandError)
      expect(error.message).toBe('Command execution failed')
      expect(error.code).toBe('COMMAND_FAILED')
      expect(error.name).toBe('CometixCommandError')
    })

    it('should create command error with cause', () => {
      const originalError = new Error('Command not found')
      const error = new CometixCommandError('Command execution failed', originalError)

      expect(error.message).toBe('Command execution failed')
      expect(error.code).toBe('COMMAND_FAILED')
      expect(error.cause).toBe(originalError)
    })

    it('should inherit from CometixError', () => {
      const error = new CometixCommandError('Command execution failed')

      expect(error instanceof CometixError).toBe(true)
      expect(error instanceof CometixCommandError).toBe(true)
    })
  })

  describe('cometixNotInstalledError', () => {
    it('should create not installed error with predefined message', () => {
      const error = new CometixNotInstalledError()

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(CometixError)
      expect(error).toBeInstanceOf(CometixNotInstalledError)
      expect(error.message).toBe('CCometixLine is not installed')
      expect(error.code).toBe('NOT_INSTALLED')
      expect(error.name).toBe('CometixNotInstalledError')
    })

    it('should inherit from CometixError', () => {
      const error = new CometixNotInstalledError()

      expect(error instanceof CometixError).toBe(true)
      expect(error instanceof CometixNotInstalledError).toBe(true)
    })

    it('should not accept custom message (constructor has no parameters)', () => {
      const error = new CometixNotInstalledError()

      // Should always have the predefined message
      expect(error.message).toBe('CCometixLine is not installed')
    })
  })

  describe('isCommandNotFoundError utility', () => {
    it('should return true for command not found errors', () => {
      const error1 = new Error('command not found: ccline')
      const error2 = new Error('bash: ccline: command not found')
      const error3 = new Error('ccline is not recognized as an internal or external command')

      expect(isCommandNotFoundError(error1)).toBe(true)
      expect(isCommandNotFoundError(error2)).toBe(true)
      expect(isCommandNotFoundError(error3)).toBe(true)
    })

    it('should return true for errors containing ccline', () => {
      const error1 = new Error('Failed to execute ccline')
      const error2 = new Error('ccline not found in PATH')

      expect(isCommandNotFoundError(error1)).toBe(true)
      expect(isCommandNotFoundError(error2)).toBe(true)
    })

    it('should return false for other errors', () => {
      const error1 = new Error('Network connection failed')
      const error2 = new Error('Permission denied')
      const error3 = new Error('npm install failed')

      expect(isCommandNotFoundError(error1)).toBe(false)
      expect(isCommandNotFoundError(error2)).toBe(false)
      expect(isCommandNotFoundError(error3)).toBe(false)
    })

    it('should handle empty error messages', () => {
      const error = new Error('empty message test')
      error.message = ''

      expect(isCommandNotFoundError(error)).toBe(false)
    })

    it('should be case sensitive for command not found', () => {
      const error1 = new Error('Command Not Found')
      const error2 = new Error('COMMAND NOT FOUND')

      expect(isCommandNotFoundError(error1)).toBe(false)
      expect(isCommandNotFoundError(error2)).toBe(false)
    })
  })

  describe('isPackageNotFoundError utility', () => {
    it('should return true for npm 404 errors', () => {
      const error1 = new Error('404 Not Found - GET https://registry.npmjs.org/@cometix/ccline')
      const error2 = new Error('npm ERR! 404 Not Found')

      expect(isPackageNotFoundError(error1)).toBe(true)
      expect(isPackageNotFoundError(error2)).toBe(true)
    })

    it('should return true for package not found errors', () => {
      const error1 = new Error('Package not found in registry')
      const error2 = new Error('The package could not be found: Package not found')

      expect(isPackageNotFoundError(error1)).toBe(true)
      expect(isPackageNotFoundError(error2)).toBe(true)
    })

    it('should return false for other errors', () => {
      const error1 = new Error('Network connection failed')
      const error2 = new Error('Permission denied')
      const error3 = new Error('command not found')

      expect(isPackageNotFoundError(error1)).toBe(false)
      expect(isPackageNotFoundError(error2)).toBe(false)
      expect(isPackageNotFoundError(error3)).toBe(false)
    })

    it('should handle empty error messages', () => {
      const error = new Error('empty message test')
      error.message = ''

      expect(isPackageNotFoundError(error)).toBe(false)
    })

    it('should be case sensitive for status codes', () => {
      const error1 = new Error('404 not found') // lowercase
      const error2 = new Error('package Not Found') // mixed case

      expect(isPackageNotFoundError(error1)).toBe(false)
      expect(isPackageNotFoundError(error2)).toBe(false)
    })
  })

  describe('error hierarchy validation', () => {
    it('should maintain proper inheritance chain', () => {
      const installationError = new CometixInstallationError('test')
      const commandError = new CometixCommandError('test')
      const notInstalledError = new CometixNotInstalledError()

      // All should inherit from base Error class
      expect(installationError instanceof Error).toBe(true)
      expect(commandError instanceof Error).toBe(true)
      expect(notInstalledError instanceof Error).toBe(true)

      // All should inherit from CometixError
      expect(installationError instanceof CometixError).toBe(true)
      expect(commandError instanceof CometixError).toBe(true)
      expect(notInstalledError instanceof CometixError).toBe(true)

      // Should not cross-inherit from each other
      expect(installationError instanceof CometixCommandError).toBe(false)
      expect(commandError instanceof CometixInstallationError).toBe(false)
      expect(notInstalledError instanceof CometixCommandError).toBe(false)
    })

    it('should have unique error codes', () => {
      const codes = new Set([
        new CometixInstallationError('test').code,
        new CometixCommandError('test').code,
        new CometixNotInstalledError().code,
      ])

      expect(codes.size).toBe(3) // All codes should be unique
    })

    it('should have unique error names', () => {
      const names = new Set([
        new CometixInstallationError('test').name,
        new CometixCommandError('test').name,
        new CometixNotInstalledError().name,
      ])

      expect(names.size).toBe(3) // All names should be unique
    })
  })

  describe('utility functions edge cases', () => {
    it('should handle errors with special characters in message', () => {
      const error1 = new Error('ccline: 特殊字符 command not found')
      const error2 = new Error('404 Not Found - @scope/package')

      expect(isCommandNotFoundError(error1)).toBe(true)
      expect(isPackageNotFoundError(error2)).toBe(true)
    })

    it('should handle very long error messages', () => {
      const longMessage = 'command not found'.repeat(100)
      const error = new Error(longMessage)

      expect(isCommandNotFoundError(error)).toBe(true)
    })

    it('should handle errors with null or undefined properties', () => {
      const error = new Error('null property test')
      // @ts-expect-error - Testing edge case
      error.message = null

      // Functions don't handle null gracefully, so they will throw
      expect(() => isCommandNotFoundError(error)).toThrow()
      expect(() => isPackageNotFoundError(error)).toThrow()
    })
  })
})
