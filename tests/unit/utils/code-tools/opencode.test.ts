import type { OpenCodeConfig } from '../../../../src/utils/code-tools/opencode'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
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

vi.mock('../../../../src/utils/fs-operations', () => ({
  ensureDir: vi.fn(),
  exists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

vi.mock('../../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
}))

vi.mock('../../../../src/utils/zcf-config', () => ({
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../../../src/constants', () => ({
  OPENCODE_CONFIG_FILE: '/home/test/.config/opencode/opencode.json',
  OPENCODE_DIR: '/home/test/.config/opencode',
}))

describe('opencode config tools', () => {
  let mockExists: ReturnType<typeof vi.fn>
  let mockReadJsonConfig: ReturnType<typeof vi.fn>
  let mockWriteJsonConfig: ReturnType<typeof vi.fn>
  let mockUpdateZcfConfig: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()

    const fsModule = await import('../../../../src/utils/fs-operations')
    mockExists = vi.mocked(fsModule.exists)

    const jsonModule = await import('../../../../src/utils/json-config')
    mockReadJsonConfig = vi.mocked(jsonModule.readJsonConfig)
    mockWriteJsonConfig = vi.mocked(jsonModule.writeJsonConfig)

    const zcfModule = await import('../../../../src/utils/zcf-config')
    mockUpdateZcfConfig = vi.mocked(zcfModule.updateZcfConfig)
  })

  describe('readOpenCodeConfig', () => {
    it('should return parsed config when file exists', async () => {
      const config: OpenCodeConfig = { model: 'anthropic/claude-sonnet-4' }
      mockReadJsonConfig.mockReturnValue(config)

      const { readOpenCodeConfig } = await import('../../../../src/utils/code-tools/opencode')
      const result = readOpenCodeConfig()

      expect(result).toEqual(config)
      expect(mockReadJsonConfig).toHaveBeenCalledWith('/home/test/.config/opencode/opencode.json')
    })

    it('should return null when file does not exist', async () => {
      mockReadJsonConfig.mockReturnValue(null)

      const { readOpenCodeConfig } = await import('../../../../src/utils/code-tools/opencode')
      const result = readOpenCodeConfig()

      expect(result).toBeNull()
    })
  })

  describe('getOpenCodeStatus', () => {
    it('should return configured status when model is set', async () => {
      mockReadJsonConfig.mockReturnValue({ model: 'anthropic/claude-sonnet-4' })

      const { getOpenCodeStatus } = await import('../../../../src/utils/code-tools/opencode')
      const status = getOpenCodeStatus()

      expect(status.configured).toBe(true)
      expect(status.model).toBe('anthropic/claude-sonnet-4')
    })

    it('should return not configured when config is missing', async () => {
      mockReadJsonConfig.mockReturnValue(null)
      mockExists.mockReturnValue(false)

      const { getOpenCodeStatus } = await import('../../../../src/utils/code-tools/opencode')
      const status = getOpenCodeStatus()

      expect(status.configured).toBe(false)
      expect(status.installed).toBe(false)
    })
  })

  describe('parseOpenCodeModel', () => {
    it('should parse provider and model name', async () => {
      const { parseOpenCodeModel } = await import('../../../../src/utils/code-tools/opencode')

      expect(parseOpenCodeModel('anthropic/claude-sonnet-4')).toEqual({
        provider: 'anthropic',
        modelName: 'claude-sonnet-4',
      })
    })

    it('should return null for invalid format', async () => {
      const { parseOpenCodeModel } = await import('../../../../src/utils/code-tools/opencode')

      expect(parseOpenCodeModel('claude-sonnet-4')).toBeNull()
      expect(parseOpenCodeModel('anthropic/')).toBeNull()
      expect(parseOpenCodeModel('')).toBeNull()
    })
  })

  describe('switchOpenCodeModel', () => {
    it('should switch model and update enabled providers', async () => {
      mockReadJsonConfig.mockReturnValue({ model: 'openai/gpt-5' })
      mockExists.mockReturnValue(false)

      const { switchOpenCodeModel } = await import('../../../../src/utils/code-tools/opencode')
      const result = switchOpenCodeModel('anthropic/claude-sonnet-4')

      expect(result.success).toBe(true)
      expect(result.model).toBe('anthropic/claude-sonnet-4')
      expect(mockWriteJsonConfig).toHaveBeenCalledWith(
        '/home/test/.config/opencode/opencode.json',
        expect.objectContaining({
          model: 'anthropic/claude-sonnet-4',
          enabled_providers: ['anthropic'],
        }),
      )
      expect(mockUpdateZcfConfig).toHaveBeenCalledWith({ codeToolType: 'opencode' })
    })

    it('should preserve existing config fields', async () => {
      const existing: OpenCodeConfig = {
        model: 'openai/gpt-5',
        logLevel: 'INFO',
        snapshot: true,
      }
      mockReadJsonConfig.mockReturnValue(existing)
      mockExists.mockReturnValue(false)

      const { switchOpenCodeModel } = await import('../../../../src/utils/code-tools/opencode')
      switchOpenCodeModel('anthropic/claude-sonnet-4')

      expect(mockWriteJsonConfig).toHaveBeenCalledWith(
        '/home/test/.config/opencode/opencode.json',
        expect.objectContaining({
          model: 'anthropic/claude-sonnet-4',
          logLevel: 'INFO',
          snapshot: true,
          enabled_providers: ['anthropic'],
        }),
      )
    })

    it('should support switching small_model', async () => {
      mockReadJsonConfig.mockReturnValue({ model: 'openai/gpt-5' })
      mockExists.mockReturnValue(false)

      const { switchOpenCodeModel } = await import('../../../../src/utils/code-tools/opencode')
      const result = switchOpenCodeModel('anthropic/claude-sonnet-4', { smallModel: 'anthropic/claude-haiku' })

      expect(result.success).toBe(true)
      expect(result.smallModel).toBe('anthropic/claude-haiku')
    })

    it('should return error for invalid model format', async () => {
      const { switchOpenCodeModel } = await import('../../../../src/utils/code-tools/opencode')
      const result = switchOpenCodeModel('claude-sonnet-4')

      expect(result.success).toBe(false)
      expect(result.error).toContain('opencode:invalidModelFormat')
    })
  })
})
