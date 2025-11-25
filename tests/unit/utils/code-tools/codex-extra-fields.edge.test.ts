import type { CodexConfigData } from '../../../../src/utils/code-tools/codex'
import { describe, expect, it } from 'vitest'
import { parseCodexConfig, renderCodexConfig } from '../../../../src/utils/code-tools/codex'

describe('codex MCP Extra Fields - Edge Cases', () => {
  describe('empty and Null Values', () => {
    it('should skip null extra field values during rendering', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            null_field: null,
            valid_field: 'value',
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).not.toContain('null_field')
      expect(rendered).toContain('valid_field = "value"')
    })

    it('should skip undefined extra field values during rendering', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            undefined_field: undefined,
            valid_field: 'value',
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).not.toContain('undefined_field')
      expect(rendered).toContain('valid_field = "value"')
    })

    it('should handle empty string values', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            empty_string: '',
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('empty_string = ""')
    })

    it('should handle empty arrays', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            empty_array: [],
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('empty_array = []')
    })

    it('should handle empty objects', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            empty_object: {},
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('empty_object = {}')
    })
  })

  describe('special Characters Handling', () => {
    it('should normalize backslashes to forward slashes in string values', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            path: 'C:\\Windows\\System32',
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      // normalizeTomlPath converts backslashes to forward slashes
      expect(rendered).toContain('path = "C:/Windows/System32"')

      // Verify round-trip - path will be normalized
      const reparsed = parseCodexConfig(rendered)
      expect(reparsed.mcpServices[0].extraFields?.path).toBe('C:/Windows/System32')
    })

    it('should escape quotes in string values', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            description: 'Test "quoted" value',
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('description = "Test \\"quoted\\" value"')

      // Verify round-trip
      const reparsed = parseCodexConfig(rendered)
      expect(reparsed.mcpServices[0].extraFields?.description).toBe('Test "quoted" value')
    })

    it('should handle newlines in string values', () => {
      const toml = `
[mcp_servers.test]
command = "node"
args = []
multiline = "line1\\nline2\\nline3"
`
      const config = parseCodexConfig(toml)

      expect(config.mcpServices[0].extraFields?.multiline).toContain('line1')
      expect(config.mcpServices[0].extraFields?.multiline).toContain('line2')
    })

    it('should normalize paths in array elements', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            paths: ['C:\\Windows', 'D:\\Program Files', 'E:\\Data'],
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      // normalizeTomlPath converts backslashes to forward slashes
      expect(rendered).toContain('paths = ["C:/Windows", "D:/Program Files", "E:/Data"]')
    })
  })

  describe('numeric Edge Cases', () => {
    it('should handle zero values', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            zero_value: 0,
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('zero_value = 0')

      const reparsed = parseCodexConfig(rendered)
      expect(reparsed.mcpServices[0].extraFields?.zero_value).toBe(0)
    })

    it('should handle negative numbers', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            negative: -42,
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('negative = -42')

      const reparsed = parseCodexConfig(rendered)
      expect(reparsed.mcpServices[0].extraFields?.negative).toBe(-42)
    })

    it('should handle floating point numbers', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            float_value: 3.14159,
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('float_value = 3.14159')

      const reparsed = parseCodexConfig(rendered)
      expect(reparsed.mcpServices[0].extraFields?.float_value).toBeCloseTo(3.14159)
    })

    it('should handle very large numbers', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            large_number: 9007199254740991, // Number.MAX_SAFE_INTEGER
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('large_number = 9007199254740991')

      const reparsed = parseCodexConfig(rendered)
      expect(reparsed.mcpServices[0].extraFields?.large_number).toBe(9007199254740991)
    })
  })

  describe('boolean Edge Cases', () => {
    it('should handle false boolean values', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            disabled: false,
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('disabled = false')

      const reparsed = parseCodexConfig(rendered)
      expect(reparsed.mcpServices[0].extraFields?.disabled).toBe(false)
    })
  })

  describe('complex Nested Structures', () => {
    it('should handle nested objects in inline tables', () => {
      const toml = `
[mcp_servers.test]
command = "node"
args = []
config = {server = {host = "localhost", port = 8080}}
`
      const config = parseCodexConfig(toml)

      expect(config.mcpServices[0].extraFields?.config).toBeDefined()
      expect(config.mcpServices[0].extraFields?.config.server).toBeDefined()
      expect(config.mcpServices[0].extraFields?.config.server.host).toBe('localhost')
      expect(config.mcpServices[0].extraFields?.config.server.port).toBe(8080)
    })

    it('should preserve nested objects through round-trip (parse → render → parse)', () => {
      // This test ensures nested inline tables don't become [object Object]
      const toml = `
[mcp_servers.test]
command = "node"
args = []
config = {server = {host = "localhost", port = 8080}}
`
      const config = parseCodexConfig(toml)
      const rendered = renderCodexConfig(config)

      // Verify no [object Object] in rendered output
      expect(rendered).not.toContain('[object Object]')

      // Verify nested structure is preserved in rendered TOML
      expect(rendered).toContain('config = {server = {host =')

      // Verify round-trip preserves data
      const reparsed = parseCodexConfig(rendered)
      expect(reparsed.mcpServices[0].extraFields?.config.server.host).toBe('localhost')
      expect(reparsed.mcpServices[0].extraFields?.config.server.port).toBe(8080)
    })

    it('should handle deeply nested objects (3+ levels)', () => {
      const toml = `
[mcp_servers.test]
command = "node"
args = []
deep = {level1 = {level2 = {level3 = "value"}}}
`
      const config = parseCodexConfig(toml)
      const rendered = renderCodexConfig(config)

      // Verify no [object Object]
      expect(rendered).not.toContain('[object Object]')

      // Verify round-trip
      const reparsed = parseCodexConfig(rendered)
      expect(reparsed.mcpServices[0].extraFields?.deep.level1.level2.level3).toBe('value')
    })

    it('should handle arrays with mixed types', () => {
      const toml = `
[mcp_servers.test]
command = "node"
args = []
mixed_array = [1, 2, 3]
`
      const config = parseCodexConfig(toml)

      expect(config.mcpServices[0].extraFields?.mixed_array).toEqual([1, 2, 3])
    })
  })

  describe('field Name Edge Cases', () => {
    it('should handle field names with underscores', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            field_with_underscores: 'value',
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('field_with_underscores = "value"')
    })

    it('should handle field names with numbers', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            field123: 'value',
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('field123 = "value"')
    })
  })

  describe('multiple Services with Extra Fields', () => {
    it('should handle multiple services each with different extra fields', () => {
      const toml = `
[mcp_servers.service1]
command = "node"
args = []
custom1 = "value1"
timeout1 = 30

[mcp_servers.service2]
command = "python"
args = []
custom2 = "value2"
retries2 = 5

[mcp_servers.service3]
command = "java"
args = []
custom3 = "value3"
max_conn3 = 100
`
      const config = parseCodexConfig(toml)

      expect(config.mcpServices).toHaveLength(3)
      expect(config.mcpServices[0].extraFields?.custom1).toBe('value1')
      expect(config.mcpServices[0].extraFields?.timeout1).toBe(30)
      expect(config.mcpServices[1].extraFields?.custom2).toBe('value2')
      expect(config.mcpServices[1].extraFields?.retries2).toBe(5)
      expect(config.mcpServices[2].extraFields?.custom3).toBe('value3')
      expect(config.mcpServices[2].extraFields?.max_conn3).toBe(100)

      // Verify round-trip
      const rendered = renderCodexConfig(config)
      const reparsed = parseCodexConfig(rendered)

      expect(reparsed.mcpServices[0].extraFields).toEqual(config.mcpServices[0].extraFields)
      expect(reparsed.mcpServices[1].extraFields).toEqual(config.mcpServices[1].extraFields)
      expect(reparsed.mcpServices[2].extraFields).toEqual(config.mcpServices[2].extraFields)
    })
  })

  describe('stress Tests', () => {
    it('should handle many extra fields', () => {
      const extraFields: Record<string, any> = {}
      for (let i = 0; i < 50; i++) {
        extraFields[`field${i}`] = `value${i}`
      }

      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields,
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)
      const reparsed = parseCodexConfig(rendered)

      expect(Object.keys(reparsed.mcpServices[0].extraFields || {})).toHaveLength(50)
      expect(reparsed.mcpServices[0].extraFields).toEqual(extraFields)
    })

    it('should handle very long string values', () => {
      const longString = 'a'.repeat(1000)
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            long_field: longString,
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)
      const reparsed = parseCodexConfig(rendered)

      expect(reparsed.mcpServices[0].extraFields?.long_field).toBe(longString)
    })
  })
})
