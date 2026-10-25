import { Box, Text, useInput } from 'ink'
import { useState } from 'react'

import { TextInput } from './text-input'
import { useTerminalRows } from './use-terminal-rows'

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

/** Lines the list may not claim: banner, status rows, panel borders, key bar, page titles and hints. */
const LIST_CHROME = 18

/**
 * A vertical list of labelled rows. ↑/↓ move, Enter edits a text row, runs an action
 * or cycles a choice (←/→ cycle too), x removes an item, and Esc goes back.
 * A list taller than the terminal shows a window around the cursor, with arrows at the cut ends.
 */
export function RowList({ rows, active, onBack, onEditing }: RowListProps) {
  const [selected, setSelected] = useState(0)
  const [editing, setEditing] = useState(false)
  const index = Math.min(selected, Math.max(0, rows.length - 1))
  const row = rows[index]
  // Values line up in one column after the longest label. Rows without a value count too:
  // an edited row renders in this box, and its label must never wrap inside a narrower one.
  const labelWidth = Math.max(0, ...rows.map(item => columns(item.label))) + 4

  // The terminal height caps the list; the window follows the cursor.
  const visible = Math.max(3, useTerminalRows() - LIST_CHROME)
  const capped = rows.length > visible
  // Both arrow lines are reserved whenever the list is capped, shown or not.
  const size = capped ? visible - 2 : rows.length
  const start = capped ? Math.max(0, Math.min(index - (size >> 1), rows.length - size)) : 0
  const shown = rows.slice(start, start + size)

  const setEdit = (value: boolean) => {
    setEditing(value)
    onEditing?.(value)
  }

  useInput(
    (input, key) => {
      if (key.upArrow || input === 'k') setSelected(Math.max(0, index - 1))
      else if (key.downArrow || input === 'j') setSelected(Math.min(rows.length - 1, index + 1))
      else if (key.escape || (key.leftArrow && row?.action?.type !== 'cycle')) onBack()
      else if (!row) return
      else if (input === 'x' && row.remove) row.remove()
      else if (row.action?.type === 'cycle' && (key.leftArrow || key.rightArrow || key.return || input === ' ')) {
        if (key.leftArrow) (row.action.previous ?? row.action.next)()
        else row.action.next()
      } else if (key.return && row.action?.type === 'run') row.action.run()
      else if (key.return && row.action?.type === 'text') setEdit(true)
    },
    { isActive: active && !editing },
  )

  return (
    <Box flexDirection="column">
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
                  {pointer} {item.label}
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
