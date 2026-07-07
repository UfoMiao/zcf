import { describe, expect, it } from 'vitest'
import * as bridge from '../../../../src/adapters/claude-code/legacy-bridge'

describe('claude-code legacy-bridge', () => {
  it('re-exports core constants', () => {
    expect(bridge.CLAUDE_DIR).toBeDefined()
    expect(bridge.SETTINGS_FILE).toBeDefined()
  })

  it('re-exports i18n', () => {
    expect(bridge.i18n).toBeDefined()
    expect(typeof bridge.i18n.t).toBe('function')
  })

  it('re-exports config helpers as functions', () => {
    expect(typeof bridge.configureApi).toBe('function')
    expect(typeof bridge.backupExistingConfig).toBe('function')
    expect(typeof bridge.applyAiLanguageDirective).toBe('function')
  })

  it('re-exports CCR helpers as functions', () => {
    expect(typeof bridge.installCcr).toBe('function')
    expect(typeof bridge.isCcrInstalled).toBe('function')
  })

  it('re-exports installer helpers as functions', () => {
    expect(typeof bridge.installClaudeCode).toBe('function')
    expect(typeof bridge.verifyInstallation).toBe('function')
  })

  it('re-exports MCP helpers as functions', () => {
    expect(typeof bridge.readMcpConfig).toBe('function')
    expect(typeof bridge.writeMcpConfig).toBe('function')
  })

  it('re-exports ZCF config helpers as functions', () => {
    expect(typeof bridge.readZcfConfig).toBe('function')
    expect(typeof bridge.updateZcfConfig).toBe('function')
  })
})
