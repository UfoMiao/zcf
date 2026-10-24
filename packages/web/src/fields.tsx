import type { ConfigEditor, DraftPath, Field } from '@zcf/ui-kit'
import { fieldValue, formatArgs, getAt, isTable, issuesAt, parseArgs } from '@zcf/ui-kit'
import { useEffect, useState } from 'react'

import type { Translate } from './api'

function issueText(editor: ConfigEditor, path: DraftPath, t: Translate): string | undefined {
  const [issue] = issuesAt(editor.validation.issues, path)
  return issue && t(issue.message.key, issue.message.params)
}

/** A text box that edits a parsed value, such as an argument list, keeping the text as typed. */
function ParsedInput({
  value,
  format,
  parse,
  onChange,
  ...rest
}: {
  value: unknown
  format: (value: unknown) => string
  parse: (text: string) => unknown
  onChange: (value: unknown) => void
  placeholder?: string
  id?: string
}) {
  const [text, setText] = useState(format(value))
  // Follow outside changes (another field, a reload) unless the text already means the same value.
  useEffect(() => {
    setText(current => (format(parse(current)) === format(value) ? current : format(value)))
  }, [value])
  return (
    <input
      {...rest}
      value={text}
      onChange={event => {
        // Commit on every change, so Ctrl+S right after typing saves what was typed.
        setText(event.target.value)
        onChange(parse(event.target.value))
      }}
    />
  )
}

const listFormat = (value: unknown) => (Array.isArray(value) ? value.map(String).join(', ') : '')
const listParse = (text: string) =>
  text
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
const argsFormat = (value: unknown) => (Array.isArray(value) ? formatArgs(value.map(String)) : '')

/** Edit a string map such as environment variables or headers. Values are hidden until focused. */
function RecordInput({ editor, path, t }: { editor: ConfigEditor; path: DraftPath; t: Translate }) {
  const record = getAt(editor.draft, path)
  const entries = isTable(record) ? Object.entries(record) : []
  const [key, setKey] = useState('')
  const add = () => {
    if (key.trim()) editor.update([...path, key.trim()], '')
    setKey('')
  }
  return (
    <div className="record">
      {entries.map(([name, value]) => (
        <div className="record-row" key={name}>
          <code>{name}</code>
          <input
            type="password"
            value={typeof value === 'string' ? value : ''}
            onFocus={event => (event.target.type = 'text')}
            onBlur={event => (event.target.type = 'password')}
            onChange={event => editor.update([...path, name], event.target.value)}
          />
          <button type="button" className="ghost" onClick={() => editor.update([...path, name], undefined)}>
            ×
          </button>
        </div>
      ))}
      <div className="record-row">
        <input
          placeholder="KEY"
          value={key}
          onChange={event => setKey(event.target.value)}
          onKeyDown={event => event.key === 'Enter' && add()}
        />
        <button type="button" onClick={add}>
          {t('tui.record.add')}
        </button>
      </div>
    </div>
  )
}

export function FieldInput({
  editor,
  root,
  field,
  t,
  onSelect,
}: {
  editor: ConfigEditor
  root: DraftPath
  field: Field
  t: Translate
  onSelect?: (value: string) => void
}) {
  const path = [...root, ...field.path]
  const id = path.join('.')
  const value = getAt(editor.draft, path)
  const error = issueText(editor, path, t)
  const text = typeof value === 'string' ? value : ''

  let input
  switch (field.kind) {
    case 'select':
      input = (
        <select
          id={id}
          value={text}
          onChange={event =>
            onSelect ? onSelect(event.target.value) : editor.update(path, fieldValue(field, event.target.value))
          }
        >
          {!text && <option value="">{t('tui.default', { value: field.options?.[0] ?? '' })}</option>}
          {field.options?.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
      break
    case 'args':
      input = (
        <ParsedInput
          id={id}
          value={value}
          format={argsFormat}
          parse={parseArgs}
          onChange={next => editor.update(path, next)}
        />
      )
      break
    case 'list':
      input = (
        <ParsedInput
          id={id}
          value={value}
          format={listFormat}
          parse={listParse}
          onChange={next => editor.update(path, next)}
        />
      )
      break
    case 'record':
      input = <RecordInput editor={editor} path={path} t={t} />
      break
    default:
      input = (
        <input
          id={id}
          type={field.kind === 'secret' ? 'password' : 'text'}
          autoComplete="off"
          spellCheck={false}
          value={text}
          onChange={event => editor.update(path, fieldValue(field, event.target.value))}
        />
      )
  }

  return (
    <div className={`field${error ? ' invalid' : ''}`}>
      <label htmlFor={id}>{t(field.label)}</label>
      {input}
      {error ? <small className="error">{error}</small> : field.hint && <small>{t(field.hint)}</small>}
    </div>
  )
}
