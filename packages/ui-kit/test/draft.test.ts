import { describe, expect, it } from 'vitest'

import {
  formatArgs,
  freshName,
  getAt,
  issuesAt,
  mcpFields,
  parseArgs,
  renameKey,
  setAt,
  fieldValue,
  validateDraft,
  withMcpType,
} from '../src'

describe('setAt', () => {
  it('sets nested values without changing the original', () => {
    const draft = { version: 1 }
    const next = setAt(draft, ['provider', 'anthropic', 'baseUrl'], 'https://a.example')
    expect(next).toEqual({ version: 1, provider: { anthropic: { baseUrl: 'https://a.example' } } })
    expect(draft).toEqual({ version: 1 })
  })

  it('removes keys set to undefined and the objects they leave empty, and keeps empty strings', () => {
    const draft = { version: 1, provider: { name: 'x', anthropic: { baseUrl: 'https://a.example' } } }
    expect(setAt(draft, ['provider', 'anthropic', 'baseUrl'], undefined)).toEqual({
      version: 1,
      provider: { name: 'x' },
    })
    expect(setAt({ version: 1, provider: { name: 'x' } }, ['provider', 'name'], undefined)).toEqual({ version: 1 })
    // A new environment variable starts empty.
    const server = { mcpServers: { s: { command: 'x' } } }
    expect(setAt(server, ['mcpServers', 's', 'env', 'FOO'], '')).toEqual({
      mcpServers: { s: { command: 'x', env: { FOO: '' } } },
    })
  })

  it('maps an empty optional field to a removal', () => {
    expect(fieldValue({ label: 'a', path: ['a'], kind: 'text' }, '')).toBeUndefined()
    expect(fieldValue({ label: 'a', path: ['a'], kind: 'text', required: true }, '')).toBe('')
    expect(fieldValue({ label: 'a', path: ['a'], kind: 'text' }, 'x')).toBe('x')
  })

  it('edits and removes list items', () => {
    const draft = { skills: [{ source: 'a' }, { source: 'b' }] }
    expect(setAt(draft, ['skills', 1, 'source'], 'c')).toEqual({ skills: [{ source: 'a' }, { source: 'c' }] })
    expect(setAt(draft, ['skills', 0], undefined)).toEqual({ skills: [{ source: 'b' }] })
    // Clearing an item's field keeps the item, so the next keystrokes still edit it.
    expect(setAt(draft, ['skills', 0, 'source'], '')).toEqual({ skills: [{ source: '' }, { source: 'b' }] })
    expect(setAt(draft, ['skills', 0, 'source'], undefined)).toEqual({ skills: [{}, { source: 'b' }] })
    expect(getAt(draft, ['skills', 1, 'source'])).toBe('b')
    expect(getAt(draft, ['skills', 'x', 'source'])).toBeUndefined()
  })
})

describe('renameKey', () => {
  it('keeps the position of the renamed key', () => {
    const draft = { mcpServers: { a: { type: 'http' }, b: { type: 'stdio' } } }
    expect(Object.keys(renameKey(draft, ['mcpServers'], 'a', 'z').mcpServers as object)).toEqual(['z', 'b'])
    expect(renameKey(draft, ['mcpServers'], 'missing', 'z')).toBe(draft)
  })
})

describe('validation', () => {
  it('finds the issues of one field', () => {
    const { valid, issues } = validateDraft({ version: 1, provider: { name: 'x', apiKey: '', anthropic: {} } })
    expect(valid).toBe(false)
    expect(issuesAt(issues, ['provider', 'apiKey'])).toEqual([
      { path: 'provider.apiKey', message: { key: 'configIssue.empty' } },
    ])
    expect(issuesAt(issues, ['provider', 'anthropic']).map(issue => issue.path)).toEqual(['provider.anthropic.baseUrl'])
    expect(validateDraft({ version: 1 })).toEqual({ valid: true, issues: [] })
  })
})

describe('args', () => {
  it('round-trips quoted arguments', () => {
    const args = ['-y', '@scope/pkg', 'a b', 'say "hi"', '', 'tab\there', 'two\nlines', 'back\\slash']
    expect(parseArgs(formatArgs(args))).toEqual(args)
    expect(parseArgs(`-y 'single quoted' x`)).toEqual(['-y', 'single quoted', 'x'])
    expect(parseArgs('--header="Authorization: Bearer t" a\'b c\'d')).toEqual([
      '--header=Authorization: Bearer t',
      'ab cd',
    ])
    expect(parseArgs('  ')).toEqual([])
    expect(parseArgs(String.raw`"a\q"`)).toEqual(['aq'])
  })
})

describe('MCP helpers', () => {
  it('shows the fields of each type and resets a server when its type changes', () => {
    expect(mcpFields('http').map(field => field.path[0])).toEqual(['type', 'url', 'headers'])
    expect(mcpFields('stdio').map(field => field.path[0])).toEqual(['type', 'command', 'args', 'env'])
    const server = { type: 'stdio', command: 'npx' }
    expect(withMcpType(server, 'stdio')).toBe(server)
    expect(withMcpType(server, 'http')).toEqual({ type: 'http', url: '' })
  })

  it('picks a free name', () => {
    expect(freshName([])).toBe('server')
    expect(freshName(['server', 'server-2'])).toBe('server-3')
  })
})
