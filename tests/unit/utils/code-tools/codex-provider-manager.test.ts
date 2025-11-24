import type { CodexConfigData, CodexProvider } from '../../../../src/utils/code-tools/codex'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addProviderToExisting,
  deleteProviders,
  editExistingProvider,
  validateProviderData,
} from '../../../../src/utils/code-tools/codex-provider-manager'

// Mock the codex module functions
vi.mock('../../../../src/utils/code-tools/codex', () => ({
  readCodexConfig: vi.fn(),
  writeCodexConfig: vi.fn(),
  backupCodexComplete: vi.fn(),
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
    model: null,
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
        backupCodexComplete,
        writeAuthFile,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))

      readCodexConfig.mockReturnValue(mockExistingConfig)
      backupCodexComplete.mockReturnValue('/backup/path/config.toml')

      // Act
      const result = await addProviderToExisting(mockNewProvider, 'new-api-key-value')

      // Assert
      expect(backupCodexComplete).toHaveBeenCalledOnce()
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
        error: 'codex:providerManager.providerExists',
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
        error: 'codex:providerManager.noConfig',
      })
    })

    it('should handle backup creation failure', async () => {
      // Arrange
      const {
        readCodexConfig,
        backupCodexComplete,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))

      readCodexConfig.mockReturnValue(mockExistingConfig)
      backupCodexComplete.mockReturnValue(null) // Backup failed

      // Act
      const result = await addProviderToExisting(mockNewProvider, 'api-key')

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'codex:providerManager.backupFailed',
      })
    })
  })

  describe('editExistingProvider', () => {
    it('should successfully edit existing provider', async () => {
      // Arrange
      const {
        readCodexConfig,
        writeCodexConfig,
        backupCodexComplete,
        writeAuthFile,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))

      readCodexConfig.mockReturnValue(mockExistingConfig)
      backupCodexComplete.mockReturnValue('/backup/path/config.toml')

      const updates = {
        name: 'Updated Provider Name',
        baseUrl: 'https://api.updated.com/v1',
        wireApi: 'chat' as const,
        apiKey: 'updated-api-key',
      }

      // Act
      const result = await editExistingProvider('existing-provider', updates)

      // Assert
      expect(backupCodexComplete).toHaveBeenCalledOnce()
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
        error: 'codex:providerManager.providerNotFound',
      })
    })

    it('should handle partial updates correctly', async () => {
      // Arrange
      const {
        readCodexConfig,
        writeCodexConfig,
        backupCodexComplete,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))

      readCodexConfig.mockReturnValue(mockExistingConfig)
      backupCodexComplete.mockReturnValue('/backup/path/config.toml')

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
      model: null,
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
        backupCodexComplete,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))

      readCodexConfig.mockReturnValue(multiProviderConfig)
      backupCodexComplete.mockReturnValue('/backup/path/config.toml')

      // Act
      const result = await deleteProviders(['provider-2', 'provider-3'])

      // Assert
      expect(backupCodexComplete).toHaveBeenCalledOnce()
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
        backupCodexComplete,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))

      readCodexConfig.mockReturnValue(multiProviderConfig)
      backupCodexComplete.mockReturnValue('/backup/path/config.toml')

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
        error: 'codex:providerManager.cannotDeleteAll',
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
        error: 'codex:providerManager.providersNotFound',
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
        error: 'codex:providerManager.noProvidersSpecified',
      })
    })
  })

  describe('validateProviderData', () => {
    it('should return valid for complete provider data', () => {
      const validProvider: CodexProvider = {
        id: 'test-provider',
        name: 'Test Provider',
        baseUrl: 'https://api.test.com/v1',
        wireApi: 'responses',
        envKey: 'TEST_API_KEY',
        requiresOpenaiAuth: true,
      }

      const result = validateProviderData(validProvider)

      expect(result).toEqual({
        valid: true,
        errors: [],
      })
    })

    it('should return errors for missing required fields', () => {
      const incompleteProvider = {}

      const result = validateProviderData(incompleteProvider)

      expect(result.valid).toBe(false)
      expect(result.errors).toEqual([
        'codex:providerManager.providerIdRequired',
        'codex:providerManager.providerNameRequired',
        'codex:providerManager.baseUrlRequired',
      ])
    })

    it('should return error for empty string fields', () => {
      const emptyFieldsProvider = {
        id: '',
        name: '   ',
        baseUrl: '',
      }

      const result = validateProviderData(emptyFieldsProvider)

      expect(result.valid).toBe(false)
      expect(result.errors).toEqual([
        'codex:providerManager.providerIdRequired',
        'codex:providerManager.providerNameRequired',
        'codex:providerManager.baseUrlRequired',
      ])
    })

    it('should return error for invalid wireApi value', () => {
      const invalidWireApiProvider = {
        id: 'test-provider',
        name: 'Test Provider',
        baseUrl: 'https://api.test.com/v1',
        wireApi: 'invalid-protocol',
      }

      const result = validateProviderData(invalidWireApiProvider)

      expect(result.valid).toBe(false)
      expect(result.errors).toEqual([
        'codex:providerManager.wireApiInvalid',
      ])
    })

    it('should accept valid wireApi values', () => {
      const chatProvider = {
        id: 'test-provider',
        name: 'Test Provider',
        baseUrl: 'https://api.test.com/v1',
        wireApi: 'chat',
      }

      const responsesProvider = {
        id: 'test-provider',
        name: 'Test Provider',
        baseUrl: 'https://api.test.com/v1',
        wireApi: 'responses',
      }

      expect(validateProviderData(chatProvider).valid).toBe(true)
      expect(validateProviderData(responsesProvider).valid).toBe(true)
    })

    it('should handle partial provider data correctly', () => {
      const partialProvider = {
        id: 'test-provider',
        baseUrl: 'https://api.test.com/v1',
        // Missing name
      }

      const result = validateProviderData(partialProvider)

      expect(result.valid).toBe(false)
      expect(result.errors).toEqual(['codex:providerManager.providerNameRequired'])
    })
  })
})
