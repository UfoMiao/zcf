import process from 'node:process'
import { resolve } from 'pathe'
import { exec } from 'tinyexec'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('cLI', () => {
  const cliPath = resolve(__dirname, '../../bin/ccs.mjs')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ccs command', () => {
    it('should run without errors when showing help', async () => {
      const result = await exec(process.execPath, [cliPath, '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('ccs - Claude Code Switch')
      expect(result.stdout).toContain('Commands')
    })

    it('should display version', async () => {
      const result = await exec(process.execPath, [cliPath, '--version'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
    })
  })

  describe('command structure', () => {
    it('should expose config-switch command', async () => {
      const result = await exec(process.execPath, [cliPath, '--help'])

      expect(result.stdout).toContain('config-switch')
    })

    it('should expose check-updates command', async () => {
      const result = await exec(process.execPath, [cliPath, '--help'])

      expect(result.stdout).toContain('check-updates')
    })
  })
})
