import { x } from 'tinyexec'

export interface CommandResult {
  /** `undefined` when the command could not be started at all, e.g. it is not installed. */
  exitCode: number | undefined
  stdout: string
  stderr: string
}

export interface RunOptions {
  /** Added to the current environment. */
  env?: Record<string, string>
}

export interface CommandRunner {
  run: (command: string, args: readonly string[], options?: RunOptions) => Promise<CommandResult>
}

/** Runs real processes. tinyexec takes care of Windows `.cmd` shims and PATHEXT. */
export const processRunner: CommandRunner = {
  async run(command, args, options = {}) {
    try {
      // tinyexec merges `env` over the current environment.
      const { exitCode, stdout, stderr } = await x(command, args, {
        throwOnError: false,
        // tinyexec would put the running Node's bin folder first on PATH; tools must be found on the user's own PATH.
        nodePath: false,
        nodeOptions: options.env ? { env: options.env } : undefined,
      })
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
