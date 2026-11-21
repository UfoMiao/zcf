/**
 * The one clock every animation in the terminal UI shares. The interval only exists
 * while something subscribes, so a UI at rest holds no timers at all; tests hand in a
 * clock of their own and step frames with `tick()`.
 */

/** The timer functions the UI uses, so tests can stand in for the real ones. Handles are plain ids. */
export interface Clock {
  setInterval: (callback: () => void, ms: number) => number
  clearInterval: (handle: number) => void
  setTimeout: (callback: () => void, ms: number) => number
  clearTimeout: (handle: number) => void
}

const timers = new Map<number, ReturnType<typeof setTimeout>>()
let nextTimer = 1

function track(timer: ReturnType<typeof setTimeout>): number {
  const id = nextTimer++
  timers.set(id, timer)
  return id
}

export const systemClock: Clock = {
  setInterval: (callback, ms) => track(setInterval(callback, ms)),
  clearInterval: handle => {
    clearInterval(timers.get(handle))
    timers.delete(handle)
  },
  setTimeout: (callback, ms) => {
    const id = track(
      setTimeout(() => {
        timers.delete(id)
        callback()
      }, ms),
    )
    return id
  },
  clearTimeout: handle => {
    clearTimeout(timers.get(handle))
    timers.delete(handle)
  },
}

/** 80 ms a frame: 12.5 frames a second, smooth enough for glyphs and cheap to draw. */
export const FRAME_MS = 80

export class Ticker {
  private readonly listeners = new Set<() => void>()
  private handle: number | undefined
  private driver: (() => void) | undefined
  /** Frames since the ticker was made; animations count from the frame they started on. */
  frame = 0

  constructor(private readonly clock: Clock = systemClock) {}

  /** How many animations are playing. */
  get subscribers(): number {
    return this.listeners.size
  }

  /** Whether the interval exists. */
  get running(): boolean {
    return this.handle !== undefined
  }

  /** Calls `listener` once a frame until the returned function is called; starts the interval if needed. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    if (this.handle === undefined) this.handle = this.clock.setInterval(() => this.tick(), FRAME_MS)
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0 && this.handle !== undefined) {
        this.clock.clearInterval(this.handle)
        this.handle = undefined
      }
    }
  }

  /**
   * Sets the one callback that turns a frame into a render. It does not count as a
   * subscriber: the interval still runs only while an animation wants frames. One
   * driver means one render a frame however many animations play — Ink's legacy root
   * would otherwise render the whole screen once per animation.
   */
  drive(driver: () => void): () => void {
    this.driver = driver
    return () => {
      if (this.driver === driver) this.driver = undefined
    }
  }

  /** Advances one frame. The interval calls this; tests call it by hand. */
  tick(): void {
    this.frame += 1
    this.driver?.()
    for (const listener of Array.from(this.listeners)) listener()
  }
}
