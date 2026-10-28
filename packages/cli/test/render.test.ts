import type { StepResult } from '@zcf/core'
import { describe, expect, it } from 'vitest'

import { createTranslator } from '../src/i18n'
import { collectSecrets, maskSecrets, quoteArg, secretVariants, tildify } from '../src/render'
import { Renderer } from '../src/render'

describe('render helpers', () => {
  it('quotes only arguments that need it', () => {
    expect(quoteArg('--scope')).toBe('--scope')
    expect(quoteArg('owner/repo@1.0')).toBe('owner/repo@1.0')
    expect(quoteArg('a b')).toBe("'a b'")
    expect(quoteArg("it's")).toBe("'it'\\''s'")
  })

  it('masks every occurrence of each secret', () => {
    expect(maskSecrets('a=secret-1 b=secret-1', ['secret-1'])).toBe('a=*** b=***')
    expect(maskSecrets('k=a-long-secret-value', ['a-long-secret-value'])).toBe('k=a-l***ue')
  })

  it('treats replacement patterns in a secret as literal text', () => {
    expect(maskSecrets('k=password-secret-$&', ['password-secret-$&'])).toBe('k=pas***$&')
    expect(maskSecrets("k=$'secret-password", ["$'secret-password"])).toBe("k=$'s***rd")
  })

  it('shortens paths under home', () => {
    expect(tildify('/home/me/.claude', '/home/me')).toBe('~/.claude')
    expect(tildify('/etc/x', '/home/me')).toBe('/etc/x')
  })

  it('masks secrets after JSON escaping and shell quoting', () => {
    const secret = `pa"ss'wo\\rd`
    const secrets = secretVariants([secret])
    const json = JSON.stringify({ PASSWORD: secret })
    expect(maskSecrets(json, secrets)).not.toContain('ss')
    expect(maskSecrets(quoteArg(json), secrets)).not.toContain('wo')
    expect(maskSecrets(quoteArg(secret), secrets)).not.toContain('wo')
  })

  it('masks short credentials where they appear as a whole quoted value', () => {
    const secrets = collectSecrets({
      version: 1,
      tools: [],
      mcpServers: { db: { type: 'stdio', command: 'npx', args: [], env: { PASSWORD: 'abc' } } },
      skills: [],
      profiles: [],
      agents: [],
      workflows: [],
      styles: { outputStyles: [] },
      extras: {},
      mirror: 'official',
      language: 'auto',
      configLanguage: 'en',
    })
    const json = JSON.stringify({ env: { PASSWORD: 'abc' } })
    expect(maskSecrets(quoteArg(json), secrets)).toBe(`'{"env":{"PASSWORD":"***"}}'`)
    expect(maskSecrets('/tmp/abcdef', secrets)).toBe('/tmp/abcdef')
  })

  it('masks MCP values written with `$` escaped as `$$`, as pi takes them', () => {
    const secrets = collectSecrets({
      version: 1,
      tools: [],
      mcpServers: { db: { type: 'stdio', command: 'npx', args: [], env: { PASSWORD: 'my$private$pass' } } },
      skills: [],
      profiles: [],
      agents: [],
      workflows: [],
      styles: { outputStyles: [] },
      extras: {},
      mirror: 'official',
      language: 'auto',
      configLanguage: 'en',
    })
    expect(maskSecrets(quoteArg('PASSWORD=my$$private$$pass'), secrets)).not.toContain('private')
  })
})

const updateStep = (tool: 'claude-code' | 'codex'): StepResult => ({
  step: {
    kind: 'command',
    title: { key: 'step.update', params: {} },
    command: 'npm',
    args: ['install', '-g', `${tool}@latest`],
  },
  status: 'done',
})

describe('summary', () => {
  const text: string[] = []
  const out = { write: (line: string) => void text.push(line) }

  it('counts a stepless tool as up to date, but not one that was not installed', () => {
    const renderer = new Renderer(out, createTranslator('en'), [], '/home/me')
    renderer.summary(
      {
        tools: [
          { tool: 'claude-code', steps: [updateStep('claude-code').step], notices: [] },
          // Planned away with a notice, such as an updater that found nothing to do.
          { tool: 'codex', steps: [], notices: [] },
          // Not installed: reported at the top, but it is not "already up to date".
          { tool: 'dsh', steps: [], notices: [{ level: 'info', message: { key: 'notice.notInstalled', params: {} } }] },
        ],
      },
      [
        { tool: 'claude-code', ok: true, steps: [updateStep('claude-code')] },
        { tool: 'codex', ok: true, steps: [] },
        { tool: 'dsh', ok: true, steps: [] },
      ],
      '/home/me/backups',
    )
    expect(text.join('')).toContain('Done: 1 applied, 1 already up to date.')
  })
})
