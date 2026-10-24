import { readFile, writeFile } from 'node:fs/promises'

import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import {
  defaultConfigPath,
  jsonEditsBetween,
  loadConfigDraft,
  loadConfigFile,
  saveConfigDraft,
} from '../src/config-file'
import { tempDir } from './helpers'

describe('loadConfigFile', () => {
  it('lives under ~/.ufomiao/zcf by default', () => {
    expect(defaultConfigPath('/home/me')).toBe('/home/me/.ufomiao/zcf/zcf.json')
  })

  it('reports a missing file', async () => {
    expect(await loadConfigFile(join(await tempDir(), 'zcf.json'))).toEqual({
      success: false,
      missing: true,
      issues: [],
    })
  })

  it('accepts comments and trailing commas', async () => {
    const path = join(await tempDir(), 'zcf.json')
    await writeFile(path, '{\n  // my tools\n  "version": 1,\n  "tools": ["claude-code",],\n}\n')
    expect(await loadConfigFile(path)).toMatchObject({
      success: true,
      config: {
        tools: ['claude-code'],
      },
    })
  })

  it('reports JSON syntax errors and schema problems', async () => {
    const dir = await tempDir()
    await writeFile(join(dir, 'broken.json'), '{\n  "version": ')
    await writeFile(join(dir, 'invalid.json'), '{ "version": 9 }')
    expect(await loadConfigFile(join(dir, 'broken.json'))).toEqual({
      success: false,
      issues: [{ path: '', message: { key: 'configIssue.syntax', params: { line: 2, column: 14 } } }],
    })
    expect(await loadConfigFile(join(dir, 'invalid.json'))).toMatchObject({
      success: false,
      issues: [{ path: 'version' }],
    })
  })
})

describe('config drafts', () => {
  it('reads a missing file as an empty version 1 config, and reports broken JSON', async () => {
    const dir = await tempDir()
    expect(await loadConfigDraft(join(dir, 'zcf.json'))).toEqual({ draft: { version: 1 }, exists: false })
    await writeFile(join(dir, 'broken.json'), '{\n  "tools": [')
    expect(await loadConfigDraft(join(dir, 'broken.json'))).toEqual({
      issues: [{ path: '', message: { key: 'configIssue.syntax', params: { line: 2, column: 13 } } }],
    })
    // A file that is valid JSON but not an object is not replaced by an empty draft.
    await writeFile(join(dir, 'list.json'), '[1]\n')
    expect(await loadConfigDraft(join(dir, 'list.json'))).toMatchObject({ issues: [{ path: '' }] })
  })

  it('reads an invalid config as written, for editing', async () => {
    const path = join(await tempDir(), 'zcf.json')
    await writeFile(path, '{ "version": 1, "tools": ["vscode"] }')
    expect(await loadConfigDraft(path)).toEqual({ draft: { version: 1, tools: ['vscode'] }, exists: true })
  })

  it('saves only what changed and keeps comments elsewhere', async () => {
    const path = join(await tempDir(), 'nested', 'zcf.json')
    await saveConfigDraft(path, { version: 1, tools: ['claude-code'] })
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ version: 1, tools: ['claude-code'] })

    await writeFile(
      path,
      '{\n  // my tools\n  "version": 1,\n  "tools": ["claude-code"],\n  "provider": {\n    // the key\n    "name": "a",\n    "apiKey": "old"\n  }\n}\n',
    )
    await saveConfigDraft(path, {
      version: 1,
      tools: ['claude-code', 'codex'],
      provider: { name: 'a', apiKey: 'new' },
    })
    const text = await readFile(path, 'utf8')
    expect(text).toContain('// my tools')
    expect(text).toContain('// the key')
    expect(text).toContain('"apiKey": "new"')
    expect(text).toContain('"tools": [\n    "claude-code",\n    "codex"\n  ]')
  })

  it('keeps changes made to the file after it was loaded', async () => {
    const path = join(await tempDir(), 'zcf.json')
    const base = { version: 1, tools: ['claude-code'] }
    // Someone adds an MCP server by hand while the draft is open.
    await writeFile(path, '{"version": 1, "tools": ["claude-code"], "mcpServers": {"a": {"command": "x"}}}\n')
    await saveConfigDraft(path, { ...base, provider: { name: 'p', apiKey: 'k' } }, base)
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({
      version: 1,
      tools: ['claude-code'],
      mcpServers: { a: { command: 'x' } },
      provider: { name: 'p', apiKey: 'k' },
    })
  })

  it('computes the smallest edits', () => {
    expect(jsonEditsBetween({ a: { b: 1, c: 2 }, d: [1] }, { a: { b: 1 }, d: [1, 2], e: true })).toEqual([
      { path: ['a', 'c'], value: undefined },
      { path: ['d'], value: [1, 2] },
      { path: ['e'], value: true },
    ])
  })
})
