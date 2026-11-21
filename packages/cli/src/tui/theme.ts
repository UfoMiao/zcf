/**
 * The "Tide" theme: the terminal UI's colours, worked out once at startup from what the
 * terminal can show. Truecolor and 256-colour terminals get gradients; 16-colour ones
 * get one named accent, the look before Tide; NO_COLOR gets none at all, and selection
 * falls back to inverse video. Pure data and arithmetic — no React, no Ink — so the
 * tokens are tested on their own and nothing here runs on the `--version` path.
 */

/** 0 none, 1 the 16 named colours, 2 256 colours, 3 truecolor — chalk's levels, which Ink paints with. */
export type ColorLevel = 0 | 1 | 2 | 3

export type Background = 'dark' | 'light'

/** The text tones every part of the UI picks from. */
export type Tone = 'fg' | 'dim' | 'faint' | 'ok' | 'warn' | 'err' | 'accent'

export interface Palette {
  /** The gradient's stops, painted left to right by column. */
  stops: readonly [string, string, string]
  fg: string
  dim: string
  faint: string
  ok: string
  warn: string
  err: string
  accent: string
  /** Key and button chips that are not focused. */
  chip: string
  /** The selected row of a list. */
  rowSelect: string
  /** Text drawn on a filled gradient or error chip. */
  onFill: string
  /** The terminal background a fade mixes towards. */
  base: string
  /** What a sweep's highlight band mixes towards. */
  glow: string
}

export const DARK: Palette = {
  stops: ['#1aa6b3', '#38cbd6', '#7ff0c6'],
  fg: '#d6dce4',
  dim: '#7a838f',
  faint: '#3a414b',
  ok: '#5fe0a1',
  warn: '#f2b84b',
  err: '#ff6f83',
  accent: '#38cbd6',
  chip: '#1b2329',
  rowSelect: '#12262b',
  onFill: '#0b1418',
  base: '#0b0f12',
  glow: '#ffffff',
}

export const LIGHT: Palette = {
  stops: ['#0a5f68', '#0e7c86', '#0b7a5c'],
  fg: '#1a1d21',
  dim: '#5f6670',
  faint: '#c9d0d6',
  ok: '#1a7f37',
  warn: '#8a5c00',
  err: '#c4314b',
  accent: '#0e7c86',
  chip: '#e6ebee',
  rowSelect: '#e1eff0',
  onFill: '#ffffff',
  base: '#ffffff',
  glow: '#39d3c3',
}

/** The named colour each tone falls back to on a 16-colour terminal; dim tones use the dim attribute. */
const NAMED: Partial<Record<Tone, string>> = { ok: 'green', warn: 'yellow', err: 'red', accent: 'cyan' }

type Env = Readonly<Record<string, string | undefined>>

/** `ZCF_THEME` wins; otherwise `COLORFGBG` names the background (7 or 15 is a light one); otherwise dark. */
export function detectBackground(env: Env): Background {
  const pinned = env.ZCF_THEME?.trim().toLowerCase()
  if (pinned === 'light' || pinned === 'dark') return pinned
  const bg = env.COLORFGBG?.split(';').at(-1)
  return bg === '7' || bg === '15' ? 'light' : 'dark'
}

/** NO_COLOR turns colour off whatever the terminal could show; otherwise the level Ink paints at. */
export function detectColorLevel(env: Env, inkLevel: number): ColorLevel {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return 0
  if (inkLevel >= 3) return 3
  if (inkLevel >= 2) return 2
  return inkLevel >= 1 ? 1 : 0
}

/**
 * Motion is off for people who ask for less of it, in CI, on dumb terminals and when
 * the output is not a terminal at all. NO_COLOR alone keeps the glyph motion.
 */
export function detectMotion(env: Env, isTTY: boolean | undefined): boolean {
  if (env.ZCF_REDUCED_MOTION !== undefined && env.ZCF_REDUCED_MOTION !== '' && env.ZCF_REDUCED_MOTION !== '0')
    return false
  if (env.CI !== undefined && env.CI !== '' && env.CI !== 'false' && env.CI !== '0') return false
  if (env.TERM === 'dumb') return false
  return isTTY === true
}

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function toHex([r, g, b]: readonly number[]): string {
  return `#${[r, g, b].map(part => Math.round(part!).toString(16).padStart(2, '0')).join('')}`
}

/** `a` moved `amount` (0–1) of the way to `b`. */
export function mix(a: string, b: string, amount: number): string {
  const from = channels(a)
  const to = channels(b)
  return toHex(from.map((part, index) => part + (to[index]! - part) * amount))
}

/** The colour at `t` (0–1) along the stops, interpolated linearly between neighbours. */
export function gradientAt(stops: readonly string[], t: number): string {
  if (stops.length === 1) return stops[0]!
  const clamped = Math.max(0, Math.min(1, t))
  const span = clamped * (stops.length - 1)
  const index = Math.min(stops.length - 2, Math.floor(span))
  return mix(stops[index]!, stops[index + 1]!, span - index)
}

/**
 * Bands a gradient is drawn in. Each band is one colour run: Ink re-tokenizes every
 * colour escape on every frame, so a gradient with a colour per column costs several
 * times more CPU while anything animates, for a difference the eye barely sees.
 */
export const GRADIENT_BANDS = 12

/** One colour per column across `count` columns, first stop to last, in at most `bands` steps. */
export function gradientColumns(stops: readonly string[], count: number, bands = GRADIENT_BANDS): string[] {
  const steps = Math.max(1, Math.min(bands, count) - 1)
  return Array.from({ length: count }, (_, column) => {
    const t = count <= 1 ? 0 : column / (count - 1)
    return gradientAt(stops, Math.round(t * steps) / steps)
  })
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(part => {
    const value = part / 255
    return value <= 0.039_28 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const first = luminance(a)
  const second = luminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

/** Props for an Ink `Text`, so a tone spreads straight onto it. */
export interface ToneProps {
  color?: string
  dimColor?: boolean
}

/** Props for a filled chip: a background with text on it, or inverse video without colour. */
export interface FillProps {
  color?: string
  backgroundColor?: string
  inverse?: boolean
  bold?: boolean
}

export interface Theme {
  level: ColorLevel
  background: Background
  palette: Palette
  /** Whether gradients and colour sweeps are drawn: 256 colours and up. */
  rich: boolean
  tone: (tone: Tone) => ToneProps
  /** A colour value for a tone, or undefined where the tone is the dim attribute or no colour. */
  color: (tone: Tone) => string | undefined
  /** A row or chip background, only where the terminal has the colours for it. */
  surface: (which: 'chip' | 'rowSelect') => string | undefined
  /**
   * One colour per column. Rich terminals get the gradient, faded towards the
   * background by `fade` (0–1); 16 colours get the accent everywhere; none get undefined.
   */
  gradient: (count: number, fade?: number) => (string | undefined)[]
  /** A filled chip: the accent gradient's middle, or the error colour for a destructive one. */
  fill: (kind: 'accent' | 'err') => FillProps
}

export function createTheme(level: ColorLevel, background: Background): Theme {
  const palette = background === 'light' ? LIGHT : DARK
  const rich = level >= 2
  const color = (tone: Tone): string | undefined => {
    if (level === 0) return undefined
    if (rich) return palette[tone]
    return NAMED[tone]
  }
  return {
    level,
    background,
    palette,
    rich,
    color,
    tone: tone => {
      const value = color(tone)
      if (value) return { color: value }
      return tone === 'dim' || tone === 'faint' ? { dimColor: true } : {}
    },
    surface: which => (rich ? palette[which] : undefined),
    gradient: (count, fade = 0) => {
      if (level === 0) return Array.from({ length: count }, () => undefined)
      if (!rich) return Array.from({ length: count }, () => 'cyan')
      return gradientColumns(palette.stops, count).map(hex => (fade > 0 ? mix(hex, palette.base, fade) : hex))
    },
    fill: kind => {
      if (level === 0) return { inverse: true, bold: true }
      if (!rich) return { color: 'black', backgroundColor: kind === 'err' ? 'red' : 'cyan', bold: true }
      return {
        color: palette.onFill,
        backgroundColor: kind === 'err' ? palette.err : palette.stops[1],
        bold: true,
      }
    },
  }
}
