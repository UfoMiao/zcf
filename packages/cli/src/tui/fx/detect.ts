import chalk from 'chalk'

import type { Background, ColorLevel } from '../theme'
import { createTheme, detectBackground, detectColorLevel, detectMotion } from '../theme'
import type { Fx } from './context'
import type { Clock } from './ticker'
import { systemClock, Ticker } from './ticker'

/** What a caller may pin instead of detecting: tests step frames by hand and pick the colours. */
export interface FxOptions {
  colorLevel?: ColorLevel
  background?: Background
  motion?: boolean
  clock?: Clock
  ticker?: Ticker
}

/**
 * The UI's colours and motion, worked out once at startup: the colour level is the one
 * Ink paints at (chalk's detector), NO_COLOR and the background from the environment,
 * and motion from the environment and whether the output is a terminal.
 */
export function resolveFx(
  options: FxOptions,
  env: Readonly<Record<string, string | undefined>>,
  isTTY: boolean | undefined,
): Fx {
  const clock = options.clock ?? systemClock
  return {
    theme: createTheme(
      options.colorLevel ?? detectColorLevel(env, chalk.level),
      options.background ?? detectBackground(env),
    ),
    motion: options.motion ?? detectMotion(env, isTTY),
    clock,
    ticker: options.ticker ?? new Ticker(clock),
  }
}
