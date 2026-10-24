import { describe, expect, it } from 'vitest'

import { maskSecrets, quoteArg, tildify } from '../src/render'

describe('render helpers', () => {
  it('quotes only arguments that need it', () => {
    expect(quoteArg('--scope')).toBe('--scope')
    expect(quoteArg('owner/repo@1.0')).toBe('owner/repo@1.0')
    expect(quoteArg('a b')).toBe("'a b'")
    expect(quoteArg("it's")).toBe("'it'\\''s'")
  })

  it('masks every occurrence of each secret', () => {
    expect(maskSecrets('a=secret-1 b=secret-1', ['secret-1'])).toBe('a=sec***-1 b=sec***-1')
  })

  it('shortens paths under home', () => {
    expect(tildify('/home/me/.claude', '/home/me')).toBe('~/.claude')
    expect(tildify('/etc/x', '/home/me')).toBe('/etc/x')
  })
})
