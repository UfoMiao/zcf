import { describe, expect, it } from 'vitest'

import { parseConfigText } from '../src/io/editors'
import { previewFileStep, previewPlan } from '../src/plan/diff'
import type { FileStep, Plan } from '../src/plan/types'

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

  it('reports every dotenv credential, including duplicates and quoted or multi-line values', async () => {
    const before = 'API_KEY=older-secret\nAPI_KEY="escaped\\"secret"\nTOKEN="line-one\nline-two"\nMODEL=m\n'
    const preview = await previewFileStep(
      { ...step, format: 'env', edits: [{ path: ['API_KEY'], value: 'newest-secret' }] },
      async () => before,
    )
    expect(preview.after).toBe('API_KEY=newest-secret\nTOKEN="line-one\nline-two"\nMODEL=m\n')
    expect(preview.secrets.toSorted()).toEqual([
      'escaped"secret',
      'escaped\\"secret',
      'line-one\nline-two',
      'newest-secret',
      'older-secret',
    ])
  })

  it('names the file when the original cannot be parsed', async () => {
    await expect(previewFileStep(step, async () => '{ "env": ')).rejects.toMatchObject({
      name: 'FileSyntaxError',
      path: step.path,
      line: 1,
    })
  })
})

describe('previewPlan', () => {
  it("previews a tool's steps on one file in order, each on top of the one before", async () => {
    const second: FileStep = { ...step, edits: [{ path: ['env', 'B'], value: '2' }] }
    const other: FileStep = { ...step, path: '/home/me/other.json' }
    const plan: Plan = {
      tools: [
        {
          tool: 'claude-code',
          steps: [step, { kind: 'command', title: { key: 'x' }, command: 'x', args: [] }, second],
          notices: [],
        },
        { tool: 'codex', steps: [other], notices: [] },
      ],
    }
    const reads: string[] = []
    const previews = await previewPlan(plan, async path => {
      reads.push(path)
      return undefined
    })
    expect(previews.size).toBe(3)
    expect(previews.get(second)).toMatchObject({
      before: '{\n  "env": {\n    "A": "1"\n  }\n}\n',
      after: '{\n  "env": {\n    "A": "1",\n    "B": "2"\n  }\n}\n',
    })
    expect(previews.get(second)!.patch).not.toContain('(new file)')
    expect(reads.toSorted()).toEqual(['/home/me/.claude/settings.json', '/home/me/other.json'])
  })
})
