// Usage: Load a template fixture for legacy resource recognition tests.
import { readFile } from 'node:fs/promises'
// Usage: Define and run integration-style uninstall lifecycle and assertion helpers.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
  lstatSync: vi.fn(() => ({ isSymbolicLink: () => false })),
  readdirSync: vi.fn(() => ['SKILL.md']),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
}))

vi.mock('tinyexec', () => ({
  exec: vi.fn(),
}))

vi.mock('pathe', () => ({
  join: (...parts: string[]) => parts.join('/'),
}))

vi.mock('node:os', () => ({
  homedir: () => '/home/user',
}))

vi.mock('../../src/config/workflows', () => ({
  getAllWorkflowSkillNames: () => ['init-project', 'workflow'],
}))

vi.mock('../../src/constants', () => ({
  LEGACY_ZCF_CONFIG_FILES: ['/home/user/.claude/.zcf-config.json'],
  SETTINGS_FILE: '/home/user/.claude/settings.json',
  ZCF_CONFIG_FILE: '/home/user/.ufomiao/zcf/config.toml',
  CODEX_AGENTS_FILE: '/home/user/.codex/AGENTS.md',
  CODEX_AUTH_FILE: '/home/user/.codex/auth.json',
  CODEX_CONFIG_FILE: '/home/user/.codex/config.toml',
  CODEX_DIR: '/home/user/.codex',
  CODEX_PROMPTS_DIR: '/home/user/.codex/prompts',
}))

vi.mock('../../src/i18n', () => ({
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

vi.mock('../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
}))

vi.mock('../../src/utils/trash', () => ({
  moveToTrash: vi.fn().mockResolvedValue([{ success: true }]),
}))

const { pathExists } = await import('fs-extra')
const { lstatSync, readdirSync, readFileSync, writeFileSync } = await import('node:fs')
const { readJsonConfig, writeJsonConfig } = await import('../../src/utils/json-config')
const { moveToTrash } = await import('../../src/utils/trash')
const {
  hashConfigValue,
  markZcfLanguageDirective,
  markZcfResourceContent,
  markZcfSystemPrompt,
} = await import('../../src/utils/config-ownership')
const { ZcfUninstaller } = await import('../../src/utils/uninstaller')
const { CodexUninstaller } = await import('../../src/utils/code-tools/codex-uninstaller')
const legacyOutputStyleContent = await readFile(
  new URL('../../templates/common/output-styles/en/engineer-professional.md', import.meta.url),
  'utf8',
)

const mockPathExists = vi.mocked(pathExists)
const mockLstatSync = vi.mocked(lstatSync)
const mockReadFileSync = vi.mocked(readFileSync)
const mockWriteFileSync = vi.mocked(writeFileSync)
const mockReaddirSync = vi.mocked(readdirSync)
const mockReadJsonConfig = vi.mocked(readJsonConfig)
const mockWriteJsonConfig = vi.mocked(writeJsonConfig)
const mockMoveToTrash = vi.mocked(moveToTrash)

function setPathExistsResult(value: boolean): void {
  mockPathExists.mockImplementation(async (_filePath: string) => value)
}

function setDirectoryEntries(entries: string[]): void {
  mockReaddirSync.mockImplementation(() => entries as unknown as ReturnType<typeof readdirSync>)
}

function setClaudeSkillLink(value: boolean): void {
  mockLstatSync.mockImplementation(() => ({
    isSymbolicLink: () => value,
  }) as unknown as ReturnType<typeof lstatSync>)
}

function zcfProviderOwnership(providerId: string, body: string, credential?: string): string {
  const credentialMarker = credential === undefined ? '' : ` ${hashConfigValue(credential)}`
  return [
    `# ZCF managed provider: ${providerId}${credentialMarker}`,
    `# ZCF managed provider snapshot: ${providerId} ${hashConfigValue(body)}`,
    body,
  ].join('\n')
}

function zcfTopLevelOwnership(field: string, value: string): string {
  return `# ZCF managed top-level: ${field} ${hashConfigValue(value)}`
}

function isCodexConfigOrAuthPath(filePath: string): boolean {
  return filePath.endsWith('/config.toml') || filePath.endsWith('/auth.json')
}

function isCodexPromptPath(filePath: string): boolean {
  return filePath.endsWith('/prompts') || filePath.includes('/prompts/')
}

function isGlobalInitProjectPath(filePath: string): boolean {
  return filePath.endsWith('/init-project') || filePath.endsWith('/init-project/SKILL.md')
}

describe('zcf-only uninstall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setPathExistsResult(false)
    mockMoveToTrash.mockResolvedValue([{ success: true, path: 'test' }])
    setDirectoryEntries(['SKILL.md'])
    setClaudeSkillLink(false)
  })

  describe('claude code', () => {
    it('removes ZCF-managed settings while preserving user settings', async () => {
      setPathExistsResult(true)
      mockReadJsonConfig.mockImplementation((filePath: string) => {
        if (filePath.endsWith('/config.json')) {
          return {
            primaryApiKey: 'zcf',
            zcfManagedEnvHashes: {
              ANTHROPIC_API_KEY: hashConfigValue('zcf-key'),
              ANTHROPIC_BASE_URL: hashConfigValue('https://example.com'),
            },
            zcfManagedSettingsFields: ['permissions'],
            zcfManagedPermissionEntries: ['Bash'],
          }
        }
        return {
          env: {
            ANTHROPIC_API_KEY: 'zcf-key',
            ANTHROPIC_BASE_URL: 'https://example.com',
            USER_ENV: 'keep',
          },
          outputStyle: 'engineer-professional',
          permissions: { allow: ['Bash', 'UserTool'] },
          customSetting: true,
        }
      })
      mockReadFileSync.mockReturnValue(markZcfResourceContent(`---
name: engineer-professional
description: ZCF style
---

# Engineer Professional Output Style

## Style Overview

ZCF style content.
`))

      const result = await new ZcfUninstaller().removeZcfSettings()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.claude/settings.json', {
        env: {
          USER_ENV: 'keep',
        },
        permissions: { allow: ['UserTool'] },
        customSetting: true,
      })
      expect(result.removedConfigs).toEqual(expect.arrayContaining([
        'uninstall:zcfSettingsEnvRemoved',
        'uninstall:zcfOutputStyleRemoved',
        'uninstall:zcfPermissionsRemoved',
      ]))
    })

    it('removes known ZCF MCP servers but preserves custom servers', async () => {
      setPathExistsResult(true)
      mockReadJsonConfig.mockReturnValue({
        mcpServers: {
          context7: {
            command: 'npx',
            args: ['-y', '@upstash/context7-mcp@latest'],
            env: {},
          },
          personal: { command: 'custom' },
        },
        hasCompletedOnboarding: true,
        customApiKeyResponses: { approved: ['keep-me'], rejected: [] },
        zcfManagedMcpServers: { context7: 'managed' },
      })

      const result = await new ZcfUninstaller().removeZcfClaudeConfig()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.claude.json', {
        mcpServers: { personal: { command: 'custom' } },
        hasCompletedOnboarding: true,
        customApiKeyResponses: { approved: ['keep-me'], rejected: [] },
      })
      expect(result.removedConfigs).toEqual(expect.arrayContaining([
        'uninstall:zcfMcpServerRemoved',
      ]))
    })

    it('preserves a ZCF MCP server after user adds custom fields', async () => {
      setPathExistsResult(true)
      mockReadJsonConfig.mockReturnValue({
        mcpServers: {
          context7: {
            command: 'npx',
            args: ['-y', '@upstash/context7-mcp@latest'],
            env: {},
            customField: 'keep',
          },
        },
      })

      const result = await new ZcfUninstaller().removeZcfClaudeConfig()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()
    })

    it('preserves a same-name custom MCP server and built-in output styles', async () => {
      setPathExistsResult(true)
      mockReadJsonConfig.mockReturnValue({
        env: { DISABLE_TELEMETRY: 'user-value', USER_ENV: 'keep' },
        mcpServers: {
          context7: { command: 'node', args: ['custom-context7.js'] },
        },
        outputStyle: 'learning',
      })

      const settingsResult = await new ZcfUninstaller().removeZcfSettings()
      const mcpResult = await new ZcfUninstaller().removeZcfClaudeConfig()

      expect(settingsResult.success).toBe(true)
      expect(mcpResult.success).toBe(true)
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()
    })

    it('preserves an unmarked Exa MCP server even when its shape matches ZCF', async () => {
      setPathExistsResult(true)
      mockReadJsonConfig.mockReturnValue({
        mcpServers: {
          exa: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', 'exa-mcp-server@latest'],
            env: { EXA_API_KEY: 'user-owned-key' },
          },
        },
      })

      const result = await new ZcfUninstaller().removeZcfClaudeConfig()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()
    })

    it('preserves an unmarked Claude MCP server with a canonical shape', async () => {
      setPathExistsResult(true)
      mockReadJsonConfig.mockReturnValue({
        mcpServers: {
          context7: {
            command: 'npx',
            args: ['-y', '@upstash/context7-mcp@latest'],
            env: {},
          },
          personal: { command: 'custom' },
        },
      })

      const result = await new ZcfUninstaller().removeZcfClaudeConfig()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()
    })

    it('removes an Exa MCP server only with its ownership fingerprint', async () => {
      setPathExistsResult(true)
      mockReadJsonConfig.mockReturnValue({
        mcpServers: {
          exa: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', 'exa-mcp-server@latest'],
            env: { EXA_API_KEY: 'zcf-owned-key' },
          },
        },
        zcfManagedMcpServers: { exa: hashConfigValue('zcf-owned-key') },
      })

      const result = await new ZcfUninstaller().removeZcfClaudeConfig()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.claude.json', {})
    })

    it('removes ZCF template fields after official login preserves their ownership marker', async () => {
      setPathExistsResult(true)
      mockReadJsonConfig.mockImplementation((filePath: string) => {
        if (filePath.endsWith('/config.json'))
          return { zcfManagedSettingsFields: ['includeCoAuthoredBy', 'hooks'] }
        return { includeCoAuthoredBy: false, hooks: {}, customSetting: 'keep' }
      })

      const result = await new ZcfUninstaller().removeZcfSettings()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.claude/settings.json', {
        customSetting: 'keep',
      })
    })

    it('preserves includeCoAuthoredBy and hooks after the user edits the marked values', async () => {
      setPathExistsResult(true)
      mockReadJsonConfig.mockImplementation((filePath: string) => {
        if (filePath.endsWith('/config.json')) {
          return {
            zcfManagedSettingsFields: ['includeCoAuthoredBy', 'hooks'],
            zcfManagedSettingsHashes: {
              includeCoAuthoredBy: hashConfigValue(JSON.stringify(false)),
              hooks: hashConfigValue(JSON.stringify({})),
            },
          }
        }
        return {
          includeCoAuthoredBy: true,
          hooks: { Stop: [] },
          customSetting: 'keep',
        }
      })

      const result = await new ZcfUninstaller().removeZcfSettings()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()
    })

    it('removes the symlink before its canonical global skill directory', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => {
        return filePath.endsWith('/init-project') || filePath.endsWith('/init-project/SKILL.md')
      })
      mockReadFileSync.mockReturnValue(markZcfResourceContent(`---
name: init-project
description: ZCF skill
disable-model-invocation: true
---
`))

      const result = await new ZcfUninstaller().removeZcfGlobalSkills()

      expect(result.success).toBe(true)
      expect(mockMoveToTrash.mock.calls.slice(0, 2)).toEqual([
        ['/home/user/.claude/skills/init-project'],
      ])
    })

    it('preserves API environment values changed after ZCF setup', async () => {
      setPathExistsResult(true)
      mockReadJsonConfig.mockImplementation((filePath: string) => {
        if (filePath.endsWith('/config.json')) {
          return {
            primaryApiKey: 'zcf',
            zcfManagedEnvHashes: {
              ANTHROPIC_API_KEY: hashConfigValue('original-key'),
              ANTHROPIC_BASE_URL: hashConfigValue('https://original.example.com'),
            },
          }
        }
        return {
          env: {
            ANTHROPIC_API_KEY: 'user-key',
            ANTHROPIC_BASE_URL: 'https://user.example.com',
          },
        }
      })

      const result = await new ZcfUninstaller().removeZcfSettings()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()
    })

    it('removes API environment values from the legacy primary API marker', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => {
        return filePath === '/home/user/.claude/settings.json' || filePath === '/home/user/.claude/config.json'
      })
      mockReadJsonConfig.mockImplementation((filePath: string) => {
        if (filePath.endsWith('/config.json'))
          return { primaryApiKey: 'zcf' }
        return { env: { ANTHROPIC_API_KEY: 'legacy-key', USER_ENV: 'keep' } }
      })
      mockReadFileSync.mockImplementation((filePath: Parameters<typeof readFileSync>[0]) => {
        if (String(filePath).endsWith('/config.toml')) {
          return '[claudeCode.profiles.legacy]\nauthType = "api_key"\napiKey = "legacy-key"\n'
        }
        return ''
      })

      const result = await new ZcfUninstaller().removeZcfSettings()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.claude/settings.json', {
        env: { USER_ENV: 'keep' },
      })
    })

    it('preserves API environment values changed after a legacy setup', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => {
        return filePath === '/home/user/.claude/settings.json' || filePath === '/home/user/.claude/config.json'
      })
      mockReadJsonConfig.mockImplementation((filePath: string) => {
        if (filePath.endsWith('/config.json'))
          return { primaryApiKey: 'zcf' }
        return { env: { ANTHROPIC_API_KEY: 'user-key' } }
      })
      mockReadFileSync.mockImplementation((filePath: Parameters<typeof readFileSync>[0]) => {
        if (String(filePath).endsWith('/config.toml')) {
          return '[claudeCode.profiles.legacy]\nauthType = "api_key"\napiKey = "legacy-key"\n'
        }
        return ''
      })

      const result = await new ZcfUninstaller().removeZcfSettings()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()
    })

    it('removes legacy API values from any matching profile without removing newer values', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => (
        filePath === '/home/user/.claude/settings.json' || filePath === '/home/user/.claude/config.json'
      ))
      mockReadJsonConfig.mockImplementation((filePath: string) => {
        if (filePath.endsWith('/config.json'))
          return { primaryApiKey: 'zcf' }
        return { env: { ANTHROPIC_API_KEY: 'second-profile-key', USER_ENV: 'keep' } }
      })
      mockReadFileSync.mockImplementation((filePath: Parameters<typeof readFileSync>[0]) => {
        if (String(filePath).endsWith('/config.toml')) {
          return [
            '[claudeCode.profiles.first]',
            'authType = "api_key"',
            'apiKey = "first-profile-key"',
            '',
            '[claudeCode.profiles.second]',
            'authType = "api_key"',
            'apiKey = "second-profile-key"',
            '',
          ].join('\n')
        }
        return ''
      })

      const result = await new ZcfUninstaller().removeZcfSettings()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.claude/settings.json', {
        env: { USER_ENV: 'keep' },
      })
    })

    it('strips the ZCF language directive while preserving appended user content', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => filePath === '/home/user/.claude/CLAUDE.md')
      mockReadFileSync.mockReturnValue([
        markZcfLanguageDirective('Always respond in English'),
        '# User instructions',
        'Keep this content.',
        '',
      ].join('\n'))

      const result = await new ZcfUninstaller().removeZcfClaudeMd()

      expect(result.success).toBe(true)
      expect(mockMoveToTrash).not.toHaveBeenCalled()
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.claude/CLAUDE.md',
        '# User instructions\nKeep this content.\n',
      )
      expect(result.removedConfigs).toContain('uninstall:zcfLanguageDirectiveRemoved')
    })

    it('removes the legacy markerless Claude language directive', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => filePath === '/home/user/.claude/CLAUDE.md')
      mockReadFileSync.mockReturnValue('Always respond in English\n')

      const result = await new ZcfUninstaller().removeZcfClaudeMd()

      expect(result.success).toBe(true)
      expect(mockMoveToTrash).not.toHaveBeenCalled()
      expect(mockWriteFileSync).toHaveBeenCalledWith('/home/user/.claude/CLAUDE.md', '')
    })

    it('recognizes ZCF output styles with CRLF line endings', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => (
        filePath === '/home/user/.claude/output-styles/engineer-professional.md'
      ))
      const styleContent = `---\r
name: engineer-professional\r
description: ZCF style\r
---\r
\r
# Engineer Professional Output Style\r
\r
## Core Identity Setting\r
\r
ZCF style content.\r
`
      mockReadFileSync.mockReturnValue(markZcfResourceContent(styleContent).replace(/\n/g, '\r\n'))

      const result = await new ZcfUninstaller().removeZcfOutputStyles()

      expect(result.success).toBe(true)
      expect(mockMoveToTrash).toHaveBeenCalledWith('/home/user/.claude/output-styles/engineer-professional.md')
    })

    it('removes a markerless legacy output style', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => (
        filePath === '/home/user/.claude/output-styles/engineer-professional.md'
      ))
      mockReadFileSync.mockReturnValue(legacyOutputStyleContent)

      const result = await new ZcfUninstaller().removeZcfOutputStyles()

      expect(result.success).toBe(true)
      expect(mockMoveToTrash).toHaveBeenCalledWith('/home/user/.claude/output-styles/engineer-professional.md')
    })

    it('handles ZCF preference cleanup when the file is absent or trashing fails', async () => {
      const uninstaller = new ZcfUninstaller()

      setPathExistsResult(false)
      const missingResult = await uninstaller.removeZcfConfig()
      expect(missingResult.success).toBe(true)
      expect(missingResult.warnings).toContain('uninstall:zcfConfigNotFound')

      setPathExistsResult(true)
      mockReadFileSync.mockReturnValue('[claudeCode]\nenabled = true\n')
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('config write failed')
      })
      const failedResult = await uninstaller.removeZcfConfig()
      expect(failedResult.success).toBe(false)
      expect(failedResult.errors).toContain('uninstall:zcfConfigRemovalFailed')
      mockWriteFileSync.mockImplementation(() => {})
    })

    it('removes only the Claude section from the shared ZCF TOML file', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue([
        '[general]',
        'preferredLang = "en"',
        '',
        '[claudeCode]',
        'enabled = true',
        '',
        '[codex]',
        'enabled = true',
        '',
      ].join('\n'))

      const result = await new ZcfUninstaller().removeZcfConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.ufomiao/zcf/config.toml',
        expect.stringContaining('[general]\npreferredLang = "en"'),
      )
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.ufomiao/zcf/config.toml',
        expect.not.stringContaining('[claudeCode]'),
      )
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.ufomiao/zcf/config.toml',
        expect.stringContaining('[codex]\nenabled = true'),
      )
    })

    it('reports preference cleanup read errors', async () => {
      mockPathExists.mockRejectedValue(new Error('config access failed'))

      const result = await new ZcfUninstaller().removeZcfConfig()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('uninstall:zcfConfigRemovalFailed')
    })

    it('preserves template-looking environment values without ownership metadata', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => filePath === '/home/user/.claude/settings.json')
      mockReadJsonConfig.mockReturnValue({
        env: {
          DISABLE_TELEMETRY: '1',
          DISABLE_ERROR_REPORTING: '1',
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
          MCP_TIMEOUT: '60000',
        },
      })

      const result = await new ZcfUninstaller().removeZcfSettings()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()
    })

    it('removes template environment values with ownership fingerprints', async () => {
      const templateEnv = {
        DISABLE_TELEMETRY: '1',
        DISABLE_ERROR_REPORTING: '1',
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
        MCP_TIMEOUT: '60000',
      }
      mockPathExists.mockImplementation(async (filePath: string) => (
        filePath === '/home/user/.claude/settings.json' || filePath === '/home/user/.claude/config.json'
      ))
      mockReadJsonConfig.mockImplementation((filePath: string) => {
        if (filePath.endsWith('/config.json')) {
          return {
            zcfManagedSettingsFields: Object.keys(templateEnv).map(key => `env.${key}`),
            zcfManagedSettingsHashes: Object.fromEntries(
              Object.entries(templateEnv).map(([key, value]) => [`env.${key}`, hashConfigValue(value)]),
            ),
          }
        }
        return { env: templateEnv }
      })

      const result = await new ZcfUninstaller().removeZcfSettings()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.claude/settings.json', {})
    })

    it('preserves template-looking environment values when the complete block is absent', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => filePath === '/home/user/.claude/settings.json')
      mockReadJsonConfig.mockReturnValue({
        env: {
          DISABLE_TELEMETRY: '1',
          DISABLE_ERROR_REPORTING: '1',
          USER_ENV: 'keep',
        },
      })

      const result = await new ZcfUninstaller().removeZcfSettings()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()
    })

    it('removes marked status, permissions, and empty metadata fields', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => {
        return filePath === '/home/user/.claude/settings.json' || filePath === '/home/user/.claude/config.json'
      })
      mockReadJsonConfig.mockImplementation((filePath: string) => {
        if (filePath.endsWith('/config.json')) {
          return {
            primaryApiKey: 'zcf',
            zcfManagedSettingsFields: ['statusLine', 'permissions', 'includeCoAuthoredBy', 'hooks'],
            zcfManagedPermissionEntries: ['Bash'],
          }
        }
        return {
          env: { DISABLE_TELEMETRY: '1' },
          statusLine: { command: '~/.claude/ccline/ccline' },
          permissions: { allow: ['Bash'] },
          includeCoAuthoredBy: false,
          hooks: {},
        }
      })

      const result = await new ZcfUninstaller().removeZcfSettings()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.claude/settings.json', {
        env: { DISABLE_TELEMETRY: '1' },
      })
      expect(result.removedConfigs).toEqual(expect.arrayContaining([
        'uninstall:zcfStatusLineRemoved',
        'uninstall:zcfPermissionsRemoved',
        'uninstall:zcfIncludeCoAuthoredByRemoved',
        'uninstall:zcfHooksRemoved',
      ]))
    })

    it('preserves a built-in output style even when stale ownership metadata exists', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => (
        filePath === '/home/user/.claude/settings.json' || filePath === '/home/user/.claude/config.json'
      ))
      mockReadJsonConfig.mockImplementation((filePath: string) => {
        if (filePath.endsWith('/config.json')) {
          return {
            zcfManagedSettingsFields: ['outputStyle'],
            zcfManagedSettingsHashes: { outputStyle: hashConfigValue('learning') },
          }
        }
        return { outputStyle: 'learning' }
      })

      const result = await new ZcfUninstaller().removeZcfSettings()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()
      expect(result.removedConfigs).not.toContain('uninstall:zcfOutputStyleRemoved')
    })

    it('removes a fingerprinted status line but preserves user additions', async () => {
      const ownedStatusLine = {
        type: 'command',
        command: '~/.claude/ccline/ccline',
        padding: 0,
      }
      mockPathExists.mockImplementation(async (filePath: string) => {
        return filePath === '/home/user/.claude/settings.json' || filePath === '/home/user/.claude/config.json'
      })
      mockReadJsonConfig.mockImplementation((filePath: string) => {
        if (filePath.endsWith('/config.json')) {
          return {
            zcfManagedSettingsFields: ['statusLine'],
            zcfManagedSettingsHashes: {
              statusLine: hashConfigValue(JSON.stringify(ownedStatusLine)),
            },
          }
        }
        return { statusLine: ownedStatusLine }
      })

      const result = await new ZcfUninstaller().removeZcfSettings()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.claude/settings.json', {})

      vi.clearAllMocks()
      mockPathExists.mockImplementation(async (filePath: string) => {
        return filePath === '/home/user/.claude/settings.json' || filePath === '/home/user/.claude/config.json'
      })
      mockReadJsonConfig.mockImplementation((filePath: string) => {
        if (filePath.endsWith('/config.json')) {
          return {
            zcfManagedSettingsFields: ['statusLine'],
            zcfManagedSettingsHashes: {
              statusLine: hashConfigValue(JSON.stringify(ownedStatusLine)),
            },
          }
        }
        return { statusLine: { ...ownedStatusLine, userField: 'keep' } }
      })

      const preservedResult = await new ZcfUninstaller().removeZcfSettings()

      expect(preservedResult.success).toBe(true)
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()
    })

    it('handles missing and unreadable Claude settings', async () => {
      setPathExistsResult(false)
      const missingResult = await new ZcfUninstaller().removeZcfSettings()
      expect(missingResult.success).toBe(true)
      expect(missingResult.warnings).toContain('uninstall:settingsJsonNotFound')

      setPathExistsResult(true)
      mockReadJsonConfig.mockImplementation(() => {
        throw new Error('settings read failed')
      })
      const errorResult = await new ZcfUninstaller().removeZcfSettings()
      expect(errorResult.success).toBe(false)
      expect(errorResult.errors).toContain('uninstall:zcfSettingsRemovalFailed')
    })

    it('matches canonical Claude MCP variants while preserving altered servers', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => filePath === '/home/user/.claude.json')
      mockReadJsonConfig.mockReturnValue({
        mcpServers: {
          'context7': {
            command: 'npx',
            args: ['-y', '@upstash/context7-mcp@latest'],
            env: {},
          },
          'open-websearch': {
            type: 'stdio',
            command: 'cmd',
            args: ['/c', 'npx', '-y', 'open-websearch@latest'],
            env: {
              MODE: 'stdio',
              DEFAULT_SEARCH_ENGINE: 'duckduckgo',
              ALLOWED_SEARCH_ENGINES: 'duckduckgo,bing,brave',
            },
          },
          'mcp-deepwiki': {
            type: 'http',
            url: 'https://mcp.deepwiki.com/mcp',
          },
          'spec-workflow': {
            command: 'npx',
            args: ['-y', '@pimzino/spec-workflow-mcp@latest'],
            extra: 'user-owned',
          },
          'personal': { command: 'custom' },
        },
        zcfManagedMcpServers: {
          'context7': 'managed',
          'open-websearch': 'managed',
          'mcp-deepwiki': 'managed',
          'spec-workflow': 'managed',
        },
      })

      const result = await new ZcfUninstaller().removeZcfClaudeConfig()

      expect(result.success).toBe(true)
      expect(result.removedConfigs).toHaveLength(3)
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.claude.json', expect.objectContaining({
        mcpServers: expect.objectContaining({
          'spec-workflow': expect.anything(),
          'personal': { command: 'custom' },
        }),
      }))
    })

    it('removes stale MCP ownership markers even when no server remains', async () => {
      setPathExistsResult(true)
      mockReadJsonConfig.mockReturnValue({ zcfManagedMcpServers: { context7: 'managed', personal: 'keep' } })

      const result = await new ZcfUninstaller().removeZcfClaudeConfig()

      expect(result.success).toBe(true)
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.claude.json', {
        zcfManagedMcpServers: { personal: 'keep' },
      })
    })

    it('handles missing and unreadable Claude MCP configuration', async () => {
      setPathExistsResult(false)
      const missingResult = await new ZcfUninstaller().removeZcfClaudeConfig()
      expect(missingResult.success).toBe(true)
      expect(missingResult.warnings).toContain('uninstall:claudeJsonNotFound')

      setPathExistsResult(true)
      mockReadJsonConfig.mockImplementation(() => {
        throw new Error('claude config read failed')
      })
      const errorResult = await new ZcfUninstaller().removeZcfClaudeConfig()
      expect(errorResult.success).toBe(false)
      expect(errorResult.errors).toContain('uninstall:zcfClaudeConfigRemovalFailed')
    })

    it('removes Claude marker metadata and handles marker errors', async () => {
      setPathExistsResult(true)
      mockReadJsonConfig.mockReturnValue({
        primaryApiKey: 'zcf',
        zcfManagedEnvHashes: { ANTHROPIC_API_KEY: 'hash' },
        zcfManagedSettingsFields: ['hooks'],
        userSetting: true,
      })

      const result = await new ZcfUninstaller().removeZcfClaudeVscConfig()

      expect(result.success).toBe(true)
      expect(result.removedConfigs).toContain('uninstall:zcfPrimaryApiKeyRemoved')
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.claude/config.json', { userSetting: true })

      mockReadJsonConfig.mockImplementation(() => {
        throw new Error('marker read failed')
      })
      const errorResult = await new ZcfUninstaller().removeZcfClaudeVscConfig()
      expect(errorResult.success).toBe(false)
      expect(errorResult.errors).toContain('uninstall:zcfClaudeMarkerRemovalFailed')
    })

    it('handles language-only Claude memory trash failures and read errors', async () => {
      setPathExistsResult(true)
      mockReadFileSync.mockReturnValue(markZcfLanguageDirective('Always respond in English'))
      mockMoveToTrash.mockResolvedValue([{ success: false, path: 'test' }])

      const failedResult = await new ZcfUninstaller().removeZcfClaudeMd()
      expect(failedResult.success).toBe(false)
      expect(failedResult.warnings).toContain('uninstall:zcfResourceTrashFailed')

      mockReadFileSync.mockImplementation(() => {
        throw new Error('CLAUDE.md read failed')
      })
      const errorResult = await new ZcfUninstaller().removeZcfClaudeMd()
      expect(errorResult.success).toBe(false)
      expect(errorResult.errors).toContain('uninstall:zcfClaudeMdRemovalFailed')
    })

    it('reports output style trash and read failures', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/engineer-professional.md'))
      mockReadFileSync.mockReturnValue(markZcfResourceContent(`---
name: engineer-professional
---
# Engineer Professional Output Style
## Style Overview
ZCF
`))
      mockMoveToTrash.mockResolvedValue([{ success: false, path: 'test' }])

      const failedResult = await new ZcfUninstaller().removeZcfOutputStyles()
      expect(failedResult.success).toBe(false)
      expect(failedResult.warnings).toContain('uninstall:zcfResourceTrashFailed')

      mockReadFileSync.mockImplementation(() => {
        throw new Error('style read failed')
      })
      const errorResult = await new ZcfUninstaller().removeZcfOutputStyles()
      expect(errorResult.success).toBe(false)
      expect(errorResult.errors).toContain('uninstall:zcfOutputStylesRemovalFailed')
    })

    it('removes legacy workflow commands and agents only when their content is owned', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => (
        filePath.includes('/commands/') || filePath.includes('/agents/')
      ))
      mockReadFileSync.mockImplementation((filePath: Parameters<typeof readFileSync>[0]) => {
        const normalizedPath = String(filePath)
        const fileName = normalizedPath.split('/').pop() || ''
        if (normalizedPath.includes('/agents/')) {
          const name = fileName.replace(/\.md$/, '')
          const description = name === 'init-architect'
            ? '项目规划 当前日期和时间'
            : 'CLAUDE.md project planning'
          return markZcfResourceContent(`---\nname: ${name}\ncolor: blue\n---\n${description}\n`)
        }
        if (fileName === 'workflow.md' && !normalizedPath.includes('/commands/zcf/'))
          return markZcfResourceContent('structured six-phase workflow')
        if (fileName === 'feat.md')
          return markZcfResourceContent('$ARGUMENTS\n## Core Workflow')
        if (fileName === 'init-project.md')
          return markZcfResourceContent('get-current-datetime')
        if (fileName === 'bmad-init.md')
          return markZcfResourceContent('# /bmad-init Command')
        return markZcfResourceContent('# Claude Command: zcf workflow')
      })

      const result = await new ZcfUninstaller().removeZcfWorkflowArtifacts()

      expect(result.success).toBe(true)
      expect(result.removed).toContain('~/.claude/commands/workflow.md')
      expect(result.removed).toContain('~/.claude/agents/init-architect.md')
      expect(mockMoveToTrash.mock.calls.length).toBeGreaterThan(5)
    })

    it('preserves non-ZCF workflow artifacts and reports workflow errors', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/commands/workflow.md'))
      mockReadFileSync.mockReturnValue('# User workflow\n')
      const preservedResult = await new ZcfUninstaller().removeZcfWorkflowArtifacts()
      expect(preservedResult.success).toBe(true)
      expect(mockMoveToTrash).not.toHaveBeenCalled()

      mockReadFileSync.mockImplementation(() => {
        throw new Error('workflow read failed')
      })
      const errorResult = await new ZcfUninstaller().removeZcfWorkflowArtifacts()
      expect(errorResult.success).toBe(false)
      expect(errorResult.errors).toContain('uninstall:zcfWorkflowRemovalFailed')
    })

    it('reports global skill trash failures and filesystem errors', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => isGlobalInitProjectPath(filePath))
      mockReadFileSync.mockReturnValue(markZcfResourceContent(`---
name: init-project
disable-model-invocation: true
---
`))
      mockMoveToTrash.mockResolvedValue([{ success: false, path: 'test' }])

      const failedResult = await new ZcfUninstaller().removeZcfGlobalSkills()
      expect(failedResult.success).toBe(false)
      expect(failedResult.warnings).toContain('uninstall:zcfResourceTrashFailed')

      mockPathExists.mockRejectedValue(new Error('skills check failed'))
      const errorResult = await new ZcfUninstaller().removeZcfGlobalSkills()
      expect(errorResult.success).toBe(false)
      expect(errorResult.errors).toContain('uninstall:zcfSkillsRemovalFailed')
    })

    it('preserves a marked global skill directory with extra user files', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => isGlobalInitProjectPath(filePath))
      mockReadFileSync.mockReturnValue(markZcfResourceContent(`---
name: init-project
disable-model-invocation: true
---
`))
      setDirectoryEntries(['SKILL.md', 'README.md'])

      const result = await new ZcfUninstaller().removeZcfGlobalSkills()

      expect(result.success).toBe(true)
      expect(mockMoveToTrash).not.toHaveBeenCalled()
    })

    it('removes marked legacy preference files and reports legacy cleanup errors', async () => {
      setPathExistsResult(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({ zcfManaged: true, codeToolType: 'claude-code' }))
      const successResult = await new ZcfUninstaller().removeLegacyZcfConfigs()
      expect(successResult.success).toBe(true)
      expect(successResult.removed).toContain('~/.claude/.zcf-config.json')

      mockMoveToTrash.mockResolvedValue([{ success: false, path: 'test' }])
      const failedResult = await new ZcfUninstaller().removeLegacyZcfConfigs()
      expect(failedResult.success).toBe(false)

      mockPathExists.mockRejectedValue(new Error('legacy check failed'))
      const errorResult = await new ZcfUninstaller().removeLegacyZcfConfigs()
      expect(errorResult.success).toBe(false)
      expect(errorResult.errors).toContain('uninstall:zcfLegacyConfigRemovalFailed')
    })

    it('preserves unmarked legacy preference files even when their shape matches ZCF', async () => {
      setPathExistsResult(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({ codeToolType: 'claude-code', preferredLang: 'en' }))

      const result = await new ZcfUninstaller().removeLegacyZcfConfigs()

      expect(result.success).toBe(true)
      expect(result.removed).toEqual([])
      expect(mockMoveToTrash).not.toHaveBeenCalled()
    })

    it('preserves a legacy preference file that belongs to Codex', async () => {
      setPathExistsResult(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({ codeToolType: 'codex' }))

      const result = await new ZcfUninstaller().removeLegacyZcfConfigs()

      expect(result.success).toBe(true)
      expect(result.removed).toEqual([])
      expect(mockMoveToTrash).not.toHaveBeenCalled()
    })

    it('merges a failed ZCF-only result without losing component details', async () => {
      const uninstaller = new ZcfUninstaller()
      vi.spyOn(uninstaller, 'removeZcfSettings').mockResolvedValue({
        success: false,
        removed: [],
        removedConfigs: [],
        errors: ['settings failed'],
        warnings: [],
      })
      vi.spyOn(uninstaller, 'removeZcfClaudeConfig').mockResolvedValue({
        success: true,
        removed: ['.claude.json'],
        removedConfigs: ['MCP removed'],
        errors: [],
        warnings: ['warning'],
      })
      vi.spyOn(uninstaller, 'removeZcfClaudeVscConfig').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })
      vi.spyOn(uninstaller, 'removeZcfClaudeMd').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })
      vi.spyOn(uninstaller, 'removeZcfOutputStyles').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })
      vi.spyOn(uninstaller, 'removeZcfWorkflowArtifacts').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })
      vi.spyOn(uninstaller, 'removeZcfGlobalSkills').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })
      vi.spyOn(uninstaller, 'removeZcfConfig').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })
      vi.spyOn(uninstaller, 'removeLegacyZcfConfigs').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })

      const result = await uninstaller.uninstallZcfConfig()

      expect(result.success).toBe(false)
      expect(result.removed).toEqual(['.claude.json'])
      expect(result.removedConfigs).toEqual(['MCP removed'])
      expect(result.errors).toEqual(['settings failed'])
      expect(result.warnings).toEqual(['warning'])
    })
  })

  describe('codex', () => {
    it('removes marked ZCF API and MCP sections while preserving user sections', async () => {
      const zcfProviderBody = `name = "ZCF Provider"
temp_env_key = "ZCF_PROVIDER_API_KEY"`
      const configContent = `# --- model provider added by ZCF ---
${zcfTopLevelOwnership('model', 'gpt-5.2')}
model = "gpt-5.2"
${zcfTopLevelOwnership('model_provider', 'zcf-provider')}
model_provider = "zcf-provider"

[model_providers.zcf-provider]
${zcfProviderOwnership('zcf-provider', zcfProviderBody, 'zcf-secret')}

[model_providers.personal-provider]
name = "Personal Provider"
temp_env_key = "PERSONAL_API_KEY"

# --- MCP servers added by ZCF ---
[mcp_servers.context7]
# ZCF managed MCP: context7
command = "npx"
args = ["-y", "@upstash/context7-mcp@latest"]

# --- User custom configuration ---
[custom]
value = "keep"

[mcp_servers.personal]
command = "custom"
`
      mockPathExists.mockImplementation(async (path: string) => {
        return path.endsWith('/config.toml') || path.endsWith('/auth.json')
      })
      mockReadFileSync.mockReturnValue(configContent)
      mockReadJsonConfig.mockReturnValue({
        'ZCF_PROVIDER_API_KEY': 'zcf-secret',
        'zcf-provider': 'zcf-secret',
        'OPENAI_API_KEY': 'zcf-secret',
        'USER_API_KEY': 'keep',
      })

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.stringContaining('[custom]\nvalue = "keep"'),
      )
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.not.stringContaining('model_providers.zcf-provider'),
      )
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.stringContaining('[model_providers.personal-provider]'),
      )
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.codex/auth.json', {
        USER_API_KEY: 'keep',
      })
      expect(result.removedConfigs).toEqual(expect.arrayContaining([
        'codex:zcfApiConfigRemoved',
        'codex:zcfMcpConfigRemoved',
        'codex:zcfAuthConfigRemoved',
      ]))
    })

    it('removes canonical Codex sections under legacy ownership headers and their auth entries', async () => {
      const configContent = `# --- model provider added by ZCF ---
[model_providers.legacy-provider]
name = "Legacy Provider"
base_url = "https://legacy.example.com/v1"
wire_api = "responses"
temp_env_key = "LEGACY_API_KEY"
requires_openai_auth = false

# --- MCP servers added by ZCF ---
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp@latest"]

[custom]
value = "keep"
`
      mockPathExists.mockImplementation(async (filePath: string) => isCodexConfigOrAuthPath(filePath))
      mockReadFileSync.mockReturnValue(configContent)
      mockReadJsonConfig.mockReturnValue({
        LEGACY_API_KEY: 'legacy-secret',
        USER_API_KEY: 'keep',
      })

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.stringContaining('[custom]\nvalue = "keep"'),
      )
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.not.stringContaining('model_providers.legacy-provider'),
      )
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.not.stringContaining('[mcp_servers.context7]'),
      )
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.codex/auth.json', {
        USER_API_KEY: 'keep',
      })
      expect(result.removedConfigs).toEqual(expect.arrayContaining([
        'codex:zcfApiConfigRemoved',
        'codex:zcfMcpConfigRemoved',
        'codex:zcfAuthConfigRemoved',
      ]))
    })

    it('preserves unmarked top-level model fields when only a ZCF header follows a section', async () => {
      const configContent = `[custom]
value = "keep"

# --- model provider added by ZCF ---
model = "gpt-5.2"
model_provider = "legacy-provider"

[model_providers.legacy-provider]
name = "Legacy Provider"
base_url = "https://legacy.example.com/v1"
wire_api = "responses"
env_key = "LEGACY_API_KEY"
requires_openai_auth = false
`
      mockPathExists.mockImplementation(async (filePath: string) => isCodexConfigOrAuthPath(filePath))
      mockReadFileSync.mockReturnValue(configContent)
      mockReadJsonConfig.mockReturnValue({ LEGACY_API_KEY: 'legacy-secret', USER_API_KEY: 'keep' })

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.stringContaining('model = "gpt-5.2"'),
      )
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.stringContaining('model_provider = "legacy-provider"'),
      )
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.stringContaining('[custom]\nvalue = "keep"'),
      )
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.not.stringContaining('[model_providers.legacy-provider]'),
      )
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.codex/auth.json', {
        USER_API_KEY: 'keep',
      })
    })

    it('preserves edited or unknown sections under legacy Codex ownership headers', async () => {
      const configContent = `# --- model provider added by ZCF ---
[model_providers.legacy-provider]
name = "Legacy Provider"
base_url = "https://legacy.example.com/v1"
wire_api = "responses"
temp_env_key = "LEGACY_API_KEY"
requires_openai_auth = false
custom = "keep"

# --- MCP servers added by ZCF ---
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp@latest"]
timeout = 5

[mcp_servers.personal]
command = "my-mcp"
`
      mockPathExists.mockImplementation(async (filePath: string) => isCodexConfigOrAuthPath(filePath))
      mockReadFileSync.mockReturnValue(configContent)
      mockReadJsonConfig.mockReturnValue({
        LEGACY_API_KEY: 'legacy-secret',
        USER_API_KEY: 'keep',
      })

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).not.toHaveBeenCalled()
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()
    })

    it('preserves an unreadable legacy provider section under an ownership header', async () => {
      const configContent = `# --- model provider added by ZCF ---
[model_providers.legacy-provider]
name = "Broken
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('preserves user MCP sections appended after the ZCF marker', async () => {
      const configContent = `# --- MCP servers added by ZCF ---
[mcp_servers.context7]
# ZCF managed MCP: context7
command = "npx"
args = ["-y", "@upstash/context7-mcp@latest"]

[mcp_servers.personal]
command = "my-mcp"
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.stringContaining('[mcp_servers.personal]\ncommand = "my-mcp"'),
      )
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.not.stringContaining('[mcp_servers.context7]'),
      )
    })

    it('preserves a ZCF MCP section after user adds custom fields', async () => {
      const configContent = `# --- MCP servers added by ZCF ---
[mcp_servers.context7]
# ZCF managed MCP: context7
command = "npx"
args = ["-y", "@upstash/context7-mcp@latest"]
custom = "keep"
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('recognizes the Codex-specific Serena context while cleaning ZCF MCP config', async () => {
      const configContent = `[mcp_servers.serena]
# ZCF managed MCP: serena
command = "uvx"
args = [
  "--from",
  "git+https://github.com/oraios/serena",
  "serena",
  "start-mcp-server",
  "--context",
  "codex",
  "--enable-web-dashboard",
  "false",
]
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.not.stringContaining('[mcp_servers.serena]'),
      )
    })

    it('recognizes the canonical DeepWiki command form while cleaning ZCF MCP config', async () => {
      const configContent = `[mcp_servers.mcp-deepwiki]
# ZCF managed MCP: mcp-deepwiki
command = "mcp-deepwiki"
startup_timeout_sec = 30
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.not.stringContaining('[mcp_servers.mcp-deepwiki]'),
      )
    })

    it('recognizes case-sensitive MCP IDs such as Playwright', async () => {
      const configContent = `[mcp_servers.Playwright]
# ZCF managed MCP: Playwright
command = "npx"
args = ["-y", "@playwright/mcp@latest"]
env = {}
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.not.stringContaining('[mcp_servers.Playwright]'),
      )
    })

    it('preserves an unmarked Exa MCP section even when its shape matches ZCF', async () => {
      const configContent = `[mcp_servers.exa]
command = "npx"
args = ["-y", "exa-mcp-server@latest"]
env = {EXA_API_KEY = "user-owned-key"}
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('removes a markerless canonical Exa MCP section under a legacy ownership header', async () => {
      const configContent = `# --- MCP servers added by ZCF ---
[mcp_servers.exa]
command = "npx"
args = ["-y", "exa-mcp-server@latest"]
env = {EXA_API_KEY = "zcf-owned-key"}
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.not.stringContaining('[mcp_servers.exa]'),
      )
    })

    it('removes an Exa MCP section only with its ownership fingerprint', async () => {
      const configContent = `# --- MCP servers added by ZCF ---
[mcp_servers.exa]
# ZCF managed MCP: exa ${hashConfigValue('zcf-owned-key')}
command = "npx"
args = ["-y", "exa-mcp-server@latest"]
env = {EXA_API_KEY = "zcf-owned-key"}
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.not.stringContaining('[mcp_servers.exa]'),
      )
    })

    it('preserves an unmarked provider with ZCF legacy fixed id', async () => {
      const configContent = `model_provider = "official-auth-token"

[model_providers.official-auth-token]
name = "Personal Provider"
temp_env_key = "PERSONAL_API_KEY"
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('preserves a same-name custom MCP service after the ZCF marker', async () => {
      const configContent = `# --- MCP servers added by ZCF ---
[mcp_servers.serena]
command = "custom-serena"
args = ["custom"]
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('removes arbitrary providers carrying a ZCF ownership marker', async () => {
      const zcfProviderBody = `name = "Custom Provider"
temp_env_key = "CUSTOM_PROVIDER_API_KEY"`
      const configContent = `model = "gpt-5.2"
model_provider = "custom-provider"

[model_providers.custom-provider]
${zcfProviderOwnership('custom-provider', zcfProviderBody, 'zcf-secret')}

[model_providers.personal-provider]
name = "Personal Provider"
temp_env_key = "PERSONAL_API_KEY"
`
      mockPathExists.mockImplementation(async (filePath: string) => isCodexConfigOrAuthPath(filePath))
      mockReadFileSync.mockReturnValue(configContent)
      mockReadJsonConfig.mockReturnValue({
        CUSTOM_PROVIDER_API_KEY: 'zcf-secret',
        OPENAI_API_KEY: 'zcf-secret',
        PERSONAL_API_KEY: 'personal-secret',
      })

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.not.stringContaining('[model_providers.custom-provider]'),
      )
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.stringContaining('[model_providers.personal-provider]'),
      )
      expect(mockWriteJsonConfig).toHaveBeenCalledWith('/home/user/.codex/auth.json', {
        PERSONAL_API_KEY: 'personal-secret',
      })
    })

    it('preserves a provider credential changed after ZCF wrote its fingerprint', async () => {
      const zcfProviderBody = `name = "Custom Provider"
temp_env_key = "CUSTOM_PROVIDER_API_KEY"`
      const configContent = `model_provider = "custom-provider"

[model_providers.custom-provider]
${zcfProviderOwnership('custom-provider', zcfProviderBody, 'old-secret')}
`
      mockPathExists.mockImplementation((filePath: string) => Promise.resolve(
        filePath.endsWith('/config.toml') || filePath.endsWith('/auth.json'),
      ))
      mockReadFileSync.mockReturnValue(configContent)
      mockReadJsonConfig.mockReturnValue({
        CUSTOM_PROVIDER_API_KEY: 'new-user-secret',
        OPENAI_API_KEY: 'new-user-secret',
      })

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.not.stringContaining('[model_providers.custom-provider]'),
      )
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()
    })

    it('preserves a provider after its marked section is edited', async () => {
      const originalProviderBody = `name = "Custom Provider"
temp_env_key = "CUSTOM_PROVIDER_API_KEY"`
      const configContent = `
[model_providers.custom-provider]
${zcfProviderOwnership('custom-provider', originalProviderBody)}
name = "User-edited Provider"
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('preserves unmarked providers and unrelated OPENAI_API_KEY credentials', async () => {
      const configContent = `model = "gpt-5.2"
model_provider = "personal-provider"

[model_providers.personal-provider]
name = "Personal Provider"
temp_env_key = "PERSONAL_API_KEY"
`
      mockPathExists.mockImplementation(async (filePath: string) => isCodexConfigOrAuthPath(filePath))
      mockReadFileSync.mockReturnValue(configContent)
      mockReadJsonConfig.mockReturnValue({
        PERSONAL_API_KEY: 'personal-secret',
        OPENAI_API_KEY: 'personal-openai-secret',
      })

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).not.toHaveBeenCalled()
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()
    })

    it('preserves the selected user model when another provider is ZCF-managed', async () => {
      const zcfProviderBody = `name = "ZCF Provider"
temp_env_key = "ZCF_PROVIDER_API_KEY"`
      const configContent = `model = "user-model"
model_provider = "personal-provider"

[model_providers.personal-provider]
name = "Personal Provider"
temp_env_key = "PERSONAL_API_KEY"

[model_providers.zcf-provider]
${zcfProviderOwnership('zcf-provider', zcfProviderBody)}
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.stringContaining('model = "user-model"\nmodel_provider = "personal-provider"'),
      )
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.not.stringContaining('[model_providers.zcf-provider]'),
      )
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.stringContaining('[model_providers.personal-provider]'),
      )
    })

    it('preserves a model changed after its ZCF ownership fingerprint', async () => {
      const configContent = `${zcfTopLevelOwnership('model', 'zcf-model')}
model = "user-model"
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('keeps user AGENTS.md and prompts while removing only ZCF-owned legacy files', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => {
        return filePath === '/home/user/.codex/AGENTS.md'
          || filePath === '/home/user/.codex/prompts'
          || filePath.endsWith('/workflow.md')
          || filePath.endsWith('/personal.md')
      })
      mockReadFileSync.mockImplementation((filePath: Parameters<typeof readFileSync>[0]) => {
        if (String(filePath).endsWith('/AGENTS.md'))
          return '# My instructions\n\nKeep this file.\n'
        if (String(filePath).endsWith('/workflow.md'))
          return markZcfResourceContent('# Workflow\n\n/zcf:workflow <TASK_DESCRIPTION>\n')
        return '# Personal prompt\n'
      })

      const uninstaller = new CodexUninstaller()
      const promptResult = await uninstaller.removeZcfSystemPrompt()
      const workflowResult = await uninstaller.removeZcfWorkflow()

      expect(promptResult.success).toBe(true)
      expect(promptResult.removed).toEqual([])
      expect(workflowResult.success).toBe(true)
      expect(workflowResult.removed).toEqual(['prompts/workflow.md'])
      expect(mockMoveToTrash).toHaveBeenCalledWith('/home/user/.codex/prompts/workflow.md')
      expect(mockMoveToTrash).not.toHaveBeenCalledWith('/home/user/.codex/AGENTS.md')
    })

    it('removes an exactly fingerprinted ZCF AGENTS.md', async () => {
      const prompt = markZcfSystemPrompt('# ZCF system prompt\n')
      mockPathExists.mockImplementation(async (filePath: string) => filePath === '/home/user/.codex/AGENTS.md')
      mockReadFileSync.mockReturnValue(prompt)

      const result = await new CodexUninstaller().removeZcfSystemPrompt()

      expect(result.success).toBe(true)
      expect(mockMoveToTrash).toHaveBeenCalledWith('/home/user/.codex/AGENTS.md')
    })

    it('removes a markerless legacy output-style AGENTS.md', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => filePath === '/home/user/.codex/AGENTS.md')
      mockReadFileSync.mockReturnValue(legacyOutputStyleContent)

      const result = await new CodexUninstaller().removeZcfSystemPrompt()

      expect(result.success).toBe(true)
      expect(mockMoveToTrash).toHaveBeenCalledWith('/home/user/.codex/AGENTS.md')
    })

    it('removes a built-in legacy language directive only when it matches the known language', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => filePath === '/home/user/.codex/AGENTS.md')
      mockReadFileSync.mockReturnValue([
        legacyOutputStyleContent.trimEnd(),
        '**Most Important:Always respond in English**',
        '',
      ].join('\n'))

      const result = await new CodexUninstaller().removeZcfSystemPrompt()

      expect(result.success).toBe(true)
      expect(mockMoveToTrash).toHaveBeenCalledWith('/home/user/.codex/AGENTS.md')
    })

    it('preserves a legacy prompt with a user-authored custom language directive', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => filePath === '/home/user/.codex/AGENTS.md')
      mockReadFileSync.mockReturnValue([
        legacyOutputStyleContent.trimEnd(),
        '**Most Important:Always respond in French**',
        '',
      ].join('\n'))

      const result = await new CodexUninstaller().removeZcfSystemPrompt()

      expect(result.success).toBe(true)
      expect(mockMoveToTrash).not.toHaveBeenCalled()
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('preserves an AGENTS.md after user content is appended to a ZCF prompt', async () => {
      const languageDirective = markZcfLanguageDirective('**Most Important:Always respond in English**')
      const prompt = `${markZcfSystemPrompt(`# ZCF system prompt\n\n${languageDirective}`)}
# User instructions
Keep this content.
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath === '/home/user/.codex/AGENTS.md')
      mockReadFileSync.mockReturnValue(prompt)

      const result = await new CodexUninstaller().removeZcfSystemPrompt()

      expect(result.success).toBe(true)
      expect(mockMoveToTrash).not.toHaveBeenCalled()
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/AGENTS.md',
        expect.stringContaining('# User instructions\nKeep this content.'),
      )
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.codex/AGENTS.md',
        expect.not.stringContaining('ZCF managed system prompt'),
      )
    })

    it('preserves an unmarked language instruction appended by a user', async () => {
      const prompt = `${markZcfSystemPrompt('# ZCF system prompt\n')}
# User instructions
**Most Important:Always respond in English**
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath === '/home/user/.codex/AGENTS.md')
      mockReadFileSync.mockReturnValue(prompt)

      const result = await new CodexUninstaller().removeZcfSystemPrompt()

      expect(result.success).toBe(true)
      expect(mockMoveToTrash).not.toHaveBeenCalled()
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('preserves a markerless output-style-shaped AGENTS.md', async () => {
      const prompt = `---
name: engineer-professional
---

# Engineer Professional Output Style

## Style Overview

User-owned content.
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath === '/home/user/.codex/AGENTS.md')
      mockReadFileSync.mockReturnValue(prompt)

      const result = await new CodexUninstaller().removeZcfSystemPrompt()

      expect(result.success).toBe(true)
      expect(result.removed).toEqual([])
      expect(mockMoveToTrash).not.toHaveBeenCalled()
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('keeps the Codex CLI and backups in ZCF-only mode', async () => {
      const uninstaller = new CodexUninstaller()
      const uninstallCliPackage = vi.spyOn(uninstaller, 'uninstallCliPackage')
      const removeBackups = vi.spyOn(uninstaller, 'removeBackups')
      vi.spyOn(uninstaller, 'removeZcfManagedConfig').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })
      vi.spyOn(uninstaller, 'removeZcfSystemPrompt').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })
      vi.spyOn(uninstaller, 'removeZcfWorkflow').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })
      vi.spyOn(uninstaller, 'removeZcfGlobalSkills').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })
      vi.spyOn(uninstaller, 'removeZcfGlobalConfig').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })

      const result = await uninstaller.uninstallZcfConfig()

      expect(result.success).toBe(true)
      expect(uninstallCliPackage).not.toHaveBeenCalled()
      expect(removeBackups).not.toHaveBeenCalled()
    })

    it('handles complete system prompt removal outcomes', async () => {
      const uninstaller = new CodexUninstaller()

      setPathExistsResult(true)
      const successResult = await uninstaller.removeSystemPrompt()
      expect(successResult.success).toBe(true)
      expect(successResult.removed).toEqual(['AGENTS.md'])

      mockMoveToTrash.mockResolvedValue([{ success: false, path: 'test' }])
      const failedResult = await uninstaller.removeSystemPrompt()
      expect(failedResult.success).toBe(false)
      expect(failedResult.warnings).toContain('codex:resourceTrashFailed')

      setPathExistsResult(false)
      const missingResult = await uninstaller.removeSystemPrompt()
      expect(missingResult.success).toBe(true)
      expect(missingResult.warnings).toContain('codex:systemPromptNotFound')

      mockPathExists.mockRejectedValue(new Error('agents check failed'))
      const errorResult = await uninstaller.removeSystemPrompt()
      expect(errorResult.success).toBe(false)
      expect(errorResult.errors).toContain('codex:systemPromptRemovalFailed')
    })

    it('handles ZCF system prompt cleanup failures and plain language directives', async () => {
      setPathExistsResult(true)
      mockReadFileSync.mockReturnValue(markZcfSystemPrompt('# ZCF prompt\n'))
      mockMoveToTrash.mockResolvedValue([{ success: false, path: 'test' }])

      const failedResult = await new CodexUninstaller().removeZcfSystemPrompt()
      expect(failedResult.success).toBe(false)
      expect(failedResult.warnings).toContain('codex:zcfResourceTrashFailed')

      mockMoveToTrash.mockResolvedValue([{ success: true, path: 'test' }])
      const languageDirective = markZcfLanguageDirective('**Most Important:Always respond in English**')
      mockReadFileSync.mockReturnValue(`# User prompt\n\n${languageDirective}`)
      const directiveResult = await new CodexUninstaller().removeZcfSystemPrompt()
      expect(directiveResult.success).toBe(true)
      expect(directiveResult.removedConfigs).toContain('codex:zcfLanguageDirectiveRemoved')

      setPathExistsResult(false)
      const missingResult = await new CodexUninstaller().removeZcfSystemPrompt()
      expect(missingResult.success).toBe(true)
      expect(missingResult.warnings).toContain('codex:systemPromptNotFound')

      setPathExistsResult(true)
      mockReadFileSync.mockImplementation(() => {
        throw new Error('prompt read failed')
      })
      const errorResult = await new CodexUninstaller().removeZcfSystemPrompt()
      expect(errorResult.success).toBe(false)
      expect(errorResult.errors).toContain('codex:zcfSystemPromptRemovalFailed')
    })

    it('handles complete workflow removal outcomes', async () => {
      const uninstaller = new CodexUninstaller()
      setPathExistsResult(true)
      const successResult = await uninstaller.removeWorkflow()
      expect(successResult.success).toBe(true)
      expect(successResult.removed).toEqual(['prompts/'])

      mockMoveToTrash.mockResolvedValue([{ success: false, path: 'test' }])
      const failedResult = await uninstaller.removeWorkflow()
      expect(failedResult.success).toBe(false)
      expect(failedResult.warnings).toContain('codex:resourceTrashFailed')

      setPathExistsResult(false)
      const missingResult = await uninstaller.removeWorkflow()
      expect(missingResult.success).toBe(true)
      expect(missingResult.warnings).toContain('codex:workflowNotFound')

      mockPathExists.mockRejectedValue(new Error('workflow check failed'))
      const errorResult = await uninstaller.removeWorkflow()
      expect(errorResult.success).toBe(false)
      expect(errorResult.errors).toContain('codex:workflowRemovalFailed')
    })

    it('recognizes all legacy Codex prompt templates and reports trash failures', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => isCodexPromptPath(filePath))
      mockReadFileSync.mockImplementation((filePath: Parameters<typeof readFileSync>[0]) => {
        const fileName = String(filePath).split('/').pop() || ''
        if (fileName === 'feat.md')
          return markZcfResourceContent('$ARGUMENTS\n## Core Workflow')
        if (fileName === 'init-project.md')
          return markZcfResourceContent('init-architect')
        if (fileName === 'bmad-init.md')
          return markZcfResourceContent('# /bmad-init Command')
        return markZcfResourceContent('/zcf:workflow task')
      })

      const successResult = await new CodexUninstaller().removeZcfWorkflow()
      expect(successResult.success).toBe(true)
      expect(successResult.removed.length).toBeGreaterThan(5)

      mockMoveToTrash.mockResolvedValue([{ success: false, path: 'test' }])
      const failedResult = await new CodexUninstaller().removeZcfWorkflow()
      expect(failedResult.success).toBe(false)
      expect(failedResult.warnings).toContain('codex:zcfResourceTrashFailed')
    })

    it('handles missing and unreadable legacy Codex prompts', async () => {
      setPathExistsResult(false)
      const missingResult = await new CodexUninstaller().removeZcfWorkflow()
      expect(missingResult.success).toBe(true)
      expect(missingResult.warnings).toContain('codex:workflowNotFound')

      mockPathExists.mockImplementation(async (filePath: string) => isCodexPromptPath(filePath))
      mockReadFileSync.mockImplementation(() => {
        throw new Error('prompt scan failed')
      })
      const errorResult = await new CodexUninstaller().removeZcfWorkflow()
      expect(errorResult.success).toBe(false)
      expect(errorResult.errors).toContain('codex:zcfWorkflowRemovalFailed')
    })

    it('handles Codex managed config absence, auth preservation, and write errors', async () => {
      setPathExistsResult(false)
      const missingResult = await new CodexUninstaller().removeZcfManagedConfig()
      expect(missingResult.success).toBe(true)
      expect(missingResult.warnings).toContain('codex:configNotFound')

      const zcfProviderBody = 'temp_env_key = "ZCF_PROVIDER_API_KEY"'
      const configContent = `model_provider = "zcf-provider"

[model_providers.zcf-provider]
${zcfProviderOwnership('zcf-provider', zcfProviderBody, 'old-secret')}
`
      mockPathExists.mockImplementation(async (filePath: string) => isCodexConfigOrAuthPath(filePath))
      mockReadFileSync.mockReturnValue(configContent)
      mockReadJsonConfig.mockReturnValue({ ZCF_PROVIDER_API_KEY: 'changed-by-user', OPENAI_API_KEY: 'user-openai' })
      const preservedResult = await new CodexUninstaller().removeZcfManagedConfig()
      expect(preservedResult.success).toBe(true)
      expect(mockWriteJsonConfig).not.toHaveBeenCalled()

      mockReadJsonConfig.mockReturnValue({ ZCF_PROVIDER_API_KEY: 'old-secret', OPENAI_API_KEY: 'old-secret' })
      mockWriteJsonConfig.mockImplementation(() => {
        throw new Error('auth write failed')
      })
      const errorResult = await new CodexUninstaller().removeZcfManagedConfig()
      expect(errorResult.success).toBe(false)
      expect(errorResult.errors).toContain('codex:zcfConfigRemovalFailed')
      mockWriteJsonConfig.mockImplementation(() => {})
    })

    it('keeps the TOML ownership markers when an existing auth file cannot be read', async () => {
      const configContent = `[model_providers.zcf-provider]
${zcfProviderOwnership('zcf-provider', 'temp_env_key = "ZCF_PROVIDER_API_KEY"', 'zcf-secret')}
`
      mockPathExists.mockImplementation(async (filePath: string) => isCodexConfigOrAuthPath(filePath))
      mockReadFileSync.mockReturnValue(configContent)
      mockReadJsonConfig.mockReturnValue(null)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('codex:zcfConfigRemovalFailed')
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('matches Codex MCP URL, Windows command, env, and invalid-shape branches', async () => {
      const configContent = `[mcp_servers.mcp-deepwiki]
# ZCF managed MCP: mcp-deepwiki
url = "https://mcp.deepwiki.com/mcp"
startup_timeout_sec = 30

[mcp_servers.open-websearch]
# ZCF managed MCP: open-websearch
command = "npx"
args = ["-y", "open-websearch@latest"]
env = {MODE = "stdio", DEFAULT_SEARCH_ENGINE = "duckduckgo", ALLOWED_SEARCH_ENGINES = "duckduckgo,bing,brave"}

[mcp_servers.context7]
# ZCF managed MCP: context7
command = "cmd"
args = ["/c", "npx", "-y", "@upstash/context7-mcp@latest"]
env = {}

[mcp_servers.spec-workflow]
# ZCF managed MCP: spec-workflow
command = "npx"
args = ["-y", "@pimzino/spec-workflow-mcp@latest"]
startup_timeout_sec = 99

[mcp_servers.Playwright]
# ZCF managed MCP: Playwright
command = "npx"
args = ["-y", "@playwright/mcp@latest"]
extra = "keep"
`
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/config.toml'))
      mockReadFileSync.mockReturnValue(configContent)

      const result = await new CodexUninstaller().removeZcfManagedConfig()

      expect(result.success).toBe(true)
      const writtenContent = mockWriteFileSync.mock.calls.at(-1)?.[1] as string
      expect(writtenContent).toContain('[mcp_servers.spec-workflow]')
      expect(writtenContent).toContain('[mcp_servers.Playwright]')
      expect(writtenContent).not.toContain('[mcp_servers.mcp-deepwiki]')
      expect(writtenContent).not.toContain('[mcp_servers.open-websearch]')
      expect(writtenContent).not.toContain('[mcp_servers.context7]')
    })

    it('removes owned Codex global skills and preserves shared preference files', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/workflow')
        || filePath.endsWith('/workflow/SKILL.md')
        || filePath.endsWith('/config.toml')
        || filePath.endsWith('.zcf-config.json'))
      mockReadFileSync.mockReturnValue(markZcfResourceContent(`---
name: workflow
disable-model-invocation: true
---
`))
      const skillResult = await new CodexUninstaller().removeZcfGlobalSkills()
      expect(skillResult.success).toBe(true)
      expect(skillResult.removed).toContain('~/.agents/skills/workflow/')

      mockReadFileSync.mockImplementation((filePath: Parameters<typeof readFileSync>[0]) => {
        if (String(filePath).endsWith('/config.toml')) {
          return '[general]\npreferredLang = "en"\n\n[claudeCode]\nprofiles = {}\n\n[codex]\nenabled = true\n'
        }
        return JSON.stringify({ zcfManaged: true, codeToolType: 'claude-code', profiles: { keep: {} } })
      })
      const configResult = await new CodexUninstaller().removeZcfGlobalConfig()
      expect(configResult.success).toBe(true)
      expect(configResult.removed).toEqual([])
      expect(configResult.removedConfigs).toContain('codex:zcfApiConfigRemoved')
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/user/.ufomiao/zcf/config.toml',
        expect.not.stringContaining('[codex]'),
      )

      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('.zcf-config.json'))
      mockReadFileSync.mockReturnValue(JSON.stringify({ zcfManaged: true, codeToolType: 'codex' }))
      mockMoveToTrash.mockResolvedValue([{ success: false, path: 'test' }])
      const failedResult = await new CodexUninstaller().removeZcfGlobalConfig()
      expect(failedResult.success).toBe(false)
      expect(failedResult.warnings).toContain('codex:zcfResourceTrashFailed')

      mockMoveToTrash.mockClear()
      mockMoveToTrash.mockResolvedValue([{ success: true, path: 'test' }])
      mockReadFileSync.mockReturnValue(JSON.stringify({ codeToolType: 'codex' }))
      const preservedResult = await new CodexUninstaller().removeZcfGlobalConfig()
      expect(preservedResult.success).toBe(true)
      expect(preservedResult.removed).toEqual([])
      expect(mockMoveToTrash).not.toHaveBeenCalled()
    })

    it('preserves a canonical skill directory linked by Claude Code', async () => {
      mockPathExists.mockImplementation(async (filePath: string) => filePath.endsWith('/workflow')
        || filePath.endsWith('/workflow/SKILL.md'))
      mockReadFileSync.mockReturnValue(markZcfResourceContent(`---
name: workflow
disable-model-invocation: true
---
`))
      setClaudeSkillLink(true)

      const result = await new CodexUninstaller().removeZcfGlobalSkills()

      expect(result.success).toBe(true)
      expect(result.removed).toEqual([])
      expect(mockMoveToTrash).not.toHaveBeenCalled()
    })

    it('reports global Codex skill and preference filesystem errors', async () => {
      mockPathExists.mockRejectedValue(new Error('global skill check failed'))
      const skillError = await new CodexUninstaller().removeZcfGlobalSkills()
      expect(skillError.success).toBe(false)
      expect(skillError.errors).toContain('codex:zcfSkillsRemovalFailed')

      mockPathExists.mockRejectedValue(new Error('global config check failed'))
      const configError = await new CodexUninstaller().removeZcfGlobalConfig()
      expect(configError.success).toBe(false)
      expect(configError.errors).toContain('codex:zcfGlobalConfigRemovalFailed')
    })

    it('merges Codex ZCF component failures into the final result', async () => {
      const uninstaller = new CodexUninstaller()
      vi.spyOn(uninstaller, 'removeZcfManagedConfig').mockResolvedValue({
        success: false,
        removed: [],
        removedConfigs: [],
        errors: ['config failed'],
        warnings: [],
      })
      vi.spyOn(uninstaller, 'removeZcfSystemPrompt').mockResolvedValue({
        success: true,
        removed: ['AGENTS.md'],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })
      vi.spyOn(uninstaller, 'removeZcfWorkflow').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: ['workflow'],
        errors: [],
        warnings: ['warning'],
      })
      vi.spyOn(uninstaller, 'removeZcfGlobalSkills').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })
      vi.spyOn(uninstaller, 'removeZcfGlobalConfig').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })

      const result = await uninstaller.uninstallZcfConfig()

      expect(result.success).toBe(false)
      expect(result.removed).toEqual(['AGENTS.md'])
      expect(result.removedConfigs).toEqual(['workflow'])
      expect(result.errors).toEqual(['config failed'])
      expect(result.warnings).toEqual(['warning'])
    })
  })
})
