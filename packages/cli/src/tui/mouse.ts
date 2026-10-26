/**
 * Mouse reporting for terminals that speak the SGR protocol. Ink 8 parses only keys and
 * discards mouse sequences, so this module reads the same stdin in parallel and publishes
 * presses to whoever is on screen; each listener hit-tests against its own box.
 */

/** SGR button codes: 0 left, 1 middle, 2 right; 64 and 65 are the wheel. */
export interface MousePress {
  button: number
  /** 1-based terminal column and row, the way the terminal reports them. */
  col: number
  row: number
}

export type MouseListener = (press: MousePress) => void

/** A stream Ink reads keys from; mouse sequences ride the same bytes. */
export type MouseStdin = {
  on: (event: 'data', listener: (data: string | Buffer) => void) => unknown
  off: (event: 'data', listener: (data: string | Buffer) => void) => unknown
}

/** A stream the escape sequences that turn reporting on and off are written to. */
export type MouseStdout = {
  isTTY?: boolean
  write: (text: string) => unknown
}

const listeners = new Set<MouseListener>()

/** Delivers a parsed press to every subscribed listener. */
export function publishMousePress(press: MousePress): void {
  for (const listener of Array.from(listeners)) listener(press)
}

/** Subscribes to mouse presses from the running UI; returns the unsubscribe. */
export function onMousePress(listener: MouseListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The wheel direction of a press, or undefined when it is not the wheel. */
export function wheelDirection(press: MousePress): 'up' | 'down' | undefined {
  if (press.button === 64) return 'up'
  if (press.button === 65) return 'down'
  return undefined
}

/** A measured box on screen, the part of ink's measureElement output hit-testing needs. */
export interface PressBounds {
  x: number
  width: number
}

/** Whether a press lands inside a measured box's columns; mouse reports are 1-based. */
export function contains(bounds: PressBounds, press: MousePress): boolean {
  const col = press.col - 1
  return col >= bounds.x && col < bounds.x + bounds.width
}

// A sequence split across chunk borders is rare but real; the tail may hold half of one,
// with keystrokes in front of it that can never complete. Only the part from the last
// escape byte can still become a press; the cap is a runaway valve, sized above the
// longest sequence a huge terminal can send (four-digit coordinates).
// The escape byte is the point: a mouse sequence is a control sequence.
// oxlint-disable-next-line no-control-regex
const SEQUENCE = /\u001B\[<(\d+);(\d+);(\d+)([Mm])/g
const MAX_CARRY = 24

/**
 * Parses SGR mouse presses out of a stdin chunk. Releases and motion reports are dropped:
 * nothing on screen needs them. Returns presses plus the unparsed tail from the last
 * escape byte, which may be half of a sequence the next chunk completes.
 */
export function parseMousePresses(chunk: string): { presses: MousePress[]; rest: string } {
  const presses: MousePress[] = []
  let end = 0
  for (const match of Array.from(chunk.matchAll(SEQUENCE))) {
    const button = Number(match[1])
    // Only button presses and wheel turns are presses; modifier bits and motion are not.
    if (match[4] === 'M' && (button < 3 || button === 64 || button === 65)) {
      presses.push({ button, col: Number(match[2]), row: Number(match[3]) })
    }
    end = (match.index ?? 0) + match[0].length
  }
  const tail = chunk.slice(end)
  const escape = tail.lastIndexOf('\u001B')
  const rest = escape >= 0 ? tail.slice(escape) : ''
  return { presses, rest: rest.length > MAX_CARRY ? '' : rest }
}

/**
 * Follows stdin alongside Ink's key parsing and turns mouse sequences into presses.
 * Ink sees the same bytes and throws the mouse ones away, so neither side disturbs the other.
 */
export function attachMouseStdin(stdin: MouseStdin, publish: (press: MousePress) => void): () => void {
  let carry = ''
  const onData = (data: string | Buffer) => {
    const { presses, rest } = parseMousePresses(carry + data.toString())
    carry = rest
    for (const press of presses) publish(press)
  }
  stdin.on('data', onData)
  return () => {
    stdin.off('data', onData)
  }
}

/** Asks a TTY to report clicks and wheel turns; `on: false` hands selection back to the terminal. */
export function setMouseReporting(stdout: MouseStdout, on: boolean): void {
  if (!stdout.isTTY) return
  // 1000 reports button presses, 1006 the SGR coordinates we parse.
  stdout.write(on ? '\u001B[?1000h\u001B[?1006h' : '\u001B[?1000l\u001B[?1006l')
}
