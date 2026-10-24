import { x } from 'tinyexec'

export interface CommandResult {
  /** `undefined` when the command could not be started at all, e.g. it is not installed. */
  exitCode: number | undefined
  stdout: string
  stderr: string
}

export interface CommandRunner {
  run: (command: string, args: readonly string[]) => Promise<CommandResult>
}

/** Runs real processes. tinyexec takes care of Windows `.cmd` shims and PATHEXT. */
export const processRunner: CommandRunner = {
  async run(command, args) {
    try {
      const { exitCode, stdout, stderr } = await x(command, args, { throwOnError: false })
      return { exitCode, stdout, stderr }
    } catch (error) {
      return {
        exitCode: undefined,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export function succeeded(result: CommandResult): boolean {
  return result.exitCode === 0
}
