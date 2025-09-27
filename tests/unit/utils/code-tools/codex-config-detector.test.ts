import type { CodexConfigData } from '../../../../src/utils/code-tools/codex'
import { describe, expect, it, vi } from 'vitest'
import { detectConfigManagementMode } from '../../../../src/utils/code-tools/codex-config-detector'

// Mock the codex module functions
vi.mock('../../../../src/utils/code-tools/codex', () => ({
  readCodexConfig: vi.fn(),
}))

describe('codex-config-detector', () => {
  describe('detectConfigManagementMode', () => {
    it('should return "initial" mode when no existing configuration', async () => {
      // Arrange
      const { readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      readCodexConfig.mockReturnValue(null)

      // Act
      const result = detectConfigManagementMode()

      // Assert
      expect(result).toEqual({
        mode: 'initial',
        hasProviders: false,
        providerCount: 0,
      })
    })

    it('should return "management" mode when existing configuration with providers', async () => {
      // Arrange
      const { readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const mockConfig: CodexConfigData = {
        model: null,
        modelProvider: 'test-provider',
        providers: [
          {
            id: 'test-provider',
            name: 'Test Provider',
            baseUrl: 'https://api.test.com/v1',
            wireApi: 'responses',
            envKey: 'TEST_API_KEY',
            requiresOpenaiAuth: true,
          },
          {
            id: 'another-provider',
            name: 'Another Provider',
            baseUrl: 'https://api.another.com/v1',
            wireApi: 'chat',
            envKey: 'ANOTHER_API_KEY',
            requiresOpenaiAuth: true,
          },
        ],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      }
      readCodexConfig.mockReturnValue(mockConfig)

      // Act
      const result = detectConfigManagementMode()

      // Assert
      expect(result).toEqual({
        mode: 'management',
        hasProviders: true,
        providerCount: 2,
        currentProvider: 'test-provider',
        providers: mockConfig.providers,
      })
    })

    it('should return "initial" mode when configuration exists but no providers', async () => {
      // Arrange
      const { readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const mockConfig: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      }
      readCodexConfig.mockReturnValue(mockConfig)

      // Act
      const result = detectConfigManagementMode()

      // Assert
      expect(result).toEqual({
        mode: 'initial',
        hasProviders: false,
        providerCount: 0,
      })
    })

    it('should handle unmanaged configuration correctly', async () => {
      // Arrange
      const { readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const mockConfig: CodexConfigData = {
        model: null,
        modelProvider: 'external-provider',
        providers: [
          {
            id: 'external-provider',
            name: 'External Provider',
            baseUrl: 'https://external.api.com/v1',
            wireApi: 'responses',
            envKey: 'EXTERNAL_API_KEY',
            requiresOpenaiAuth: true,
          },
        ],
        mcpServices: [],
        managed: false,
        otherConfig: ['# Some external config'],
      }
      readCodexConfig.mockReturnValue(mockConfig)

      // Act
      const result = detectConfigManagementMode()

      // Assert
      expect(result).toEqual({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        currentProvider: 'external-provider',
        providers: mockConfig.providers,
        isUnmanaged: true,
      })
    })

    it('should handle corrupted configuration gracefully', async () => {
      // Arrange
      const { readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      readCodexConfig.mockImplementation(() => {
        throw new Error('Config file corrupted')
      })

      // Act
      const result = detectConfigManagementMode()

      // Assert
      expect(result).toEqual({
        mode: 'initial',
        hasProviders: false,
        providerCount: 0,
        error: 'Config file corrupted',
      })
    })
  })
})
