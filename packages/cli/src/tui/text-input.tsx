import { Text, useInput, usePaste } from 'ink'
import { useRef, useState } from 'react'

export interface TextInputProps {
  initial: string
  onSubmit: (value: string) => void
  onCancel: () => void
  placeholder?: string
  /** Show each character as `*`, for API keys and other secrets; `value` masks only what follows the first `=`. */
  mask?: boolean | 'value'
}

interface Editing {
  value: string
  cursor: number
}

function insertAt({ value, cursor }: Editing, text: string): Editing {
  // Pasted line breaks would end up inside a one-line value.
  const clean = text.replace(/[\r\n]+/g, '')
  return { value: value.slice(0, cursor) + clean + value.slice(cursor), cursor: cursor + clean.length }
}

/** A one-line editor: arrows, Home/End, Backspace, Ctrl+U, paste; Enter submits and Esc cancels. */
export function TextInput({ initial, onSubmit, onCancel, placeholder = '', mask = false }: TextInputProps) {
  const [state, setState] = useState<Editing>({ value: initial, cursor: initial.length })
  // Several keys can arrive before React re-renders, so updates read the latest state from here.
  const latest = useRef(state)
  const update = (change: (current: Editing) => Editing) => {
    latest.current = change(latest.current)
    setState(latest.current)
  }

  usePaste(text => update(current => insertAt(current, text)))
  useInput((input, key) => {
    if (key.return) onSubmit(latest.current.value)
    else if (key.escape) onCancel()
    else if (key.leftArrow) update(({ value, cursor }) => ({ value, cursor: Math.max(0, cursor - 1) }))
    else if (key.rightArrow) update(({ value, cursor }) => ({ value, cursor: Math.min(value.length, cursor + 1) }))
    else if (key.home || (key.ctrl && input === 'a')) update(({ value }) => ({ value, cursor: 0 }))
    else if (key.end || (key.ctrl && input === 'e')) update(({ value }) => ({ value, cursor: value.length }))
    // Most terminals send DEL for Backspace, which Ink reports as `delete`.
    else if (key.backspace || key.delete) {
      update(({ value, cursor }) =>
        cursor === 0
          ? { value, cursor }
          : { value: value.slice(0, cursor - 1) + value.slice(cursor), cursor: cursor - 1 },
      )
    } else if (key.ctrl && input === 'u') update(({ value, cursor }) => ({ value: value.slice(cursor), cursor: 0 }))
    else if (input && !key.ctrl && !key.meta && !key.tab && !key.upArrow && !key.downArrow) {
      update(current => insertAt(current, input))
    }
  })

  const { cursor } = state
  const shown = mask === 'value' ? state.value.indexOf('=') + 1 : 0
  const value =
    mask === true || (mask === 'value' && shown > 0)
      ? state.value.slice(0, shown) + '*'.repeat(state.value.length - shown)
      : state.value
  if (value === '') {
    return (
      <Text>
        <Text inverse> </Text>
        <Text dimColor>{placeholder}</Text>
      </Text>
    )
  }
  return (
    <Text>
      {value.slice(0, cursor)}
      <Text inverse>{value[cursor] ?? ' '}</Text>
      {value.slice(cursor + 1)}
    </Text>
  )
}
