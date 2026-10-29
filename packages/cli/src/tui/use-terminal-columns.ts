import { useStdout } from 'ink'
import { useEffect, useState } from 'react'

function terminalColumns(stdout: object): number {
  return 'columns' in stdout && typeof stdout.columns === 'number' ? stdout.columns : 100
}

/** Terminal columns, re-read whenever the terminal is resized; 100 otherwise. */
export function useTerminalColumns(): number {
  const { stdout } = useStdout()
  const [columns, setColumns] = useState(() => terminalColumns(stdout))
  useEffect(() => {
    const onResize = () => setColumns(terminalColumns(stdout))
    stdout.on('resize', onResize)
    return () => {
      stdout.off('resize', onResize)
    }
  }, [stdout])
  return columns
}
