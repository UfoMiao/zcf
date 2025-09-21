import type { CodexConfigData, CodexProvider } from '../../../../src/utils/code-tools/codex'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addProviderToExisting,
  deleteProviders,
  editExistingProvider,
} from '../../../../src/utils/code-tools/codex-provider-manager'

// Mock the codex module functions
vi.mock('../../../../src/utils/code-tools/codex', () => ({
  readCodexConfig: vi.fn(),
  writeCodexConfig: vi.fn(),
  backupCodexConfig: vi.fn(),
  writeAuthFile: vi.fn(),
}))

vi.mock('../../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

describe('codex-provider-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockExistingConfig: CodexConfigData = {
    modelProvider: 'existing-provider',
    providers: [
      {
        id: 'existing-provider',
        name: 'Existing Provider',
        baseUrl: 'https://api.existing.com/v1',
        wireApi: 'responses',
        envKey: 'EXISTING_API_KEY',
        requiresOpenaiAuth: true,
      },
    ],
    mcpServices: [],
    managed: true,
    otherConfig: [],
  }

  const mockNewProvider: CodexProvider = {
    id: 'new-provider',
    name: 'New Provider',
    baseUrl: 'https://api.new.com/v1',
    wireApi: 'chat',
    envKey: 'NEW_API_KEY',
    requiresOpenaiAuth: true,
  }

  describe('addProviderToExisting', () => {
    it('should successfully add new provider to existing configuration', async () => {
      // Arrange
      const {
        readCodexConfig,
        writeCodexConfig,
        backupCodexConfig,
        writeAuthFile,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))

      readCodexConfig.mockReturnValue(mockExistingConfig)
      backupCodexConfig.mockReturnValue('/backup/path/config.toml')

      // Act
      const result = await addProviderToExisting(mockNewProvider, 'new-api-key-value')

      // Assert
      expect(backupCodexConfig).toHaveBeenCalledOnce()
      expect(writeCodexConfig).toHaveBeenCalledWith({
        ...mockExistingConfig,
        providers: [mockExistingConfig.providers[0], mockNewProvider],
      })
      expect(writeAuthFile).toHaveBeenCalledWith({
        [mockNewProvider.envKey]: 'new-api-key-value',
      })
      expect(result).toEqual({
        success: true,
        backupPath: '/backup/path/config.toml',
        addedProvider: mockNewProvider,
      })
    })

    it('should reject duplicate provider IDs', async () => {
      // Arrange
      const {
        readCodexConfig,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))

      readCodexConfig.mockReturnValue(mockExistingConfig)

      const duplicateProvider: CodexProvider = {
        ...mockNewProvider,
        id: 'existing-provider', // Same as existing
      }

      // Act
      const result = await addProviderToExisting(duplicateProvider, 'api-key')

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Provider with ID "existing-provider" already exists',
      })
    })

    it('should handle missing configuration gracefully', async () => {
      // Arrange
      const { readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      readCodexConfig.mockReturnValue(null)

      // Act
      const result = await addProviderToExisting(mockNewProvider, 'api-key')

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'No existing configuration found',
      })
    })

    it('should handle backup creation failure', async () => {
      // Arrange
      const {
        readCodexConfig,
        backupCodexConfig,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))

      readCodexConfig.mockReturnValue(mockExistingConfig)
      backupCodexConfig.mockReturnValue(null) // Backup failed

      // Act
      const result = await addProviderToExisting(mockNewProvider, 'api-key')

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Failed to create backup',
      })
    })
  })

  describe('editExistingProvider', () => {
    it('should successfully edit existing provider', async () => {
      // Arrange
      const {
        readCodexConfig,
        writeCodexConfig,
        backupCodexConfig,
        writeAuthFile,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))

      readCodexConfig.mockReturnValue(mockExistingConfig)
      backupCodexConfig.mockReturnValue('/backup/path/config.toml')

      const updates = {
        name: 'Updated Provider Name',
        baseUrl: 'https://api.updated.com/v1',
        wireApi: 'chat' as const,
        apiKey: 'updated-api-key',
      }

      // Act
      const result = await editExistingProvider('existing-provider', updates)

      // Assert
      expect(backupCodexConfig).toHaveBeenCalledOnce()
      expect(writeCodexConfig).toHaveBeenCalledWith({
        ...mockExistingConfig,
        providers: [
          {
            ...mockExistingConfig.providers[0],
            name: updates.name,
            baseUrl: updates.baseUrl,
            wireApi: updates.wireApi,
          },
        ],
      })
      expect(writeAuthFile).toHaveBeenCalledWith({
        [mockExistingConfig.providers[0].envKey]: updates.apiKey,
      })
      expect(result).toEqual({
        success: true,
        backupPath: '/backup/path/config.toml',
        updatedProvider: {
          ...mockExistingConfig.providers[0],
          name: updates.name,
          baseUrl: updates.baseUrl,
          wireApi: updates.wireApi,
        },
      })
    })

    it('should reject edit for non-existent provider', async () => {
      // Arrange
      const { readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      readCodexConfig.mockReturnValue(mockExistingConfig)

      // Act
      const result = await editExistingProvider('non-existent-provider', {
        name: 'Updated Name',
      })

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Provider with ID "non-existent-provider" not found',
      })
    })

    it('should handle partial updates correctly', async () => {
      // Arrange
      const {
        readCodexConfig,
        writeCodexConfig,
        backupCodexConfig,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))

      readCodexConfig.mockReturnValue(mockExistingConfig)
      backupCodexConfig.mockReturnValue('/backup/path/config.toml')

      const partialUpdates = {
        name: 'Partially Updated Name',
      }

      // Act
      const result = await editExistingProvider('existing-provider', partialUpdates)

      // Assert
      expect(writeCodexConfig).toHaveBeenCalledWith({
        ...mockExistingConfig,
        providers: [
          {
            ...mockExistingConfig.providers[0],
            name: partialUpdates.name,
          },
        ],
      })
      expect(result.success).toBe(true)
    })
  })

  describe('deleteProviders', () => {
    const multiProviderConfig: CodexConfigData = {
      modelProvider: 'provider-1',
      providers: [
        {
          id: 'provider-1',
          name: 'Provider 1',
          baseUrl: 'https://api.provider1.com/v1',
          wireApi: 'responses',
          envKey: 'PROVIDER1_API_KEY',
          requiresOpenaiAuth: true,
        },
        {
          id: 'provider-2',
          name: 'Provider 2',
          baseUrl: 'https://api.provider2.com/v1',
          wireApi: 'chat',
          envKey: 'PROVIDER2_API_KEY',
          requiresOpenaiAuth: true,
        },
        {
          id: 'provider-3',
          name: 'Provider 3',
          baseUrl: 'https://api.provider3.com/v1',
          wireApi: 'responses',
          envKey: 'PROVIDER3_API_KEY',
          requiresOpenaiAuth: true,
        },
      ],
      mcpServices: [],
      managed: true,
      otherConfig: [],
    }

    it('should successfully delete selected providers', async () => {
      // Arrange
      const {
        readCodexConfig,
        writeCodexConfig,
        backupCodexConfig,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))

      readCodexConfig.mockReturnValue(multiProviderConfig)
      backupCodexConfig.mockReturnValue('/backup/path/config.toml')

      // Act
      const result = await deleteProviders(['provider-2', 'provider-3'])

      // Assert
      expect(backupCodexConfig).toHaveBeenCalledOnce()
      expect(writeCodexConfig).toHaveBeenCalledWith({
        ...multiProviderConfig,
        providers: [multiProviderConfig.providers[0]], // Only provider-1 remains
      })
      expect(result).toEqual({
        success: true,
        backupPath: '/backup/path/config.toml',
        deletedProviders: ['provider-2', 'provider-3'],
        remainingProviders: [multiProviderConfig.providers[0]],
      })
    })

    it('should update default provider when current default is deleted', async () => {
      // Arrange
      const {
        readCodexConfig,
        writeCodexConfig,
        backupCodexConfig,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))

      readCodexConfig.mockReturnValue(multiProviderConfig)
      backupCodexConfig.mockReturnValue('/backup/path/config.toml')

      // Act - Delete the current default provider (provider-1)
      const result = await deleteProviders(['provider-1'])

      // Assert
      expect(writeCodexConfig).toHaveBeenCalledWith({
        ...multiProviderConfig,
        modelProvider: 'provider-2', // Should auto-select next available
        providers: [
          multiProviderConfig.providers[1],
          multiProviderConfig.providers[2],
        ],
      })
      expect(result).toEqual({
        success: true,
        backupPath: '/backup/path/config.toml',
        deletedProviders: ['provider-1'],
        remainingProviders: [
          multiProviderConfig.providers[1],
          multiProviderConfig.providers[2],
        ],
        newDefaultProvider: 'provider-2',
      })
    })

    it('should prevent deletion of all providers', async () => {
      // Arrange
      const { readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      readCodexConfig.mockReturnValue(multiProviderConfig)

      // Act - Try to delete all providers
      const result = await deleteProviders(['provider-1', 'provider-2', 'provider-3'])

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Cannot delete all providers. At least one provider must remain.',
      })
    })

    it('should handle deletion of non-existent providers', async () => {
      // Arrange
      const { readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      readCodexConfig.mockReturnValue(multiProviderConfig)

      // Act
      const result = await deleteProviders(['non-existent-provider', 'provider-2'])

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Some providers not found: non-existent-provider',
      })
    })

    it('should handle empty deletion list', async () => {
      // Arrange
      const { readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      readCodexConfig.mockReturnValue(multiProviderConfig)

      // Act
      const result = await deleteProviders([])

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'No providers specified for deletion',
      })
    })
  })
})
