import type { CodexConfigData, CodexProvider } from '../../../../src/utils/code-tools/codex'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { detectConfigManagementMode } from '../../../../src/utils/code-tools/codex-config-detector'
import {
  addProviderToExisting,
  deleteProviders,
  editExistingProvider,
} from '../../../../src/utils/code-tools/codex-provider-manager'

// Mock the codex module functions
vi.mock('../../../../src/utils/code-tools/codex', () => ({
  readCodexConfig: vi.fn(),
  backupCodexComplete: vi.fn(),
  writeAuthFile: vi.fn(),
}))

// Mock the codex-toml-updater module functions (new targeted update approach)
vi.mock('../../../../src/utils/code-tools/codex-toml-updater', () => ({
  updateCodexApiFields: vi.fn(),
  upsertCodexProvider: vi.fn(),
  deleteCodexProvider: vi.fn(),
}))

vi.mock('../../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

describe('codex-incremental-config integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const initialConfig: CodexConfigData = {
    model: null,
    modelProvider: 'provider-1',
    providers: [
      {
        id: 'provider-1',
        name: 'Provider 1',
        baseUrl: 'https://api.provider1.com/v1',
        wireApi: 'responses',
        tempEnvKey: 'PROVIDER1_API_KEY',
        requiresOpenaiAuth: true,
      },
    ],
    mcpServices: [],
    managed: true,
    otherConfig: [],
  }

  const newProvider: CodexProvider = {
    id: 'provider-2',
    name: 'Provider 2',
    baseUrl: 'https://api.provider2.com/v1',
    wireApi: 'chat',
    tempEnvKey: 'PROVIDER2_API_KEY',
    requiresOpenaiAuth: true,
  }

  describe('full incremental configuration workflow', () => {
    it('should handle complete add-edit-delete provider lifecycle', async () => {
      // Arrange
      const {
        readCodexConfig,
        backupCodexComplete,
        writeAuthFile,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const {
        upsertCodexProvider,
        deleteCodexProvider,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      // Initial configuration exists
      readCodexConfig.mockReturnValue(initialConfig)
      backupCodexComplete.mockReturnValue('/backup/path/config.toml')

      // Step 1: Detect management mode
      const detectionResult = detectConfigManagementMode()
      expect(detectionResult).toEqual({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        currentProvider: 'provider-1',
        providers: initialConfig.providers,
      })

      // Step 2: Add new provider
      const addResult = await addProviderToExisting(newProvider, 'api-key-2')
      expect(addResult.success).toBe(true)
      expect(addResult.addedProvider).toEqual(newProvider)

      // Verify add operation calls - new implementation uses targeted upsertCodexProvider
      expect(upsertCodexProvider).toHaveBeenCalledWith(newProvider.id, newProvider)
      expect(writeAuthFile).toHaveBeenCalledWith({
        [newProvider.tempEnvKey]: 'api-key-2',
      })

      // Step 3: Edit existing provider
      const editUpdates = {
        name: 'Updated Provider 1',
        baseUrl: 'https://api.updated-provider1.com/v1',
        wireApi: 'chat' as const,
        apiKey: 'updated-api-key-1',
      }

      // Mock updated config for edit operation
      const configAfterAdd: CodexConfigData = {
        ...initialConfig,
        providers: [initialConfig.providers[0], newProvider],
      }
      readCodexConfig.mockReturnValue(configAfterAdd)

      const editResult = await editExistingProvider('provider-1', editUpdates)
      expect(editResult.success).toBe(true)
      expect(editResult.updatedProvider?.name).toBe('Updated Provider 1')

      // Step 4: Delete a provider
      const configAfterEdit: CodexConfigData = {
        ...configAfterAdd,
        providers: [
          {
            ...initialConfig.providers[0],
            name: editUpdates.name,
            baseUrl: editUpdates.baseUrl,
            wireApi: editUpdates.wireApi,
          },
          newProvider,
        ],
      }
      readCodexConfig.mockReturnValue(configAfterEdit)

      const deleteResult = await deleteProviders(['provider-2'])
      expect(deleteResult.success).toBe(true)
      expect(deleteResult.deletedProviders).toEqual(['provider-2'])
      expect(deleteResult.remainingProviders).toHaveLength(1)

      // Verify delete operation uses targeted deleteCodexProvider
      expect(deleteCodexProvider).toHaveBeenCalledWith('provider-2')

      // Verify all operations created backups
      expect(backupCodexComplete).toHaveBeenCalledTimes(3)
    })

    it('should detect initial mode for fresh installations', async () => {
      // Arrange
      const { readCodexConfig } = vi.mocked(
        await import('../../../../src/utils/code-tools/codex'),
      )
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

    it('should maintain configuration integrity during operations', async () => {
      // Arrange
      const {
        readCodexConfig,
        backupCodexComplete,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const {
        upsertCodexProvider,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      const complexConfig: CodexConfigData = {
        model: null,
        modelProvider: 'provider-1',
        providers: [
          {
            id: 'provider-1',
            name: 'Provider 1',
            baseUrl: 'https://api.provider1.com/v1',
            wireApi: 'responses',
            tempEnvKey: 'PROVIDER1_API_KEY',
            requiresOpenaiAuth: true,
          },
          {
            id: 'provider-2',
            name: 'Provider 2',
            baseUrl: 'https://api.provider2.com/v1',
            wireApi: 'chat',
            tempEnvKey: 'PROVIDER2_API_KEY',
            requiresOpenaiAuth: true,
          },
        ],
        mcpServices: [
          {
            id: 'test-mcp',
            command: 'test-command',
            args: ['--test'],
          },
        ],
        managed: true,
        otherConfig: ['# Custom user config'],
      }

      readCodexConfig.mockReturnValue(complexConfig)
      backupCodexComplete.mockReturnValue('/backup/path/config.toml')

      const newProviderToAdd = {
        id: 'provider-3',
        name: 'Provider 3',
        baseUrl: 'https://api.provider3.com/v1',
        wireApi: 'responses' as const,
        tempEnvKey: 'PROVIDER3_API_KEY',
        requiresOpenaiAuth: true,
      }

      // Act: Add a provider and verify configuration integrity
      const addResult = await addProviderToExisting(
        newProviderToAdd,
        'api-key-3',
      )

      // Assert: Configuration integrity is maintained
      expect(addResult.success).toBe(true)
      // New implementation uses targeted upsertCodexProvider - only modifies provider section
      // This preserves MCP services and other config automatically
      expect(upsertCodexProvider).toHaveBeenCalledWith('provider-3', newProviderToAdd)

      // Note: The new implementation doesn't use writeCodexConfig anymore
      // Instead, it uses targeted TOML updates that preserve other sections automatically
    })

    it('should handle error scenarios gracefully', async () => {
      // Arrange
      const { readCodexConfig } = vi.mocked(
        await import('../../../../src/utils/code-tools/codex'),
      )
      const {
        upsertCodexProvider,
        updateCodexApiFields,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      // Test 1: Missing configuration - PR #251 changed: creates new config instead of error
      readCodexConfig.mockReturnValue(null)
      const addResult1 = await addProviderToExisting(newProvider, 'api-key')
      expect(addResult1.success).toBe(true)
      expect(addResult1.addedProvider).toEqual(newProvider)
      // New implementation uses targeted updates
      expect(updateCodexApiFields).toHaveBeenCalled()
      expect(upsertCodexProvider).toHaveBeenCalledWith(newProvider.id, newProvider)

      // Test 2: Duplicate provider
      readCodexConfig.mockReturnValue(initialConfig)
      const duplicateProvider: CodexProvider = {
        ...newProvider,
        id: 'provider-1', // Same as existing
      }
      const addResult2 = await addProviderToExisting(duplicateProvider, 'api-key')
      expect(addResult2.success).toBe(false)
      expect(addResult2.error).toBe('codex:providerManager.providerExists')

      // Test 3: Edit non-existent provider
      const editResult = await editExistingProvider('non-existent', { name: 'Test' })
      expect(editResult.success).toBe(false)
      expect(editResult.error).toBe('codex:providerManager.providerNotFound')

      // Test 4: Delete all providers
      const deleteResult = await deleteProviders(['provider-1'])
      expect(deleteResult.success).toBe(false)
      expect(deleteResult.error).toBe('codex:providerManager.cannotDeleteAll')
    })

    it('should handle default provider switching during deletion', async () => {
      // Arrange
      const {
        readCodexConfig,
        backupCodexComplete,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const {
        updateCodexApiFields,
        deleteCodexProvider,
      } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      const multiProviderConfig: CodexConfigData = {
        model: null,
        modelProvider: 'provider-1', // This will be deleted
        providers: [
          {
            id: 'provider-1',
            name: 'Provider 1',
            baseUrl: 'https://api.provider1.com/v1',
            wireApi: 'responses',
            tempEnvKey: 'PROVIDER1_API_KEY',
            requiresOpenaiAuth: true,
          },
          {
            id: 'provider-2',
            name: 'Provider 2',
            baseUrl: 'https://api.provider2.com/v1',
            wireApi: 'chat',
            tempEnvKey: 'PROVIDER2_API_KEY',
            requiresOpenaiAuth: true,
          },
        ],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      }

      readCodexConfig.mockReturnValue(multiProviderConfig)
      backupCodexComplete.mockReturnValue('/backup/path/config.toml')

      // Act: Delete the current default provider
      const deleteResult = await deleteProviders(['provider-1'])

      // Assert: Default provider is automatically updated
      expect(deleteResult.success).toBe(true)
      expect(deleteResult.newDefaultProvider).toBe('provider-2')
      // New implementation uses targeted updates
      expect(updateCodexApiFields).toHaveBeenCalledWith(expect.objectContaining({
        modelProvider: 'provider-2', // Updated to remaining provider
      }))
      expect(deleteCodexProvider).toHaveBeenCalledWith('provider-1')
    })
  })
})
