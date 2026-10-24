import { describe, expect, it } from 'vitest'

import { parseConfigText } from '../src/io/editors'
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

  it('reports credential values from both versions of the file', async () => {
    const before = '{\n  "env": {\n    "ANTHROPIC_API_KEY": "old-secret"\n  }\n}\n'
    const preview = await previewFileStep(
      {
        ...step,
        edits: [
          { path: ['env', 'ANTHROPIC_API_KEY'], value: undefined },
          { path: ['env', 'ANTHROPIC_AUTH_TOKEN'], value: 'new-secret' },
        ],
      },
      async () => before,
    )
    expect(preview.secrets.toSorted()).toEqual(['new-secret', 'old-secret'])
  })

  it('reads credentials from TOML files too, and tolerates broken originals', async () => {
    const toml = await previewFileStep(
      { ...step, format: 'toml', edits: [{ path: ['model'], value: 'x' }] },
      async () => 'api_key = "toml-secret"\n',
    )
    expect(toml.secrets).toEqual(['toml-secret'])

    expect(await parseConfigText('toml', '[oops\n')).toBeUndefined()
    expect(await parseConfigText('json', '  ')).toBeUndefined()
  })
})
