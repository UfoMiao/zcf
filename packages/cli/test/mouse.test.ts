import { describe, expect, it } from 'vitest'

import {
  type MousePress,
  attachMouseStdin,
  contains,
  onMousePress,
  parseMousePresses,
  publishMousePress,
  setMouseReporting,
  wheelDirection,
} from '../src/tui/mouse'

describe('parseMousePresses', () => {
  it('parses SGR presses and wheel turns, dropping releases and motion', () => {
    const { presses } = parseMousePresses('\u001B[<0;12;5M\u001B[<0;12;5m\u001B[<32;9;9M\u001B[<64;3;3M\u001B[<65;3;4M')
    expect(presses).toEqual([
      { button: 0, col: 12, row: 5 },
      { button: 64, col: 3, row: 3 },
      { button: 65, col: 3, row: 4 },
    ])
  })

  it('keeps half a sequence for the chunk that completes it', () => {
    const first = parseMousePresses('\r\u001B[<0;12')
    expect(first.presses).toEqual([])
    const second = parseMousePresses(`${first.rest};5Mj`)
    expect(second.presses).toEqual([{ button: 0, col: 12, row: 5 }])
    // A trailing keystroke can never become part of a sequence, so it is dropped.
    expect(second.rest).toBe('')
  })

  it('keeps half of the longest sequence a terminal sends, dropping junk before it', () => {
    // Four-digit coordinates make the longest SGR sequence there is; keystrokes ride the
    // same stream and may sit in front of a half sequence split across chunk borders.
    const first = parseMousePresses('junk\u001B[<64;1000;100')
    expect(first.presses).toEqual([])
    expect(first.rest).toBe('\u001B[<64;1000;100')
    const second = parseMousePresses(`${first.rest}0M`)
    expect(second.presses).toEqual([{ button: 64, col: 1000, row: 1000 }])
  })

  it('drops a tail longer than a whole sequence instead of growing forever', () => {
    const { presses, rest } = parseMousePresses('x'.repeat(64))
    expect(presses).toEqual([])
    expect(rest).toBe('')
  })

  it('parses the legacy X10 encoding terminals without SGR send', () => {
    // `\u001B[M` then button+32, col+32, row+32, the encoding xterm grew out of.
    const legacy = `\u001B[M${String.fromCharCode(32, 42, 35)}`
    const { presses } = parseMousePresses(legacy)
    expect(presses).toEqual([{ button: 0, col: 10, row: 3 }])
    // The wheel is 96/97 there, which lands on the same 64/65 buttons as SGR.
    const wheel = parseMousePresses(`\u001B[M${String.fromCharCode(97, 33, 34)}`)
    expect(wheel.presses).toEqual([{ button: 65, col: 1, row: 2 }])
    // A release is button 3 in the legacy encoding, modifier clicks 4-31 and motion 32-63;
    // none is a press, and coordinates past byte 126 cannot survive UTF-8.
    for (const button of [35, 36, 65]) {
      const dropped = parseMousePresses(`\u001B[M${String.fromCharCode(button, 33, 34)}`)
      expect(dropped.presses).toEqual([])
    }
    const mangled = parseMousePresses(`\u001B[M${String.fromCharCode(32, 255, 34)}`)
    expect(mangled.presses).toEqual([])
  })

  it('keeps half of a legacy sequence for the chunk that completes it', () => {
    const first = parseMousePresses(`\u001B[M${String.fromCharCode(32, 42)}`)
    expect(first.presses).toEqual([])
    const second = parseMousePresses(`${first.rest}${String.fromCharCode(35)}`)
    expect(second.presses).toEqual([{ button: 0, col: 10, row: 3 }])
  })

  it('skips an abandoned prefix without swallowing the sequences behind it', () => {
    // A stream that never finishes `\u001B[<0;1` must not cost the press after it.
    const { presses, rest } = parseMousePresses('\u001B[<0;1\u001B[<0;2;3M')
    expect(presses).toEqual([{ button: 0, col: 2, row: 3 }])
    expect(rest).toBe('')
  })
})

describe('wheelDirection', () => {
  it('tells the wheel direction apart from a button press', () => {
    expect(wheelDirection({ button: 64, col: 1, row: 1 })).toBe('up')
    expect(wheelDirection({ button: 65, col: 1, row: 1 })).toBe('down')
    expect(wheelDirection({ button: 0, col: 1, row: 1 })).toBeUndefined()
  })
})

describe('contains', () => {
  it('hit-tests a press against a measured box, in the 1-based columns terminals report', () => {
    const bounds = { x: 19, width: 20 }
    expect(contains(bounds, { button: 0, col: 20, row: 1 })).toBe(true)
    expect(contains(bounds, { button: 0, col: 39, row: 1 })).toBe(true)
    expect(contains(bounds, { button: 0, col: 19, row: 1 })).toBe(false)
    expect(contains(bounds, { button: 0, col: 40, row: 1 })).toBe(false)
  })
})

describe('attachMouseStdin', () => {
  it('reads presses off the stream and unsubscribes cleanly', () => {
    const listeners = new Set<(data: string) => void>()
    const stdin = {
      on: (_event: 'data', listener: (data: string) => void) => listeners.add(listener),
      off: (_event: 'data', listener: (data: string) => void) => listeners.delete(listener),
    }
    const seen: MousePress[] = []
    const detach = attachMouseStdin(stdin, press => seen.push(press))
    for (const listener of Array.from(listeners)) listener('\u001B[<0;3;4M')
    expect(seen).toEqual([{ button: 0, col: 3, row: 4 }])
    detach()
    expect(listeners.size).toBe(0)
  })
})

describe('mouse reporting and listeners', () => {
  it('writes the escape sequences only for a TTY', () => {
    const written: string[] = []
    const tty = { isTTY: true, write: (text: string) => written.push(text) }
    setMouseReporting(tty, true)
    setMouseReporting(tty, false)
    expect(written).toEqual(['\u001B[?1000h\u001B[?1006h', '\u001B[?1000l\u001B[?1006l'])
    setMouseReporting({ write: (text: string) => written.push(text) }, true)
    expect(written).toHaveLength(2)
  })

  it('delivers presses to subscribers until they unsubscribe', () => {
    const seen: MousePress[] = []
    const detach = onMousePress(press => seen.push(press))
    publishMousePress({ button: 64, col: 1, row: 1 })
    detach()
    publishMousePress({ button: 0, col: 2, row: 2 })
    expect(seen).toEqual([{ button: 64, col: 1, row: 1 }])
  })
})
