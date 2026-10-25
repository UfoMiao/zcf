import { useStdout } from 'ink'

/** Terminal rows when the stream reports them; 24 otherwise, the usual terminal floor. */
export function useTerminalRows(): number {
  const { stdout } = useStdout()
  return 'rows' in stdout && typeof stdout.rows === 'number' ? stdout.rows : 24
}
