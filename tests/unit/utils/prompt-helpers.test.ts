import { describe, expect, it } from 'vitest'
import { addCustomNumbersToChoices, addNumbersToChoices } from '../../../src/utils/prompt-helpers'

describe('prompt-helpers', () => {
  describe('addNumbersToChoices', () => {
    it('should add numbers to basic choices', () => {
      const choices = [
        { name: 'Option A', value: 'a' },
        { name: 'Option B', value: 'b' },
        { name: 'Option C', value: 'c' },
      ]

      const result = addNumbersToChoices(choices)

      expect(result).toEqual([
        { name: '1. Option A', value: 'a' },
        { name: '2. Option B', value: 'b' },
        { name: '3. Option C', value: 'c' },
      ])
    })

    it('should preserve short property', () => {
      const choices = [
        { name: 'Long Option Name', value: 'a', short: 'Option A' },
        { name: 'Another Long Name', value: 'b', short: 'Option B' },
      ]

      const result = addNumbersToChoices(choices)

      expect(result).toEqual([
        { name: '1. Long Option Name', value: 'a', short: 'Option A' },
        { name: '2. Another Long Name', value: 'b', short: 'Option B' },
      ])
    })

    it('should skip disabled choices', () => {
      const choices = [
        { name: 'Option A', value: 'a' },
        { name: 'Option B', value: 'b', disabled: true },
        { name: 'Option C', value: 'c' },
      ]

      const result = addNumbersToChoices(choices)

      expect(result).toEqual([
        { name: '1. Option A', value: 'a' },
        { name: 'Option B', value: 'b', disabled: true },
        { name: '2. Option C', value: 'c' },
      ])
    })

    it('should skip choices with disabled string message', () => {
      const choices = [
        { name: 'Option A', value: 'a' },
        { name: 'Option B', value: 'b', disabled: 'Not available' },
        { name: 'Option C', value: 'c' },
      ]

      const result = addNumbersToChoices(choices)

      expect(result).toEqual([
        { name: '1. Option A', value: 'a' },
        { name: 'Option B', value: 'b', disabled: 'Not available' },
        { name: '2. Option C', value: 'c' },
      ])
    })

    it('should use custom start number', () => {
      const choices = [
        { name: 'Option A', value: 'a' },
        { name: 'Option B', value: 'b' },
      ]

      const result = addNumbersToChoices(choices, 5)

      expect(result).toEqual([
        { name: '5. Option A', value: 'a' },
        { name: '6. Option B', value: 'b' },
      ])
    })

    it('should use custom format function', () => {
      const choices = [
        { name: 'Option A', value: 'a' },
        { name: 'Option B', value: 'b' },
      ]

      const customFormat = (n: number) => `[${n}] `
      const result = addNumbersToChoices(choices, 1, customFormat)

      expect(result).toEqual([
        { name: '[1] Option A', value: 'a' },
        { name: '[2] Option B', value: 'b' },
      ])
    })

    it('should handle empty array', () => {
      const choices: Array<{ name: string, value: string }> = []
      const result = addNumbersToChoices(choices)
      expect(result).toEqual([])
    })

    it('should handle single item', () => {
      const choices = [{ name: 'Only Option', value: 'only' }]
      const result = addNumbersToChoices(choices)
      expect(result).toEqual([{ name: '1. Only Option', value: 'only' }])
    })

    it('should handle complex nested values', () => {
      const choices = [
        { name: 'Option A', value: { id: 1, type: 'alpha' } },
        { name: 'Option B', value: { id: 2, type: 'beta' } },
      ]

      const result = addNumbersToChoices(choices)

      expect(result).toEqual([
        { name: '1. Option A', value: { id: 1, type: 'alpha' } },
        { name: '2. Option B', value: { id: 2, type: 'beta' } },
      ])
    })

    it('should handle choices with mixed properties', () => {
      const choices = [
        { name: 'Option A', value: 'a' },
        { name: 'Option B', value: 'b', short: 'B' },
        { name: 'Option C', value: 'c', disabled: true },
        { name: 'Option D', value: 'd', short: 'D', disabled: 'Coming soon' },
      ]

      const result = addNumbersToChoices(choices)

      expect(result).toEqual([
        { name: '1. Option A', value: 'a' },
        { name: '2. Option B', value: 'b', short: 'B' },
        { name: 'Option C', value: 'c', disabled: true },
        { name: 'Option D', value: 'd', short: 'D', disabled: 'Coming soon' },
      ])
    })
  })

  describe('addCustomNumbersToChoices', () => {
    it('should add custom formats to specific values', () => {
      const choices = [
        { name: 'Option A', value: 'a' },
        { name: 'Option B', value: 'b' },
        { name: 'Quit', value: 'quit' },
      ]

      const customFormats = new Map([['quit', 'Q. ']])
      const result = addCustomNumbersToChoices(choices, customFormats)

      expect(result).toEqual([
        { name: '1. Option A', value: 'a' },
        { name: '2. Option B', value: 'b' },
        { name: 'Q. Quit', value: 'quit' },
      ])
    })

    it('should handle multiple custom formats', () => {
      const choices = [
        { name: 'Option A', value: 'a' },
        { name: 'Back', value: 'back' },
        { name: 'Option B', value: 'b' },
        { name: 'Exit', value: 'exit' },
      ]

      const customFormats = new Map([
        ['back', '← '],
        ['exit', 'X. '],
      ])
      const result = addCustomNumbersToChoices(choices, customFormats)

      expect(result).toEqual([
        { name: '1. Option A', value: 'a' },
        { name: '← Back', value: 'back' },
        { name: '2. Option B', value: 'b' },
        { name: 'X. Exit', value: 'exit' },
      ])
    })

    it('should skip disabled items in numbering', () => {
      const choices = [
        { name: 'Option A', value: 'a' },
        { name: 'Option B', value: 'b', disabled: true },
        { name: 'Option C', value: 'c' },
        { name: 'Quit', value: 'quit' },
      ]

      const customFormats = new Map([['quit', 'Q. ']])
      const result = addCustomNumbersToChoices(choices, customFormats)

      expect(result).toEqual([
        { name: '1. Option A', value: 'a' },
        { name: 'Option B', value: 'b', disabled: true },
        { name: '2. Option C', value: 'c' },
        { name: 'Q. Quit', value: 'quit' },
      ])
    })

    it('should handle empty custom formats map', () => {
      const choices = [
        { name: 'Option A', value: 'a' },
        { name: 'Option B', value: 'b' },
      ]

      const result = addCustomNumbersToChoices(choices, new Map())

      expect(result).toEqual([
        { name: '1. Option A', value: 'a' },
        { name: '2. Option B', value: 'b' },
      ])
    })

    it('should handle no custom formats parameter', () => {
      const choices = [
        { name: 'Option A', value: 'a' },
        { name: 'Option B', value: 'b' },
      ]

      const result = addCustomNumbersToChoices(choices)

      expect(result).toEqual([
        { name: '1. Option A', value: 'a' },
        { name: '2. Option B', value: 'b' },
      ])
    })

    it('should preserve short property with custom formats', () => {
      const choices = [
        { name: 'Long Option Name', value: 'a', short: 'A' },
        { name: 'Exit Application', value: 'exit', short: 'Exit' },
      ]

      const customFormats = new Map([['exit', 'X. ']])
      const result = addCustomNumbersToChoices(choices, customFormats)

      expect(result).toEqual([
        { name: '1. Long Option Name', value: 'a', short: 'A' },
        { name: 'X. Exit Application', value: 'exit', short: 'Exit' },
      ])
    })

    it('should handle complex value types', () => {
      const choices = [
        { name: 'Option A', value: { id: 'a', data: 'alpha' } },
        { name: 'Option B', value: { id: 'b', data: 'beta' } },
      ]

      const customFormats = new Map([[{ id: 'b', data: 'beta' }, 'B. ']])
      const result = addCustomNumbersToChoices(choices, customFormats)

      // Note: Map with object keys won't match unless it's the exact same object reference
      // This test demonstrates that complex objects as keys typically won't match
      expect(result).toEqual([
        { name: '1. Option A', value: { id: 'a', data: 'alpha' } },
        { name: '2. Option B', value: { id: 'b', data: 'beta' } },
      ])
    })
  })

  describe('integration with real-world scenarios', () => {
    it('should handle API configuration choices', () => {
      const choices = [
        { name: 'Auth Token (OAuth) - Recommended for most users', value: 'auth_token', short: 'Auth Token' },
        { name: 'API Key - For advanced users', value: 'api_key', short: 'API Key' },
        { name: 'Skip', value: 'skip' },
      ]

      const result = addNumbersToChoices(choices)

      expect(result[0].name).toBe('1. Auth Token (OAuth) - Recommended for most users')
      expect(result[1].name).toBe('2. API Key - For advanced users')
      expect(result[2].name).toBe('3. Skip')
      expect(result[0].short).toBe('Auth Token')
    })

    it('should handle language selection choices', () => {
      const choices = [
        { name: '简体中文 - 适合中文用户', value: 'zh-CN' },
        { name: 'English - For English users', value: 'en' },
      ]

      const result = addNumbersToChoices(choices)

      expect(result).toEqual([
        { name: '1. 简体中文 - 适合中文用户', value: 'zh-CN' },
        { name: '2. English - For English users', value: 'en' },
      ])
    })

    it('should handle menu with special exit option', () => {
      const choices = [
        { name: 'Configure API', value: 'api' },
        { name: 'Configure MCP', value: 'mcp' },
        { name: 'Import Workflow', value: 'workflow' },
        { name: 'Exit', value: 'exit' },
      ]

      const customFormats = new Map([['exit', 'Q. ']])
      const result = addCustomNumbersToChoices(choices, customFormats)

      expect(result).toEqual([
        { name: '1. Configure API', value: 'api' },
        { name: '2. Configure MCP', value: 'mcp' },
        { name: '3. Import Workflow', value: 'workflow' },
        { name: 'Q. Exit', value: 'exit' },
      ])
    })
  })
})
