/**
 * Mouse reporting for the terminal: SGR where it exists, the X10 legacy encoding where
 * it does not. Ink 8 parses only keys and discards mouse sequences, so this module reads
 * the same stdin in parallel and publishes presses to whoever is on screen; each
 * listener hit-tests against its own box.
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
// with keystrokes in front of it that can never complete. Only the part from the escape
// byte of a half sequence can still become a press; the cap is a runaway valve, sized
// above the longest sequence a huge terminal can send (four-digit coordinates).
// The escape byte is the point: a mouse sequence is a control sequence.
// oxlint-disable-next-line no-control-regex
const SGR_SEQUENCE = /\u001B\[<(\d+);(\d+);(\d+)([Mm])/y
const MAX_CARRY = 24

/** SGR button codes: 0-2 are clicks and 64/65 the wheel; releases, motion and modifier bits are not presses. */
function isPress(button: number): boolean {
  return (button >= 0 && button < 3) || button === 64 || button === 65
}

/**
 * Parses mouse presses out of a stdin chunk, in either encoding a terminal sends:
 * SGR (`ESC[<button;col;rowM`) or the X10 legacy xterm grew out of (`ESC[M` then three
 * bytes, each the 1-based value plus 32) that a terminal without SGR support — such as
 * a legacy Windows console — still speaks. Releases and motion reports are dropped:
 * nothing on screen needs them. Half a sequence at the end of the chunk is carried for
 * the next chunk to complete; an abandoned prefix is skipped, so the sequences behind
 * it still parse.
 */
export function parseMousePresses(chunk: string): { presses: MousePress[]; rest: string } {
  const presses: MousePress[] = []
  let index = 0
  // End of the last complete sequence; only what follows it can still be half of one.
  let consumed = 0
  while (index < chunk.length) {
    const escape = chunk.indexOf('\u001B', index)
    if (escape < 0) break
    if (chunk.startsWith('\u001B[<', escape)) {
      SGR_SEQUENCE.lastIndex = escape
      const match = SGR_SEQUENCE.exec(chunk)
      if (match) {
        const button = Number(match[1])
        if (match[4] === 'M' && isPress(button)) {
          presses.push({ button, col: Number(match[2]), row: Number(match[3]) })
        }
        index = escape + match[0].length
        consumed = index
      } else {
        // Half a sequence, or an abandoned prefix; move past the escape either way.
        index = escape + 1
      }
    } else if (chunk.startsWith('\u001B[M', escape) && escape + 6 <= chunk.length) {
      // Three bytes: button, column, row, each the value plus 32. A coordinate past
      // byte 126 does not fit its byte and arrives mangled through UTF-8; dropped.
      const button = chunk.charCodeAt(escape + 3) - 32
      const colByte = chunk.charCodeAt(escape + 4)
      const rowByte = chunk.charCodeAt(escape + 5)
      if (isPress(button) && colByte <= 126 && rowByte <= 126)
        presses.push({ button, col: colByte - 32, row: rowByte - 32 })
      index = escape + 6
      consumed = index
    } else {
      // Another escape sequence, a keystroke; not ours.
      index = escape + 1
    }
  }
  // The leftover may end in half a sequence; carry it from its escape byte, capped at
  // a whole sequence's length so junk cannot grow the carry forever.
  const tail = chunk.slice(consumed)
  const lastEscape = tail.lastIndexOf('\u001B')
  const halfSequence =
    lastEscape >= 0 && (tail.startsWith('\u001B[<', lastEscape) || tail.startsWith('\u001B[M', lastEscape))
  const rest = halfSequence ? tail.slice(lastEscape) : ''
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
