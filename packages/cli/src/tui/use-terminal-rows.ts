import { useStdout } from 'ink'
import { useEffect, useState } from 'react'

function terminalRows(stdout: object): number {
  return 'rows' in stdout && typeof stdout.rows === 'number' ? stdout.rows : 24
}

/** Terminal rows, re-read whenever the terminal is resized; 24 otherwise, the usual terminal floor. */
export function useTerminalRows(): number {
  const { stdout } = useStdout()
  const [rows, setRows] = useState(() => terminalRows(stdout))
  useEffect(() => {
    const onResize = () => setRows(terminalRows(stdout))
    stdout.on('resize', onResize)
    return () => {
      stdout.off('resize', onResize)
    }
  }, [stdout])
  return rows
}
