import type { Plan } from '@zcf/core'
import type { Draft, PlanView, ZcfService } from '@zcf/ui-kit'
import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'

import { createTranslator } from '../src/i18n'
import { App } from '../src/tui/app'

const t = createTranslator('en')
const KEY = { enter: '\r', up: '\u001B[A', down: '\u001B[B', right: '\u001B[C', escape: '\u001B', save: '\u0013' }

const tick = () => new Promise(resolve => setTimeout(resolve, 30))

function fakeService(draft: Draft | undefined, overrides: Partial<ZcfService> = {}) {
  const saved: Draft[] = []
  const bases: (Draft | undefined)[] = []
  const service: ZcfService = {
    load: async () =>
      draft
        ? { path: '/home/me/.ufomiao/zcf/config.json', draft, exists: true, issues: [] }
        : {
            path: '/home/me/.ufomiao/zcf/config.json',
            exists: true,
            issues: [{ path: 'tools', message: { key: 'configIssue.missing' } }],
          },
    save: async (next, base) => {
      saved.push(next)
      bases.push(base)
    },
    detect: async () => ({ 'claude-code': { installed: true, command: 'claude', version: '2.1.0' } }),
    plan: async () => {
      throw new Error('not planned')
    },
    apply: async () => ({ results: [], backupDir: '/home/me/backups' }),
    presets: async () => ({ presets: [], source: 'none' }),
    ...overrides,
  }
  return { service, saved, bases }
}

async function start(service: ZcfService) {
  const app = render(<App service={service} t={t} lang="en" home="/home/me" />)
  await tick()
  const press = async (...keys: string[]) => {
    for (const key of keys) {
      app.stdin.write(key)
      // Each key needs its own render before the next one arrives.
      // oxlint-disable-next-line no-await-in-loop
      await tick()
    }
  }
  const frame = () => app.lastFrame() ?? ''
  // Waits for something that loads in the background, which can take longer than one tick on a busy machine.
  const until = async (text: string) => {
    for (let waited = 0; !frame().includes(text) && waited < 2000; waited += 30) {
      // oxlint-disable-next-line no-await-in-loop
      await tick()
    }
    // One more tick so input handlers of what just appeared are attached.
    await tick()
    return frame()
  }
  return { ...app, press, frame, until }
}

describe('terminal UI', () => {
  it('lists the tools with their install state and saves a toggled tool with Ctrl+S', async () => {
    const { service, saved, bases } = fakeService({ version: 1, tools: ['claude-code'] })
    const app = await start(service)
    expect(app.frame()).toContain('~/.ufomiao/zcf/config.json')
    expect(app.frame()).toContain('[x] Claude Code')
    expect(app.frame()).toContain('installed 2.1.0')
    expect(app.frame()).toContain('[ ] Codex')

    await app.press(KEY.enter, KEY.down, ' ')
    expect(app.frame()).toContain('[x] Codex')
    expect(app.frame()).toContain('unsaved')

    await app.press(KEY.save)
    expect(saved).toEqual([{ version: 1, tools: ['claude-code', 'codex'] }])
    // The save is compared with what this editor loaded.
    expect(bases).toEqual([{ version: 1, tools: ['claude-code'] }])
    expect(app.frame()).toContain('Saved.')
    expect(app.frame()).not.toContain('unsaved')
    app.unmount()
  })

  it('edits provider fields in place and never shows the API key', async () => {
    const { service } = fakeService({ version: 1, tools: [], provider: { name: 'old', apiKey: 'sk-very-secret' } })
    const app = await start(service)
    await app.press(KEY.down, KEY.enter)
    expect(app.frame()).toContain('Name')
    expect(app.frame()).not.toContain('sk-very-secret')

    await app.press(KEY.down, KEY.enter, '\u007F\u007F\u007F', 'relay', KEY.enter)
    expect(app.frame()).toContain('relay')
    expect(app.frame()).not.toContain('old')

    // Emptying a required field shows its problem, and saving is refused.
    // The key being edited is shown as stars.
    await app.press(KEY.down, KEY.enter)
    expect(app.frame()).toContain('*'.repeat('sk-very-secret'.length))
    expect(app.frame()).not.toContain('sk-very-secret')
    await app.press('\u0015', KEY.enter, KEY.save)
    expect(app.frame()).toContain('Fix 1 problem(s) before saving. provider.apiKey: must not be empty')
    expect(app.frame()).toMatch(/Provider !/)
    app.unmount()
  })

  it('switches the download mirror on the Settings page', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press(KEY.down, KEY.down, KEY.down, KEY.down)
    expect(app.frame()).toContain('Settings')
    await app.press(KEY.enter)
    expect(app.frame()).toContain('Download mirror')
    expect(app.frame()).toContain('official sources (default)')
    // From the default, the next option is the China mirror.
    await app.press(KEY.right)
    expect(app.frame()).toContain('China mirrors')
    await app.press(KEY.save)
    expect(saved).toEqual([{ version: 1, tools: [], mirror: 'china' }])
    app.unmount()
  })

  it('says when ZCF_MIRROR outranks the saved mirror, and fixes a mirror that is not an option', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [], mirror: 'cn' })
    const loaded = await service.load()
    service.load = async () => ({ ...loaded, envMirror: 'official' })
    const app = await start(service)
    await app.press(KEY.down, KEY.down, KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('ZCF_MIRROR is set, so ZCF uses official sources')
    expect(app.frame()).toMatch(/Download mirror\s+cn/)
    // The first press offers the first option rather than skipping it.
    await app.press(KEY.right, KEY.save)
    expect(saved).toEqual([{ version: 1, tools: [], mirror: 'official' }])
    app.unmount()
  })

  it('opens a skill source with the cursor on its first field', async () => {
    const skills = [{ source: 'a/a' }, { source: 'b/b' }, { source: 'c/c' }]
    const { service, saved } = fakeService({ version: 1, tools: [], skills })
    const app = await start(service)
    await app.press(KEY.down, KEY.down, KEY.down, KEY.enter, KEY.down, KEY.down, KEY.enter)
    await app.press(KEY.enter, '\u0015', 'x/y', KEY.enter, KEY.save)
    expect(saved).toEqual([
      { version: 1, tools: [], skills: [{ source: 'a/a' }, { source: 'b/b' }, { source: 'x/y' }] },
    ])
    app.unmount()
  })

  it('fills the provider from a preset and keeps the API key', async () => {
    const { service, saved } = fakeService(
      {
        version: 1,
        tools: [],
        provider: {
          name: 'old',
          apiKey: 'sk-very-secret',
          anthropic: { baseUrl: 'https://relay.example.com/v0' },
          models: { opus: 'x' },
        },
      },
      {
        presets: async () => ({
          source: 'cache',
          presets: [
            {
              id: 'relay',
              name: 'Relay',
              description: { en: 'A relay', 'zh-CN': '中转' },
              anthropic: { baseUrl: 'https://relay.example.com', authType: 'api_key' },
              models: { default: 'relay-1' },
            },
          ],
        }),
      },
    )
    const app = await start(service)
    await app.press(KEY.down, KEY.enter, KEY.enter)
    // The host comes first, so the user sees where the key would go before picking.
    expect(await app.until('Relay')).toContain('relay.example.com · A relay')
    expect(app.frame()).toContain('saved copy')

    await app.press(KEY.enter)
    expect(await app.until('relay.example.com')).toContain('Relay')
    await app.press(KEY.save)
    expect(saved).toEqual([
      {
        version: 1,
        tools: [],
        provider: {
          name: 'Relay',
          apiKey: 'sk-very-secret',
          anthropic: { baseUrl: 'https://relay.example.com', authType: 'api_key' },
          models: { default: 'relay-1' },
        },
      },
    ])
    expect(app.frame()).not.toContain('sk-very-secret')
    app.unmount()
  })

  it('goes back from the preset list while it is still loading', async () => {
    const { service } = fakeService({ version: 1, tools: [] }, { presets: () => new Promise(() => {}) })
    const app = await start(service)
    await app.press(KEY.down, KEY.enter, KEY.enter)
    expect(await app.until('Loading the preset list')).toContain('Choose a provider preset')
    await app.press(KEY.escape)
    expect(await app.until('Start from a preset')).not.toContain('Loading the preset list')
    app.unmount()
  })

  it('adds an MCP server through its form', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press(KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('Add a local (stdio) server')

    await app.press(KEY.enter)
    expect(app.frame()).toContain('MCP server "server"')
    await app.press(KEY.down, KEY.down, KEY.enter, 'npx', KEY.enter, KEY.down, KEY.enter, '-y "ctx 7"', KEY.enter)
    await app.press(KEY.save)
    expect(saved.at(-1)).toEqual({
      version: 1,
      tools: [],
      mcpServers: { server: { type: 'stdio', command: 'npx', args: ['-y', 'ctx 7'] } },
    })

    // A new variable's value is masked while typed.
    await app.press(KEY.down, KEY.enter, KEY.enter, 'TOKEN=sk-abc')
    expect(app.frame()).toContain('TOKEN=******')
    expect(app.frame()).not.toContain('sk-abc')
    await app.press(KEY.enter, KEY.escape, KEY.save)
    expect(saved.at(-1)).toMatchObject({ mcpServers: { server: { env: { TOKEN: 'sk-abc' } } } })

    await app.press(KEY.escape)
    expect(app.frame()).toContain('npx -y')
    app.unmount()
  })

  it('removes the provider, so a config without one is valid again', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [], provider: { name: '', apiKey: '' } })
    const app = await start(service)
    await app.press(KEY.down, KEY.enter)
    for (let i = 0; i < 13; i++) {
      // oxlint-disable-next-line no-await-in-loop
      await app.press(KEY.down)
    }
    expect(app.frame()).toContain('› Remove the provider')
    await app.press(KEY.enter, KEY.save)
    expect(saved).toEqual([{ version: 1, tools: [] }])
    app.unmount()
  })

  it('shows the plan with secrets masked and applies it on Enter', async () => {
    const plan: Plan = {
      tools: [
        {
          tool: 'claude-code',
          notices: [],
          steps: [
            {
              kind: 'command',
              title: { key: 'step.install', params: { tool: 'claude-code' } },
              command: 'npm',
              args: ['i', '-g', 'x'],
            },
          ],
        },
      ],
    }
    const view: PlanView = { plan, previews: [[null]], secrets: ['sk-very-secret'] }
    let applied = false
    const { service } = fakeService(
      { version: 1, tools: ['claude-code'] },
      {
        plan: async () => view,
        apply: async onStep => {
          applied = true
          onStep?.({ tool: 'claude-code', index: 0, result: { step: plan.tools[0]!.steps[0]!, status: 'done' } })
          return {
            results: [{ tool: 'claude-code', ok: true, steps: [{ step: plan.tools[0]!.steps[0]!, status: 'done' }] }],
            backupDir: '/home/me/b',
          }
        },
      },
    )
    const app = await start(service)
    await app.press(KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('Install Claude Code')
    expect(app.frame()).toContain('$ npm i -g x')

    await app.press(KEY.enter)
    await tick()
    expect(applied).toBe(true)
    expect(app.frame()).toContain('Done: 1 applied, 0 already up to date.')
    app.unmount()
  })

  it('asks to save before planning unsaved changes', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press(KEY.enter, ' ', KEY.escape, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down)
    expect(app.frame()).toContain('Save your changes with Ctrl+S to see the plan.')
    app.unmount()
  })

  it('needs a second q to quit with unsaved changes', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press(KEY.enter, ' ', KEY.escape, 'q')
    expect(app.frame()).toContain('Press q again to quit without saving')
    app.unmount()
  })

  it('shows why the config could not be read instead of loading forever', async () => {
    const { service } = fakeService(undefined, { load: () => Promise.reject(new Error('EACCES: permission denied')) })
    const app = await start(service)
    expect(app.frame()).toContain('The config could not be read: EACCES: permission denied')
    app.unmount()
  })

  it('explains why a broken config cannot be edited', async () => {
    const { service } = fakeService(undefined)
    const app = await start(service)
    expect(app.frame()).toContain('cannot be read')
    expect(app.frame()).toContain('tools: is required')
    app.unmount()
  })
})
