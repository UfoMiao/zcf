import { existsSync } from 'node:fs'
import cac from 'cac'
import { describe, expect, it, vi } from 'vitest'
import { setupCommands } from '../../src/cli-setup'
import { CODEX_AGENTS_FILE, CODEX_CONFIG_FILE, ZCF_CONFIG_FILE } from '../../src/constants'

vi.mock('../../src/utils/code-tools/codex', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/code-tools/codex')>()
  return {
    ...actual,
    runCodexFullInit: vi.fn(async () => {
      throw new Error('runCodexFullInit must not run for illegal output styles')
    }),
  }
})

vi.mock('../../src/utils/zcf-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/zcf-config')>()
  return {
    ...actual,
    updateZcfConfig: vi.fn(),
  }
})

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(async () => {
      throw new Error('illegal output-style must not open a prompt')
    }),
  },
}))

describe('codex illegal output-style CLI', () => {
  it('rejects init -T codex -s -o totally-invalid before any Codex or ZCF writes', async () => {
    const { runCodexFullInit } = await import('../../src/utils/code-tools/codex')
    const { updateZcfConfig } = await import('../../src/utils/zcf-config')
    const existed = {
      agents: existsSync(CODEX_AGENTS_FILE),
      config: existsSync(CODEX_CONFIG_FILE),
      zcf: existsSync(ZCF_CONFIG_FILE),
    }

    const cli = cac('zcf')
    await setupCommands(cli)
    cli.parse([
      'node',
      'zcf',
      'init',
      '-T',
      'codex',
      '-s',
      '-o',
      'totally-invalid',
      '-g',
      'en',
      '-t',
      'skip',
      '-w',
      'skip',
      '-x',
      'false',
    ], { run: false })

    await expect(cli.runMatchedCommand()).rejects.toThrow(/Invalid output style|invalidOutputStyle/)
    expect(runCodexFullInit).not.toHaveBeenCalled()
    expect(updateZcfConfig).not.toHaveBeenCalled()
    expect(existsSync(CODEX_AGENTS_FILE)).toBe(existed.agents)
    expect(existsSync(CODEX_CONFIG_FILE)).toBe(existed.config)
    expect(existsSync(ZCF_CONFIG_FILE)).toBe(existed.zcf)
  })
})
