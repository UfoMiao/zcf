import { describe, expect, it } from 'vitest'

import { previewFileStep } from '../src/plan/diff'
import type { FileStep } from '../src/plan/types'

const step: FileStep = {
  kind: 'file',
  title: { key: 'test' },
  path: '/home/me/.claude/settings.json',
  format: 'json',
  edits: [
    {
      path: ['env', 'A'],
      value: '1',
    },
  ],
}

describe('previewFileStep', () => {
  it('shows a new file as all additions', async () => {
    const preview = await previewFileStep(step, async () => undefined)
    expect(preview).toMatchObject({ before: undefined, changed: true, after: '{\n  "env": {\n    "A": "1"\n  }\n}\n' })
    expect(preview.patch).toContain('(new file)')
    expect(preview.patch).toContain('+    "A": "1"')
  })

  it('reports no change when the file already matches', async () => {
    const preview = await previewFileStep(step, async () => '{\n  "env": {\n    "A": "1"\n  }\n}\n')
    expect(preview).toMatchObject({ changed: false, patch: '' })
  })

  it('reads from disk by default', async () => {
    const preview = await previewFileStep({ ...step, path: '/definitely/missing/zcf.json' })
    expect(preview.before).toBeUndefined()
  })
})
