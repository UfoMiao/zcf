import { describe, expect, it } from 'vitest'

import { applyKeyEdits, editJson, editToml, FileSyntaxError, setAtPath } from '../src/io/editors'

describe('editJson', () => {
  it('keeps comments, order and untouched keys', () => {
    const before = '{\n  // keep me\n  "b": 1,\n  "env": { "A": "1" }\n}\n'
    const after = editJson(before, [
      {
        path: ['env', 'B'],
        value: '2',
      },
      {
        path: ['a'],
        value: true,
      },
    ])
    expect(after).toContain('// keep me')
    expect(after.indexOf('"b"')).toBeLessThan(after.indexOf('"a"'))
    expect(JSON.parse(after.replace(/\/\/.*\n/, ''))).toEqual({
      b: 1,
      env: { A: '1', B: '2' },
      a: true,
    })
  })

  it('removes keys set to undefined and ignores missing ones', () => {
    const after = editJson('{\n  "env": {\n    "A": "1",\n    "B": "2"\n  }\n}\n', [
      {
        path: ['env', 'A'],
        value: undefined,
      },
      {
        path: ['env', 'MISSING'],
        value: undefined,
      },
      {
        path: ['other', 'MISSING'],
        value: undefined,
      },
    ])
    expect(JSON.parse(after)).toEqual({
      env: { B: '2' },
    })
  })

  it('creates a document from nothing and adds a trailing newline', () => {
    expect(
      editJson(undefined, [
        {
          path: ['env', 'A'],
          value: '1',
        },
      ]),
    ).toBe('{\n  "env": {\n    "A": "1"\n  }\n}\n')
    expect(editJson('  ', [])).toBe('{}\n')
    expect(editJson('{}', [])).toBe('{}\n')
  })

  it('refuses to edit a broken file and says where it breaks', () => {
    expect(() => editJson('{\n  "a": ', [{ path: ['a'], value: 1 }])).toThrow(
      expect.objectContaining({ name: 'FileSyntaxError', format: 'json', line: 2, column: 8 }),
    )
    expect(() => editJson('{ "a": ', [])).toThrow(FileSyntaxError)
  })

  it('follows the indentation the file already uses', () => {
    const after = editJson('{\n    "a": 1\n}\n', [
      {
        path: ['b'],
        value: { c: 1 },
      },
    ])
    expect(after).toBe('{\n    "a": 1,\n    "b": {\n        "c": 1\n    }\n}\n')
  })
})

describe('editToml', () => {
  it('sets values and keeps comments', async () => {
    const before = '# my settings\nmodel = "a"\n\n[profiles.work]\nmodel = "b" # inline\n'
    const after = await editToml(before, [
      {
        path: ['model'],
        value: 'gpt-5',
      },
      {
        path: ['profiles', 'work', 'approval'],
        value: 'never',
      },
    ])
    expect(after).toContain('# my settings')
    expect(after).toContain('model = "gpt-5"')
    expect(after).toContain('# inline')
    expect(after).toContain('approval = "never"')
  })

  it('starts from an empty document', async () => {
    expect(
      await editToml(undefined, [
        {
          path: ['model'],
          value: 'x',
        },
      ]),
    ).toBe('model = "x"\n')
  })

  it('removes keys and ignores missing ones', async () => {
    const after = await editToml('a = 1\nb = 2\n\n[t]\nc = 3\n', [
      {
        path: ['a'],
        value: undefined,
      },
      {
        path: ['t', 'c'],
        value: undefined,
      },
      {
        path: ['missing', 'x'],
        value: undefined,
      },
    ])
    expect(after).not.toMatch(/^a = 1/m)
    expect(after).not.toContain('c = 3')
    expect(after).toContain('b = 2')
  })
})

describe('setAtPath', () => {
  it('creates tables on the way and replaces non-table values', () => {
    const root: Record<string, unknown> = { a: 1 }
    setAtPath(root, ['a', 'b'], 2)
    setAtPath(root, ['x', 'y', 'z'], true)
    expect(root).toEqual({
      a: { b: 2 },
      x: {
        y: { z: true },
      },
    })
  })

  it('refuses keys that would reach the object prototype', () => {
    expect(() => setAtPath({}, ['__proto__', 'polluted'], true)).toThrow('Unsafe key in path: __proto__')
    expect(() => setAtPath({}, ['a', 'constructor'], true)).toThrow('Unsafe key in path: constructor')
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('does not create tables just to remove a key', () => {
    const root: Record<string, unknown> = {}
    setAtPath(root, ['a', 'b'], undefined)
    expect(root).toEqual({})
  })
})

describe('applyKeyEdits', () => {
  it('picks the editor by format', async () => {
    expect(
      await applyKeyEdits('json', undefined, [
        {
          path: ['a'],
          value: 1,
        },
      ]),
    ).toBe('{\n  "a": 1\n}\n')
    expect(
      await applyKeyEdits('toml', undefined, [
        {
          path: ['a'],
          value: 1,
        },
      ]),
    ).toBe('a = 1\n')
  })
})

describe('editToml on a broken file', () => {
  it('reports the position of the syntax error', async () => {
    await expect(editToml('a = 1\nb = = 2\n', [])).rejects.toMatchObject({
      name: 'FileSyntaxError',
      format: 'toml',
      line: 2,
      column: 5,
    })
  })
})
