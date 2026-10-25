import type { ConfigEditor, DraftPath, Field } from '@zcf/ui-kit'
import { fieldValue, formatArgs, getAt, isTable, issuesAt, parseArgs, selectValue } from '@zcf/ui-kit'
import { PlusIcon, XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

import type { Translate } from './api'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'

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
  'aria-invalid'?: boolean
}) {
  const [text, setText] = useState(format(value))
  // Follow outside changes (another field, a reload) unless the text already means the same value.
  useEffect(() => {
    setText(current => (format(parse(current)) === format(value) ? current : format(value)))
  }, [value])
  return (
    <Input
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

/** Edit a string map such as environment variables. Values stay hidden, even while edited. */
function RecordInput({ editor, path, t }: { editor: ConfigEditor; path: DraftPath; t: Translate }) {
  const record = getAt(editor.draft, path)
  const entries = isTable(record) ? Object.entries(record) : []
  const [key, setKey] = useState('')
  const add = () => {
    const name = key.trim()
    // Adding a name that already exists keeps its value.
    if (name && !entries.some(([existing]) => existing === name)) editor.update([...path, name], '')
    setKey('')
  }
  return (
    <div className="flex flex-col gap-1.5">
      {entries.map(([name, value]) => (
        <div className="grid grid-cols-[minmax(5rem,auto)_1fr_auto] items-center gap-1.5" key={name}>
          <code className="text-muted-foreground truncate font-mono text-xs" title={name}>
            {name}
          </code>
          <Input
            type="password"
            autoComplete="off"
            value={typeof value === 'string' ? value : ''}
            aria-label={name}
            onChange={event => editor.update([...path, name], event.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => editor.update([...path, name], undefined)}
            aria-label={t('tui.record.remove', { name })}
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <div className="grid grid-cols-[1fr_auto] items-center gap-1.5">
        <Input
          placeholder="KEY"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={event => setKey(event.target.value)}
          onKeyDown={event => event.key === 'Enter' && add()}
        />
        <Button variant="outline" size="sm" onClick={add} disabled={!key.trim()}>
          <PlusIcon />
          {t('web.record.add')}
        </Button>
      </div>
    </div>
  )
}

function optionText(field: Field, option: string, t: Translate): string {
  return field.optionLabel ? t(`${field.optionLabel}.${option}`) : option
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
          value={selectValue(field, value)}
          onChange={event =>
            onSelect ? onSelect(event.target.value) : editor.update(path, fieldValue(field, event.target.value))
          }
          className={cn(
            'flex h-8 w-full rounded-md border bg-card px-2 py-1 text-sm outline-none',
            'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
            'aria-invalid:border-destructive aria-invalid:ring-destructive/30',
          )}
        >
          {/* A value that is not an option, such as one written by hand, shows as it is, so choosing any option changes it. */}
          {text && !field.options?.includes(text) && <option value={text}>{text}</option>}
          {field.options?.map(option => (
            <option key={option} value={option}>
              {optionText(field, option, t)}
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
        <Input
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
    <div className={cn('flex min-w-0 flex-col gap-1.5', error && '[&_input]:border-destructive')}>
      <Label htmlFor={id} className={error && 'text-destructive'}>
        {t(field.label)}
      </Label>
      {input}
      {error ? (
        <p className="text-destructive text-xs leading-relaxed">{error}</p>
      ) : (
        field.hint && <p className="text-muted-foreground text-xs leading-relaxed">{t(field.hint)}</p>
      )}
    </div>
  )
}
