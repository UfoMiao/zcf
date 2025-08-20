import type { ClaudeSettings } from '../../src/types/config'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mergeSettingsFile } from '../../src/utils/config'
import { readJsonConfig, writeJsonConfig } from '../../src/utils/json-config'

describe('statusLine Configuration Integration', () => {
  let tempDir: string
  let templatePath: string
  let targetPath: string

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await mkdtemp(join(tmpdir(), 'zcf-statusline-test-'))
    templatePath = join(tempDir, 'template-settings.json')
    targetPath = join(tempDir, 'target-settings.json')
  })

  afterEach(async () => {
    // Clean up temporary directory
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('should create complete settings.json with statusLine from template', async () => {
    // Arrange: Create template with statusLine
    const templateSettings: ClaudeSettings = {
      $schema: 'https://json.schemastore.org/claude-code-settings.json',
      env: {
        DISABLE_TELEMETRY: '1',
      },
      permissions: {
        allow: ['Bash', 'Read', 'Write'],
      },
      statusLine: {
        type: 'command',
        command: '~/.claude/ccline/ccline',
        padding: 0,
      },
    }

    writeJsonConfig(templatePath, templateSettings)

    // Act: Merge settings
    mergeSettingsFile(templatePath, targetPath)

    // Assert: Verify merged result
    const result = readJsonConfig<ClaudeSettings>(targetPath)

    expect(result).toBeDefined()
    expect(result?.statusLine).toBeDefined()
    expect(result?.statusLine?.type).toBe('command')
    expect(result?.statusLine?.command).toBe('~/.claude/ccline/ccline')
    expect(result?.statusLine?.padding).toBe(0)
  })

  it('should preserve user statusLine configuration when merging', async () => {
    // Arrange: Create template and existing user settings
    const templateSettings: ClaudeSettings = {
      statusLine: {
        type: 'command',
        command: '~/.claude/ccline/ccline',
        padding: 0,
      },
      env: {
        DISABLE_TELEMETRY: '1',
      },
    }

    const existingSettings: ClaudeSettings = {
      statusLine: {
        type: 'command',
        command: 'custom-statusline-command',
        padding: 2,
      },
      env: {
        ANTHROPIC_API_KEY: 'user-secret-key',
      },
    }

    writeJsonConfig(templatePath, templateSettings)
    writeJsonConfig(targetPath, existingSettings)

    // Act: Merge settings
    mergeSettingsFile(templatePath, targetPath)

    // Assert: User's statusLine should be preserved
    const result = readJsonConfig<ClaudeSettings>(targetPath)

    expect(result?.statusLine?.command).toBe('custom-statusline-command')
    expect(result?.statusLine?.padding).toBe(2)
    expect(result?.env?.ANTHROPIC_API_KEY).toBe('user-secret-key')
    expect(result?.env?.DISABLE_TELEMETRY).toBe('1')
  })

  it('should add statusLine when user has no existing statusLine config', async () => {
    // Arrange: Template with statusLine, user without
    const templateSettings: ClaudeSettings = {
      statusLine: {
        type: 'command',
        command: '~/.claude/ccline/ccline',
        padding: 0,
      },
      permissions: {
        allow: ['Bash'],
      },
    }

    const existingSettings: ClaudeSettings = {
      env: {
        ANTHROPIC_API_KEY: 'user-key',
      },
      permissions: {
        allow: ['Bash', 'Read', 'Write'],
      },
    }

    writeJsonConfig(templatePath, templateSettings)
    writeJsonConfig(targetPath, existingSettings)

    // Act: Merge settings
    mergeSettingsFile(templatePath, targetPath)

    // Assert: StatusLine should be added from template
    const result = readJsonConfig<ClaudeSettings>(targetPath)

    expect(result?.statusLine).toBeDefined()
    expect(result?.statusLine?.command).toBe('~/.claude/ccline/ccline')
    expect(result?.env?.ANTHROPIC_API_KEY).toBe('user-key')
    expect(result?.permissions?.allow).toEqual(['Bash', 'Read', 'Write'])
  })

  it('should handle Windows path format correctly', async () => {
    // Arrange: Template with Windows statusLine path
    const templateSettings: ClaudeSettings = {
      statusLine: {
        type: 'command',
        command: '%USERPROFILE%\\.claude\\ccline\\ccline.exe',
        padding: 0,
      },
    }

    writeJsonConfig(templatePath, templateSettings)

    // Act: Merge settings
    mergeSettingsFile(templatePath, targetPath)

    // Assert: Windows path should be preserved correctly
    const result = readJsonConfig<ClaudeSettings>(targetPath)

    expect(result?.statusLine?.command).toBe('%USERPROFILE%\\.claude\\ccline\\ccline.exe')
  })
})
