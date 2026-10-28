import type { PresetList, ProviderPreset, SkillHit, SkillSearchList, ToolId, ToolStatus } from '@zcf/core'
import {
  applyPreset,
  BUILTIN_AGENT_IDS,
  BUILTIN_SKILLS_SOURCE,
  BUILTIN_STYLE_IDS,
  presetSummary,
  SKILLS_CATALOG,
  skillDescription,
  SKILLS_SEARCH_MIN_QUERY,
  TOOL_NAMES,
  WORKFLOW_PRESETS,
} from '@zcf/core'
import type { ConfigEditor, DraftPath, Field, McpType } from '@zcf/ui-kit'
import {
  addSourcedSkill,
  fieldValue,
  formatArgs,
  freshName,
  getAt,
  hasSourcedSkill,
  isTable,
  issuesAt,
  mcpFields,
  newMcpServer,
  parseArgs,
  pickedCatalogSkills,
  presetCovered,
  PROVIDER_FIELDS,
  renameKey,
  sameProvider,
  selectValue,
  SETTINGS_FIELDS,
  SKILL_FIELDS,
  TOOL_OPTIONS,
  toggleCatalogSkill,
  togglePreset,
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

/** A `[x]` checkbox row: Enter, Space and a click all flip it through `flip`. */
function toggleRow(
  id: string,
  label: string,
  on: boolean,
  flip: () => void,
  extras: { value?: string; hint?: string } = {},
): Row {
  return {
    id,
    label: `${on ? '[x]' : '[ ]'} ${label}`,
    value: extras.value,
    hint: extras.hint,
    action: { type: 'cycle', next: flip },
  }
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
    return toggleRow(tool, TOOL_NAMES[tool], on, toggle, { value: state })
  })
  return (
    <Box flexDirection="column" gap={1}>
      <Text dimColor>{t('tui.tools.intro')}</Text>
      <RowList rows={rows} active={active} onBack={onBack} onEditing={onEditing} />
    </Box>
  )
}

/** The built-in agents, one toggle each. */
export function AgentsPage({ editor, t, active, onBack, onEditing }: PageProps) {
  const picked = Array.isArray(editor.draft.agents) ? editor.draft.agents.map(String) : []
  const rows: Row[] = BUILTIN_AGENT_IDS.map(id => {
    const on = picked.includes(id)
    const toggle = () => {
      const next = on ? picked.filter(agent => agent !== id) : [...picked, id]
      editor.update(['agents'], next.length > 0 ? next : undefined)
    }
    return toggleRow(id, id, on, toggle, { hint: t(`tui.agents.hint.${id}`) })
  })
  return (
    <Box flexDirection="column" gap={1}>
      <Text dimColor>{t('tui.agents.intro')}</Text>
      <RowList rows={rows} active={active} onBack={onBack} onEditing={onEditing} />
    </Box>
  )
}

/** The magpie install faces a cycle steps through, `undefined` first so it starts off. */
const MAGPIE_FACES = [undefined, 'client', 'cli'] as const

/** The default output style cycles through unset and every built-in style. */
const DEFAULT_STYLE_CYCLE = [undefined, ...BUILTIN_STYLE_IDS] as const

export function ExtrasPage({ editor, t, active, onBack, onEditing }: PageProps) {
  const extras = isTable(editor.draft.extras) ? editor.draft.extras : {}
  const face = extras.magpie === 'client' || extras.magpie === 'cli' ? extras.magpie : undefined
  const at = MAGPIE_FACES.indexOf(face)
  const ccline = extras.ccline === true
  const rows: Row[] = [
    {
      id: 'magpie',
      label: t('tui.extras.magpie'),
      value: t(`tui.extras.magpie.${face ?? 'none'}`),
      hint: t('tui.extras.magpieHint'),
      action: {
        type: 'cycle',
        next: () => editor.update(['extras', 'magpie'], MAGPIE_FACES[(at + 1) % MAGPIE_FACES.length]),
        previous: () =>
          editor.update(['extras', 'magpie'], MAGPIE_FACES[(at - 1 + MAGPIE_FACES.length) % MAGPIE_FACES.length]),
      },
    },
    toggleRow(
      'ccline',
      t('tui.extras.ccline'),
      ccline,
      () => editor.update(['extras', 'ccline'], ccline ? undefined : true),
      {
        hint: t('tui.extras.cclineHint'),
      },
    ),
  ]
  return (
    <Box flexDirection="column" gap={1}>
      <Text dimColor>{t('tui.extras.intro')}</Text>
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

/** A profile id from a name: lowercase, with anything but word characters folded into dashes. */
function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Saved providers, one row each: Enter copies one into the provider fields. */
function ProfilePicker({ editor, t, active, onBack, onEditing }: PageProps) {
  const list = Array.isArray(editor.draft.profiles) ? editor.draft.profiles : []
  const rows: Row[] = list.map((profile, index): Row => {
    const item = isTable(profile) ? profile : {}
    const provider = isTable(item.provider) ? item.provider : undefined
    return {
      id: asText(item.id) || String(index),
      label: asText(item.name) || asText(item.id) || String(index),
      value:
        provider !== undefined && sameProvider(editor.draft.provider, provider) ? t('tui.profiles.active') : undefined,
      error: firstIssue(editor, ['profiles', index], t),
      remove: () => editor.update(['profiles', index], undefined),
      action: {
        type: 'run',
        run: () => {
          if (provider === undefined) return
          editor.update(['provider'], provider)
          onBack()
        },
      },
    }
  })
  // There is no current provider to save when the config has none.
  if (editor.draft.provider !== undefined) {
    rows.push({
      id: '+save',
      label: t('tui.profiles.save'),
      hint: t('tui.profiles.rowHint'),
      action: {
        type: 'text',
        initial: '',
        placeholder: t('tui.profiles.namePlaceholder'),
        commit: text => {
          const name = text.trim()
          if (!name) return
          const ids = list.map(profile => (isTable(profile) ? asText(profile.id) : '')).filter(Boolean)
          editor.update(['profiles', list.length], {
            id: freshName(ids, slug(name) || 'profile'),
            name,
            provider: editor.draft.provider,
          })
        },
      },
    })
  }
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>{t('tui.profiles.title')}</Text>
      <RowList rows={rows} active={active} onBack={onBack} onEditing={onEditing} />
    </Box>
  )
}

export function ProviderPage(props: PageProps & { lang: string; loadPresets: () => Promise<PresetList> }) {
  const { editor, t, active, onBack, onEditing, lang, loadPresets } = props
  const [record, setRecord] = useState<{ path: DraftPath; title: string }>()
  const [picking, setPicking] = useState(false)
  const [profiles, setProfiles] = useState(false)
  if (record) return <RecordEditor {...props} {...record} onBack={() => setRecord(undefined)} />
  if (profiles) return <ProfilePicker {...props} onBack={() => setProfiles(false)} />
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
    {
      id: 'profiles',
      label: t('tui.profiles.row'),
      hint: t('tui.profiles.rowHint'),
      action: { type: 'run', run: () => setProfiles(true) },
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

/** The built-in skills v3 shipped, one row each: Enter toggles, Esc goes back. */
function CatalogPicker({
  t,
  active,
  onBack,
  onEditing,
  lang,
  picked,
  onToggle,
}: Omit<PageProps, 'editor'> & { lang: string; picked: readonly string[]; onToggle: (id: string) => void }) {
  const rows: Row[] = SKILLS_CATALOG.map(skill => ({
    id: skill.id,
    label: `${picked.includes(skill.id) ? '✓' : ' '} ${skill.id}`,
    value: skillDescription(skill, lang),
    action: { type: 'run', run: () => onToggle(skill.id) },
  }))
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>{t('tui.skills.catalogTitle')}</Text>
      <RowList rows={rows} active={active} onBack={onBack} onEditing={onEditing} />
    </Box>
  )
}

/**
 * Search the community skills index: type a keyword, then Enter on a hit adds it to the
 * draft. The picker stays open, so one search can add several skills.
 */
function SkillSearchPicker({
  t,
  active,
  onBack,
  onEditing,
  searchSkills,
  sources,
  onAdd,
}: Omit<PageProps, 'editor'> & {
  searchSkills: (query: string) => Promise<SkillSearchList>
  sources: readonly unknown[]
  onAdd: (hit: SkillHit) => void
}) {
  const [answer, setAnswer] = useState<'idle' | 'loading' | SkillSearchList>('idle')
  // Status rows carry no action: they are notes, and Enter on them does nothing.
  const results: Row[] =
    answer === 'idle'
      ? []
      : answer === 'loading'
        ? [{ id: 'loading', label: t('tui.skills.searching') }]
        : answer.source === 'none'
          ? [{ id: 'failed', label: t('tui.skills.searchFailed') }]
          : answer.skills.length === 0
            ? [{ id: 'empty', label: t('tui.skills.searchNone') }]
            : answer.skills.map((hit): Row => {
                const added = hasSourcedSkill(sources, hit.source, hit.name)
                return {
                  id: `${hit.source}/${hit.name}`,
                  label: hit.name,
                  value: added ? `${hit.source} · ${t('tui.skills.added')}` : hit.source,
                  hint: hit.description,
                  action: { type: 'run', run: () => onAdd(hit) },
                }
              })
  const rows: Row[] = [
    {
      id: 'query',
      label: t('tui.skills.searchQuery'),
      hint: t('tui.skills.searchHint'),
      action: {
        type: 'text',
        initial: '',
        placeholder: t('tui.skills.searchQuery'),
        // The index answers nothing for a single character, so it is not asked.
        commit: text => {
          const query = text.trim()
          if (query.length < SKILLS_SEARCH_MIN_QUERY) return
          setAnswer('loading')
          searchSkills(query).then(setAnswer, () => setAnswer({ skills: [], source: 'none' }))
        },
      },
    },
    ...results,
  ]
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>{t('tui.skills.searchTitle')}</Text>
      <RowList rows={rows} active={active} onBack={onBack} onEditing={onEditing} />
    </Box>
  )
}

export function SkillsPage(
  props: PageProps & { lang: string; searchSkills: (query: string) => Promise<SkillSearchList> },
) {
  const { editor, t, active, onBack, onEditing, lang, searchSkills } = props
  const [open, setOpen] = useState<number>()
  const [picking, setPicking] = useState(false)
  const [searching, setSearching] = useState(false)
  const sources = Array.isArray(editor.draft.skills) ? editor.draft.skills : []
  const picked = pickedCatalogSkills(sources)
  // A `zcf` source row stands for the catalog whatever its list says, even when it names no
  // skills and so installs every built-in one.
  const hasBuiltinSource = sources.some(item => isTable(item) && item.source === BUILTIN_SKILLS_SOURCE)

  if (searching) {
    return (
      <SkillSearchPicker
        t={t}
        active={active}
        onEditing={onEditing}
        searchSkills={searchSkills}
        sources={sources}
        onBack={() => setSearching(false)}
        onAdd={hit => editor.update(['skills'], addSourcedSkill(editor.draft.skills, hit.source, hit.name))}
      />
    )
  }

  if (picking) {
    return (
      <CatalogPicker
        t={t}
        active={active}
        onEditing={onEditing}
        lang={lang}
        picked={picked}
        onBack={() => setPicking(false)}
        onToggle={id => editor.update(['skills'], toggleCatalogSkill(editor.draft.skills, id))}
      />
    )
  }

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
      // The built-in source is one row named after the catalog it opens; other sources open
      // their own form.
      const builtin = asText(item.source) === BUILTIN_SKILLS_SOURCE
      return {
        id: String(index),
        label: builtin ? t('tui.skills.builtin') : asText(item.source),
        value: skills.length > 0 ? skills.join(', ') : t('tui.skills.all'),
        hint: builtin ? t('tui.skills.catalogHint') : undefined,
        error: firstIssue(editor, ['skills', index], t),
        remove: () => editor.update(['skills', index], undefined),
        action: { type: 'run', run: () => (builtin ? setPicking(true) : setOpen(index)) },
      }
    }),
    // With no `zcf` source of its own yet, this row stands in for the catalog.
    ...(hasBuiltinSource
      ? []
      : [
          {
            id: '+catalog',
            label: `+ ${t('tui.skills.builtin')}`,
            hint: t('tui.skills.catalogHint'),
            action: { type: 'run' as const, run: () => setPicking(true) },
          },
        ]),
    {
      id: '+search',
      label: t('tui.skills.search'),
      hint: t('tui.skills.searchHint'),
      action: { type: 'run', run: () => setSearching(true) },
    },
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

/** What a bundle builder holds before the entry lands in `workflows`. */
interface BundleDraft {
  /** Where the bundle lands when saved: its index, or past the end for a new one. */
  at: number
  name: string
  agents: string[]
  skills: unknown[]
  mcp: string[]
  /** A bundle is named before the rest of it is filled in. */
  named: boolean
}

/** The contents a bundle row lists: each kind of thing it bundles, counted. */
function bundleCounts(item: unknown, t: Translate): string {
  const table = isTable(item) ? item : {}
  const parts: string[] = []
  const skills = Array.isArray(table.skills) ? table.skills.length : 0
  const agents = Array.isArray(table.agents) ? table.agents.length : 0
  const mcp = Array.isArray(table.mcp) ? table.mcp.length : 0
  if (skills > 0) parts.push(t('tui.workflows.countSkills', { count: skills }))
  if (agents > 0) parts.push(t('tui.workflows.countAgents', { count: agents }))
  if (mcp > 0) parts.push(t('tui.workflows.countMcp', { count: mcp }))
  return parts.length > 0 ? parts.join(', ') : t('tui.empty')
}

export function WorkflowsPage(
  props: PageProps & { lang: string; searchSkills: (query: string) => Promise<SkillSearchList> },
) {
  const { editor, t, active, onBack, onEditing, lang, searchSkills } = props
  const [bundle, setBundle] = useState<BundleDraft>()
  const [picking, setPicking] = useState<'catalog' | 'search'>()
  const bundles = Array.isArray(editor.draft.workflows) ? editor.draft.workflows : []
  const styles = isTable(editor.draft.styles) ? editor.draft.styles : {}
  const pickedStyles = Array.isArray(styles.outputStyles) ? styles.outputStyles.map(String) : []
  const defaultStyle = typeof styles.defaultOutputStyle === 'string' ? styles.defaultOutputStyle : undefined
  const defaultAt = (DEFAULT_STYLE_CYCLE as readonly (string | undefined)[]).indexOf(defaultStyle)

  const leaveBuilder = () => {
    setPicking(undefined)
    setBundle(undefined)
  }

  if (bundle && !bundle.named) {
    // The name comes first: the builder's title and the saved entry both need one.
    const rows: Row[] = [
      {
        id: 'name',
        label: t('tui.workflows.name'),
        action: {
          type: 'text',
          initial: bundle.name,
          placeholder: t('tui.workflows.namePlaceholder'),
          commit: text => {
            const name = text.trim()
            if (name) setBundle({ ...bundle, name, named: true })
          },
        },
      },
    ]
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>{t('tui.workflows.nameTitle')}</Text>
        <RowList rows={rows} active={active} onBack={leaveBuilder} onEditing={onEditing} />
      </Box>
    )
  }

  if (bundle && picking === 'search') {
    return (
      <SkillSearchPicker
        t={t}
        active={active}
        onEditing={onEditing}
        searchSkills={searchSkills}
        sources={bundle.skills}
        onBack={() => setPicking(undefined)}
        onAdd={hit => setBundle({ ...bundle, skills: addSourcedSkill(bundle.skills, hit.source, hit.name) })}
      />
    )
  }

  if (bundle && picking === 'catalog') {
    return (
      <CatalogPicker
        t={t}
        active={active}
        onEditing={onEditing}
        lang={lang}
        picked={pickedCatalogSkills(bundle.skills)}
        onBack={() => setPicking(undefined)}
        onToggle={id => setBundle({ ...bundle, skills: toggleCatalogSkill(bundle.skills, id) ?? [] })}
      />
    )
  }

  if (bundle) {
    const servers = Object.keys(isTable(editor.draft.mcpServers) ? editor.draft.mcpServers : {})
    const rows: Row[] = [
      {
        id: 'name',
        label: t('tui.workflows.name'),
        value: bundle.name,
        error: firstIssue(editor, ['workflows', bundle.at], t),
        action: {
          type: 'text',
          initial: bundle.name,
          commit: text => {
            const name = text.trim()
            if (name) setBundle({ ...bundle, name })
          },
        },
      },
      ...BUILTIN_AGENT_IDS.map((id): Row =>
        toggleRow(
          `agent-${id}`,
          id,
          bundle.agents.includes(id),
          () =>
            setBundle({
              ...bundle,
              agents: bundle.agents.includes(id) ? bundle.agents.filter(agent => agent !== id) : [...bundle.agents, id],
            }),
          { hint: t(`tui.agents.hint.${id}`) },
        ),
      ),
      ...bundle.skills.map((source, index): Row => {
        const item = isTable(source) ? source : {}
        const skills = Array.isArray(item.skills) ? item.skills.map(String) : []
        const builtin = asText(item.source) === BUILTIN_SKILLS_SOURCE
        return {
          id: `skill-${index}`,
          label: builtin ? t('tui.skills.builtin') : asText(item.source),
          value: skills.length > 0 ? skills.join(', ') : t('tui.skills.all'),
          remove: () => setBundle({ ...bundle, skills: bundle.skills.filter((_, at) => at !== index) }),
        }
      }),
      {
        id: '+catalog',
        label: `+ ${t('tui.skills.builtin')}`,
        action: { type: 'run', run: () => setPicking('catalog') },
      },
      {
        id: '+search',
        label: t('tui.skills.search'),
        hint: t('tui.skills.searchHint'),
        action: { type: 'run', run: () => setPicking('search') },
      },
      ...servers.map((name): Row =>
        toggleRow(
          `mcp-${name}`,
          name,
          bundle.mcp.includes(name),
          () =>
            setBundle({
              ...bundle,
              mcp: bundle.mcp.includes(name) ? bundle.mcp.filter(server => server !== name) : [...bundle.mcp, name],
            }),
          { hint: t('tui.workflows.mcpHint') },
        ),
      ),
      {
        id: 'save',
        label: t('tui.workflows.save'),
        hint: t('tui.workflows.bundleHint'),
        action: {
          type: 'run',
          run: () => {
            const entry: Record<string, unknown> = { name: bundle.name }
            if (bundle.skills.length > 0) entry.skills = bundle.skills
            if (bundle.agents.length > 0) entry.agents = bundle.agents
            if (bundle.mcp.length > 0) entry.mcp = bundle.mcp
            editor.update(['workflows', bundle.at], entry)
            leaveBuilder()
          },
        },
      },
    ]
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>{t('tui.workflows.bundle', { name: bundle.name })}</Text>
        <RowList key="builder" rows={rows} active={active} onBack={leaveBuilder} onEditing={onEditing} />
      </Box>
    )
  }

  const rows: Row[] = [
    ...WORKFLOW_PRESETS.map((preset): Row => ({
      id: `preset-${preset.id}`,
      label: `${presetCovered(editor.draft.skills, editor.draft.agents, preset) ? '[x]' : '[ ]'} ${t(preset.nameKey)}`,
      action: {
        type: 'cycle',
        next: () => {
          const next = togglePreset(editor.draft.skills, editor.draft.agents, preset)
          editor.update(['skills'], next.skills)
          editor.update(['agents'], next.agents)
        },
      },
    })),
    ...bundles.map((item, index): Row => {
      const table = isTable(item) ? item : {}
      return {
        id: `bundle-${index}`,
        label: asText(table.name) || String(index),
        value: bundleCounts(item, t),
        error: firstIssue(editor, ['workflows', index], t),
        remove: () => editor.update(['workflows', index], undefined),
        action: {
          type: 'run',
          run: () => {
            setBundle({
              at: index,
              name: asText(table.name),
              agents: Array.isArray(table.agents) ? table.agents.map(String) : [],
              skills: Array.isArray(table.skills) ? [...table.skills] : [],
              mcp: Array.isArray(table.mcp) ? table.mcp.map(String) : [],
              named: true,
            })
          },
        },
      }
    }),
    {
      id: '+add',
      label: t('tui.workflows.add'),
      action: {
        type: 'run',
        run: () => setBundle({ at: bundles.length, name: '', agents: [], skills: [], mcp: [], named: false }),
      },
    },
    // The output styles ride on this page beside the bundles, the way the web lays it out.
    ...BUILTIN_STYLE_IDS.map(id => {
      const on = pickedStyles.includes(id)
      const toggle = () => {
        const next = on ? pickedStyles.filter(style => style !== id) : [...pickedStyles, id]
        editor.update(['styles', 'outputStyles'], next.length > 0 ? next : undefined)
      }
      return toggleRow(`style-${id}`, id, on, toggle, { hint: t('tui.workflows.stylesHint') })
    }),
    {
      id: 'defaultStyle',
      label: t('tui.workflows.defaultStyle'),
      value: defaultStyle ?? t('tui.empty'),
      hint: t('tui.workflows.defaultStyleHint'),
      action: {
        type: 'cycle',
        next: () =>
          editor.update(
            ['styles', 'defaultOutputStyle'],
            DEFAULT_STYLE_CYCLE[(defaultAt + 1) % DEFAULT_STYLE_CYCLE.length],
          ),
        previous: () =>
          editor.update(
            ['styles', 'defaultOutputStyle'],
            DEFAULT_STYLE_CYCLE[(defaultAt - 1 + DEFAULT_STYLE_CYCLE.length) % DEFAULT_STYLE_CYCLE.length],
          ),
      },
    },
  ]
  return (
    <Box flexDirection="column" gap={1}>
      <Text dimColor>{t('tui.workflows.intro')}</Text>
      <RowList key="list" rows={rows} active={active} onBack={onBack} onEditing={onEditing} />
    </Box>
  )
}
