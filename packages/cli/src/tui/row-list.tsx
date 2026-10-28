import { digitIndex, isDigitKey } from '@zcf/ui-kit'
import { type DOMElement, Box, Text, measureElement, useInput } from 'ink'
import { useEffect, useRef, useState } from 'react'

import { contains, onMousePress, wheelDirection } from './mouse'
import { TextInput } from './text-input'
import { useTerminalRows } from './use-terminal-rows'
import { windowRange } from './window'

export type RowAction =
  | { type: 'text'; initial: string; placeholder?: string; mask?: boolean | 'value'; commit: (text: string) => void }
  | { type: 'cycle'; next: () => void; previous?: () => void }
  | { type: 'run'; run: () => void }

export interface Row {
  id: string
  label: string
  value?: string
  /** Shown in red under the row. */
  error?: string
  /** Shown dimmed under the row while it is selected. */
  hint?: string
  /** A row without one is a plain message, such as a loading note; Enter does nothing. */
  action?: RowAction
  /** Called on `x` or Delete, for rows that stand for a removable item. */
  remove?: () => void
}

/** Terminal columns a label takes; CJK and other wide characters take two. */
function columns(text: string): number {
  let width = 0
  for (const char of text)
    width += /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/u.test(char)
      ? 2
      : 1
  return width
}

export interface RowListProps {
  rows: readonly Row[]
  /** Whether keys go to this list. */
  active: boolean
  onBack: () => void
  /** Reports whether a row is being edited, so the app can hold back its own shortcuts. */
  onEditing?: (editing: boolean) => void
}

/**
 * Lines the list may not claim: banner, status rows, panel borders, key bar, page titles
 * and the selected row's hint — the hint takes a line of its own inside a capped window,
 * so it is budgeted here rather than left to push a label out of the render.
 */
const LIST_CHROME = 19

/** Lines a row takes once rendered: its own, an error, or the selected row's hint while focused. */
function rowHeight(item: Row, selected: boolean, active: boolean): number {
  return 1 + (item.error || (selected && active && item.hint) ? 1 : 0)
}

/**
 * A vertical list of labelled rows, numbered within the visible window. ↑/↓ move,
 * a digit picks the row it names without running it, Enter edits a text row, runs an
 * action or cycles a choice (←/→ cycle too), x removes an item, and Esc goes back.
 * A list taller than the terminal shows a window around the cursor, with arrows at the cut ends.
 */
export function RowList({ rows, active, onBack, onEditing }: RowListProps) {
  const [selected, setSelected] = useState(0)
  const [editing, setEditing] = useState(false)
  const listRef = useRef<DOMElement | null>(null)
  const index = Math.min(selected, Math.max(0, rows.length - 1))
  const row = rows[index]

  // The terminal height caps the list; the window follows the cursor.
  const visible = Math.max(3, useTerminalRows() - LIST_CHROME)
  const { capped, start, size } = windowRange(rows.length, index, visible)
  const shown = rows.slice(start, start + size)

  // Ordinals number the visible window — scrolling renumbers what it shows, which is
  // the design, not a bug to fix — padded to the width of the window's largest ordinal,
  // so every label starts in the same column whether it sits under a 1 or a 10.
  const ordinalDigits = String(shown.length).length
  const ordinalWidth = ordinalDigits + 1
  // Values line up in one column after the longest label, ordinal prefix included.
  // Rows without a value count too: an edited row renders in this box, and its label
  // must never wrap inside a narrower one.
  const labelWidth = Math.max(0, ...rows.map(item => columns(item.label))) + 2 + ordinalWidth + 2

  const setEdit = (value: boolean) => {
    setEditing(value)
    onEditing?.(value)
  }

  // What a click and Enter share: run an action, cycle a choice, or open the text editor.
  const activate = (item: Row) => {
    if (item.action?.type === 'text') setEdit(true)
    else {
      if (editing) setEdit(false)
      if (item.action?.type === 'run') item.action.run()
      else if (item.action?.type === 'cycle') item.action.next()
    }
  }

  // A click lands on the row it selects, then runs what Enter would run; the wheel moves
  // the selection. Only presses inside this list act, so the nav column keeps its own.
  useEffect(() => {
    if (!active) return undefined
    return onMousePress(press => {
      const list = listRef.current
      if (!list) return
      const metrics = measureElement(list)
      if (!contains(metrics, press)) return
      const direction = wheelDirection(press)
      if (direction) {
        setSelected(direction === 'up' ? Math.max(0, index - 1) : Math.min(rows.length - 1, index + 1))
        return
      }
      // Walk the rendered lines: each row takes what rowHeight says, and the top arrow,
      // when drawn, takes one more. Presses above that belong to the page, not to a row.
      const offset = press.row - 1 - metrics.y
      let line = start > 0 ? 1 : 0
      if (offset < line) return
      for (let position = start; position < start + shown.length; position++) {
        const item = rows[position]!
        const height = rowHeight(item, position === index, active)
        if (offset < line + height) {
          setSelected(position)
          activate(item)
          return
        }
        line += height
      }
    })
  }, [active, rows, index, start, shown.length, editing])

  useInput(
    (input, key) => {
      if (key.upArrow || input === 'k') setSelected(Math.max(0, index - 1))
      else if (key.downArrow || input === 'j') setSelected(Math.min(rows.length - 1, index + 1))
      // A digit picks the visible row it names without running it; a digit past the
      // window is ignored.
      else if (input && isDigitKey(input)) {
        const at = start + digitIndex(input)
        if (at < start + shown.length) setSelected(at)
      } else if (key.escape || (key.leftArrow && row?.action?.type !== 'cycle')) onBack()
      else if (!row) return
      else if (input === 'x' && row.remove) row.remove()
      else if (row.action?.type === 'cycle' && (key.leftArrow || key.rightArrow || input === ' ')) {
        if (key.leftArrow) (row.action.previous ?? row.action.next)()
        else row.action.next()
      } else if (key.return) activate(row)
    },
    { isActive: active && !editing },
  )

  return (
    <Box ref={listRef} flexDirection="column">
      {capped && start > 0 && <Text dimColor>{'  ↑'}</Text>}
      {shown.map((item, offset) => {
        const position = start + offset
        const current = position === index
        const pointer = current && active ? '›' : ' '
        const editor =
          current && editing && item.action?.type === 'text' ? (
            <TextInput
              initial={item.action.initial}
              placeholder={item.action.placeholder}
              mask={item.action.mask}
              onSubmit={text => {
                setEdit(false)
                if (item.action?.type === 'text') item.action.commit(text)
              }}
              onCancel={() => setEdit(false)}
            />
          ) : undefined
        return (
          <Box key={item.id} flexDirection="column">
            <Box>
              <Box width={editor || item.value !== undefined ? labelWidth : undefined} flexShrink={0}>
                <Text color={current && active ? 'cyan' : undefined}>
                  {pointer} {String(offset + 1).padStart(ordinalDigits, ' ')} {item.label}
                </Text>
              </Box>
              {editor ?? (item.value !== undefined && <Text dimColor={!current}>{item.value}</Text>)}
            </Box>
            {item.error && <Text color="red">{`    ${item.error}`}</Text>}
            {current && active && item.hint && !item.error && <Text dimColor>{`    ${item.hint}`}</Text>}
          </Box>
        )
      })}
      {capped && start + size < rows.length && <Text dimColor>{'  ↓'}</Text>}
    </Box>
  )
}
