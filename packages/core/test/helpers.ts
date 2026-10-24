import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { join } from 'pathe'
import { afterEach } from 'vitest'

import type { CommandResult, CommandRunner } from '../src/exec/runner'

export interface FakeRunner extends CommandRunner {
  calls: string[][]
}

/** Answers commands from a table keyed by "command arg1 arg2"; anything else is "not installed". */
export function fakeRunner(responses: Record<string, Partial<CommandResult>> = {}): FakeRunner {
  const calls: string[][] = []
  return {
    calls,
    async run(command, args) {
      calls.push([command, ...args])
      const response = responses[[command, ...args].join(' ')]
      if (!response) return { exitCode: undefined, stdout: '', stderr: `${command}: not found` }
      return {
        exitCode: 0,
        stdout: '',
        stderr: '',
        ...response,
      }
    },
  }
}

const temps: string[] = []

/** A fresh temp folder, removed after the test. */
export async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'zcf-test-'))
  temps.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(temps.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})
