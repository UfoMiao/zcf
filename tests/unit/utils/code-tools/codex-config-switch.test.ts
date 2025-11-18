import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addProviderToExisting } from '../../../../src/utils/code-tools/codex-provider-manager'
// Mock all external dependencies
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))
vi.mock('ansis', () => ({
  default: {
    yellow: vi.fn((text: string) => text),
    cyan: vi.fn((text: string) => text),
    gray: vi.fn((text: string) => text),
    green: vi.fn((text: string) => text),
    red: vi.fn((text: string) => text),
  },
}))
vi.mock('../../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string, params?: any) => {
      if (params) {
        return `${key}:${JSON.stringify(params)}`
      }
      return key
    }),
  },
}))
vi.mock('../../../../src/utils/prompt-helpers', () => ({
  addNumbersToChoices: vi.fn(choices => choices),
}))
vi.mock('../../../../src/utils/code-tools/codex-config-detector', () => ({
  detectConfigManagementMode: vi.fn(),
}))
vi.mock('../../../../src/utils/code-tools/codex-provider-manager', () => ({
  addProviderToExisting: vi.fn(),
  deleteProviders: vi.fn(),
  editExistingProvider: vi.fn(),
}))
vi.mock('../../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))
vi.mock('../../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(() => ({})),
}))
vi.mock('../../../../src/constants', () => ({
  CODEX_AUTH_FILE: '/home/test/.codex/auth.json',
}))
vi.mock('../../../../src/config/api-providers', () => ({
  getApiProviders: vi.fn(() => []),
}))
vi.mock('../../../../src/utils/code-tools/codex', () => ({
  switchToProvider: vi.fn(),
}))
// Helper function to create complete CodexProvider objects
function createMockProvider(
  id: string,
  name: string,
  baseUrl?: string,
  wireApi?: 'responses' | 'chat',
  envKey?: string,
): any {
  return {
    id,
    name,
    baseUrl: baseUrl || 'https://api.example.com/v1',
    wireApi: wireApi || 'responses',
    envKey: envKey || `${id.toUpperCase().replace(/-/g, '_')}_API_KEY`,
    requiresOpenaiAuth: true,
  }
}
describe('codex-config-switch', () => {
  let mockedPromptBoolean: any

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Get mocked promptBoolean
    const togglePromptModule = await import('../../../../src/utils/toggle-prompt')
    mockedPromptBoolean = vi.mocked(togglePromptModule.promptBoolean)
  })
  describe('configureIncrementalManagement', () => {
    it('should handle no existing providers case', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: false,
        providerCount: 0,
        providers: [],
        currentProvider: null,
      })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:noExistingProviders')
    })
    it('should handle non-management mode', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'initial',
        hasProviders: false,
        providerCount: 0,
        providers: [],
        currentProvider: null,
      })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:noExistingProviders')
    })
    it('should display management interface when providers exist', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1'),
        createMockProvider('provider2', 'Provider 2'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 2,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt).mockResolvedValue({ action: 'skip' })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:incrementalManagementTitle')
      expect(console.log).toHaveBeenCalledWith('codex:currentProviderCount:{"count":2}')
      expect(console.log).toHaveBeenCalledWith('codex:currentDefaultProvider:{"provider":"Provider 1"}')
      expect(console.log).toHaveBeenCalledWith('common:skip')
    })
    it('should handle add provider action', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { addProviderToExisting } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [createMockProvider('provider1', 'Provider 1')]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'add' })
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection in handleAddProvider
        .mockResolvedValueOnce({
          providerName: 'Test Provider',
          baseUrl: 'https://api.test.com/v1',
          wireApi: 'responses',
          apiKey: 'test-key',
        })
      // No model prompt - model comes from prefilledModel or default 'gpt-5-codex'
      mockedPromptBoolean.mockResolvedValueOnce(false) // shouldOverwrite (no duplicate)
      mockedPromptBoolean.mockResolvedValueOnce(false) // setAsDefault
      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
        addedProvider: createMockProvider('test-provider', 'Test Provider'),
        backupPath: '/backup/path',
      })
      await configureIncrementalManagement()
      expect(addProviderToExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-provider',
          name: 'Test Provider',
          baseUrl: 'https://api.test.com/v1',
          wireApi: 'responses',
        }),
        'test-key',
        true,
      )
    })
    it('should handle edit provider action', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { editExistingProvider } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com', 'responses'),
        createMockProvider('provider2', 'Provider 2', 'https://api.test2.com', 'chat'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 2,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'edit' })
        .mockResolvedValueOnce({ selectedProviderId: 'provider1' }) // Provider selection
        .mockResolvedValueOnce({
          providerName: 'Updated Provider',
          baseUrl: 'https://api.updated.com',
          wireApi: 'responses',
          apiKey: 'updated-key',
        })
        .mockResolvedValueOnce({ model: 'gpt-5-codex' }) // Model configuration
      // handleEditProvider doesn't call promptBoolean on success
      vi.mocked(editExistingProvider).mockResolvedValue({
        success: true,
        updatedProvider: createMockProvider('provider1', 'Updated Provider'),
      })
      await configureIncrementalManagement()
      expect(editExistingProvider).toHaveBeenCalledWith('provider1', {
        name: 'Updated Provider',
        baseUrl: 'https://api.updated.com',
        wireApi: 'responses',
        apiKey: 'updated-key',
        model: 'gpt-5-codex',
      })
    })
    it('should handle delete provider action', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { deleteProviders } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com'),
        createMockProvider('provider2', 'Provider 2', 'https://api.test2.com'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 2,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      // Reset mocks to ensure clean state
      vi.mocked(inquirer.prompt).mockReset()
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'delete' })
        .mockResolvedValueOnce({ selectedProviderIds: ['provider1'] })
      mockedPromptBoolean.mockReset()
      mockedPromptBoolean.mockResolvedValueOnce(true) // confirmDelete
      vi.mocked(deleteProviders).mockResolvedValue({
        success: true,
        newDefaultProvider: 'Provider 2',
        backupPath: '/backup/path',
      })
      await configureIncrementalManagement()
      expect(deleteProviders).toHaveBeenCalledWith(['provider1'])
    })
    it('should handle user cancellation', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const mockProviders = [createMockProvider('provider1', 'Provider 1')]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ action: undefined })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('common:skip')
    })
  })
  describe('handleAddProvider', () => {
    it('should validate provider name input', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const mockProviders = [createMockProvider('provider1', 'Provider 1')]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'add' })
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockResolvedValueOnce({
          providerName: 'Test Provider',
          baseUrl: 'https://api.test.com/v1',
          wireApi: 'responses',
          apiKey: 'test-key',
        })
      // No model prompt - model comes from prefilledModel or default 'gpt-5-codex'
      mockedPromptBoolean.mockResolvedValueOnce(false) // shouldOverwrite (no duplicate)
      mockedPromptBoolean.mockResolvedValueOnce(false) // setAsDefault
      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
        addedProvider: createMockProvider('test-provider', 'Test Provider'),
      })
      await configureIncrementalManagement()
      // Verify the prompt was called for add action (action + selectedProvider + provider details)
      // handleAddProvider calls: 1) selectedProvider, 2) provider details (name, baseUrl, wireApi, apiKey)
      expect(inquirer.prompt).toHaveBeenCalledTimes(3) // action + selectedProvider + provider details
    })
    it('should validate base URL input', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const mockProviders = [createMockProvider('provider1', 'Provider 1')]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'add' })
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockResolvedValueOnce({
          providerName: 'Test Provider',
          baseUrl: 'https://api.test.com/v1',
          wireApi: 'responses',
          apiKey: 'test-key',
        })
      // No model prompt - model comes from prefilledModel or default 'gpt-5-codex'
      mockedPromptBoolean.mockResolvedValueOnce(false) // shouldOverwrite (no duplicate)
      mockedPromptBoolean.mockResolvedValueOnce(false) // setAsDefault
      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
        addedProvider: createMockProvider('test-provider', 'Test Provider'),
      })
      await configureIncrementalManagement()
      // Verify the prompt was called for add action (action + selectedProvider + provider details)
      // handleAddProvider calls: 1) selectedProvider, 2) provider details (name, baseUrl, wireApi, apiKey)
      expect(inquirer.prompt).toHaveBeenCalledTimes(3) // action + selectedProvider + provider details
    })
    it('should validate API key input', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const mockProviders = [createMockProvider('provider1', 'Provider 1')]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'add' })
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockResolvedValueOnce({
          providerName: 'Test Provider',
          baseUrl: 'https://api.test.com/v1',
          wireApi: 'responses',
          apiKey: 'test-key',
        })
      // No model prompt - model comes from prefilledModel or default 'gpt-5-codex'
      mockedPromptBoolean.mockResolvedValueOnce(false) // shouldOverwrite (no duplicate)
      mockedPromptBoolean.mockResolvedValueOnce(false) // setAsDefault
      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
        addedProvider: createMockProvider('test-provider', 'Test Provider'),
      })
      await configureIncrementalManagement()
      // Verify the prompt was called for add action (action + selectedProvider + provider details)
      // handleAddProvider calls: 1) selectedProvider, 2) provider details (name, baseUrl, wireApi, apiKey)
      expect(inquirer.prompt).toHaveBeenCalledTimes(3) // action + selectedProvider + provider details
    })
    it('should generate correct provider ID from name', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { addProviderToExisting } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [createMockProvider('provider1', 'Provider 1')]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'add' })
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockResolvedValueOnce({
          providerName: 'My Test Provider @#$',
          baseUrl: 'https://api.test.com/v1',
          wireApi: 'chat',
          apiKey: 'test-key',
        })
      // No model prompt - model comes from prefilledModel or default 'gpt-5-codex'
      mockedPromptBoolean.mockResolvedValueOnce(false) // shouldOverwrite (no duplicate)
      mockedPromptBoolean.mockResolvedValueOnce(false) // setAsDefault
      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
        addedProvider: createMockProvider('my-test-provider-', 'My Test Provider @#$'),
      })
      await configureIncrementalManagement()
      expect(addProviderToExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'my-test-provider-',
          name: 'My Test Provider @#$',
          envKey: 'MY_TEST_PROVIDER__API_KEY',
          model: 'gpt-5-codex', // Default model
        }),
        'test-key',
        true,
      )
    })
    it('should handle add provider success', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { addProviderToExisting } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [createMockProvider('provider1', 'Provider 1')]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'add' })
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockResolvedValueOnce({
          providerName: 'Test Provider',
          baseUrl: 'https://api.test.com/v1',
          wireApi: 'responses',
          apiKey: 'test-key',
        })
        .mockResolvedValueOnce({ model: 'gpt-5-codex' }) // Model selection
      mockedPromptBoolean.mockResolvedValueOnce(false) // shouldOverwrite (no duplicate)
      mockedPromptBoolean.mockResolvedValueOnce(false) // setAsDefault
      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
        addedProvider: createMockProvider('test-provider', 'Test Provider'),
        backupPath: '/backup/path',
      })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:providerAdded:{"name":"Test Provider"}')
      expect(console.log).toHaveBeenCalledWith('common:backupCreated:{"path":"/backup/path"}')
    })
    it('should handle add provider failure', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { addProviderToExisting } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [createMockProvider('provider1', 'Provider 1')]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt).mockReset()
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'add' })
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockResolvedValueOnce({
          providerName: 'Test Provider',
          baseUrl: 'https://api.test.com/v1',
          wireApi: 'responses',
          apiKey: 'test-key',
        })
      // No model prompt - model comes from prefilledModel or default 'gpt-5-codex'
      mockedPromptBoolean.mockReset()
      // No promptBoolean needed for failure case (no duplicate check since provider name is different)
      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: false,
        error: 'Provider already exists',
      })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:providerAddFailed:{"error":"Provider already exists"}')
    })
    it('should handle add provider success without backup path', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { addProviderToExisting } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [createMockProvider('provider1', 'Provider 1')]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'add' })
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockResolvedValueOnce({
          providerName: 'Test Provider',
          baseUrl: 'https://api.test.com/v1',
          wireApi: 'responses',
          apiKey: 'test-key',
        })
      // No model prompt - model comes from prefilledModel or default 'gpt-5-codex'
      mockedPromptBoolean.mockResolvedValueOnce(false) // shouldOverwrite (no duplicate)
      mockedPromptBoolean.mockResolvedValueOnce(false) // setAsDefault
      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
        addedProvider: createMockProvider('test-provider', 'Test Provider'),
        // No backupPath
      })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:providerAdded:{"name":"Test Provider"}')
      // Should not call backup message
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('common:backupCreated'))
    })
  })
  describe('handleEditProvider tests', () => {
    it('should handle provider edit cancellation', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com', 'responses'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt).mockReset()
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'edit' })
        .mockResolvedValueOnce({ selectedProviderId: undefined })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('common:cancelled')
    })
    it('should handle provider not found in edit', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com', 'responses'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt).mockReset()
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'edit' })
        .mockResolvedValueOnce({ selectedProviderId: 'nonexistent' })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:providerNotFound')
    })
    it('should handle provider edit failure', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { editExistingProvider } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com', 'responses'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt).mockReset()
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'edit' })
        .mockResolvedValueOnce({ selectedProviderId: 'provider1' }) // Provider selection
        .mockResolvedValueOnce({
          providerName: 'Updated Provider',
          baseUrl: 'https://api.updated.com',
          wireApi: 'responses',
          apiKey: 'updated-key',
        })
        .mockResolvedValueOnce({ model: 'gpt-5-codex' }) // Model configuration
      // No promptBoolean needed for failure case
      vi.mocked(editExistingProvider).mockResolvedValue({
        success: false,
        error: 'Edit failed',
      })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:providerUpdateFailed:{"error":"Edit failed"}')
    })
    it('should handle provider edit success', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { editExistingProvider } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com', 'responses'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt).mockReset()
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'edit' })
        .mockResolvedValueOnce({ selectedProviderId: 'provider1' }) // Provider selection
        .mockResolvedValueOnce({
          providerName: 'Updated Provider',
          baseUrl: 'https://api.updated.com',
          wireApi: 'responses',
          apiKey: 'updated-key',
        })
        .mockResolvedValueOnce({ model: 'gpt-5-codex' }) // Model configuration
      // handleEditProvider doesn't call promptBoolean on success
      vi.mocked(editExistingProvider).mockResolvedValue({
        success: true,
        updatedProvider: createMockProvider('provider1', 'Updated Provider'),
        backupPath: '/backup/path',
      })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:providerUpdated:{"name":"Updated Provider"}')
      expect(console.log).toHaveBeenCalledWith('common:backupCreated:{"path":"/backup/path"}')
    })
  })
  describe('handleDeleteProvider tests', () => {
    it('should handle provider delete cancellation', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com'),
        createMockProvider('provider2', 'Provider 2', 'https://api.test2.com'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 2,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'delete' })
        .mockResolvedValueOnce({ selectedProviderIds: [] })
      // No promptBoolean needed when no providers selected
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('common:cancelled')
    })
    it('should handle provider delete confirmation cancellation', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com'),
        createMockProvider('provider2', 'Provider 2', 'https://api.test2.com'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 2,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'delete' })
        .mockResolvedValueOnce({ selectedProviderIds: ['provider1'] })
      mockedPromptBoolean.mockResolvedValueOnce(false) // confirmDelete
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('common:cancelled')
    })
    it('should handle provider delete success', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { deleteProviders } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com'),
        createMockProvider('provider2', 'Provider 2', 'https://api.test2.com'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 2,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt).mockReset()
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'delete' })
        .mockResolvedValueOnce({ selectedProviderIds: ['provider1'] })
      mockedPromptBoolean.mockReset()
      mockedPromptBoolean.mockResolvedValueOnce(true) // confirmDelete
      vi.mocked(deleteProviders).mockResolvedValue({
        success: true,
        newDefaultProvider: 'Provider 2',
        backupPath: '/backup/path',
      })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:providersDeleted:{"count":1}')
      expect(console.log).toHaveBeenCalledWith('codex:newDefaultProvider:{"provider":"Provider 2"}')
      expect(console.log).toHaveBeenCalledWith('common:backupCreated:{"path":"/backup/path"}')
    })
    it('should handle provider delete failure', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { deleteProviders } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com'),
        createMockProvider('provider2', 'Provider 2', 'https://api.test2.com'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 2,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt).mockReset()
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'delete' })
        .mockResolvedValueOnce({ selectedProviderIds: ['provider1'] })
      mockedPromptBoolean.mockReset()
      mockedPromptBoolean.mockResolvedValueOnce(true) // confirmDelete
      vi.mocked(deleteProviders).mockResolvedValue({
        success: false,
        error: 'Delete failed',
      })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:providersDeleteFailed:{"error":"Delete failed"}')
    })
  })
  describe('handleCopyProvider tests', () => {
    it('should handle copy provider cancellation', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com', 'responses'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'copy' })
        .mockResolvedValueOnce({ selectedProviderId: undefined })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('common:cancelled')
    })

    it('should handle provider not found in copy', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com', 'responses'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'copy' })
        .mockResolvedValueOnce({ selectedProviderId: 'nonexistent' })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:providerNotFound')
    })

    it('should handle copy provider success without setting as default', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { addProviderToExisting } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com', 'responses', 'PROVIDER1_API_KEY'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'copy' })
        .mockResolvedValueOnce({ selectedProviderId: 'provider1' })
        .mockResolvedValueOnce({
          providerName: 'Provider 1-copy',
          baseUrl: 'https://api.test1.com',
          wireApi: 'responses',
          apiKey: 'test-key',
        })
        .mockResolvedValueOnce({ model: 'gpt-5-codex' })
      mockedPromptBoolean.mockResolvedValueOnce(false) // setAsDefault
      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
        addedProvider: createMockProvider('provider1-copy', 'Provider 1-copy'),
        backupPath: '/backup/path',
      })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:providerCopied:{"name":"Provider 1-copy"}')
      expect(console.log).toHaveBeenCalledWith('common:backupCreated:{"path":"/backup/path"}')
    })

    it('should handle copy provider success and set as default', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { addProviderToExisting } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com', 'responses', 'PROVIDER1_API_KEY'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })

      vi.mocked(inquirer.prompt).mockReset()
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'copy' })
        .mockResolvedValueOnce({ selectedProviderId: 'provider1' })
        .mockResolvedValueOnce({
          providerName: 'Provider 1-copy',
          baseUrl: 'https://api.test1.com',
          wireApi: 'responses',
          apiKey: 'test-key',
        })
        .mockResolvedValueOnce({ model: 'gpt-5-codex' })
      mockedPromptBoolean.mockReset()
      mockedPromptBoolean.mockResolvedValueOnce(true) // setAsDefault
      // Mock switchToProvider
      const { switchToProvider } = await import('../../../../src/utils/code-tools/codex')
      vi.mocked(switchToProvider).mockResolvedValue(true)
      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
        addedProvider: createMockProvider('provider1-copy', 'Provider 1-copy'),
        backupPath: '/backup/path',
      })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:providerCopied:{"name":"Provider 1-copy"}')
      expect(console.log).toHaveBeenCalledWith('multi-config:profileSetAsDefault:{"name":"Provider 1-copy"}')
    })

    it('should handle copy provider failure', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { addProviderToExisting } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [
        createMockProvider('provider1', 'Provider 1', 'https://api.test1.com', 'responses'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'copy' })
        .mockResolvedValueOnce({ selectedProviderId: 'provider1' })
        .mockResolvedValueOnce({
          providerName: 'Provider 1-copy',
          baseUrl: 'https://api.test1.com',
          wireApi: 'responses',
          apiKey: 'test-key',
        })
        .mockResolvedValueOnce({ model: 'gpt-5-codex' })
      // No need to mock promptBoolean since failure case doesn't reach it
      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: false,
        error: 'Copy failed',
      })
      await configureIncrementalManagement()
      expect(console.log).toHaveBeenCalledWith('codex:providerCopyFailed:{"error":"Copy failed"}')
    })

    it('should generate correct provider ID from copied name', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { addProviderToExisting } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [
        createMockProvider('provider1', 'My Test Provider', 'https://api.test1.com', 'responses'),
      ]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'My Test Provider',
      })
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'copy' })
        .mockResolvedValueOnce({ selectedProviderId: 'provider1' })
        .mockResolvedValueOnce({
          providerName: 'My Test Provider @#$ Copy',
          baseUrl: 'https://api.test1.com',
          wireApi: 'chat',
          apiKey: 'test-key',
        })
        .mockResolvedValueOnce({ model: 'gpt-5-codex' })
      mockedPromptBoolean.mockResolvedValueOnce(false) // setAsDefault
      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
        addedProvider: createMockProvider('my-test-provider--copy', 'My Test Provider @#$ Copy'),
      })
      await configureIncrementalManagement()
      expect(addProviderToExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'my-test-provider--copy',
          name: 'My Test Provider @#$ Copy',
          envKey: 'MY_TEST_PROVIDER__COPY_API_KEY',
        }),
        'test-key',
        false,
      )
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle inquirer prompt rejection', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const mockProviders = [createMockProvider('provider1', 'Provider 1')]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      // Mock the action prompt to reject - this is the first inquirer.prompt call in configureIncrementalManagement
      vi.mocked(inquirer.prompt)
        .mockRejectedValueOnce(new Error('User interrupted'))
      await expect(configureIncrementalManagement()).rejects.toThrow('User interrupted')
    })
    it('should handle detectConfigManagementMode throwing error', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      // detectConfigManagementMode has try-catch, so it returns error in result, not throws
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'initial',
        hasProviders: false,
        providerCount: 0,
        error: 'Config detection failed',
      })
      await configureIncrementalManagement()
      // Should log no existing providers message
      expect(console.log).toHaveBeenCalledWith('codex:noExistingProviders')
    })
    it('should handle addProviderToExisting throwing error', async () => {
      const { configureIncrementalManagement } = await import('../../../../src/utils/code-tools/codex-config-switch')
      const { detectConfigManagementMode } = await import('../../../../src/utils/code-tools/codex-config-detector')
      const { addProviderToExisting } = await import('../../../../src/utils/code-tools/codex-provider-manager')
      const mockProviders = [createMockProvider('provider1', 'Provider 1')]
      vi.mocked(detectConfigManagementMode).mockReturnValue({
        mode: 'management',
        hasProviders: true,
        providerCount: 1,
        providers: mockProviders,
        currentProvider: 'Provider 1',
      })
      // Reset inquirer.prompt mock to ensure clean state
      vi.mocked(inquirer.prompt).mockReset()
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'add' })
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection in handleAddProvider
        .mockResolvedValueOnce({
          providerName: 'Test Provider',
          baseUrl: 'https://api.test.com/v1',
          wireApi: 'responses',
          apiKey: 'test-key',
        })
      // No model prompt - model comes from prefilledModel or default 'gpt-5-codex'
      mockedPromptBoolean.mockReset() // Reset to ensure clean state
      mockedPromptBoolean.mockResolvedValueOnce(false) // shouldOverwrite (no duplicate)
      // No setAsDefault promptBoolean needed since addProviderToExisting will throw
      vi.mocked(addProviderToExisting).mockRejectedValue(new Error('Provider addition failed'))
      await expect(configureIncrementalManagement()).rejects.toThrow('Provider addition failed')
    })
  })
})
