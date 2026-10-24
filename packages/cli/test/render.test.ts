import { describe, expect, it } from 'vitest'

import { maskSecrets, quoteArg, secretVariants, tildify } from '../src/render'

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
})
