import type { ConfigIssue } from '@zcf/core/schema'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
  dirty: boolean
  saving: boolean
  update: (path: DraftPath, value: unknown) => void
  replace: (draft: Draft) => void
  /** Save when the draft is valid; resolves to whether it was saved. */
  save: () => Promise<boolean>
}

const EMPTY: Draft = { version: 1 }

export function useConfigEditor(service: ZcfService): ConfigEditor {
  const [status, setStatus] = useState<EditorStatus>('loading')
  const [path, setPath] = useState('')
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saved, setSaved] = useState(JSON.stringify(EMPTY))
  const [loadIssues, setLoadIssues] = useState<ConfigIssue[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void service.load().then(loaded => {
      if (!active) return
      setPath(loaded.path)
      if (loaded.draft) {
        setDraft(loaded.draft)
        // A config that does not exist yet counts as unsaved, so the first save writes it.
        setSaved(loaded.exists ? JSON.stringify(loaded.draft) : '')
        setStatus('ready')
      } else {
        setLoadIssues(loaded.issues)
        setStatus('broken')
      }
    })
    return () => {
      active = false
    }
  }, [service])

  const validation = useMemo(() => validateDraft(draft), [draft])
  const update = useCallback((at: DraftPath, value: unknown) => setDraft(current => setAt(current, at, value)), [])

  const save = useCallback(async () => {
    if (!validation.valid) return false
    setSaving(true)
    try {
      await service.save(draft)
      setSaved(JSON.stringify(draft))
      return true
    } finally {
      setSaving(false)
    }
  }, [draft, service, validation.valid])

  return {
    status,
    path,
    draft,
    validation,
    loadIssues,
    dirty: JSON.stringify(draft) !== saved,
    saving,
    update,
    replace: setDraft,
    save,
  }
}
