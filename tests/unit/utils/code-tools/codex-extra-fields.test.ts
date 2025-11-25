import type { CodexConfigData } from '../../../../src/utils/code-tools/codex'
import { describe, expect, it } from 'vitest'
import { parseCodexConfig, renderCodexConfig } from '../../../../src/utils/code-tools/codex'

describe('codex MCP Extra Fields Preservation', () => {
  describe('parseCodexConfig - Extra Fields Collection', () => {
    it('should preserve extra MCP fields during parsing', () => {
      const toml = `
[mcp_servers.test]
command = "node"
args = ["server.js"]
startup_timeout_sec = 30
retries = 3
max_connections = 100
`
      const config = parseCodexConfig(toml)

      expect(config.mcpServices).toHaveLength(1)
      expect(config.mcpServices[0].extraFields).toBeDefined()
      expect(config.mcpServices[0].extraFields?.startup_timeout_sec).toBe(30)
      expect(config.mcpServices[0].extraFields?.retries).toBe(3)
      expect(config.mcpServices[0].extraFields?.max_connections).toBe(100)
    })

    it('should not add extraFields when no extra fields exist', () => {
      const toml = `
[mcp_servers.test]
command = "node"
args = []
startup_timeout_ms = 5000
`
      const config = parseCodexConfig(toml)

      expect(config.mcpServices).toHaveLength(1)
      expect(config.mcpServices[0].extraFields).toBeUndefined()
    })

    it('should handle multiple MCP services with different extra fields', () => {
      const toml = `
[mcp_servers.service1]
command = "node"
args = ["server1.js"]
custom_field1 = "value1"

[mcp_servers.service2]
command = "python"
args = ["server2.py"]
custom_field2 = 42
`
      const config = parseCodexConfig(toml)

      expect(config.mcpServices).toHaveLength(2)
      expect(config.mcpServices[0].extraFields?.custom_field1).toBe('value1')
      expect(config.mcpServices[1].extraFields?.custom_field2).toBe(42)
    })

    it('should handle complex extra field types', () => {
      const toml = `
[mcp_servers.test]
command = "node"
args = []
string_field = "test"
number_field = 123
boolean_field = true
array_field = ["a", "b", "c"]
`
      const config = parseCodexConfig(toml)

      expect(config.mcpServices[0].extraFields?.string_field).toBe('test')
      expect(config.mcpServices[0].extraFields?.number_field).toBe(123)
      expect(config.mcpServices[0].extraFields?.boolean_field).toBe(true)
      expect(config.mcpServices[0].extraFields?.array_field).toEqual(['a', 'b', 'c'])
    })

    it('should handle object type extra fields', () => {
      const toml = `
[mcp_servers.test]
command = "node"
args = []
object_field = {key1 = "value1", key2 = 42}
`
      const config = parseCodexConfig(toml)

      expect(config.mcpServices[0].extraFields?.object_field).toEqual({
        key1: 'value1',
        key2: 42,
      })
    })
  })

  describe('renderCodexConfig - Extra Fields Output', () => {
    it('should output extra fields correctly', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: ['server.js'],
          extraFields: {
            startup_timeout_sec: 30,
            retries: 3,
            custom_setting: 'important',
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('[mcp_servers.test]')
      expect(rendered).toContain('command = "node"')
      expect(rendered).toContain('args = ["server.js"]')
      expect(rendered).toContain('startup_timeout_sec = 30')
      expect(rendered).toContain('retries = 3')
      expect(rendered).toContain('custom_setting = "important"')
    })

    it('should not output extraFields section when undefined', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('[mcp_servers.test]')
      expect(rendered).toContain('command = "node"')
      // Should not have any extra fields
      expect(rendered.split('\n').filter(line => line.includes('=')).length).toBe(2) // Only command and args
    })

    it('should format different value types correctly', () => {
      const config: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{
          id: 'test',
          command: 'node',
          args: [],
          extraFields: {
            string_val: 'test',
            number_val: 42,
            boolean_val: true,
            array_val: ['a', 'b'],
          },
        }],
        managed: true,
      }

      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('string_val = "test"')
      expect(rendered).toContain('number_val = 42')
      expect(rendered).toContain('boolean_val = true')
      expect(rendered).toContain('array_val = ["a", "b"]')
    })
  })

  describe('round-trip Consistency', () => {
    it('should maintain extra fields through parse → render → parse cycle', () => {
      const originalToml = `
[mcp_servers.test]
command = "node"
args = ["server.js"]
startup_timeout_ms = 5000
custom_field = "value"
numeric_field = 42
boolean_field = true
`

      const config = parseCodexConfig(originalToml)
      const rendered = renderCodexConfig(config)
      const reparsed = parseCodexConfig(rendered)

      expect(reparsed.mcpServices[0].extraFields).toEqual(
        config.mcpServices[0].extraFields,
      )
    })

    it('should preserve extra fields during config updates', () => {
      // Simulate initial configuration
      const initial = parseCodexConfig(`
[mcp_servers.serena]
command = "npx"
args = ["-y", "@serena/mcp-serena"]
startup_timeout_sec = 30
custom_setting = "important"
`)

      // Simulate adding new provider (not modifying MCP)
      const updated: CodexConfigData = {
        ...initial,
        providers: [
          {
            id: 'new-provider',
            name: 'New',
            baseUrl: 'https://api.example.com',
            wireApi: 'responses',
            envKey: 'NEW_KEY',
            requiresOpenaiAuth: true,
          },
        ],
      }

      // Render and reparse
      const rendered = renderCodexConfig(updated)
      const final = parseCodexConfig(rendered)

      // Verify extra fields not lost
      expect(final.mcpServices[0].extraFields?.startup_timeout_sec).toBe(30)
      expect(final.mcpServices[0].extraFields?.custom_setting).toBe('important')
    })

    it('should handle multiple round-trips without data loss', () => {
      const originalToml = `
[mcp_servers.test]
command = "node"
args = []
field1 = "value1"
field2 = 123
field3 = true
`

      let config = parseCodexConfig(originalToml)

      // Perform 3 round-trips
      for (let i = 0; i < 3; i++) {
        const rendered = renderCodexConfig(config)
        config = parseCodexConfig(rendered)
      }

      // Verify data integrity after multiple round-trips
      expect(config.mcpServices[0].extraFields?.field1).toBe('value1')
      expect(config.mcpServices[0].extraFields?.field2).toBe(123)
      expect(config.mcpServices[0].extraFields?.field3).toBe(true)
    })
  })

  describe('real-world Scenarios', () => {
    it('should preserve user-reported startup_timeout_sec field', () => {
      const toml = `
[mcp_servers.serena]
command = "npx"
args = ["-y", "@serena/mcp-serena"]
startup_timeout_sec = 30
`
      const config = parseCodexConfig(toml)
      const rendered = renderCodexConfig(config)

      expect(rendered).toContain('startup_timeout_sec = 30')

      // Verify it survives round-trip
      const reparsed = parseCodexConfig(rendered)
      expect(reparsed.mcpServices[0].extraFields?.startup_timeout_sec).toBe(30)
    })

    it('should handle mixed known and extra fields', () => {
      const toml = `
[mcp_servers.complex]
command = "node"
args = ["server.js"]
env = {PATH = "/usr/bin", HOME = "/home/user"}
startup_timeout_ms = 5000
startup_timeout_sec = 30
retries = 3
max_connections = 100
custom_config = "value"
`
      const config = parseCodexConfig(toml)

      // Known fields should be in their proper places
      expect(config.mcpServices[0].command).toBe('node')
      expect(config.mcpServices[0].args).toEqual(['server.js'])
      expect(config.mcpServices[0].env).toEqual({ PATH: '/usr/bin', HOME: '/home/user' })
      expect(config.mcpServices[0].startup_timeout_ms).toBe(5000)

      // Extra fields should be in extraFields
      expect(config.mcpServices[0].extraFields?.startup_timeout_sec).toBe(30)
      expect(config.mcpServices[0].extraFields?.retries).toBe(3)
      expect(config.mcpServices[0].extraFields?.max_connections).toBe(100)
      expect(config.mcpServices[0].extraFields?.custom_config).toBe('value')
    })
  })
})
