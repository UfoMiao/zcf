import type { PresetList, ProviderPreset, ToolId, ToolStatus } from '@zcf/core'
import { applyPreset, presetSummary, TOOL_NAMES } from '@zcf/core'
import type { ConfigEditor, DraftPath, Field, McpType } from '@zcf/ui-kit'
import {
  fieldValue,
  formatArgs,
  freshName,
  getAt,
  isTable,
  issuesAt,
  mcpFields,
  newMcpServer,
  parseArgs,
  PROVIDER_FIELDS,
  renameKey,
  selectValue,
  SETTINGS_FIELDS,
  SKILL_FIELDS,
  TOOL_OPTIONS,
  withMcpType,
} from '@zcf/ui-kit'
import { Box, Text } from 'ink'
import { useEffect, useState } from 'react'

import type { Translate } from '../i18n'
import type { Row } from './row-list'
import { RowList } from './row-list'

export interface PageProps {
  editor: ConfigEditor
  t: Translate
  active: boolean
  onBack: () => void
  onEditing: (editing: boolean) => void
}

const MASK = '••••••••'

function asText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function firstIssue(editor: ConfigEditor, path: DraftPath, t: Translate): string | undefined {
  const [issue] = issuesAt(editor.validation.issues, path)
  return issue && t(issue.message.key, issue.message.params)
}

function display(field: Field, value: unknown, t: Translate): string {
  if (value === undefined || value === '') return t('tui.empty')
  if (field.kind === 'secret') return MASK
  if (field.kind === 'args' && Array.isArray(value)) return formatArgs(value.map(String))
  if (field.kind === 'list' && Array.isArray(value)) return value.map(String).join(', ')
  if (field.kind === 'record' && isTable(value)) {
    const keys = Object.keys(value)
    return keys.length === 0 ? t('tui.empty') : keys.join(', ')
  }
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function editText(field: Field, value: unknown): string {
  if (field.kind === 'args' && Array.isArray(value)) return formatArgs(value.map(String))
  if (field.kind === 'list' && Array.isArray(value)) return value.map(String).join(', ')
  return typeof value === 'string' ? value : ''
}

function parseText(field: Field, text: string): unknown {
  if (field.kind === 'args') return parseArgs(text)
  if (field.kind === 'list') {
    return text
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }
  return fieldValue(field, text.trim())
}

/** Rows for plain fields under `root`. Record fields open `onOpenRecord`. */
function fieldRows(
  editor: ConfigEditor,
  t: Translate,
  root: DraftPath,
  fields: readonly Field[],
  onOpenRecord: (path: DraftPath, label: string) => void,
  onSelect?: (field: Field, value: string) => void,
): Row[] {
  return fields.map(field => {
    const path = [...root, ...field.path]
    const value = getAt(editor.draft, path)
    const base = {
      id: path.join('.'),
      label: t(field.label),
      value: display(field, value, t),
      error: firstIssue(editor, path, t),
      hint: field.hint && t(field.hint),
    }
    if (field.kind === 'record')
      return { ...base, action: { type: 'run', run: () => onOpenRecord(path, t(field.label)) } }
    if (field.kind === 'select') {
      const options = field.options ?? []
      const label = (option: string) => (field.optionLabel ? t(`${field.optionLabel}.${option}`) : option)
      const current = selectValue(field, value)
      const step = (delta: number) => {
        // An unset field shows the first option, so cycling starts from there; a value that is
        // not an option starts before the first one, so the first press offers it.
        const next = options[(options.indexOf(current) + delta + options.length) % options.length]!
        if (onSelect) onSelect(field, next)
        else editor.update(path, next)
      }
      return {
        ...base,
        value: options.includes(current) ? label(current) : current,
        action: { type: 'cycle', next: () => step(1), previous: () => step(-1) },
      }
    }
    return {
      ...base,
      action: {
        type: 'text',
        initial: editText(field, value),
        mask: field.kind === 'secret',
        commit: text => editor.update(path, parseText(field, text)),
      },
    }
  })
}

export function SettingsPage({ editor, t, active, onBack, onEditing }: PageProps) {
  const rows = fieldRows(editor, t, [], SETTINGS_FIELDS, () => {})
  return (
    <Box flexDirection="column" gap={1}>
      <Text dimColor>{t('tui.settings.intro')}</Text>
      {editor.envMirror && (
        <Text color="yellow">{t('tui.settings.envMirror', { mirror: t(`mirror.${editor.envMirror}`) })}</Text>
      )}
      <RowList rows={rows} active={active} onBack={onBack} onEditing={onEditing} />
    </Box>
  )
}

export function ToolsPage({
  editor,
  t,
  active,
  onBack,
  onEditing,
  detected,
}: PageProps & {
  detected: Partial<Record<ToolId, ToolStatus>> | undefined
}) {
  const selected = Array.isArray(editor.draft.tools) ? editor.draft.tools : []
  const rows: Row[] = TOOL_OPTIONS.map(tool => {
    const status = detected?.[tool]
    const state = !detected
      ? t('tui.tools.checking')
      : status?.installed
        ? t('tui.tools.installed', { version: status.version ?? '?' })
        : t('tui.tools.missing')
    const on = selected.includes(tool)
    const toggle = () => editor.update(['tools'], on ? selected.filter(item => item !== tool) : [...selected, tool])
    return {
      id: tool,
      label: `${on ? '[x]' : '[ ]'} ${TOOL_NAMES[tool]}`,
      value: state,
      action: { type: 'cycle', next: toggle },
    }
  })
  return (
    <Box flexDirection="column" gap={1}>
      <Text dimColor>{t('tui.tools.intro')}</Text>
      <RowList rows={rows} active={active} onBack={onBack} onEditing={onEditing} />
    </Box>
  )
}

/** Edit a string map, such as an MCP server's environment variables. */
function RecordEditor({
  editor,
  t,
  active,
  onBack,
  onEditing,
  path,
  title,
}: PageProps & { path: DraftPath; title: string }) {
  const record = getAt(editor.draft, path)
  const entries = isTable(record) ? Object.entries(record) : []
  const rows: Row[] = [
    ...entries.map(([key, value]): Row => ({
      id: key,
      label: key,
      value: MASK,
      remove: () => editor.update([...path, key], undefined),
      action: { type: 'text', initial: String(value), mask: true, commit: text => editor.update([...path, key], text) },
    })),
    {
      id: '+add',
      label: t('tui.record.add'),
      hint: t('tui.record.addHint'),
      action: {
        type: 'text',
        initial: '',
        placeholder: 'KEY=value',
        mask: 'value',
        commit: text => {
          const at = text.indexOf('=')
          const key = (at > 0 ? text.slice(0, at) : text).trim()
          if (key) editor.update([...path, key], at > 0 ? text.slice(at + 1) : '')
        },
      },
    },
  ]
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>{title}</Text>
      <RowList rows={rows} active={active} onBack={onBack} onEditing={onEditing} />
    </Box>
  )
}

/** The description of a preset in the user's language, else in English. */
function PresetPicker({
  t,
  active,
  onBack,
  onEditing,
  lang,
  loadPresets,
  onPick,
}: Omit<PageProps, 'editor'> & {
  lang: string
  loadPresets: () => Promise<PresetList>
  onPick: (preset: ProviderPreset) => void
}) {
  const [list, setList] = useState<PresetList>()
  useEffect(() => {
    loadPresets().then(setList, () => setList({ presets: [], source: 'none' }))
  }, [loadPresets])
  const rows: Row[] = (list?.presets ?? []).map(preset => ({
    id: preset.id,
    label: preset.name,
    value: presetSummary(preset, lang),
    action: { type: 'run', run: () => onPick(preset) },
  }))
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>{t('tui.provider.presetTitle')}</Text>
      {!list && <Text dimColor>{t('tui.provider.presetsLoading')}</Text>}
      {list?.source === 'none' && <Text color="yellow">{t('tui.provider.presetsUnavailable')}</Text>}
      {list?.source === 'cache' && <Text dimColor>{t('tui.provider.presetsCached')}</Text>}
      {/* Mounted while loading too, so Esc goes back without waiting for the network. */}
      <RowList rows={rows} active={active} onBack={onBack} onEditing={onEditing} />
    </Box>
  )
}

export function ProviderPage(props: PageProps & { lang: string; loadPresets: () => Promise<PresetList> }) {
  const { editor, t, active, onBack, onEditing, lang, loadPresets } = props
  const [record, setRecord] = useState<{ path: DraftPath; title: string }>()
  const [picking, setPicking] = useState(false)
  if (record) return <RecordEditor {...props} {...record} onBack={() => setRecord(undefined)} />
  if (picking) {
    return (
      <PresetPicker
        t={t}
        active={active}
        onEditing={onEditing}
        lang={lang}
        loadPresets={loadPresets}
        onBack={() => setPicking(false)}
        onPick={preset => {
          editor.update(['provider'], applyPreset(preset, editor.draft.provider))
          setPicking(false)
        }}
      />
    )
  }
  const rows: Row[] = [
    {
      id: 'preset',
      label: t('tui.provider.preset'),
      value: t('tui.provider.presetHint'),
      action: { type: 'run', run: () => setPicking(true) },
    },
    ...fieldRows(editor, t, [], PROVIDER_FIELDS, (path, title) => setRecord({ path, title })),
  ]
  // The provider is optional; removing it is the way back to a config without one.
  if (editor.draft.provider !== undefined) {
    rows.push({
      id: 'remove',
      label: t('tui.provider.remove'),
      action: { type: 'run', run: () => editor.update(['provider'], undefined) },
    })
  }
  return (
    <Box flexDirection="column" gap={1}>
      <Text dimColor>{t('tui.provider.intro')}</Text>
      <RowList rows={rows} active={active} onBack={onBack} onEditing={onEditing} />
    </Box>
  )
}

function McpServerForm(props: PageProps & { name: string; onClose: (name?: string) => void }) {
  const { editor, t, active, onEditing, name, onClose } = props
  const [record, setRecord] = useState<{ path: DraftPath; title: string }>()
  if (record) return <RecordEditor {...props} {...record} onBack={() => setRecord(undefined)} />

  const root = ['mcpServers', name]
  const server = getAt(editor.draft, root)
  const type: McpType = isTable(server) && server.type === 'http' ? 'http' : 'stdio'
  const names = Object.keys(isTable(editor.draft.mcpServers) ? editor.draft.mcpServers : {})
  const rows: Row[] = [
    {
      id: 'name',
      label: t('field.mcp.name'),
      value: name,
      error: firstIssue(editor, ['mcpServers', name], t),
      action: {
        type: 'text',
        initial: name,
        commit: text => {
          const next = text.trim()
          if (!next || next === name || names.includes(next)) return
          editor.replace(renameKey(editor.draft, ['mcpServers'], name, next))
          onClose(next)
        },
      },
    },
    ...fieldRows(
      editor,
      t,
      root,
      mcpFields(type),
      (path, title) => setRecord({ path, title }),
      (field, value) => {
        if (field.path[0] === 'type') editor.update(root, withMcpType(server, value === 'http' ? 'http' : 'stdio'))
      },
    ),
    {
      id: 'delete',
      label: t('tui.mcp.delete'),
      action: {
        type: 'run',
        run: () => {
          editor.update(root, undefined)
          onClose()
        },
      },
    },
  ]
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>{t('tui.mcp.server', { name })}</Text>
      <RowList rows={rows} active={active} onBack={() => onClose(name)} onEditing={onEditing} />
    </Box>
  )
}

export function McpPage(props: PageProps) {
  const { editor, t, active, onBack, onEditing } = props
  const [open, setOpen] = useState<string>()
  const servers = isTable(editor.draft.mcpServers) ? editor.draft.mcpServers : {}
  if (open !== undefined && open in servers) {
    // Closing the form returns to the list; a rename keeps nothing open.
    return <McpServerForm {...props} name={open} onClose={() => setOpen(undefined)} />
  }
  const add = (type: McpType) => {
    const name = freshName(Object.keys(servers))
    editor.update(['mcpServers', name], newMcpServer(type))
    setOpen(name)
  }
  const rows: Row[] = [
    ...Object.entries(servers).map(([name, server]): Row => {
      const describe = isTable(server)
        ? server.type === 'http'
          ? asText(server.url)
          : formatArgs([asText(server.command), ...(Array.isArray(server.args) ? server.args.map(String) : [])])
        : ''
      return {
        id: name,
        label: name,
        value: describe,
        error: firstIssue(editor, ['mcpServers', name], t),
        remove: () => editor.update(['mcpServers', name], undefined),
        action: { type: 'run', run: () => setOpen(name) },
      }
    }),
    { id: '+stdio', label: t('tui.mcp.addStdio'), action: { type: 'run', run: () => add('stdio') } },
    { id: '+http', label: t('tui.mcp.addHttp'), action: { type: 'run', run: () => add('http') } },
  ]
  return (
    <Box flexDirection="column" gap={1}>
      <Text dimColor>{t('tui.mcp.intro')}</Text>
      <RowList rows={rows} active={active} onBack={onBack} onEditing={onEditing} />
    </Box>
  )
}

export function SkillsPage(props: PageProps) {
  const { editor, t, active, onBack, onEditing } = props
  const [open, setOpen] = useState<number>()
  const sources = Array.isArray(editor.draft.skills) ? editor.draft.skills : []

  if (open !== undefined && open < sources.length) {
    const rows: Row[] = [
      ...fieldRows(editor, t, ['skills', open], SKILL_FIELDS, () => {}),
      {
        id: 'delete',
        label: t('tui.skills.delete'),
        action: {
          type: 'run',
          run: () => {
            editor.update(['skills', open], undefined)
            setOpen(undefined)
          },
        },
      },
    ]
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>{t('tui.skills.source')}</Text>
        {/* A key of its own, so the cursor starts at the top instead of where it was in the list. */}
        <RowList key="source" rows={rows} active={active} onBack={() => setOpen(undefined)} onEditing={onEditing} />
      </Box>
    )
  }

  const rows: Row[] = [
    ...sources.map((source, index): Row => {
      const item = isTable(source) ? source : {}
      const skills = Array.isArray(item.skills) ? item.skills.map(String) : []
      return {
        id: String(index),
        label: asText(item.source),
        value: skills.length > 0 ? skills.join(', ') : t('tui.skills.all'),
        error: firstIssue(editor, ['skills', index], t),
        remove: () => editor.update(['skills', index], undefined),
        action: { type: 'run', run: () => setOpen(index) },
      }
    }),
    {
      id: '+add',
      label: t('tui.skills.add'),
      hint: t('hint.skill.source'),
      action: {
        type: 'text',
        initial: '',
        placeholder: 'owner/repo',
        commit: text => {
          if (text.trim()) editor.update(['skills', sources.length], { source: text.trim() })
        },
      },
    },
  ]
  return (
    <Box flexDirection="column" gap={1}>
      <Text dimColor>{t('tui.skills.intro')}</Text>
      <RowList key="list" rows={rows} active={active} onBack={onBack} onEditing={onEditing} />
    </Box>
  )
}
