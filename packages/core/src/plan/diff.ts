import { createTwoFilesPatch } from 'diff'

import { applyKeyEdits } from '../io/editors'
import { readTextIfExists } from '../io/fs'
import type { FileStep } from './types'

export interface FilePreview {
  path: string
  before: string | undefined
  after: string
  changed: boolean
  /** Unified diff, empty when nothing changes. */
  patch: string
}

/** Work out what a file step would write, without touching the disk. */
export async function previewFileStep(
  step: FileStep,
  read: (path: string) => Promise<string | undefined> = readTextIfExists,
): Promise<FilePreview> {
  const before = await read(step.path)
  const after = await applyKeyEdits(step.format, before, step.edits)
  const changed = before !== after
  const patch = changed
    ? createTwoFilesPatch(
        step.path,
        step.path,
        before ?? '',
        after,
        before === undefined ? '(new file)' : undefined,
        undefined,
        { context: 3 },
      )
    : ''
  return {
    path: step.path,
    before,
    after,
    changed,
    patch,
  }
}
