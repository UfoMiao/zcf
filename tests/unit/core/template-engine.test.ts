import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TemplateEngine } from '../../../src/core/template-engine'

const files = new Map<string, string>()
const dirs = new Set<string>()

vi.mock('../../../src/utils/fs-operations', () => ({
  exists: vi.fn((path: string) => files.has(path)),
  ensureDir: vi.fn((path: string) => { dirs.add(path) }),
  readFile: vi.fn((path: string) => {
    if (!files.has(path))
      throw new Error(`File not found: ${path}`)
    return files.get(path)!
  }),
  writeFile: vi.fn((path: string, content: string) => { files.set(path, content) }),
  copyFile: vi.fn((source: string, target: string) => {
    files.set(target, files.get(source) || '')
  }),
  remove: vi.fn(),
}))

vi.mock('../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn((path: string, options: { defaultValue?: unknown } = {}) => {
    if (!files.has(path))
      return options.defaultValue ?? null
    return JSON.parse(files.get(path)!)
  }),
  writeJsonConfig: vi.fn((path: string, data: unknown) => {
    files.set(path, JSON.stringify(data, null, 2))
  }),
}))

vi.mock('../../../src/utils/toml-edit', () => ({
  parseToml: vi.fn((content: string) => {
    // Minimal TOML-like parser for tests
    const result: Record<string, unknown> = {}
    for (const line of content.split('\n')) {
      const [key, ...rest] = line.split('=')
      if (key && rest.length) {
        const value = rest.join('=').trim()
        result[key.trim()] = value.startsWith('"') && value.endsWith('"')
          ? value.slice(1, -1)
          : value
      }
    }
    return result
  }),
  stringifyToml: vi.fn((data: Record<string, unknown>) =>
    Object.entries(data).map(([k, v]) => `${k} = "${v}"`).join('\n')),
}))

describe('templateEngine', () => {
  beforeEach(() => {
    files.clear()
    dirs.clear()
  })

  it('copies a source file to target', async () => {
    files.set('/src/a.md', '# hello')
    const engine = new TemplateEngine()
    const result = await engine.renderFile('/src/a.md', '/out/a.md', 'copy')
    expect(result.changed).toBe(true)
    expect(files.get('/out/a.md')).toBe('# hello')
  })

  it('overwrites target content', async () => {
    files.set('/src/b.json', '{"a":1}')
    files.set('/out/b.json', '{"a":2}')
    const engine = new TemplateEngine()
    const result = await engine.renderFile('/src/b.json', '/out/b.json', 'overwrite')
    expect(result.changed).toBe(true)
    expect(files.get('/out/b.json')).toBe('{"a":1}')
  })

  it('merges JSON files', async () => {
    files.set('/src/c.json', '{"a":1,"b":2}')
    files.set('/out/c.json', '{"b":3,"c":4}')
    const engine = new TemplateEngine()
    const result = await engine.renderFile('/src/c.json', '/out/c.json', 'merge')
    expect(result.changed).toBe(true)
    expect(JSON.parse(files.get('/out/c.json')!)).toEqual({ a: 1, b: 2, c: 4 })
  })

  it('appends markdown content', async () => {
    files.set('/src/d.md', '## section')
    files.set('/out/d.md', '# title\n')
    const engine = new TemplateEngine()
    const result = await engine.renderFile('/src/d.md', '/out/d.md', 'append')
    expect(result.changed).toBe(true)
    expect(files.get('/out/d.md')).toBe('# title\n## section')
  })

  it('skips rendering when requested', async () => {
    const engine = new TemplateEngine()
    const result = await engine.renderFile('/src/x.md', '/out/x.md', 'skip')
    expect(result.changed).toBe(false)
    expect(files.has('/out/x.md')).toBe(false)
  })

  it('renders a skill package', async () => {
    const engine = new TemplateEngine()
    const result = await engine.renderSkill({
      meta: { name: 'git-commit', namespace: 'zcf' },
      body: 'Write good commits.',
      sourcePath: '/templates/zcf/git-commit/SKILL.md',
      targetPath: '/skills',
    })
    expect(result.target).toBe('/skills/SKILL.md')
    expect(files.get('/skills/SKILL.md')).toBe('Write good commits.')
  })
})
