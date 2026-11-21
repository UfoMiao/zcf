import { type DOMElement, Box, Text, measureElement, useInput } from 'ink'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import type { FrameTone } from './frame'
import { GradientFrame } from './frame'
import { useOneShot, useTheme } from './fx/context'
import { FillText } from './fx/paint'
import { onMousePress, wheelDirection } from './mouse'

export interface DialogButton {
  label: string
  run: () => void
  /** Drops changes or overwrites files: its focused chip is red. */
  destructive?: boolean
}

/** Frames of the open animation: the box grows out of the middle. */
export const GROW_FRAMES = 4

/** The chip text of a button: `▸` marks focus, and the same slot stays blank otherwise, so the row never shifts. */
function chip(label: string, focused: boolean): string {
  return ` ${focused ? '▸' : ' '} ${label} `
}

/**
 * The button row every pop-up ends with. Exactly one button is focused: a filled chip
 * with a `▸`; the rest are muted chips with the same slot left blank. A click runs a
 * button the way Enter runs the focused one.
 */
export function ButtonRow({
  buttons,
  focus,
  active,
}: {
  buttons: readonly DialogButton[]
  focus: number
  active: boolean
}) {
  const theme = useTheme()
  const refs = useRef<(DOMElement | null)[]>([])

  useEffect(() => {
    if (!active) return undefined
    return onMousePress(press => {
      if (wheelDirection(press) || press.button !== 0) return
      for (const [index, element] of refs.current.entries()) {
        if (!element) continue
        const box = measureElement(element)
        const col = press.col - 1
        const row = press.row - 1
        if (col >= box.x && col < box.x + box.width && row === box.y) {
          buttons[index]?.run()
          return
        }
      }
    })
  }, [active, buttons])

  return (
    <Box justifyContent="flex-end" gap={2}>
      {buttons.map((button, index) => (
        <Box
          key={button.label}
          ref={element => {
            refs.current[index] = element
          }}
        >
          {index === focus ? (
            <FillText text={chip(button.label, true)} kind={button.destructive ? 'err' : 'accent'} />
          ) : (
            <Text backgroundColor={theme.surface('chip')} {...theme.tone('fg')}>
              {chip(button.label, false)}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  )
}

/**
 * The focus model every pop-up shares: ←/→ (and h/l) move without wrapping, Tab and
 * Shift+Tab wrap, ↑/↓ move too unless the view uses them to scroll, Enter runs the
 * focused button and Esc cancels. `extra` sees every key first and returns true for
 * the ones it took, such as `q` inside the quit dialog.
 */
export function useButtonFocus({
  buttons,
  initial,
  active,
  onCancel,
  verticalMoves = true,
  extra,
}: {
  buttons: readonly DialogButton[]
  initial: number
  active: boolean
  onCancel: () => void
  verticalMoves?: boolean
  extra?: (input: string, key: Parameters<Parameters<typeof useInput>[0]>[1]) => boolean
}): number {
  const [focus, setFocus] = useState(initial)
  const last = buttons.length - 1
  const at = Math.min(focus, last)
  useInput(
    (input, key) => {
      if (extra?.(input, key)) return
      if (key.escape) onCancel()
      else if (key.return) buttons[at]?.run()
      else if (key.tab) setFocus(key.shift ? (at + last) % (last + 1) : (at + 1) % (last + 1))
      else if (key.leftArrow || input === 'h' || (verticalMoves && key.upArrow)) setFocus(Math.max(0, at - 1))
      else if (key.rightArrow || input === 'l' || (verticalMoves && key.downArrow)) setFocus(Math.min(last, at + 1))
    },
    { isActive: active },
  )
  return at
}

/**
 * A pop-up: a frame on the gradient (or in the warning or error colour) holding its
 * content and a button row, with a blank cell cleared around it. It opens with a
 * four-frame grow from the middle; keys work from the first frame, so Esc during the
 * grow closes it at once.
 */
export function Dialog({
  width,
  tone = 'accent',
  buttons,
  initial,
  active,
  onCancel,
  verticalMoves = true,
  extra,
  footer,
  clear = true,
  children,
}: {
  width: number
  tone?: FrameTone
  /** None while the dialog is busy; `footer` shows in their place. */
  buttons?: readonly DialogButton[]
  initial: number
  active: boolean
  onCancel: () => void
  verticalMoves?: boolean
  extra?: (input: string, key: Parameters<Parameters<typeof useInput>[0]>[1]) => boolean
  footer?: ReactNode
  /** Leave a blank cell around the box, for a dialog drawn over other content. */
  clear?: boolean
  children: ReactNode
}) {
  const focus = useButtonFocus({
    buttons: buttons ?? [],
    initial,
    active: active && buttons !== undefined,
    onCancel,
    verticalMoves,
    extra,
  })
  const grow = useOneShot(GROW_FRAMES, 'open')
  if (grow !== undefined) {
    const share = (grow + 1) / (GROW_FRAMES + 1)
    return (
      <Box padding={clear ? 1 : 0}>
        <GradientFrame width={Math.max(4, Math.round(width * share))} tone={tone}>
          <Box height={grow} />
        </GradientFrame>
      </Box>
    )
  }
  return (
    <Box padding={clear ? 1 : 0}>
      <GradientFrame width={width} tone={tone} paddingX={2}>
        <Box flexDirection="column" gap={1}>
          {children}
          {buttons ? <ButtonRow buttons={buttons} focus={focus} active={active} /> : footer}
        </Box>
      </GradientFrame>
    </Box>
  )
}

/**
 * The frame width for a dialog drawn over an area `room` columns wide: as wide as it
 * prefers, but always leaving its cleared cell on each side, so its border never sits
 * against the panel's.
 */
export function dialogWidth(preferred: number, room: number): number {
  return Math.max(4, Math.min(preferred, room - 2))
}
