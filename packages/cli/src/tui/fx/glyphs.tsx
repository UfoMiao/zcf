import { Text } from 'ink'

import { useTheme, useFrame } from './context'
import { Paint } from './paint'

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const

/** A braille spinner while `active`; under reduced motion, a still `…`. */
export function Spinner({ active = true }: { active?: boolean }) {
  const theme = useTheme()
  const frame = useFrame(active)
  return <Text {...theme.tone('accent')}>{frame === undefined ? '…' : SPINNER[frame % SPINNER.length]}</Text>
}

const RAMP = '▁▂▃▄▅▆▇'

/** The cells of a rising tide `width` wide at `frame`; undefined is the still ramp. */
export function waveCells(width: number, frame: number | undefined): string {
  if (frame === undefined) return Array.from({ length: width }, (_, i) => RAMP[i % RAMP.length]).join('')
  // A triangle wave rolling right: up the ramp and back down, one cell a frame.
  const period = (RAMP.length - 1) * 2
  return Array.from({ length: width }, (_, i) => {
    const phase = (((i - frame) % period) + period) % period
    return RAMP[phase < RAMP.length ? phase : period - phase]
  }).join('')
}

/** A small tide wave on the gradient while `active`: planning, a tool that is running. */
export function Wave({ width = 6, active = true }: { width?: number; active?: boolean }) {
  const theme = useTheme()
  const frame = useFrame(active)
  return <Paint text={waveCells(width, frame)} colors={theme.gradient(width)} />
}

/** The swell under the wordmark: still at rest, rolling only while ZCF plans or applies. */
export const TIDE = '▁▂▃▅▆▇▆▅▃▂▁▁▂▃▄▅▄▃▂▁▁▂▄▅'

export function tideCells(frame: number | undefined): string {
  if (frame === undefined) return TIDE
  const cells = Array.from(TIDE)
  const offset = frame % cells.length
  return [...cells.slice(cells.length - offset), ...cells.slice(0, cells.length - offset)].join('')
}

export function TideLine({ rolling }: { rolling: boolean }) {
  const theme = useTheme()
  const frame = useFrame(rolling)
  const text = tideCells(frame)
  // Below 256 colours the line takes one accent colour; the gradient needs the range.
  return theme.rich ? (
    <Paint text={text} colors={theme.gradient(TIDE.length, 0.3)} />
  ) : (
    <Text {...theme.tone('accent')}>{text}</Text>
  )
}

/**
 * The diagonal hatch beside a title. While `flowing`, a bright cell runs along it;
 * at rest it is a faded gradient.
 */
export function Hatch({ width, flowing = false }: { width: number; flowing?: boolean }) {
  const theme = useTheme()
  const frame = useFrame(flowing)
  const text = '╱'.repeat(width)
  if (!theme.rich) return <Text {...theme.tone('dim')}>{text}</Text>
  const bright = theme.gradient(width)
  const faded = theme.gradient(width, 0.55)
  const head = frame === undefined ? -1 : frame % (width + 3)
  return <Paint text={text} colors={faded.map((color, i) => (i <= head && i >= head - 2 ? bright[i] : color))} />
}
