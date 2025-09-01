import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMcpServices } from '../../src/config/mcp-services'
import { selectMcpServices } from '../../src/utils/mcp-selector'

// Mock external dependencies
vi.mock('inquirer')
vi.mock('../../src/config/mcp-services')
vi.mock('ansis', () => ({
  default: {
    gray: vi.fn((text: string) => text),
    yellow: vi.fn((text: string) => text),
  },
}))
// Use real i18n system for better integration testing
vi.mock('../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/i18n')>()
  return {
    ...actual,
    // Only mock initialization functions to avoid setup issues in tests
    ensureI18nInitialized: vi.fn(),
  }
})

const mockInquirer = vi.mocked(inquirer)
const mockGetMcpServices = vi.mocked(getMcpServices)

describe('mcp-selector', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default MCP services mock
    mockGetMcpServices.mockResolvedValue([
      {
        id: 'service1',
        name: 'Service 1',
        description: 'First service',
        requiresApiKey: false,
        config: { type: 'stdio', command: 'service1-cmd' },
      },
      {
        id: 'service2',
        name: 'Service 2',
        description: 'Second service',
        requiresApiKey: false,
        config: { type: 'stdio', command: 'service2-cmd' },
      },
    ])
  })

  describe('selectMcpServices', () => {
    it('should return selected service IDs when services are chosen', async () => {
      // Arrange
      const expectedServices = ['service1', 'service2']
      mockInquirer.prompt.mockResolvedValue({ services: expectedServices })

      // Act
      const result = await selectMcpServices()

      // Assert
      expect(result).toEqual(expectedServices)
      expect(mockInquirer.prompt).toHaveBeenCalledWith({
        type: 'checkbox',
        name: 'services',
        message: 'Select MCP services to install (Space to select, a to select all, i to invert, Enter to confirm)',
        choices: [
          {
            name: 'Service 1 - First service',
            value: 'service1',
            selected: false,
          },
          {
            name: 'Service 2 - Second service',
            value: 'service2',
            selected: false,
          },
        ],
      })
    })

    it('should return empty array when no services are selected', async () => {
      // Arrange
      mockInquirer.prompt.mockResolvedValue({ services: [] })

      // Act
      const result = await selectMcpServices()

      // Assert
      expect(result).toEqual([])
    })

    it('should return undefined when operation is cancelled', async () => {
      // Arrange
      mockInquirer.prompt.mockResolvedValue({ services: undefined })

      // Act
      const result = await selectMcpServices()

      // Assert
      expect(result).toBeUndefined()
    })

    it('should work with English language', async () => {
      // Arrange
      const expectedServices = ['service1']
      mockInquirer.prompt.mockResolvedValue({ services: expectedServices })

      // Act
      const result = await selectMcpServices()

      // Assert
      expect(result).toEqual(expectedServices)
      expect(getMcpServices).toHaveBeenCalled()
    })

    it('should handle empty MCP services list', async () => {
      // Arrange
      mockGetMcpServices.mockResolvedValue([])
      mockInquirer.prompt.mockResolvedValue({ services: [] })

      // Act
      const result = await selectMcpServices()

      // Assert
      expect(result).toEqual([])
      expect(mockInquirer.prompt).toHaveBeenCalledWith({
        type: 'checkbox',
        name: 'services',
        message: 'Select MCP services to install (Space to select, a to select all, i to invert, Enter to confirm)',
        choices: [],
      })
    })
  })
})
