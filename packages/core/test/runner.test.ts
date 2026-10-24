import process from 'node:process'

import { describe, expect, it } from 'vitest'

import { processRunner, succeeded } from '../src/exec/runner'

describe('processRunner', () => {
  it('captures output and the exit code', async () => {
    const result = await processRunner.run(process.execPath, [
      '-e',
      'console.log("hi"); console.error("oops"); process.exit(3)',
    ])
    expect(result).toEqual({ exitCode: 3, stdout: 'hi\n', stderr: 'oops\n' })
    expect(succeeded(result)).toBe(false)
  })

  it('adds extra environment variables to the current ones', async () => {
    const result = await processRunner.run(
      process.execPath,
      ['-e', 'console.log(process.env.npm_config_registry, Boolean(process.env.PATH))'],
      { env: { npm_config_registry: 'https://registry.npmmirror.com' } },
    )
    expect(result.stdout).toBe('https://registry.npmmirror.com true\n')
  })

  it('reports a command that cannot start', async () => {
    const result = await processRunner.run('zcf-command-that-does-not-exist', [])
    expect(succeeded(result)).toBe(false)
    expect(result.exitCode).not.toBe(0)
  })
})
