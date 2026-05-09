/**
 * Comprehensive test suite for export-import path-adapter module
 *
 * Tests cover:
 * - adaptConfigPaths() - Main path adaptation
 * - adaptMcpPaths() - MCP-specific path adaptation
 * - normalizeConfigPaths() - Path normalization
 * - replaceHomeWithTilde() - Home directory replacement
 * - expandEnvVars() - Environment variable expansion
 * - getPathAdaptationSummary() - Adaptation summary generation
 * - Helper functions: isAbsolutePath, isPathLike, adaptSinglePath, etc.
 */

import type { ExportMetadata, PlatformType } from '../../../../src/types/export-import'
import { homedir } from 'node:os'
import process from 'node:process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  adaptConfigPaths,
  adaptMcpPaths,
  expandEnvVars,
  getPathAdaptationSummary,
  normalizeConfigPaths,
  replaceHomeWithTilde,
} from '../../../../src/utils/export-import/path-adapter'

// Mock dependencies
vi.mock('../../../../src/utils/platform', () => ({
  isWindows: vi.fn(() => process.platform === 'win32'),
}))

// Store original platform
const originalPlatform = process.platform

// Mock getCurrentPlatform
let mockCurrentPlatform: PlatformType = process.platform as PlatformType

vi.mock('../../../../src/utils/export-import/core', () => ({
  getCurrentPlatform: vi.fn(() => mockCurrentPlatform),

  expandHomePath: vi.fn((path: string) => {
    if (path.startsWith('~')) {
      return path.replace('~', homedir())
    }
    if (path.includes('$HOME')) {
      return path.replace('$HOME', homedir())
    }
    if (path.includes('%USERPROFILE%')) {
      return path.replace('%USERPROFILE%', homedir())
    }
    return path
  }),

  normalizePath: vi.fn((path: string) => {
    return path.replace(/\\/g, '/')
  }),

  windowsToUnixPath: vi.fn((path: string) => {
    // Simplified conversion for testing
    let converted = path.replace(/\\/g, '/')
    // Remove drive letter if present
    converted = converted.replace(/^[A-Z]:/i, '')
    return converted
  }),

  unixToWindowsPath: vi.fn((path: string) => {
    // Simplified conversion for testing
    let converted = path.replace(/\//g, '\\')
    // Add C: drive if it's an absolute path without drive
    if (converted.startsWith('\\') && !converted.match(/^[A-Z]:/i)) {
      converted = `C:${converted}`
    }
    return converted
  }),

  adaptPlatformPaths: vi.fn((config: any, source: PlatformType, target: PlatformType) => {
    // Simplified adaptation for testing
    const adapted = JSON.parse(JSON.stringify(config))
    const mappings: any[] = []

    function adaptRecursive(obj: any) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && (value.includes('/') || value.includes('\\'))) {
          const original = value
          let newValue = value

          if (source === 'win32' && target !== 'win32') {
            newValue = value.replace(/\\/g, '/').replace(/^[A-Z]:/i, '')
          }
          else if (source !== 'win32' && target === 'win32') {
            newValue = value.replace(/\//g, '\\')
            if (newValue.startsWith('\\') && !newValue.match(/^[A-Z]:/i)) {
              newValue = `C:${newValue}`
            }
          }

          if (newValue !== original) {
            obj[key] = newValue
            mappings.push({
              original,
              adapted: newValue,
              type: 'absolute',
              success: true,
            })
          }
        }
        else if (typeof value === 'object' && value !== null) {
          adaptRecursive(value)
        }
      }
    }

    adaptRecursive(adapted)
    return { config: adapted, mappings }
  }),
}))

describe('export-import/path-adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentPlatform = originalPlatform as PlatformType
  })

  describe('adaptConfigPaths', () => {
    describe('same platform - no adaptation needed', () => {
      it('should return unchanged config when platforms match', () => {
        const config = { path: '/home/user/config' }
        const sourcePlatform: PlatformType = mockCurrentPlatform

        const result = adaptConfigPaths(config, sourcePlatform)

        expect(result.adaptedConfig).toEqual(config)
        expect(result.mappings).toHaveLength(0)
        expect(result.warnings).toHaveLength(0)
      })

      it('should deep clone the config', () => {
        const config = { nested: { path: '/some/path' } }
        const sourcePlatform: PlatformType = mockCurrentPlatform

        const result = adaptConfigPaths(config, sourcePlatform)

        expect(result.adaptedConfig).toEqual(config)
        expect(result.adaptedConfig).not.toBe(config) // Different object
      })
    })

    describe('cross-platform adaptation', () => {
      it('should adapt paths from Windows to Unix', () => {
        const config = { path: 'C:\\Users\\test\\config' }
        const sourcePlatform: PlatformType = 'win32'
        mockCurrentPlatform = 'linux'

        const result = adaptConfigPaths(config, sourcePlatform)

        expect(result.adaptedConfig.path).not.toContain('\\')
        expect(result.mappings.length).toBeGreaterThan(0)
      })

      it('should adapt paths from Unix to Windows', () => {
        const config = { path: '/home/user/config' }
        const sourcePlatform: PlatformType = 'linux'
        mockCurrentPlatform = 'win32'

        const result = adaptConfigPaths(config, sourcePlatform)

        expect(result.adaptedConfig.path).toContain('\\')
        expect(result.mappings.length).toBeGreaterThan(0)
      })

      it('should collect warnings from mappings', async () => {
        const config = { path: 'C:\\Complex\\Path' }
        const sourcePlatform: PlatformType = 'win32'
        mockCurrentPlatform = 'linux'

        // Dynamically import and mock for this test
        const core = await import('../../../../src/utils/export-import/core')
        vi.mocked(core.adaptPlatformPaths).mockReturnValueOnce({
          config: { path: '/Complex/Path' },
          mappings: [{
            original: 'C:\\Complex\\Path',
            adapted: '/Complex/Path',
            type: 'absolute',
            success: true,
            warning: 'Manual verification needed',
          }],
        })

        const result = adaptConfigPaths(config, sourcePlatform)

        expect(result.warnings.length).toBeGreaterThan(0)
      })

      it('should warn about mixed type paths', async () => {
        const config = { path: 'C:\\some\\path' }
        const sourcePlatform: PlatformType = 'win32'
        mockCurrentPlatform = 'linux'

        const core = await import('../../../../src/utils/export-import/core')
        vi.mocked(core.adaptPlatformPaths).mockReturnValueOnce({
          config: { path: '/some/path' },
          mappings: [{
            original: 'C:\\some\\path',
            adapted: '/some/path',
            type: 'mixed',
            success: true,
          }],
        })

        const result = adaptConfigPaths(config, sourcePlatform)

        expect(result.warnings.some(w => w.includes('Complex path'))).toBe(true)
      })
    })
  })

  describe('adaptMcpPaths', () => {
    describe('null/invalid input handling', () => {
      it('should handle null config', () => {
        const result = adaptMcpPaths(null, 'win32')

        expect(result.adapted).toBeNull()
        expect(result.warnings).toHaveLength(0)
      })

      it('should handle non-object config', () => {
        const result = adaptMcpPaths('string', 'win32')

        expect(result.adapted).toBe('string')
        expect(result.warnings).toHaveLength(0)
      })

      it('should handle config without mcpServers', () => {
        const config = { other: 'value' }
        const result = adaptMcpPaths(config, 'win32')

        expect(result.adapted).toEqual(config)
        expect(result.warnings).toHaveLength(0)
      })
    })

    describe('mcp command adaptation', () => {
      it('should not adapt common commands', () => {
        const config = {
          mcpServers: {
            test: { command: 'npx' },
            test2: { command: 'node' },
            test3: { command: 'python' },
          },
        }

        mockCurrentPlatform = 'linux'
        const result = adaptMcpPaths(config, 'win32')

        expect(result.adapted.mcpServers.test.command).toBe('npx')
        expect(result.adapted.mcpServers.test2.command).toBe('node')
        expect(result.adapted.mcpServers.test3.command).toBe('python')
      })

      it('should adapt absolute path commands', () => {
        const config = {
          mcpServers: {
            test: { command: '/usr/bin/python3' },
          },
        }

        mockCurrentPlatform = 'win32'
        const result = adaptMcpPaths(config, 'linux')

        expect(result.adapted.mcpServers.test.command).toContain('\\')
        expect(result.warnings.some(w => w.includes('Command path adapted'))).toBe(true)
      })

      it('should adapt relative path commands', () => {
        const config = {
          mcpServers: {
            test: { command: './scripts/start.sh' },
          },
        }

        mockCurrentPlatform = 'win32'
        const result = adaptMcpPaths(config, 'linux')

        expect(result.adapted.mcpServers.test.command).toContain('\\')
        expect(result.warnings.some(w => w.includes('Relative command path'))).toBe(true)
      })
    })

    describe('mcp args adaptation', () => {
      it('should adapt path-like args', () => {
        const config = {
          mcpServers: {
            test: {
              command: 'node',
              args: ['/path/to/script.js', '--config', '/path/to/config'],
            },
          },
        }

        mockCurrentPlatform = 'win32'
        const result = adaptMcpPaths(config, 'linux')

        expect(result.adapted.mcpServers.test.args[0]).toContain('\\')
        expect(result.adapted.mcpServers.test.args[2]).toContain('\\')
      })

      it('should not adapt non-path args', () => {
        const config = {
          mcpServers: {
            test: {
              command: 'node',
              args: ['--verbose', '--debug', 'value'],
            },
          },
        }

        const result = adaptMcpPaths(config, 'linux')

        expect(result.adapted.mcpServers.test.args).toEqual(['--verbose', '--debug', 'value'])
      })
    })

    describe('mcp env adaptation', () => {
      it('should adapt path-like environment variables', () => {
        const config = {
          mcpServers: {
            test: {
              command: 'node',
              env: {
                PATH: '/usr/bin:/usr/local/bin',
                CONFIG_PATH: '/etc/config',
                OTHER: 'value',
              },
            },
          },
        }

        mockCurrentPlatform = 'win32'
        const result = adaptMcpPaths(config, 'linux')

        expect(result.adapted.mcpServers.test.env.PATH).toContain('\\')
        expect(result.adapted.mcpServers.test.env.CONFIG_PATH).toContain('\\')
        expect(result.adapted.mcpServers.test.env.OTHER).toBe('value')
      })
    })
  })

  describe('normalizeConfigPaths', () => {
    it('should handle null/undefined config', () => {
      expect(normalizeConfigPaths(null)).toBeNull()
      expect(normalizeConfigPaths(undefined)).toBeUndefined()
    })

    it('should normalize Windows paths to forward slashes', () => {
      const config = {
        path1: 'C:\\Users\\test\\config',
        path2: 'D:\\Projects\\app',
      }

      const result = normalizeConfigPaths(config)

      expect(result.path1).toBe('C:/Users/test/config')
      expect(result.path2).toBe('D:/Projects/app')
    })

    it('should recursively normalize nested paths', () => {
      const config = {
        level1: {
          path: 'C:\\Users\\test',
          level2: {
            path: 'D:\\Data\\files',
          },
        },
      }

      const result = normalizeConfigPaths(config)

      expect(result.level1.path).toBe('C:/Users/test')
      expect(result.level1.level2.path).toBe('D:/Data/files')
    })

    it('should preserve non-path strings', () => {
      const config = {
        name: 'test',
        value: 123,
        flag: true,
      }

      const result = normalizeConfigPaths(config)

      expect(result).toEqual(config)
    })
  })

  describe('replaceHomeWithTilde', () => {
    it('should handle null/undefined config', () => {
      expect(replaceHomeWithTilde(null)).toBeNull()
      expect(replaceHomeWithTilde(undefined)).toBeUndefined()
    })

    it('should replace home directory with tilde', () => {
      const home = homedir()
      const config = {
        path: `${home}/config`,
        nested: {
          path: `${home}/data`,
        },
      }

      const result = replaceHomeWithTilde(config)

      expect(result.path).toBe('~/config')
      expect(result.nested.path).toBe('~/data')
    })

    it('should handle normalized home paths', () => {
      const home = homedir()
      const normalizedHome = home.replace(/\\/g, '/')
      const config = {
        path: `${normalizedHome}/config`,
      }

      const result = replaceHomeWithTilde(config)

      expect(result.path).toBe('~/config')
    })

    it('should preserve paths not containing home directory', () => {
      const config = {
        path: '/usr/local/bin',
        other: '/etc/config',
      }

      const result = replaceHomeWithTilde(config)

      expect(result.path).toBe('/usr/local/bin')
      expect(result.other).toBe('/etc/config')
    })
  })

  describe('expandEnvVars', () => {
    it('should expand $HOME', () => {
      const result = expandEnvVars('$HOME/config')

      expect(result).toBe(`${homedir()}/config`)
    })

    it('should expand %USERPROFILE%', () => {
      const result = expandEnvVars('%USERPROFILE%/config')

      expect(result).toBe(`${homedir()}/config`)
    })

    it('should expand %APPDATA% on Windows', () => {
      if (process.platform === 'win32' && process.env.APPDATA) {
        const result = expandEnvVars('%APPDATA%/config')

        expect(result).toBe(`${process.env.APPDATA}/config`)
      }
      else {
        expect(true).toBe(true) // Skip on non-Windows
      }
    })

    it('should expand %LOCALAPPDATA% on Windows', () => {
      if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
        const result = expandEnvVars('%LOCALAPPDATA%/config')

        expect(result).toBe(`${process.env.LOCALAPPDATA}/config`)
      }
      else {
        expect(true).toBe(true) // Skip on non-Windows
      }
    })

    it('should expand Unix environment variables', () => {
      if (process.platform !== 'win32') {
        const testVar = 'TEST_VALUE'
        process.env.TEST_VAR = testVar

        const result = expandEnvVars('/path/$TEST_VAR/config')

        expect(result).toBe(`/path/${testVar}/config`)

        delete process.env.TEST_VAR
      }
      else {
        expect(true).toBe(true) // Skip on Windows
      }
    })

    it('should preserve unrecognized variables', () => {
      const result = expandEnvVars('/path/$NONEXISTENT/config')

      expect(result).toContain('$NONEXISTENT')
    })
  })

  describe('getPathAdaptationSummary', () => {
    const createMetadata = (platform: PlatformType): ExportMetadata => ({
      version: '3.5.0',
      exportDate: '2025-01-03',
      platform,
      codeType: 'claude-code',
      scope: ['all'],
      hasSensitiveData: false,
      files: [],
    })

    describe('same platform', () => {
      it('should indicate no adaptation needed', () => {
        const metadata = createMetadata(mockCurrentPlatform)
        const config = {}

        const result = getPathAdaptationSummary(metadata, config)

        expect(result.needsAdaptation).toBe(false)
        expect(result.estimatedChanges).toBe(0)
        expect(result.criticalPaths).toHaveLength(0)
      })
    })

    describe('cross-platform', () => {
      it('should indicate adaptation needed', () => {
        const metadata = createMetadata('win32')
        mockCurrentPlatform = 'linux'
        const config = {
          path: 'C:\\Users\\test',
        }

        const result = getPathAdaptationSummary(metadata, config)

        expect(result.needsAdaptation).toBe(true)
        expect(result.sourcePlatform).toBe('win32')
        expect(result.targetPlatform).toBe('linux')
      })

      it('should estimate number of path changes', () => {
        const metadata = createMetadata('win32')
        mockCurrentPlatform = 'linux'
        const config = {
          path1: 'C:\\Users\\test',
          path2: 'D:\\Data',
          nested: {
            path3: 'E:\\More',
          },
        }

        const result = getPathAdaptationSummary(metadata, config)

        expect(result.estimatedChanges).toBeGreaterThan(0)
      })

      it('should identify critical command paths', () => {
        const metadata = createMetadata('linux')
        mockCurrentPlatform = 'win32'
        const config = {
          mcpServers: {
            test: {
              command: '/usr/bin/python3',
              executable: '/bin/node',
            },
          },
        }

        const result = getPathAdaptationSummary(metadata, config)

        expect(result.criticalPaths.length).toBeGreaterThan(0)
        expect(result.criticalPaths.some(p => p.includes('command'))).toBe(true)
      })

      it('should identify critical executable paths', () => {
        const metadata = createMetadata('win32')
        mockCurrentPlatform = 'linux'
        const config = {
          settings: {
            binary: 'C:\\Program Files\\app.exe',
          },
        }

        const result = getPathAdaptationSummary(metadata, config)

        expect(result.criticalPaths.some(p => p.includes('binary'))).toBe(true)
      })

      it('should identify absolute paths as critical', () => {
        const metadata = createMetadata('linux')
        mockCurrentPlatform = 'win32'
        const config = {
          config: {
            dataPath: '/var/data',
          },
        }

        const result = getPathAdaptationSummary(metadata, config)

        expect(result.criticalPaths.some(p => p.includes('dataPath'))).toBe(true)
      })
    })
  })

  describe('edge cases', () => {
    it('should handle empty config objects', () => {
      const result1 = adaptConfigPaths({}, 'win32')
      const result2 = normalizeConfigPaths({})
      const result3 = replaceHomeWithTilde({})

      expect(result1.adaptedConfig).toEqual({})
      expect(result2).toEqual({})
      expect(result3).toEqual({})
    })

    it('should handle arrays in config', () => {
      const config = {
        paths: ['C:\\path1', 'D:\\path2'],
      }

      const result = normalizeConfigPaths(config)

      // Should normalize paths in arrays
      expect(result.paths[0]).toBe('C:/path1')
      expect(result.paths[1]).toBe('D:/path2')
    })

    it('should handle deeply nested structures', () => {
      const config = {
        level1: {
          level2: {
            level3: {
              path: 'C:\\deep\\path',
            },
          },
        },
      }

      const result = normalizeConfigPaths(config)

      expect(result.level1.level2.level3.path).toBe('C:/deep/path')
    })

    it('should preserve config structure', () => {
      const config = {
        string: 'value',
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        object: { key: 'value' },
      }

      const result = adaptConfigPaths(config, mockCurrentPlatform)

      expect(result.adaptedConfig).toEqual(config)
    })
  })
})
