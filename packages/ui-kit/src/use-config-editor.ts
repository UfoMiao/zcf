import type { ConfigIssue, Mirror } from '@zcf/core/schema'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Draft, DraftPath, Validation } from './draft'
import { setAt, validateDraft } from './draft'
import type { ZcfService } from './service'

export type EditorStatus = 'loading' | 'ready' | 'broken'

export interface ConfigEditor {
  status: EditorStatus
  path: string
  draft: Draft
  validation: Validation
  /** Why the file could not be read, when `status` is `broken`. */
  loadIssues: ConfigIssue[]
  /** The mirror `ZCF_MIRROR` picks, which outranks the draft's `mirror` while ZCF runs. */
  envMirror?: Mirror
  dirty: boolean
  saving: boolean
  update: (path: DraftPath, value: unknown) => void
  replace: (draft: Draft) => void
  /** Save when the draft is valid; resolves to whether it was saved. */
  save: () => Promise<boolean>
  /**
   * Update one field and persist just it now. Nothing else the draft holds reaches the
   * disk: the write is the diff from the draft as it stands, so fields still being
   * edited stay unsaved. A draft that is not valid only moves in memory, since writing
   * a config that does not exist yet would put its problems on disk.
   */
  saveField: (path: DraftPath, value: unknown) => Promise<void>
}

const EMPTY: Draft = { version: 1 }

export function useConfigEditor(service: ZcfService): ConfigEditor {
  const [status, setStatus] = useState<EditorStatus>('loading')
  const [path, setPath] = useState('')
  const [draft, setDraft] = useState<Draft>(EMPTY)
  // The draft as last loaded or saved by this editor, so a save writes only this editor's changes.
  const [saved, setSaved] = useState<Draft | undefined>(EMPTY)
  const [loadIssues, setLoadIssues] = useState<ConfigIssue[]>([])
  const [saving, setSaving] = useState(false)
  const [envMirror, setEnvMirror] = useState<Mirror>()

  useEffect(() => {
    let active = true
    void service.load().then(
      loaded => {
        if (!active) return
        setPath(loaded.path)
        setEnvMirror(loaded.envMirror)
        if (loaded.draft) {
          setDraft(loaded.draft)
          // A config that does not exist yet counts as unsaved, so the first save writes it.
          setSaved(loaded.exists ? loaded.draft : undefined)
          setStatus('ready')
        } else {
          setLoadIssues(loaded.issues)
          setStatus('broken')
        }
      },
      (error: unknown) => {
        if (!active) return
        // Such as a config the user may not read; shown like a broken file.
        const message = error instanceof Error ? error.message : String(error)
        setLoadIssues([{ path: '', message: { key: 'configIssue.unreadable', params: { message } } }])
        setStatus('broken')
      },
    )
    return () => {
      active = false
    }
  }, [service])

  const validation = useMemo(() => validateDraft(draft), [draft])
  const update = useCallback((at: DraftPath, value: unknown) => setDraft(current => setAt(current, at, value)), [])

  // A ref, not state: a second Ctrl+S can arrive before React re-renders.
  const busy = useRef(false)
  const save = useCallback(async () => {
    // One save at a time, so an older draft never lands on disk after a newer one.
    if (!validation.valid || busy.current) return false
    busy.current = true
    setSaving(true)
    try {
      await service.save(draft, saved)
      setSaved(draft)
      return true
    } finally {
      busy.current = false
      setSaving(false)
    }
  }, [draft, saved, service, validation.valid])
  const savedText = useMemo(() => saved && JSON.stringify(saved), [saved])

  // The base is the draft itself, so the write carries this one field and nothing else pending.
  const saveField = useCallback(
    async (at: DraftPath, value: unknown) => {
      const next = setAt(draft, at, value)
      setDraft(next)
      if (!validation.valid) return
      await service.save(next, draft)
      // The field is on disk now. A config that did not exist yet was written whole, since
      // a missing file has no keys to diff against, so the draft counts as saved.
      setSaved(current => (current ? setAt(current, at, value) : next))
    },
    [draft, service, validation.valid],
  )

  return {
    status,
    path,
    draft,
    validation,
    loadIssues,
    envMirror,
    dirty: JSON.stringify(draft) !== savedText,
    saving,
    update,
    replace: setDraft,
    save,
    saveField,
  }
}
