import { describe, expect, it } from 'vitest'

import {
  applyKeyEdits,
  editDotenv,
  editJson,
  editToml,
  editYaml,
  FileSyntaxError,
  JsExpression,
  QuotedString,
  parseConfigText,
  parseDotenv,
  setAtPath,
} from '../src/io/editors'

describe('editJson', () => {
  it('keeps a one-line file on one line', () => {
    expect(
      editJson('{"mcpServers":{"a":{"command":"x"}}}\n', [{ path: ['mcpServers', 'b'], value: { url: 'u' } }]),
    ).toBe('{"mcpServers":{"a":{"command":"x"},"b": {"url":"u"}}}\n')
  })

  it('leaves the layout of untouched neighbours alone when adding a key', () => {
    const before = '{\n  "version": 1,\n  "tools": ["claude-code", "codex"],\n  "env": { "A": "1" }\n}\n'
    expect(editJson(before, [{ path: ['mirror'], value: 'china' }])).toBe(
      '{\n  "version": 1,\n  "tools": ["claude-code", "codex"],\n  "env": { "A": "1" },\n  "mirror": "china"\n}\n',
    )
  })

  it('expands an object written on one line as a whole when a key is added to it', () => {
    const before = '{\n  "env": {"ANTHROPIC_BASE_URL": "x"},\n  "model": "opus"\n}\n'
    const after = editJson(before, [{ path: ['env', 'ANTHROPIC_AUTH_TOKEN'], value: 't' }])
    expect(after).toBe(
      '{\n  "env": {\n    "ANTHROPIC_BASE_URL": "x",\n    "ANTHROPIC_AUTH_TOKEN": "t"\n  },\n  "model": "opus"\n}\n',
    )
    expect(editJson(after, [{ path: ['env', 'ANTHROPIC_AUTH_TOKEN'], value: 't' }])).toBe(after)
  })

  it('indents with tabs in a file that uses tabs', () => {
    expect(editJson('{\n\t"e": {\n\t\t"a": 1\n\t}\n}\n', [{ path: ['e', 'b'], value: 2 }])).toBe(
      '{\n\t"e": {\n\t\t"a": 1,\n\t\t"b": 2\n\t}\n}\n',
    )
  })

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

  it('leaves values that are already set as they are written', () => {
    const before = '{\n\t"args": ["-y",   "pkg"],\n\t"env": {"B": "2", "A": "1"}\n}\n'
    expect(
      editJson(before, [
        { path: ['args'], value: ['-y', 'pkg'] },
        { path: ['env'], value: { A: '1', B: '2' } },
      ]),
    ).toBe(before)
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
  it('writes new nested tables as sections, keeping deeper tables inline', async () => {
    const after = await editToml('model = "a"\n', [
      { path: ['model_provider'], value: 'zcf' },
      { path: ['model_providers', 'zcf'], value: { name: 'ZCF', base_url: 'u', http_headers: { X: '1' } } },
    ])
    expect(after).toBe(
      'model = "a"\nmodel_provider = "zcf"\n\n[model_providers.zcf]\nname = "ZCF"\nbase_url = "u"\nhttp_headers = { X = "1" }\n',
    )
    // A header the user wrote stays, even when it has no keys of its own.
    expect(await editToml('[model_providers]\n', [{ path: ['model_providers', 'zcf'], value: { name: 'ZCF' } }])).toBe(
      '[model_providers]\n\n[model_providers.zcf]\nname = "ZCF"\n',
    )
    // Windows line endings get the same layout.
    expect(await editToml('model = "a"\r\n', [{ path: ['mcp_servers', 'foo'], value: { command: 'x' } }])).not.toMatch(
      /^\[mcp_servers\]/m,
    )
  })

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

describe('editDotenv', () => {
  it('changes variables in place and keeps comments, blank lines and the rest', () => {
    const before = '# keys\nexport GEMINI_API_KEY=old\n\nOTHER="kept value" # note\nGEMINI_MODEL=a\n'
    const after = editDotenv(before, [
      { path: ['GEMINI_API_KEY'], value: 'new-key' },
      { path: ['GEMINI_MODEL'], value: undefined },
      { path: ['GOOGLE_GEMINI_BASE_URL'], value: 'https://example.com/gemini' },
    ])
    expect(after).toBe(
      '# keys\nexport GEMINI_API_KEY=new-key\n\nOTHER="kept value" # note\nGOOGLE_GEMINI_BASE_URL=https://example.com/gemini\n',
    )
    expect(parseDotenv(after)).toEqual({
      GEMINI_API_KEY: 'new-key',
      OTHER: 'kept value',
      GOOGLE_GEMINI_BASE_URL: 'https://example.com/gemini',
    })
  })

  it('quotes values that need it and reads them back unchanged', () => {
    const values = { SPACES: 'a b', HASH: 'x #y', SINGLE: "it's", LINES: 'one\ntwo' }
    const after = editDotenv(
      undefined,
      Object.entries(values).map(([key, value]) => ({ path: [key], value })),
    )
    expect(after).toBe(`SPACES='a b'\nHASH='x #y'\nSINGLE="it's"\nLINES="one\\ntwo"\n`)
    expect(parseDotenv(after)).toEqual(values)
  })

  it('updates the last of duplicate lines, drops the earlier ones, removes all of them, and keeps CRLF', () => {
    expect(editDotenv('A=1\r\nB=2\r\nA=3\r\n', [{ path: ['A'], value: '4' }])).toBe('B=2\r\nA=4\r\n')
    expect(editDotenv('A=1\nB=2\nA=3\n', [{ path: ['A'], value: undefined }])).toBe('B=2\n')
    expect(editDotenv('A=1\n', [{ path: ['A'], value: undefined }])).toBe('')
    expect(() => editDotenv('', [{ path: ['A', 'B'], value: '1' }])).toThrow('one element')
    expect(() => editDotenv('', [{ path: ['A'], value: { b: 1 } }])).toThrow('must be a string')
  })

  it('keeps an inline comment and the spacing around it', () => {
    expect(editDotenv('KEY = old   # managed by team\n', [{ path: ['KEY'], value: 'new' }])).toBe(
      'KEY = new   # managed by team\n',
    )
    expect(editDotenv("KEY='old' # note\n", [{ path: ['KEY'], value: 'a b' }])).toBe("KEY='a b' # note\n")
    expect(parseDotenv('KEY= # configure here\n')).toEqual({ KEY: '' })
    expect(parseDotenv('KEY=old#team\n')).toEqual({ KEY: 'old' })
    expect(editDotenv('KEY=old#team\n', [{ path: ['KEY'], value: 'new' }])).toBe('KEY=new #team\n')
    expect(editDotenv('KEY= # configure here\n', [{ path: ['KEY'], value: 'new' }])).toBe('KEY= new # configure here\n')
  })

  it('rejects names that are not variable names', () => {
    expect(() => editDotenv('', [{ path: ['A\nINJECTED'], value: '1' }])).toThrow('variable name')
    expect(() => editDotenv('', [{ path: ['A=B'], value: '1' }])).toThrow('variable name')
    expect(() => editDotenv('', [{ path: [0], value: '1' }])).toThrow('variable name')
  })

  it('refuses values that no quoting reads back unchanged', () => {
    // Plain dotenv readers do not unescape \" or \\ inside double quotes.
    expect(() => editDotenv('', [{ path: ['A'], value: `it's "x"` }])).toThrow('cannot be written')
    expect(() => editDotenv('', [{ path: ['A'], value: "it's a\\nb" }])).toThrow('cannot be written')
    expect(editDotenv('', [{ path: ['A'], value: 'a\\nb "c"' }])).toBe(`A='a\\nb "c"'\n`)
  })

  it('reads quoted values across lines and past escaped quotes', () => {
    const content = 'A="first\nsecond" # note\nB="x\\"y"\nC=\'it\'s\nD=after\n'
    expect(parseDotenv(content)).toEqual({ A: 'first\nsecond', B: 'x"y', C: "'it's", D: 'after' })
    expect(parseDotenv('E=`one\ntwo` # note\nF=1\n')).toEqual({ E: 'one\ntwo', F: '1' })
    expect(editDotenv('E=`one\ntwo`\nF=1\n', [{ path: ['E'], value: 'x' }])).toBe('E=x\nF=1\n')
    expect(editDotenv(content, [{ path: ['A'], value: 'one' }])).toBe('A=one # note\nB="x\\"y"\nC=\'it\'s\nD=after\n')
  })

  it('is picked by applyKeyEdits', async () => {
    expect(await applyKeyEdits('env', 'X=1\n', [{ path: ['Y'], value: 2 }])).toBe('X=1\nY=2\n')
  })
})

describe('editYaml', () => {
  const before = [
    '# my overrides',
    '- id: hmr',
    "  disabled: !!js '!ctx.get(''profileContext'')' # keep",
    '- id: llm',
    '  config:',
    '    providers:',
    '      mine: { models: [{ id: a }] }',
    '',
  ].join('\n')

  it('keeps comments and !!js tags while editing and appending entries', async () => {
    const after = await editYaml(before, [
      { path: [1, 'config', 'providers', 'zcf'], value: { models: [{ id: 'm' }] } },
      { path: [2], value: { insert: [{ id: 'zcf-a', name: '@scope/plugin' }] } },
    ])
    expect(after).toBe(
      [
        '# my overrides',
        '- id: hmr',
        "  disabled: !!js '!ctx.get(''profileContext'')' # keep",
        '- id: llm',
        '  config:',
        '    providers:',
        // The yaml library writes flow collections with spaces inside the brackets.
        '      mine: { models: [ { id: a } ] }',
        '      zcf:',
        '        models:',
        '          - id: m',
        '- insert:',
        '    - id: zcf-a',
        '      name: "@scope/plugin"',
        '',
      ].join('\n'),
    )
  })

  // Sequences flush with their key, CRLF, a byte order mark and a long line.
  const handWritten = [
    '\uFEFF# mine',
    '- id: agent-default-model',
    '  config:',
    '    provider: mine # pinned by me',
    '    model: m',
    '- insert:',
    '  - id: tools',
    '    config:',
    '      paths:',
    '      - /a',
    `      note: ${'x'.repeat(100)}`,
    '',
  ].join('\r\n')

  it('returns a file that already has every value byte for byte', async () => {
    const edits = [
      { path: [0, 'config', 'provider'], value: 'mine' },
      { path: [1, 'insert', 0, 'config', 'paths'], value: ['/a'] },
      { path: [0, 'missing'], value: undefined },
    ]
    expect(await editYaml(handWritten, edits)).toBe(handWritten)
  })

  it('keeps the indentation, line endings, byte order mark, long lines and comments of a changed file', async () => {
    const after = await editYaml(handWritten, [
      { path: [0, 'config', 'provider'], value: 'zcf' },
      { path: [1, 'insert', 0, 'config', 'paths', 1], value: '/b' },
    ])
    expect(after).toBe(
      handWritten
        .replace('provider: mine # pinned by me', 'provider: zcf # pinned by me')
        .replace('- /a\r\n', '- /a\r\n      - /b\r\n'),
    )
    expect(await editYaml('a:\n    b: 1\n', [{ path: ['a', 'c'], value: [1] }])).toBe(
      'a:\n    b: 1\n    c:\n        - 1\n',
    )
  })

  it('reads the sequence style from a key with nested items, not from the next entry', async () => {
    const file = '- id: a\n  config:\n    providers:\n- id: b\n  config:\n    args:\n      - x\n'
    const after = await editYaml(file, [{ path: [0, 'config', 'providers'], value: { r: { models: ['m'] } } }])
    expect(after).toBe(
      '- id: a\n  config:\n    providers:\n      r:\n        models:\n          - m\n- id: b\n  config:\n    args:\n      - x\n',
    )
  })

  it('quotes strings that YAML 1.1 readers would take for binary numbers', async () => {
    expect(await editYaml(undefined, [{ path: ['bin'], value: '0b11' }])).toBe('bin: "0b11"\n')
  })

  it('writes a QuotedString double-quoted', async () => {
    const after = await editYaml('a: 1\n', [{ path: ['pw'], value: new QuotedString('ab') }])
    expect(after).toBe('a: 1\npw: "ab"\n')
    expect(await editYaml(after, [{ path: ['pw'], value: new QuotedString('ab') }])).toBe(after)
  })

  it('writes a JsExpression as a !!js scalar that reads back as its source', async () => {
    const value = new JsExpression('process.env.TOKEN')
    const after = await editYaml('- id: a\n', [{ path: [0, 'env'], value: { TOKEN: value } }])
    expect(after).toBe('- id: a\n  env:\n    TOKEN: !!js process.env.TOKEN\n')
    expect(await parseConfigText('yaml', after)).toEqual([{ id: 'a', env: { TOKEN: 'process.env.TOKEN' } }])
    expect(await editYaml(after, [{ path: [0, 'env', 'TOKEN'], value }])).toBe(after)
  })

  it('removes keys, ignoring ones that are not there', async () => {
    const after = await editYaml(before, [
      { path: [0, 'disabled'], value: undefined },
      { path: [5, 'config'], value: undefined },
    ])
    expect(after).not.toContain('disabled')
    expect(after).toContain('mine:')
  })

  it('starts a block list in a missing, empty or `[]` file', async () => {
    const edits = [{ path: [0], value: { id: 'x', config: { a: 1 } } }]
    const expected = '- id: x\n  config:\n    a: 1\n'
    expect(await editYaml(undefined, edits)).toBe(expected)
    expect(await editYaml('# comment\n[]\n', edits)).toBe(`# comment\n${expected}`)
    expect(await editYaml('', [])).toBe('')
  })

  it('reports the position of a syntax error and refuses unsafe keys', async () => {
    await expect(editYaml('- id: a\n  b: [\n', [])).rejects.toMatchObject({ name: 'FileSyntaxError', format: 'yaml' })
    await expect(editYaml('a: 1\n', [{ path: ['__proto__', 'x'], value: 1 }])).rejects.toThrow('Unsafe key')
  })

  it('is picked by applyKeyEdits and parseConfigText', async () => {
    expect(await applyKeyEdits('yaml', 'a: 1\n', [{ path: ['b'], value: 2 }])).toBe('a: 1\nb: 2\n')
    expect(await parseConfigText('yaml', "- a: !!js 'x'\n")).toEqual([{ a: 'x' }])
    expect(await parseConfigText('yaml', 'a: [\n')).toBeUndefined()
  })
})
