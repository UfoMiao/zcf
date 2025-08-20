import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  configureAiPersonality,
  getExistingPersonality,
  getPersonalityInfo,
  hasExistingPersonality,
} from '../../../src/utils/ai-personality'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('ansis', () => ({
  default: {
    gray: (text: string) => text,
    green: (text: string) => text,
    yellow: (text: string) => text,
    cyan: (text: string) => text,
    red: (text: string) => text,
    blue: (text: string) => text,
  },
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../../src/utils/fs-operations', () => ({
  writeFile: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}))

describe('ai-personality utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should load ai-personality module', async () => {
    const module = await import('../../../src/utils/ai-personality')
    expect(module).toBeDefined()
    expect(module.configureAiPersonality).toBeDefined()
    expect(typeof module.configureAiPersonality).toBe('function')
  })

  describe('core Functions', () => {
    describe('hasExistingPersonality', () => {
      it('should return true when personality exists', async () => {
        const { readZcfConfig } = vi.mocked(await import('../../../src/utils/zcf-config'))

        vi.mocked(readZcfConfig).mockReturnValue({
          version: '2.3.0',
          preferredLang: 'zh-CN',
          aiPersonality: 'professional',
        } as any)

        const result = hasExistingPersonality()
        expect(result).toBe(true)
      })

      it('should return false when personality does not exist', async () => {
        const { readZcfConfig } = vi.mocked(await import('../../../src/utils/zcf-config'))

        vi.mocked(readZcfConfig).mockReturnValue({
          version: '2.3.0',
          preferredLang: 'zh-CN',
        } as any)

        const result = hasExistingPersonality()
        expect(result).toBe(false)
      })

      it('should return false when config is null', async () => {
        const { readZcfConfig } = vi.mocked(await import('../../../src/utils/zcf-config'))

        vi.mocked(readZcfConfig).mockReturnValue(null)

        const result = hasExistingPersonality()
        expect(result).toBe(false)
      })
    })

    describe('getExistingPersonality', () => {
      it('should return personality when it exists', async () => {
        const { readZcfConfig } = vi.mocked(await import('../../../src/utils/zcf-config'))

        vi.mocked(readZcfConfig).mockReturnValue({
          version: '2.3.0',
          preferredLang: 'zh-CN',
          aiPersonality: 'catgirl',
        } as any)

        const result = getExistingPersonality()
        expect(result).toBe('catgirl')
      })

      it('should return null when personality does not exist', async () => {
        const { readZcfConfig } = vi.mocked(await import('../../../src/utils/zcf-config'))

        vi.mocked(readZcfConfig).mockReturnValue({
          version: '2.3.0',
          preferredLang: 'zh-CN',
        } as any)

        const result = getExistingPersonality()
        expect(result).toBe(null)
      })

      it('should return null when config is null', async () => {
        const { readZcfConfig } = vi.mocked(await import('../../../src/utils/zcf-config'))

        vi.mocked(readZcfConfig).mockReturnValue(null)

        const result = getExistingPersonality()
        expect(result).toBe(null)
      })
    })

    describe('getPersonalityInfo', () => {
      it('should return personality info for valid id', () => {
        const result = getPersonalityInfo('professional')
        expect(result).toBeDefined()
        expect(result?.id).toBe('professional')
        expect(result?.name['zh-CN']).toBe('专业助手(默认)')
      })

      it('should return personality info for catgirl', () => {
        const result = getPersonalityInfo('catgirl')
        expect(result).toBeDefined()
        expect(result?.id).toBe('catgirl')
        expect(result?.name['zh-CN']).toBe('猫娘助手')
      })

      it('should return undefined for invalid id', () => {
        const result = getPersonalityInfo('invalid-id')
        expect(result).toBeUndefined()
      })
    })
  })

  describe('configureAiPersonality', () => {
    it('should use saved personality from config', async () => {
      const { configureAiPersonality } = await import('../../../src/utils/ai-personality')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { writeFile } = await import('../../../src/utils/fs-operations')

      vi.mocked(readZcfConfig).mockReturnValue({
        version: '2.3.0',
        preferredLang: 'zh-CN',
        selectedPersonality: 'catgirl',
      } as any)

      // Even with saved config, inquirer will still be called to show selection
      vi.mocked(inquirer.prompt).mockResolvedValue({ personality: 'catgirl' })

      await configureAiPersonality('zh-CN')

      expect(readZcfConfig).toHaveBeenCalled()
      expect(writeFile).toHaveBeenCalled()
    })

    it('should prompt for personality when no saved config', async () => {
      const { configureAiPersonality } = await import('../../../src/utils/ai-personality')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { writeFile } = await import('../../../src/utils/fs-operations')

      vi.mocked(readZcfConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ personality: 'professional' })

      await configureAiPersonality('zh-CN')

      expect(inquirer.prompt).toHaveBeenCalled()
      expect(writeFile).toHaveBeenCalled()
    })

    it('should handle different personality types', async () => {
      const { configureAiPersonality } = await import('../../../src/utils/ai-personality')
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')
      const { writeFile } = await import('../../../src/utils/fs-operations')

      vi.mocked(readZcfConfig).mockReturnValue(null)

      // Test each personality type
      const personalities = ['professional', 'catgirl', 'friendly', 'mentor', 'concise']

      for (const personality of personalities) {
        vi.clearAllMocks()
        vi.mocked(readZcfConfig).mockReturnValue(null)
        vi.mocked(inquirer.prompt).mockResolvedValue({ personality })

        await configureAiPersonality('zh-CN')

        expect(updateZcfConfig).toHaveBeenCalled()
        expect(writeFile).toHaveBeenCalled()
      }
    })

    it('should handle custom personality', async () => {
      const { configureAiPersonality } = await import('../../../src/utils/ai-personality')
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')
      const { writeFile } = await import('../../../src/utils/fs-operations')

      vi.mocked(readZcfConfig).mockReturnValue(null)

      // Mock both prompts in sequence
      vi.mocked(inquirer.prompt)
        .mockImplementationOnce(() => Promise.resolve({ personality: 'custom' }))
        .mockImplementationOnce(() => Promise.resolve({ customDirective: 'My custom directive' }))

      await configureAiPersonality('zh-CN')

      expect(inquirer.prompt).toHaveBeenCalledTimes(2)
      expect(updateZcfConfig).toHaveBeenCalledWith({ aiPersonality: 'custom' })
      expect(writeFile).toHaveBeenCalled()
    })

    it('should handle custom personality cancellation', async () => {
      const { configureAiPersonality } = await import('../../../src/utils/ai-personality')
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')
      const { writeFile } = await import('../../../src/utils/fs-operations')

      vi.mocked(readZcfConfig).mockReturnValue(null)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      // Mock custom selection then cancellation
      vi.mocked(inquirer.prompt)
        .mockImplementationOnce(() => Promise.resolve({ personality: 'custom' }))
        .mockImplementationOnce(() => Promise.resolve({ customDirective: undefined }))

      await configureAiPersonality('zh-CN')

      expect(inquirer.prompt).toHaveBeenCalledTimes(2)
      expect(updateZcfConfig).not.toHaveBeenCalled()
      expect(writeFile).not.toHaveBeenCalled()
      // Check for either English 'cancelled' or Chinese '取消'
      expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/cancelled|取消/))
    })

    it('should handle error in applyPersonalityDirective', async () => {
      const { configureAiPersonality } = await import('../../../src/utils/ai-personality')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { writeFile } = await import('../../../src/utils/fs-operations')

      vi.mocked(readZcfConfig).mockReturnValue(null)
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(inquirer.prompt).mockResolvedValue({ personality: 'professional' })
      vi.mocked(writeFile).mockImplementation(() => {
        throw new Error('Write error')
      })

      await configureAiPersonality('zh-CN')

      expect(console.error).toHaveBeenCalled()
    })

    it('should use English fallback when config lang is not available', async () => {
      const { configureAiPersonality } = await import('../../../src/utils/ai-personality')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { writeFile } = await import('../../../src/utils/fs-operations')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: undefined } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ personality: 'professional' })
      vi.mocked(writeFile).mockImplementation(() => {
        throw new Error('Write error')
      })
      vi.spyOn(console, 'error').mockImplementation(() => {})

      await configureAiPersonality('zh-CN')

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed'), expect.any(Error))
    })

    it('should handle empty personality selection', async () => {
      const { configureAiPersonality } = await import('../../../src/utils/ai-personality')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { writeFile } = await import('../../../src/utils/fs-operations')

      vi.mocked(readZcfConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValue({ personality: undefined })

      await configureAiPersonality('zh-CN')

      expect(writeFile).not.toHaveBeenCalled()
    })
  })

  describe('edge Cases - Existing Personality', () => {
    it('should show existing personality and keep it when not modifying', async () => {
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { writeFile } = await import('../../../src/utils/fs-operations')

      vi.mocked(readZcfConfig).mockReturnValue({
        version: '2.3.0',
        preferredLang: 'zh-CN',
        aiPersonality: 'professional',
      } as any)

      vi.mocked(inquirer.prompt).mockResolvedValue({ modify: false })

      await configureAiPersonality('zh-CN', true)

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('检测到已有 AI 个性配置'))
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('专业助手(默认)'))
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('保持当前个性配置'))
      expect(writeFile).not.toHaveBeenCalled()
    })

    it('should allow modifying existing personality', async () => {
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')
      const { writeFile } = await import('../../../src/utils/fs-operations')

      vi.mocked(readZcfConfig).mockReturnValue({
        version: '2.3.0',
        preferredLang: 'zh-CN',
        aiPersonality: 'professional',
      } as any)

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ modify: true })
        .mockResolvedValueOnce({ personality: 'catgirl' })

      await configureAiPersonality('zh-CN', true)

      expect(updateZcfConfig).toHaveBeenCalledWith({ aiPersonality: 'catgirl' })
      expect(writeFile).toHaveBeenCalled()
    })

    it('should handle missing personality info gracefully', async () => {
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')
      const { writeFile } = await import('../../../src/utils/fs-operations')

      vi.mocked(readZcfConfig).mockReturnValue({
        version: '2.3.0',
        preferredLang: 'zh-CN',
        aiPersonality: 'invalid-personality',
      } as any)

      vi.mocked(inquirer.prompt).mockResolvedValue({ personality: 'professional' })

      await configureAiPersonality('zh-CN', true)

      // Should not show existing personality if info not found
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Existing AI personality configuration'))
      expect(updateZcfConfig).toHaveBeenCalledWith({ aiPersonality: 'professional' })
      expect(writeFile).toHaveBeenCalled()
    })

    it('should skip showing existing personality when showExisting is false', async () => {
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')
      const { writeFile } = await import('../../../src/utils/fs-operations')

      vi.mocked(readZcfConfig).mockReturnValue({
        version: '2.3.0',
        preferredLang: 'zh-CN',
        aiPersonality: 'professional',
      } as any)

      vi.mocked(inquirer.prompt).mockResolvedValue({ personality: 'catgirl' })

      await configureAiPersonality('zh-CN', false)

      // Should not show existing personality
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Existing AI personality configuration'))
      expect(updateZcfConfig).toHaveBeenCalledWith({ aiPersonality: 'catgirl' })
      expect(writeFile).toHaveBeenCalled()
    })

    it('should use English labels when using en language', async () => {
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({
        version: '2.3.0',
        preferredLang: 'en',
        aiPersonality: 'professional',
      } as any)

      vi.mocked(inquirer.prompt).mockResolvedValue({ modify: false })

      await configureAiPersonality('en', true)

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Professional Assistant(Default)'))
    })
  })
})
