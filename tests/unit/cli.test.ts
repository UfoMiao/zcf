import { resolve } from 'pathe'
import { exec } from 'tinyexec'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('cLI', () => {
  const cliPath = resolve(__dirname, '../../bin/zcf.mjs')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('zcf command', () => {
    it('should run without errors when showing help', async () => {
      const result = await exec(process.execPath, [cliPath, '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('ZCF - Zero-Config Code Flow')
      expect(result.stdout).toContain('Commands')
    })

    it('should display version', async () => {
      const result = await exec(process.execPath, [cliPath, '--version'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
    })
  })

  describe('command structure', () => {
    it('should have init command alias', async () => {
      const result = await exec(process.execPath, [cliPath, '--help'])

      expect(result.stdout).toContain('zcf init')
      expect(result.stdout).toContain('zcf i')
    })

    it('should have update command alias', async () => {
      const result = await exec(process.execPath, [cliPath, '--help'])

      expect(result.stdout).toContain('zcf update')
      expect(result.stdout).toContain('zcf u')
    })
  })
})
