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

  it('removes cleared values and the objects they leave empty', () => {
    const draft = { version: 1, provider: { name: 'x', anthropic: { baseUrl: 'https://a.example' } } }
    expect(setAt(draft, ['provider', 'anthropic', 'baseUrl'], '')).toEqual({ version: 1, provider: { name: 'x' } })
    expect(setAt({ version: 1, provider: { name: 'x' } }, ['provider', 'name'], undefined)).toEqual({ version: 1 })
  })

  it('edits and removes list items', () => {
    const draft = { skills: [{ source: 'a' }, { source: 'b' }] }
    expect(setAt(draft, ['skills', 1, 'source'], 'c')).toEqual({ skills: [{ source: 'a' }, { source: 'c' }] })
    expect(setAt(draft, ['skills', 0], undefined)).toEqual({ skills: [{ source: 'b' }] })
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
    const args = ['-y', '@scope/pkg', 'a b', 'say "hi"', '']
    expect(parseArgs(formatArgs(args))).toEqual(args)
    expect(parseArgs(`-y 'single quoted' x`)).toEqual(['-y', 'single quoted', 'x'])
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
