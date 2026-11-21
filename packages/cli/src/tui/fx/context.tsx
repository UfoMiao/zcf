import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import type { Theme } from '../theme'
import { createTheme } from '../theme'
import type { Clock } from './ticker'
import { systemClock, Ticker } from './ticker'

/** What every visual piece of the UI reads: the colours, whether things move, and the clock. */
export interface Fx {
  theme: Theme
  /** False under reduced motion: every animation shows its final, still frame. */
  motion: boolean
  ticker: Ticker
  clock: Clock
}

const defaultFx: Fx = { theme: createTheme(1, 'dark'), motion: false, ticker: new Ticker(), clock: systemClock }

const FxContext = createContext<Fx>(defaultFx)

/** The ticker's frame as of the last render; only animated leaves read it, so only they re-render. */
const FrameContext = createContext(0)

/**
 * Registers demand for frames. Each call makes its own listener: the ticker keeps a
 * set, so a shared function would count every animation as one, and the first to end
 * would stop the rest.
 */
function demand(ticker: Ticker): () => void {
  return ticker.subscribe(() => {})
}

export function FxProvider({ fx, children }: { fx: Fx; children: ReactNode }) {
  const [frame, setFrame] = useState(fx.ticker.frame)
  useEffect(() => fx.ticker.drive(() => setFrame(fx.ticker.frame)), [fx.ticker])
  return (
    <FxContext.Provider value={fx}>
      <FrameContext.Provider value={frame}>{children}</FrameContext.Provider>
    </FxContext.Provider>
  )
}

export function useFx(): Fx {
  return useContext(FxContext)
}

export function useTheme(): Theme {
  return useContext(FxContext).theme
}

/**
 * Frames counted from when `active` turned on, for animations that run as long as
 * their work does — spinners, the planning wave. Undefined while inactive or under
 * reduced motion, which callers draw as the still frame.
 */
export function useFrame(active: boolean): number | undefined {
  const { ticker, motion } = useFx()
  const now = useContext(FrameContext)
  const on = motion && active
  const [start, setStart] = useState(ticker.frame)
  useEffect(() => {
    if (!on) return undefined
    setStart(ticker.frame)
    return demand(ticker)
  }, [on, ticker])
  return on ? Math.max(0, now - start) : undefined
}

/**
 * A one-shot animation of `frames` frames, played on mount and again whenever
 * `trigger` changes. Returns the frame while it plays, undefined once it has ended —
 * and at once under reduced motion or while `enabled` is false — so it leaves no
 * subscription behind.
 */
export function useOneShot(frames: number, trigger: unknown, enabled = true): number | undefined {
  const { ticker, motion } = useFx()
  const now = useContext(FrameContext)
  const on = motion && enabled
  // The frame the current play started on; undefined until its effect has run.
  const [play, setPlay] = useState<{ trigger: unknown; start: number | undefined }>({ trigger, start: undefined })
  const started = play.trigger === trigger && play.start !== undefined
  const frame = started ? Math.max(0, now - play.start!) : 0
  const playing = on && frame < frames
  useEffect(() => {
    if (on) setPlay({ trigger, start: ticker.frame })
  }, [on, trigger, ticker])
  useEffect(() => {
    if (!playing) return undefined
    return demand(ticker)
  }, [playing, ticker])
  return playing ? frame : undefined
}
