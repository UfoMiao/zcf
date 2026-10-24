import { createTwoFilesPatch } from 'diff'

import { applyKeyEdits, FileSyntaxError, parseConfigText } from '../io/editors'
import { readTextIfExists } from '../io/fs'
import { sensitiveValues } from '../io/secrets'
import type { FileStep } from './types'

export interface FilePreview {
  path: string
  before: string | undefined
  after: string
  changed: boolean
  /** Unified diff, empty when nothing changes. */
  patch: string
  /** Credential values found in either version of the file; front ends must mask them. */
  secrets: string[]
}

/** Work out what a file step would write, without touching the disk. */
export async function previewFileStep(
  step: FileStep,
  read: (path: string) => Promise<string | undefined> = readTextIfExists,
): Promise<FilePreview> {
  const before = await read(step.path)
  const after = await applyKeyEdits(step.format, before, step.edits).catch((error: unknown) => {
    throw error instanceof FileSyntaxError
      ? new FileSyntaxError(error.format, error.line, error.column, step.path)
      : error
  })
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
    secrets: [
      ...new Set([
        ...sensitiveValues(await parseConfigText(step.format, before)),
        ...sensitiveValues(await parseConfigText(step.format, after)),
      ]),
    ],
  }
}
