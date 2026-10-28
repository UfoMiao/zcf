import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { request } from 'node:http'
import { tmpdir } from 'node:os'

import type { Plan } from '@zcf/core'
import { MessageError } from '@zcf/core'
import type { Draft, ZcfService } from '@zcf/ui-kit'
import { join } from 'pathe'
import { afterEach, describe, expect, it } from 'vitest'

import { collectSecrets } from '../src/render'
import type { UiServer } from '../src/server'
import { browserPlan, contentType, fileAssets, startUiServer } from '../src/server'

const TOKEN = 'test-token-1234567890'
const secrets = collectSecrets(
  {
    version: 1,
    tools: [],
    mcpServers: {},
    skills: [],
    profiles: [],
    agents: [],
    workflows: [],
    styles: { outputStyles: [] },
    extras: {},
    mirror: 'official',
    language: 'auto',
    configLanguage: 'en',
  },
  ['sk-very-secret-key'],
)

const plan: Plan = {
  tools: [
    {
      tool: 'claude-code',
      notices: [],
      steps: [
        {
          kind: 'file',
          title: { key: 'step.provider', params: { provider: 'relay' } },
          path: '/home/me/.claude/settings.json',
          format: 'json',
          edits: [{ path: ['env', 'ANTHROPIC_AUTH_TOKEN'], value: 'sk-very-secret-key' }],
        },
        {
          kind: 'command',
          title: { key: 'x' },
          command: 'claude',
          args: ['mcp', 'add-json', 'x', '{"env":{"K":"sk-very-secret-key"}}'],
        },
      ],
    },
  ],
}

let saved: [Draft, Draft | undefined][] = []
const service: ZcfService = {
  load: async () => ({ path: '/home/me/.ufomiao/zcf/zcf.json', draft: { version: 1 }, exists: true, issues: [] }),
  save: async (draft, base) => {
    saved.push([draft, base])
  },
  detect: async () => ({ 'claude-code': { installed: true, command: 'claude', version: '2.1.0' } }),
  plan: async () => ({
    plan,
    previews: [
      [
        {
          path: '/home/me/.claude/settings.json',
          before: '{}\n',
          after: '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-very-secret-key"}}\n',
          changed: true,
          patch: '+    "ANTHROPIC_AUTH_TOKEN": "sk-very-secret-key"',
          secrets: ['sk-very-secret-key'],
        },
        null,
      ],
    ],
    secrets,
  }),
  apply: async onStep => {
    const step = plan.tools[0]!.steps[1]!
    onStep?.({
      tool: 'claude-code',
      index: 1,
      result: { step, status: 'failed', detail: 'bad key sk-very-secret-key' },
    })
    return { results: [{ tool: 'claude-code', ok: false, steps: [{ step, status: 'failed' }] }], backupDir: '/b' }
  },
  presets: async refresh => ({
    presets: [{ id: 'relay', name: 'Relay', description: { en: 'A relay' }, models: {} }],
    source: refresh ? 'remote' : 'cache',
  }),
  searchSkills: async () => ({
    skills: [{ name: 'using-git-worktrees', source: 'obra/superpowers', description: 'Worktrees.', installs: 541 }],
    source: 'remote',
  }),
  backups: async () => [{ id: '2026-10-24T08-00-00-000Z', reason: 'apply', entries: [] }],
  restoreBackup: async () => ({
    id: '2026-10-24T09-00-00-000Z',
    changed: 1,
    unchanged: 0,
    missing: 0,
    corrupt: 0,
    outside: 0,
  }),
  pruneBackups: async () => [],
}

const assets = {
  '/index.html': { body: '<!doctype html><title>ZCF</title>', type: 'text/html; charset=utf-8' },
}

let server: UiServer
afterEach(async () => {
  saved = []
  await server.close()
})

function call(
  path: string,
  init: { method?: string; body?: unknown; token?: string | null; host?: string; lang?: string } = {},
) {
  return new Promise<{ status: number; type: string; text: string }>((resolve, reject) => {
    const headers: Record<string, string> = { host: init.host ?? `127.0.0.1:${server.port}` }
    if (init.lang) headers['x-zcf-lang'] = init.lang
    if (init.token !== null) headers['x-zcf-token'] = init.token ?? TOKEN
    const req = request({ host: '127.0.0.1', port: server.port, path, method: init.method ?? 'GET', headers }, res => {
      let text = ''
      res.on('data', chunk => (text += String(chunk)))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, type: String(res.headers['content-type']), text }))
    })
    req.on('error', reject)
    req.end(init.body === undefined ? undefined : JSON.stringify(init.body))
  })
}

async function start(overrides: { langPinned?: boolean } = {}) {
  server = await startUiServer({
    service,
    lang: 'zh-CN',
    home: '/home/me',
    token: TOKEN,
    asset: async path => assets[path as keyof typeof assets],
    ...overrides,
  })
}

describe('startUiServer', () => {
  it('listens on 127.0.0.1 and puts the token in the URL fragment', async () => {
    await start()
    expect(server.url).toBe(`http://127.0.0.1:${server.port}/#token=${TOKEN}`)
    expect(await call('/', { token: null })).toMatchObject({ status: 200, text: '<!doctype html><title>ZCF</title>' })
    expect((await call('/missing.js', { token: null })).status).toBe(404)
  })

  it('refuses API calls without the token and requests for other host names', async () => {
    await start()
    expect((await call('/api/config', { token: null })).status).toBe(401)
    expect((await call('/api/config', { token: 'wrong-token-123456789' })).status).toBe(401)
    expect((await call('/api/config', { host: 'evil.example.com' })).status).toBe(403)
    expect((await call('/api/nope')).status).toBe(404)
  })

  it('serves both dictionaries so the browser can switch languages, loads and saves the config, and detects tools', async () => {
    await start()
    const session = JSON.parse((await call('/api/session')).text) as {
      lang: string
      langPinned: boolean
      messages: Record<string, Record<string, string>>
    }
    expect(session).toMatchObject({ lang: 'zh-CN', home: '/home/me', langPinned: false })
    expect(session.messages['zh-CN']!['tui.page.tools']).toBe('Agent 工具')
    expect(session.messages['en']!['tui.page.tools']).toBe('Agent tools')

    expect(JSON.parse((await call('/api/config')).text)).toMatchObject({ draft: { version: 1 }, exists: true })
    const draft = { version: 1, tools: ['codex'] }
    expect((await call('/api/config', { method: 'PUT', body: { draft, base: { version: 1 } } })).status).toBe(204)
    expect((await call('/api/config', { method: 'PUT', body: { draft } })).status).toBe(204)
    expect(saved).toEqual([
      [draft, { version: 1 }],
      [draft, undefined],
    ])
    expect((await call('/api/config', { method: 'PUT', body: [1] })).status).toBe(400)
    expect((await call('/api/config', { method: 'PUT', body: { draft, base: 'x' } })).status).toBe(400)
    expect(JSON.parse((await call('/api/detect', { method: 'POST' })).text)).toMatchObject({
      'claude-code': { installed: true },
    })
    expect(JSON.parse((await call('/api/presets')).text)).toMatchObject({ source: 'cache', presets: [{ id: 'relay' }] })
    expect(JSON.parse((await call('/api/presets?refresh=1')).text)).toMatchObject({ source: 'remote' })
    expect(JSON.parse((await call('/api/skills/search?q=git')).text)).toMatchObject({
      source: 'remote',
      skills: [{ name: 'using-git-worktrees', source: 'obra/superpowers' }],
    })
  })

  it('lists, restores and prunes backups behind the token', async () => {
    await start()
    expect(JSON.parse((await call('/api/backups')).text)).toEqual([
      { id: '2026-10-24T08-00-00-000Z', reason: 'apply', entries: [] },
    ])
    expect(
      JSON.parse((await call('/api/backups/restore', { method: 'POST', body: { id: 'run' } })).text),
    ).toMatchObject({
      id: '2026-10-24T09-00-00-000Z',
      changed: 1,
    })
    expect(JSON.parse((await call('/api/backups/prune', { method: 'POST', body: {} })).text)).toEqual([])
    expect((await call('/api/backups', { token: null })).status).toBe(401)
    expect((await call('/api/backups/restore', { method: 'POST', body: { id: 1 } })).status).toBe(400)
    expect((await call('/api/backups/prune', { method: 'POST', body: { keep: 'x' } })).status).toBe(400)
  })

  it('never sends secrets, file contents or edit values to the browser', async () => {
    await start()
    const { text } = await call('/api/plan', { method: 'POST' })
    expect(text).not.toContain('sk-very-secret-key')
    expect(text).toContain('sk-***ey')
    const view = JSON.parse(text) as ReturnType<typeof browserPlan>
    expect(view.previews[0]![0]).toMatchObject({ before: '', after: '', secrets: [] })
    expect(view.plan.tools[0]!.steps[0]).toMatchObject({ kind: 'file', edits: [] })

    const applied = await call('/api/apply', { method: 'POST' })
    expect(applied.type).toBe('application/x-ndjson')
    expect(applied.text).not.toContain('sk-very-secret-key')
    const events = applied.text
      .trim()
      .split('\n')
      .map(line => JSON.parse(line) as { type: string })
    expect(events.map(event => event.type)).toEqual(['step', 'done'])
  })

  it('reports a failing call as a 500 with the message', async () => {
    server = await startUiServer({
      service: { ...service, load: () => Promise.reject(new Error('disk on fire')) },
      lang: 'en',
      home: '/home/me',
      token: TOKEN,
      asset: async () => undefined,
    })
    expect(await call('/api/config')).toMatchObject({ status: 500, text: '{"error":"disk on fire"}' })
  })

  it('masks a secret that a failing call leaks in its error message', async () => {
    server = await startUiServer({
      // A plain Error's message can quote the command line, key included.
      service: {
        ...service,
        detect: () => Promise.reject(new Error('claude mcp add-json relay {"env":{"K":"sk-very-secret-key"}} failed')),
      },
      lang: 'en',
      home: '/home/me',
      token: TOKEN,
      asset: async () => undefined,
    })
    const failed = await call('/api/detect', { method: 'POST' })
    expect(failed.status).toBe(500)
    expect(failed.text).not.toContain('sk-very-secret-key')
    expect(failed.text).toContain('sk-***ey')
  })

  it('tells the browser when the language is pinned, and errors speak the language it asks for', async () => {
    await start({ langPinned: true })
    const session = JSON.parse((await call('/api/session')).text) as { langPinned: boolean }
    expect(session.langPinned).toBe(true)
    await server.close()

    server = await startUiServer({
      service: {
        ...service,
        load: () => Promise.reject(new MessageError({ key: 'service.configInvalid', params: { path: '/z.json' } })),
      },
      lang: 'en',
      home: '/home/me',
      token: TOKEN,
      asset: async () => undefined,
    })
    const zh = await call('/api/config', { lang: 'zh-CN' })
    expect(zh).toMatchObject({ status: 500, text: expect.stringContaining('/z.json 中的配置有问题') })
    expect(await call('/api/config')).toMatchObject({
      status: 500,
      text: '{"error":"The config at /z.json has problems. Fix them and save before planning."}',
    })
  })

  it('translates a failing apply and sends it as the last event', async () => {
    server = await startUiServer({
      service: {
        ...service,
        apply: () => Promise.reject(new MessageError({ key: 'service.configInvalid', params: { path: '/z.json' } })),
      },
      lang: 'en',
      home: '/home/me',
      token: TOKEN,
      asset: async () => undefined,
    })
    const applied = await call('/api/apply', { method: 'POST' })
    expect(applied.status).toBe(200)
    expect(JSON.parse(applied.text)).toEqual({
      type: 'error',
      error: 'The config at /z.json has problems. Fix them and save before planning.',
    })
  })
})

describe('contentType', () => {
  it('knows the web app file types', () => {
    expect(contentType('/assets/index-abc.js')).toBe('text/javascript; charset=utf-8')
    expect(contentType('/x.unknown')).toBe('application/octet-stream')
  })
})

describe('fileAssets', () => {
  it('serves files from the first folder with an index.html, and nothing outside it', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'zcf-web-'))
    try {
      await mkdir(join(dir, 'web', 'assets'), { recursive: true })
      await writeFile(join(dir, 'web', 'index.html'), '<!doctype html>')
      await writeFile(join(dir, 'web', 'assets', 'app.js'), 'export {}')
      await writeFile(join(dir, 'secret.txt'), 'no')
      const asset = (await fileAssets([join(dir, 'missing'), join(dir, 'web')]))!
      expect(await asset('/assets/app.js')).toEqual({
        body: Buffer.from('export {}'),
        type: 'text/javascript; charset=utf-8',
      })
      expect(await asset('/../secret.txt')).toBeUndefined()
      expect(await asset('/nope.css')).toBeUndefined()
      expect(await fileAssets([join(dir, 'missing')])).toBeUndefined()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
