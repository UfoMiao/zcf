import { describe, expect, it } from 'vitest'
import * as bridge from '../../../../src/adapters/codex/legacy-bridge'

describe('codex legacy-bridge', () => {
  it('re-exports core constants', () => {
    expect(bridge.CODEX_DIR).toBeDefined()
    expect(bridge.CODEX_CONFIG_FILE).toBeDefined()
    expect(bridge.CODEX_AGENTS_FILE).toBeDefined()
  })

  it('re-exports i18n', () => {
    expect(bridge.i18n).toBeDefined()
    expect(typeof bridge.i18n.t).toBe('function')
  })

  it('re-exports codex helpers as functions', () => {
    expect(typeof bridge.configureCodexApi).toBe('function')
    expect(typeof bridge.installCodexCli).toBe('function')
    expect(typeof bridge.readCodexConfig).toBe('function')
    expect(typeof bridge.runCodexFullInit).toBe('function')
  })

  it('re-exports fs helpers as functions', () => {
    expect(typeof bridge.ensureDir).toBe('function')
    expect(typeof bridge.exists).toBe('function')
    expect(typeof bridge.readFile).toBe('function')
    expect(typeof bridge.writeFile).toBe('function')
  })

  it('re-exports JSON config helpers as functions', () => {
    expect(typeof bridge.readJsonConfig).toBe('function')
    expect(typeof bridge.writeJsonConfig).toBe('function')
  })

  it('re-exports ZCF config helpers as functions', () => {
    expect(typeof bridge.readZcfConfig).toBe('function')
    expect(typeof bridge.updateZcfConfig).toBe('function')
  })
})
