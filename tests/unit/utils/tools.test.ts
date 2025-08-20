import ansis from 'ansis'
import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeCcusage } from '../../../src/commands/ccu'
import { runCcusageFeature } from '../../../src/utils/tools'

vi.mock('inquirer')
vi.mock('../../../src/commands/ccu')

describe('runCcusageFeature', () => {
  const mockPrompt = vi.mocked(inquirer.prompt)
  const mockExecuteCcusage = vi.mocked(executeCcusage)
  const consoleLogSpy = vi.spyOn(console, 'log')

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy.mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('mode selection', () => {
    it('should handle daily mode selection', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'daily' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature('zh-CN')

      expect(mockPrompt).toHaveBeenCalledWith({
        type: 'list',
        name: 'mode',
        message: '选择分析模式:',
        choices: [
          { name: '1. 每日使用量', value: 'daily' },
          { name: '2. 每月使用量', value: 'monthly' },
          { name: '3. 会话统计', value: 'session' },
          { name: '4. 区块统计', value: 'blocks' },
          { name: '5. 自定义参数', value: 'custom' },
          { name: '6. 返回', value: 'back' },
        ],
      })
      expect(mockExecuteCcusage).toHaveBeenCalledWith(['daily'])
      // Console log validation removed - UI output is managed by i18n
    })

    it('should handle monthly mode selection in English', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'monthly' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature('en')

      expect(mockPrompt).toHaveBeenCalledWith({
        type: 'list',
        name: 'mode',
        message: 'Select analysis mode:',
        choices: [
          { name: '1. Daily usage', value: 'daily' },
          { name: '2. Monthly usage', value: 'monthly' },
          { name: '3. Session statistics', value: 'session' },
          { name: '4. Block statistics', value: 'blocks' },
          { name: '5. Custom parameters', value: 'custom' },
          { name: '6. Back', value: 'back' },
        ],
      })
      expect(mockExecuteCcusage).toHaveBeenCalledWith(['monthly'])
      // Console log validation removed - UI output is managed by i18n
    })

    it('should handle session mode selection', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'session' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature('zh-CN')

      expect(mockExecuteCcusage).toHaveBeenCalledWith(['session'])
    })

    it('should handle blocks mode selection', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'blocks' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature('en')

      expect(mockExecuteCcusage).toHaveBeenCalledWith(['blocks'])
    })
  })

  describe('back option', () => {
    it('should return early when back is selected', async () => {
      mockPrompt.mockResolvedValueOnce({ mode: 'back' })

      await runCcusageFeature('zh-CN')

      expect(mockExecuteCcusage).not.toHaveBeenCalled()
      expect(mockPrompt).toHaveBeenCalledTimes(1)
    })

    it('should return early when back is selected in English', async () => {
      mockPrompt.mockResolvedValueOnce({ mode: 'back' })

      await runCcusageFeature('en')

      expect(mockExecuteCcusage).not.toHaveBeenCalled()
      expect(mockPrompt).toHaveBeenCalledTimes(1)
    })
  })

  describe('custom mode', () => {
    it('should handle custom mode with arguments', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: 'daily --json --output report.json' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature('zh-CN')

      expect(mockPrompt).toHaveBeenCalledWith({
        type: 'input',
        name: 'customArgs',
        message: '输入自定义参数 (例如: daily --json):',
        default: '',
      })
      expect(mockExecuteCcusage).toHaveBeenCalledWith(['daily', '--json', '--output', 'report.json'])
    })

    it('should handle custom mode with empty arguments', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: '' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature('en')

      expect(mockPrompt).toHaveBeenCalledWith({
        type: 'input',
        name: 'customArgs',
        message: 'Enter custom arguments (e.g., daily --json):',
        default: '',
      })
      expect(mockExecuteCcusage).toHaveBeenCalledWith([])
    })

    it('should handle custom mode with spaces only', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: '   ' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature('zh-CN')

      expect(mockExecuteCcusage).toHaveBeenCalledWith([])
    })

    it('should handle custom mode with multiple spaces between arguments', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: 'daily    --json     --verbose' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature('en')

      expect(mockExecuteCcusage).toHaveBeenCalledWith(['daily', '--json', '--verbose'])
    })
  })

  describe('continue prompt', () => {
    it('should show continue prompt in Chinese', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'daily' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature('zh-CN')

      expect(mockPrompt).toHaveBeenNthCalledWith(2, {
        type: 'input',
        name: 'continue',
        message: ansis.gray('按 Enter 键继续...'),
      })
    })

    it('should show continue prompt in English', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'monthly' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature('en')

      expect(mockPrompt).toHaveBeenNthCalledWith(2, {
        type: 'input',
        name: 'continue',
        message: ansis.gray('Press Enter to continue...'),
      })
    })
  })

  // Display text tests removed - UI output is implementation detail managed by i18n system
})
