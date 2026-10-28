import { createTwoFilesPatch } from 'diff'

import { applyKeyEdits, dotenvEntries, FileSyntaxError, parseConfigText } from '../io/editors'
import { readTextIfExists } from '../io/fs'
import { sensitiveValues } from '../io/secrets'
import type { CopyStep, FileFormat, FileStep, Plan, PlanStep } from './types'

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

/** Credential values in a native file. A dotenv file counts every line, duplicates included, as written and as read. */
async function fileSecrets(format: FileFormat, text: string | undefined): Promise<string[]> {
  if (format === 'env') {
    return sensitiveValues(dotenvEntries(text ?? '').map(entry => ({ [entry.key]: [entry.value, entry.raw] })))
  }
  return sensitiveValues(await parseConfigText(format, text))
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
    secrets: [...new Set([...(await fileSecrets(step.format, before)), ...(await fileSecrets(step.format, after))])],
  }
}

/** Work out what a copy step would write, without touching the disk. */
export async function previewCopyStep(
  step: CopyStep,
  read: (path: string) => Promise<string | undefined> = readTextIfExists,
): Promise<FilePreview> {
  const before = await read(step.to)
  // A template that does not exist is a packaging bug the apply step fails on; the preview
  // shows no change, so the plan stays quiet until then.
  const after = (await read(step.from)) ?? ''
  const changed = before !== after && after !== ''
  const patch = changed
    ? createTwoFilesPatch(
        step.to,
        step.to,
        before ?? '',
        after,
        before === undefined ? '(new file)' : undefined,
        undefined,
        {
          context: 3,
        },
      )
    : ''
  // Templates carry no credentials; the file they replace could only hold the same template.
  return { path: step.to, before, after, changed, patch, secrets: [] }
}

/**
 * Preview every file and copy step of a plan. A tool's steps are previewed in order, and a
 * step on a file an earlier step already changed starts from that change, as apply does.
 */
export async function previewPlan(
  plan: Plan,
  read: (path: string) => Promise<string | undefined> = readTextIfExists,
): Promise<Map<PlanStep, FilePreview>> {
  const previews = new Map<PlanStep, FilePreview>()
  await Promise.all(
    plan.tools.map(async toolPlan => {
      const written = new Map<string, string>()
      for (const step of toolPlan.steps) {
        const readStep = (path: string) => (written.has(path) ? Promise.resolve(written.get(path)) : read(path))
        if (step.kind === 'file') {
          // oxlint-disable-next-line no-await-in-loop
          const preview = await previewFileStep(step, readStep)
          written.set(step.path, preview.after)
          previews.set(step, preview)
        } else if (step.kind === 'copy') {
          // oxlint-disable-next-line no-await-in-loop
          const preview = await previewCopyStep(step, readStep)
          written.set(step.to, preview.after)
          previews.set(step, preview)
        }
      }
    }),
  )
  return previews
}
