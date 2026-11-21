import { stripVTControlCharacters } from 'node:util'

import type { BackupInfo, Plan } from '@zcf/core'
import type { Draft, PlanView, ZcfService } from '@zcf/ui-kit'
import chalk from 'chalk'
import { Box, Text } from 'ink'
import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'

import type { Lang } from '../src/i18n'
import { createTranslator } from '../src/i18n'
import { App } from '../src/tui/app'
import { fitLists } from '../src/tui/apply-page'
import type { FxOptions } from '../src/tui/fx/detect'
import type { Clock } from '../src/tui/fx/ticker'
import { FRAME_MS, systemClock, Ticker } from '../src/tui/fx/ticker'
import { LOGO_ROWS } from '../src/tui/sidebar'
import { textWidth, wrappedLines } from '../src/tui/text-width'
import {
  contrast,
  createTheme,
  DARK,
  detectBackground,
  detectColorLevel,
  detectMotion,
  gradientColumns,
  LIGHT,
} from '../src/tui/theme'

const KEY = {
  enter: '\r',
  up: '\u001B[A',
  down: '\u001B[B',
  right: '\u001B[C',
  left: '\u001B[D',
  escape: '\u001B',
}

const tick = () => new Promise(resolve => setTimeout(resolve, 30))

/** One backup run, the shape `listBackups` reports. */
const backupRun = (id: string, at: string) => ({
  id,
  createdAt: at,
  reason: 'apply' as const,
  entries: [
    { path: 'a.json', size: 1, mode: 0o644 },
    { path: 'b.json', size: 2, mode: 0o644 },
  ],
})

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
    backups: async () => [],
    restoreBackup: async () => ({ id: 'run', changed: 0, unchanged: 0, missing: 0, corrupt: 0, outside: 0 }),
    pruneBackups: async () => [],
    presets: async () => ({ presets: [], source: 'none' }),
    searchSkills: async () => ({ skills: [], source: 'none' }),
    ...overrides,
  }
  return { service, saved, bases }
}

async function start(
  service: ZcfService,
  options: { lang?: Lang; langPinned?: boolean; fx?: FxOptions; columns?: number; rows?: number } = {},
) {
  const app = render(
    <App
      service={service}
      lang={options.lang ?? 'en'}
      langPinned={options.langPinned ?? false}
      home="/home/me"
      fx={options.fx}
    />,
  )
  // The fake stdout defaults to a stub short of the centered apply dialog; a real-size
  // terminal is the honest default, and the windowing tests pin their own smaller rows.
  Object.defineProperty(app.stdout, 'rows', { get: () => options.rows ?? 30, configurable: true })
  Object.defineProperty(app.stdout, 'columns', { get: () => options.columns ?? 100, configurable: true })
  app.stdout.emit('resize')
  const press = async (...keys: string[]) => {
    for (const key of keys) {
      app.stdin.write(key)
      // Each key needs its own render before the next one arrives. Ink handles the key
      // and renders synchronously; one tick lets the effects and promises it started
      // settle, so the next key never interleaves with the previous render.
      // oxlint-disable-next-line no-await-in-loop
      await tick()
    }
  }
  // Colour codes come and go with the terminal the suite runs in; the text is what these tests read.
  const frame = () => stripVTControlCharacters(app.lastFrame() ?? '')
  // Waits for something that loads in the background, which can take longer than one tick on a busy machine.
  const until = async (text: string) => {
    for (let waited = 0; !frame().includes(text) && waited < 2000; waited += 30) {
      // oxlint-disable-next-line no-await-in-loop
      await tick()
    }
    // A wait that runs out is a wrong expectation, not a slow machine: say so instead of returning.
    if (!frame().includes(text)) throw new Error(`Timed out waiting for ${JSON.stringify(text)}:\n${frame()}`)
    // One more tick so input handlers of what just appeared are attached.
    await tick()
    return frame()
  }
  // One tick is not always enough for the config to load on a busy machine, and a key
  // pressed while it still loads lands on the loading screen and silently moves focus.
  // A fast load draws nothing until it is in, so the first non-empty frame is the loaded app,
  // whatever the width shows of it.
  for (let waited = 0; frame().trim() === '' && waited < 2000; waited += 30) {
    // oxlint-disable-next-line no-await-in-loop
    await tick()
  }
  await tick()
  // The frame with its escape codes, for the tests that read colour and inverse video.
  const raw = () => app.lastFrame() ?? ''
  return { ...app, press, frame, until, raw }
}

// The backup page is the ninth: every test reaches it the one way the app offers — jump
// to it with 9, then open it with Enter.
async function openBackup(app: Awaited<ReturnType<typeof start>>) {
  await app.press('9', KEY.enter)
}

// Saving a draft runs through the apply flow: a opens it, Enter saves, plans and applies,
// and the fake service's default plan rejects, so the run ends with its failure line. Esc
// may close the flow only once that run is over — keys are ignored while it is still going.
async function saveThroughFlow(app: Awaited<ReturnType<typeof start>>) {
  await app.press('a', KEY.enter)
  await app.until('Could not plan: not planned')
  await app.press(KEY.escape)
}

describe('terminal UI', () => {
  it('lists the tools with their install state and saves a toggled tool through the apply flow', async () => {
    const { service, saved, bases } = fakeService({ version: 1, tools: ['claude-code'] })
    const app = await start(service)
    // 1 opens the tools page from the nav; Enter moves into its list.
    await app.press('1', KEY.enter)
    expect(app.frame()).toContain('~/.ufomiao/zcf/config.json')
    expect(app.frame()).toContain('◉ Claude Code')
    expect(app.frame()).toContain('installed 2.1.0')
    expect(app.frame()).toContain('○ Codex')

    await app.press(KEY.down, ' ')
    expect(app.frame()).toContain('◉ Codex')
    expect(app.frame()).toContain('to apply')

    // a opens the confirm-then-run flow over the page: what changed, what is installed.
    await app.press('a')
    expect(app.frame()).toContain('Apply the configuration')
    expect(app.frame()).toContain('tools: claude-code, codex')
    expect(app.frame()).toContain('Tools: Claude Code (installed)')

    // Enter saves, plans and applies at once; the fake service's plan rejects, so the run says so.
    await app.press(KEY.enter)
    expect(saved).toEqual([{ version: 1, tools: ['claude-code', 'codex'] }])
    // The save is compared with what this editor loaded.
    expect(bases).toEqual([{ version: 1, tools: ['claude-code'] }])
    expect(await app.until('Could not plan: not planned')).toContain('Could not plan: not planned')
    // Esc closes the flow; with the draft saved, the dirty dot is gone.
    await app.press(KEY.escape)
    expect(app.frame()).toContain('Pick the agent tools')
    expect(app.frame()).not.toContain('to apply')
    app.unmount()
  })

  it('edits provider fields in place and never shows the API key', async () => {
    const { service } = fakeService({ version: 1, tools: [], provider: { name: 'old', apiKey: 'sk-very-secret' } })
    const app = await start(service)
    await app.press('2', KEY.enter)
    expect(app.frame()).toContain('Name')
    expect(app.frame()).not.toContain('sk-very-secret')

    await app.press(KEY.down, KEY.down, KEY.enter, '\u007F\u007F\u007F', 'relay', KEY.enter)
    expect(app.frame()).toContain('relay')
    expect(app.frame()).not.toContain('old')

    // Emptying a required field shows its problem, and the apply flow refuses to save.
    // The key being edited is shown as stars.
    await app.press(KEY.down, KEY.enter)
    expect(app.frame()).toContain('*'.repeat('sk-very-secret'.length))
    expect(app.frame()).not.toContain('sk-very-secret')
    await app.press('\u0015', KEY.enter, 'a', KEY.enter)
    expect(app.frame()).toContain('Fix 1 problem(s) before saving. provider.apiKey: must not be empty')
    // The refused save leaves the flow on its confirmation.
    expect(app.frame()).toContain('Apply the configuration')
    expect(app.frame()).toMatch(/Provider !/)
    app.unmount()
  })

  it('switches the download mirror on the Settings page', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('7')
    expect(app.frame()).toContain('Settings')
    await app.press(KEY.enter)
    expect(app.frame()).toContain('Download mirror')
    // An unset select shows its first option, the schema default, with no extra placeholder.
    expect(app.frame()).toContain('official sources')
    expect(app.frame()).not.toContain('(default)')
    // From the default, the next option is the China mirror.
    await app.press(KEY.right)
    expect(app.frame()).toContain('China mirrors')
    // The confirmation names the changed key before Enter saves through the flow.
    await app.press('a')
    expect(app.frame()).toContain('mirror: china')
    await app.press(KEY.enter)
    expect(saved).toEqual([{ version: 1, tools: [], mirror: 'china' }])
    app.unmount()
  })

  it('says when ZCF_MIRROR outranks the saved mirror, and fixes a mirror that is not an option', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [], mirror: 'cn' })
    const loaded = await service.load()
    service.load = async () => ({ ...loaded, envMirror: 'official' })
    const app = await start(service)
    await app.press('7', KEY.enter)
    expect(app.frame()).toContain('ZCF_MIRROR is set, so ZCF uses official sources')
    expect(app.frame()).toMatch(/Download mirror\s+cn/)
    // The first press offers the first option rather than skipping it.
    await app.press(KEY.right, 'a', KEY.enter)
    expect(saved).toEqual([{ version: 1, tools: [], mirror: 'official' }])
    app.unmount()
  })

  it('shows the one-line header: badge, version, path and the language', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    expect(app.frame()).toContain('zcf')
    expect(app.frame()).toContain('Interface language: Auto (L)')
    app.unmount()
  })

  it('moves the state onto a right sidebar once the terminal is wide enough', async () => {
    const { service } = fakeService({ version: 1, tools: ['claude-code'] })
    const app = await start(service)
    // 100 columns still keep the header: the sidebar only takes over when the page
    // keeps a full line's worth beside it.
    expect(app.frame()).toContain('Interface language: Auto (L)')
    expect(app.frame()).not.toContain('ZERO-CONFIG')

    Object.defineProperty(app.stdout, 'columns', { get: () => 120, configurable: true })
    app.stdout.emit('resize')
    await tick()
    expect(app.frame()).not.toContain('Interface language:')
    expect(app.frame()).toContain('ZERO-CONFIG')
    // The wordmark sits over a live picture of the config: clean state, counts, path.
    expect(app.frame()).toContain('nothing to apply')
    // The dim label and the plain value carry an ANSI switch between them, so each
    // half is asserted on its own.
    expect(app.frame()).toContain('Agent tools')
    expect(app.frame()).toContain('1/1 installed')
    // The 26-wide column truncates the path; the home it sits under still shows.
    expect(app.frame()).toContain('~/.ufomiao/zcf')
    expect(app.frame()).toContain('5.0.0-alpha.0')

    // An edit flips the sidebar's state line without leaving the page.
    await app.press(KEY.right, ' ')
    expect(app.frame()).toContain('to apply')
    expect(app.frame()).not.toContain('nothing to apply')
    app.unmount()
  })

  it('switches the interface language from the header with L, saving it at once', async () => {
    const zh = createTranslator('zh-CN')
    const { service, saved, bases } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    expect(app.frame()).toContain('Interface language: Auto (L)')

    // auto → en: the value moves and is saved on its own, without the apply flow.
    await app.press('l')
    expect(app.frame()).toContain('Interface language: English (L)')
    expect(saved).toEqual([{ version: 1, tools: [], language: 'en' }])
    expect(bases).toEqual([{ version: 1, tools: [] }])
    expect(app.frame()).not.toContain('to apply')

    // en → zh-CN: the whole UI switches, not just the header.
    await app.press('l')
    expect(await app.until(zh('tui.page.tools'))).toContain('a  应用')
    expect(app.frame()).toContain('界面语言: 简体中文 (L)')
    expect(saved.at(-1)).toEqual({ version: 1, tools: [], language: 'zh-CN' })
    // bases stay the draft as it stood, so only the language key is ever written.
    expect(bases.at(-1)).toEqual({ version: 1, tools: [], language: 'en' })

    // zh-CN → auto: back to the startup locale.
    await app.press('l')
    expect(app.frame()).toContain('Interface language: Auto (L)')
    expect(app.frame()).toContain('Agent tools')
    app.unmount()
  })

  it('keeps a language pinned by --lang or ZCF_LANG, without the header switch', async () => {
    const zh = createTranslator('zh-CN')
    const { service, saved } = fakeService({ version: 1, tools: [], language: 'zh-CN' })
    const app = await start(service, { lang: 'en', langPinned: true })
    expect(app.frame()).toContain('Interface language: 简体中文')
    expect(app.frame()).not.toContain('(L)')
    // The footer hints stop offering the switch too: L is a no-op while pinned.
    expect(app.frame()).not.toContain('L  lang')
    expect(app.frame()).toContain('a  apply')
    expect(app.frame()).toContain('q  quit')
    expect(app.frame()).not.toContain('L  lang')
    await app.press('l')
    expect(app.frame()).toContain('MCP servers')
    expect(app.frame()).not.toContain(zh('tui.page.tools'))
    expect(saved).toEqual([])
    app.unmount()
  })

  it('switches with an uppercase L too, the way the header hint is written', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    expect(app.frame()).toContain('Interface language: Auto (L)')
    await app.press('L')
    expect(app.frame()).toContain('Interface language: English (L)')
    expect(saved).toEqual([{ version: 1, tools: [], language: 'en' }])
    app.unmount()
  })

  it('types l into a text field without switching the interface language', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    // To the Provider page, down past the profiles row to the name field, and into its text input.
    await app.press('2', KEY.enter, KEY.down, KEY.down, KEY.enter)
    await app.press('l', 'a', 'n', 'g')
    expect(app.frame()).toContain('lang')
    // The language sits where it was, and nothing was saved behind the user's back.
    expect(app.frame()).toContain('Interface language: Auto (L)')
    await app.press(KEY.enter)
    expect(saved).toEqual([])
    app.unmount()
  })

  it('shows the error in the status line when a language switch cannot save', async () => {
    const { service } = fakeService(
      { version: 1, tools: [] },
      {
        save: async () => {
          throw new Error('disk full')
        },
      },
    )
    const app = await start(service)
    await app.press('l')
    expect(await app.until('Could not save: disk full')).toContain('Could not save: disk full')
    app.unmount()
  })

  it('picks the config language on the Settings page; the interface language is not a field there', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('7', KEY.enter)
    expect(app.frame()).toContain('Config language')
    // An unset select shows its first option, which is the schema default (selectValue).
    expect(app.frame()).toContain('English')
    expect(app.frame()).not.toContain('(default)')
    // The interface language lives in the header now, not among these fields.
    expect(app.frame()).not.toMatch(/^ {2}Interface language/m)
    // Config language sits under the mirror: from the default, the next option is zh-CN.
    await app.press(KEY.down, KEY.right)
    expect(app.frame()).toContain('简体中文')
    await app.press('a', KEY.enter)
    expect(saved).toEqual([{ version: 1, tools: [], configLanguage: 'zh-CN' }])
    app.unmount()
  })

  it('starts in the config language, unless --lang or ZCF_LANG pinned it', async () => {
    const zh = createTranslator('zh-CN')
    const follows = await start(fakeService({ version: 1, tools: [], language: 'zh-CN' }).service)
    expect(await follows.until(zh('tui.page.tools'))).toContain('Enter  打开')
    follows.unmount()

    const pinned = await start(fakeService({ version: 1, tools: [], language: 'zh-CN' }).service, {
      lang: 'en',
      langPinned: true,
    })
    expect(pinned.frame()).toContain('MCP servers')
    expect(pinned.frame()).not.toContain(zh('tui.page.tools'))
    pinned.unmount()
  })

  it('opens a skill source with the cursor on its first field', async () => {
    const skills = [{ source: 'a/a' }, { source: 'b/b' }, { source: 'c/c' }]
    const { service, saved } = fakeService({ version: 1, tools: [], skills })
    const app = await start(service)
    await app.press('4', KEY.enter, KEY.down, KEY.down, KEY.enter)
    await app.press(KEY.enter, '\u0015', 'x/y', KEY.enter, 'a', KEY.enter)
    expect(saved).toEqual([
      { version: 1, tools: [], skills: [{ source: 'a/a' }, { source: 'b/b' }, { source: 'x/y' }] },
    ])
    app.unmount()
  })

  it('picks built-in skills from the catalog beside a custom source', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [], skills: [{ source: 'a/a' }] })
    const app = await start(service)
    await app.press('4', KEY.enter)
    // The list starts at the custom source; the catalog row is below it.
    await app.press(KEY.down, KEY.enter)
    expect(app.frame()).toContain('Pick the ZCF built-in skills to install')
    expect(app.frame()).toContain('Generate CLAUDE.md context indexes for a project')
    await app.press(KEY.down, KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('✓ git-commit')
    await app.press(KEY.up, KEY.up, KEY.up, KEY.enter)
    expect(app.frame()).toContain('✓ init-project')
    await app.press(KEY.escape)
    expect(app.frame()).toContain('ZCF built-in skills')
    expect(app.frame()).toContain('git-commit, init-project')
    // One row for the catalog, not a second one repeating the same picked skills.
    expect(app.frame().match(/ZCF built-in skills/g)).toHaveLength(1)
    await app.press('a', KEY.enter)
    expect(saved).toEqual([
      {
        version: 1,
        tools: [],
        skills: [{ source: 'a/a' }, { source: 'zcf', skills: ['git-commit', 'init-project'] }],
      },
    ])
    app.unmount()
  })

  it('untoggles a picked built-in skill and drops the source once it is empty', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [], skills: [{ source: 'zcf', skills: ['feat'] }] })
    const app = await start(service)
    await app.press('4', KEY.enter)
    expect(app.frame()).toContain('ZCF built-in skills')
    expect(app.frame()).toContain('feat')
    // The built-in row itself opens the catalog, so Enter on it goes straight to the checkboxes.
    await app.press(KEY.enter)
    expect(app.frame()).toContain('✓ feat')
    await app.press(KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).not.toContain('✓ feat')
    await app.press(KEY.escape)
    await app.press('a', KEY.enter)
    expect(saved).toEqual([{ version: 1, tools: [] }])
    app.unmount()
  })

  it('keeps a single built-in row for a zcf source that names no skills', async () => {
    // `{ source: 'zcf' }` with no list means every built-in skill; it already has a row.
    const { service, saved } = fakeService({ version: 1, tools: [], skills: [{ source: 'zcf' }] })
    const app = await start(service)
    await app.press('4', KEY.enter)
    expect(app.frame()).toContain('ZCF built-in skills')
    expect(app.frame()).toContain('all skills')
    expect(app.frame().match(/ZCF built-in skills/g)).toHaveLength(1)
    // Removing it leaves the stand-in row, which a plain source takes over again.
    await app.press('x')
    expect(app.frame()).toContain('+ ZCF built-in skills')
    await app.press(KEY.down, KEY.down, KEY.enter, 'a', '/', 'b', KEY.enter)
    expect(app.frame()).toContain('a/b')
    await app.press('a', KEY.enter)
    expect(saved).toEqual([{ version: 1, tools: [], skills: [{ source: 'a/b' }] }])
    app.unmount()
  })

  it('searches community skills and adds a hit to the source it belongs to', async () => {
    const { service, saved } = fakeService(
      { version: 1, tools: [], skills: [{ source: 'obra/superpowers', skills: ['existing-one'] }] },
      {
        searchSkills: async () => ({
          skills: [
            {
              name: 'using-git-worktrees',
              source: 'obra/superpowers',
              description: 'Create and manage git worktrees.',
            },
          ],
          source: 'remote' as const,
        }),
      },
    )
    const app = await start(service)
    await app.press('4', KEY.enter)
    // The list starts at the existing source; the search row is two rows below it.
    await app.press(KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('Search skills')
    await app.press(KEY.enter, 'g', 'i', 't', KEY.enter)
    await app.until('using-git-worktrees')
    expect(app.frame()).toContain('obra/superpowers')
    await app.press(KEY.down, KEY.enter)
    expect(app.frame()).toContain('obra/superpowers · added')
    await app.press(KEY.escape, 'a', KEY.enter)
    expect(saved).toEqual([
      {
        version: 1,
        tools: [],
        skills: [{ source: 'obra/superpowers', skills: ['existing-one', 'using-git-worktrees'] }],
      },
    ])
    app.unmount()
  })

  it('keeps the search query label on one line when its editor opens', async () => {
    // Before any results, the query row is the only row; its label must not be squeezed
    // into the value column width of rows that do not exist.
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('4', KEY.enter, KEY.down, KEY.enter)
    await app.press(KEY.enter)
    expect(app.frame()).toContain('› 1 keyword')
    app.unmount()
  })

  it('windows a list taller than the terminal and marks the hidden ends', async () => {
    const hits = Array.from({ length: 15 }, (_, i) => ({
      name: `skill-${String(i).padStart(2, '0')}`,
      source: `owner/repo-${i}`,
      description: 'Community skill.',
    }))
    const { service } = fakeService(
      { version: 1, tools: [] },
      { searchSkills: async () => ({ skills: hits, source: 'remote' as const }) },
    )
    const app = await start(service)
    // The mock stream reports no rows on its own; speak for the terminal so the app
    // and its lists read the height the way a real one does. A 40-line terminal holds
    // the query row and all 15 hits: the ordinals run to two digits, and every label
    // still starts in one column whether its ordinal is one digit or two.
    Object.defineProperty(app.stdout, 'rows', { get: () => 40, configurable: true })
    app.stdout.emit('resize')
    await tick()
    await tick()
    await app.press('4', KEY.enter, KEY.down, KEY.enter)
    await app.press(KEY.enter, 'g', 'i', 't', KEY.enter)
    await app.until('skill-00')
    expect(app.frame()).toContain('  2 skill-00')
    expect(app.frame()).toContain(' 10 skill-08')
    const column = (text: string) =>
      app
        .frame()
        .split('\n')
        .find(line => line.includes(text))
        ?.indexOf(text)
    expect(column('skill-00')).toBe(column('skill-08'))
    // A 24-line terminal cannot hold 16 rows; the list shows a window with arrows.
    Object.defineProperty(app.stdout, 'rows', { get: () => 17, configurable: true })
    app.stdout.emit('resize')
    await tick()
    await tick()
    const head = app.frame()
    expect(head).toContain('skill-00')
    expect(head).not.toContain('skill-14')
    expect(head).toContain('  ↓')
    for (let i = 0; i < 15; i++) {
      // oxlint-disable-next-line no-await-in-loop
      await app.press(KEY.down)
    }
    const tail = app.frame()
    expect(tail).toContain('skill-14')
    expect(tail).not.toContain('skill-00')
    expect(tail).toContain('  ↑')
    app.unmount()
  })

  it('fills the terminal height, so the panel reaches the bottom of the screen', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    Object.defineProperty(app.stdout, 'rows', { get: () => 40 })
    app.stdout.emit('resize')
    await tick()
    await tick()
    const lines = app.frame().split('\n')
    expect(lines).toHaveLength(40)
    expect(lines[38]).toContain('╰')
    expect(lines[39]).toContain('a  apply')
    app.unmount()
  })

  it('holds the whole app in a terminal 12 rows tall', async () => {
    // One header line leaves the panel and the key bar the rest; nothing folds away.
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    Object.defineProperty(app.stdout, 'rows', { get: () => 12, configurable: true })
    app.stdout.emit('resize')
    await tick()
    await tick()
    const lines = app.frame().split('\n')
    expect(lines).toHaveLength(12)
    expect(lines[0]).toContain('zcf')
    expect(lines[0]).not.toContain('╔')
    expect(lines[11]).toContain('a  apply')
    app.unmount()
  })

  it('opens rows and pages with a mouse click', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    const lineOf = (text: string) => {
      const at = app
        .frame()
        .split('\n')
        .findIndex(line => line.includes(text))
      expect(at).toBeGreaterThanOrEqual(0)
      // The terminal reports 1-based rows.
      return at + 1
    }
    const click = async (line: number, col: number) => {
      app.stdin.write(`\u001B[<0;${col};${line}M`)
      await tick()
    }
    await app.press('1', KEY.enter)
    // A click selects the row and runs what Enter would run: the Codex checkbox turns on.
    await click(lineOf('○ Codex'), 40)
    expect(await app.until('◉ Codex')).toContain('◉ Codex')
    // A click on a nav entry opens that page.
    await click(lineOf('2 Provider'), 5)
    expect(await app.until('One API provider for every tool.')).toContain('One API provider for every tool.')
    app.unmount()
  })

  it('ignores a click on the page text above the list', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('1', KEY.enter)
    const at = app
      .frame()
      .split('\n')
      .findIndex(line => line.includes('Pick the agent tools'))
    expect(at).toBeGreaterThanOrEqual(0)
    app.stdin.write(`\u001B[<0;40;${at + 1}M`)
    await tick()
    // The intro line is above every row: nothing toggles and the draft stays clean.
    const frame = app.frame()
    expect(frame).toContain('○ Claude Code')
    expect(frame).not.toContain('●')
    app.unmount()
  })

  it('moves the page choice with the wheel on the nav column', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    const at = app
      .frame()
      .split('\n')
      .findIndex(line => line.includes('1 Agent tools'))
    expect(at).toBeGreaterThanOrEqual(0)
    // The wheel turns the page choice down from Tools to Provider, and back up again.
    app.stdin.write(`\u001B[<65;5;${at + 1}M`)
    expect(await app.until('One API provider for every tool')).toContain('One API provider for every tool')
    app.stdin.write(`\u001B[<64;5;${at + 1}M`)
    expect(await app.until('Pick the agent tools')).toContain('Pick the agent tools')
    app.unmount()
  })

  it('groups the nav into sections with headers and digit-prefixed pages', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    const frame = app.frame()
    expect(frame).toContain('Configuration')
    expect(frame).toContain('1 Agent tools')
    // A 24-row terminal windows the nav; the later pages show once it is tall enough.
    Object.defineProperty(app.stdout, 'rows', { get: () => 40, configurable: true })
    app.stdout.emit('resize')
    await tick()
    await tick()
    const tall = app.frame()
    for (const header of ['Configuration', 'More tools', 'ZCF']) expect(tall).toContain(header)
    for (const page of ['5 Workflows', '6 Output styles', '7 Settings', '8 Extras', '9 Backup'])
      expect(tall).toContain(page)
    // Nine pages, nine digits: even the last page carries the digit that jumps to it.
    expect(tall).toMatch(/^│ {2}9 Backup/m)
    app.unmount()
  })

  it('jumps to a page by its digit, and 0 names no page any more', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('4')
    expect(app.frame()).toContain('Skills installed for every selected tool')
    await app.press('1')
    expect(app.frame()).toContain('Pick the agent tools')
    await app.press('5')
    expect(app.frame()).toContain('Ready-made workflows')
    await app.press('6')
    expect(app.frame()).toContain('Built-in output styles')
    await app.press('7')
    expect(app.frame()).toContain('Download mirror')
    await app.press('8')
    expect(app.frame()).toContain('Companion tools')
    // Backup is the ninth page; the fake service answers at once with an empty list.
    await app.press('9')
    expect(await app.until('No backups yet.')).toContain('No backups yet.')
    // 0 no longer maps to a page: it leaves the backup page showing.
    await app.press('0')
    expect(app.frame()).toContain('No backups yet.')
    app.unmount()
  })

  it('keeps digit keys for the text editor while a row is edited', async () => {
    const { service, saved } = fakeService({
      version: 1,
      tools: [],
      provider: { name: 'old', apiKey: 'sk-very-secret' },
    })
    const app = await start(service)
    await app.press('2', KEY.enter, KEY.down, KEY.down, KEY.enter)
    await app.press('\u007F\u007F\u007F', '4', '2')
    await app.press(KEY.enter, 'a', KEY.enter)
    expect(saved).toEqual([{ version: 1, tools: [], provider: { name: '42', apiKey: 'sk-very-secret' } }])
    app.unmount()
  })

  it('ignores a mouse click on a section header', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    Object.defineProperty(app.stdout, 'rows', { get: () => 40, configurable: true })
    app.stdout.emit('resize')
    await tick()
    await tick()
    const at = app
      .frame()
      .split('\n')
      .findIndex(line => line.includes('More tools'))
    expect(at).toBeGreaterThanOrEqual(0)
    app.stdin.write(`\u001B[<0;5;${at + 1}M`)
    await tick()
    // The page did not change, and the nav keeps the focus: j still moves the page choice.
    expect(app.frame()).toContain('Pick the agent tools')
    await app.press('j')
    expect(app.frame()).toContain('One API provider for every tool')
    app.unmount()
  })

  it('windows the nav in a short terminal, keeping the open page in view', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    Object.defineProperty(app.stdout, 'rows', { get: () => 17, configurable: true })
    app.stdout.emit('resize')
    await tick()
    await tick()
    const lines = app.frame().split('\n')
    expect(lines).toHaveLength(17)
    expect(app.frame()).toContain('1 Agent tools')
    expect(app.frame()).not.toContain('Backup')
    // Moving down the pages pulls the later rows into the window; the chosen one is
    // highlighted rather than pointed at while the nav itself has the focus.
    await app.press('j', 'j', 'j', 'j', 'j', 'j', 'j', 'j')
    expect(app.frame()).toContain('9 Backup')
    expect(app.frame()).toContain('↑')
    app.unmount()
  })

  it('moves the selection with the mouse wheel', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('1', KEY.enter)
    // One wheel turn down moves one row, to Codex — wait for the pointer to move before
    // the next key, so it reads the selection the wheel just made.
    app.stdin.write('\u001B[<65;40;14M')
    expect(await app.until('› 2 ○ Codex')).toContain('› 2 ○ Codex')
    await app.press(KEY.enter)
    expect(app.frame()).toContain('◉ Codex')
    app.unmount()
  })

  it('opens a text editor with a mouse click', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('4', KEY.enter, KEY.down, KEY.enter)
    const at = app
      .frame()
      .split('\n')
      .findIndex(line => line.includes('keyword'))
    expect(at).toBeGreaterThanOrEqual(0)
    app.stdin.write(`\u001B[<0;30;${at + 1}M`)
    // The click opened the query editor, the way Enter does.
    expect(await app.until('Enter  confirm')).toContain('Enter  confirm')
    app.unmount()
  })

  it('says when a search matches nothing, and when the index cannot answer', async () => {
    // With no sources yet, the list is the catalog stand-in, search and add: one down reaches search.
    const empty = fakeService(
      { version: 1, tools: [] },
      {
        searchSkills: async () => ({ skills: [], source: 'remote' as const }),
      },
    )
    const app = await start(empty.service)
    await app.press('4', KEY.enter, KEY.down, KEY.enter)
    await app.press(KEY.enter, 'g', 'i', 't', KEY.enter)
    expect(await app.until('No skills found')).toContain('No skills found')
    app.unmount()

    const offline = fakeService(
      { version: 1, tools: [] },
      {
        searchSkills: async () => {
          throw new Error('offline')
        },
      },
    )
    const retry = await start(offline.service)
    await retry.press('4', KEY.enter, KEY.down, KEY.enter)
    await retry.press(KEY.enter, 'g', 'i', 't', KEY.enter)
    expect(await retry.until('Search failed')).toContain('Search failed')
    retry.unmount()
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
    await app.press('2', KEY.enter, KEY.enter)
    // The host comes first, so the user sees where the key would go before picking.
    expect(await app.until('Relay')).toContain('relay.example.com · A relay')
    expect(app.frame()).toContain('saved copy')

    await app.press(KEY.enter)
    expect(await app.until('relay.example.com')).toContain('Relay')
    await app.press('a', KEY.enter)
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
    await app.press('2', KEY.enter, KEY.enter)
    expect(await app.until('Loading the preset list')).toContain('Choose a provider preset')
    await app.press(KEY.escape)
    expect(await app.until('Start from a preset')).not.toContain('Loading the preset list')
    app.unmount()
  })

  it('adds an MCP server through its form', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('3', KEY.enter)
    expect(app.frame()).toContain('Add a local (stdio) server')

    await app.press(KEY.enter)
    expect(app.frame()).toContain('MCP server "server"')
    await app.press(KEY.down, KEY.down, KEY.enter, 'npx', KEY.enter, KEY.down, KEY.enter, '-y "ctx 7"', KEY.enter)
    await saveThroughFlow(app)
    expect(saved.at(-1)).toEqual({
      version: 1,
      tools: [],
      mcpServers: { server: { type: 'stdio', command: 'npx', args: ['-y', 'ctx 7'] } },
    })

    // The flow covered the page, so the server list starts over: open the server again
    // and walk its form down to the environment variables.
    await app.press(KEY.enter, KEY.down, KEY.down, KEY.down, KEY.down, KEY.enter, KEY.enter, 'TOKEN=sk-abc')
    // A new variable's value is masked while typed.
    expect(app.frame()).toContain('TOKEN=******')
    expect(app.frame()).not.toContain('sk-abc')
    await app.press(KEY.enter, KEY.escape)
    await saveThroughFlow(app)
    expect(saved.at(-1)).toMatchObject({ mcpServers: { server: { env: { TOKEN: 'sk-abc' } } } })
    expect(app.frame()).toContain('npx -y')
    app.unmount()
  })

  it('removes the provider, so a config without one is valid again', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [], provider: { name: '', apiKey: '' } })
    const app = await start(service)
    await app.press('2', KEY.enter)
    // The profiles row sits between the preset row and the fields now.
    for (let i = 0; i < 14; i++) {
      // oxlint-disable-next-line no-await-in-loop
      await app.press(KEY.down)
    }
    expect(app.frame()).toContain('› 15 Remove the provider')
    await app.press(KEY.enter, 'a', KEY.enter)
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
    // a opens the flow over the tools page: nothing changed, and the tool is already installed.
    await app.press('a')
    expect(app.frame()).toContain('Apply the configuration')
    expect(app.frame()).toContain('No unsaved config changes.')
    expect(app.frame()).toContain('Tools: Claude Code (installed)')
    // Enter saves, plans and applies in one go.
    await app.press(KEY.enter)
    expect(await app.until('$ npm i -g x')).toContain('Install Claude Code')
    expect(applied).toBe(true)
    expect(await app.until('Applied — 1 changed · 0 already up to date')).toContain('✓ Install Claude Code')
    expect(app.frame()).toContain('1/1 steps')
    // The result card opens on Back to editor: Enter closes the flow back onto the page it covered.
    expect(app.frame()).toContain('▸ Back to editor')
    await app.press(KEY.enter)
    expect(app.frame()).toContain('Pick the agent tools')
    expect(app.frame()).not.toContain('Apply the configuration')
    app.unmount()
  })

  it('scrolls the apply output with the mouse wheel', async () => {
    const steps: Plan['tools'][number]['steps'] = Array.from({ length: 30 }, (_, i) => ({
      kind: 'command',
      title: { key: 'step.install', params: { tool: 'claude-code' } },
      command: 'npm',
      args: ['i', '-g', `x${i}`],
    }))
    const plan: Plan = { tools: [{ tool: 'claude-code', notices: [], steps }] }
    const view: PlanView = { plan, previews: [steps.map(() => null)], secrets: [] }
    const { service } = fakeService({ version: 1, tools: ['claude-code'] }, { plan: async () => view })
    const app = await start(service)
    await app.press('a', KEY.enter)
    const at = (await app.until('$ npm i -g x0')).split('\n').findIndex(line => line.includes('$ npm i -g x0'))
    expect(at).toBeGreaterThanOrEqual(0)
    // Thirty steps overflow the window; the wheel rolls the output to its end.
    for (let i = 0; i < 40; i++) {
      app.stdin.write(`\u001B[<65;40;${at + 1}M`)
      // oxlint-disable-next-line no-await-in-loop
      await tick()
    }
    const frame = await app.until('$ npm i -g x29')
    expect(frame).not.toContain('$ npm i -g x0')
    expect(frame).toContain('$ npm i -g x29')
    app.unmount()
  })

  it('says so when the plan has nothing to do, and closes', async () => {
    const step: Plan['tools'][number]['steps'][number] = {
      kind: 'file',
      title: { key: 'step.provider', params: { tool: 'claude-code', provider: 'x' } },
      path: '/home/me/.claude/settings.json',
      format: 'json',
      edits: [],
    }
    const plan: Plan = { tools: [{ tool: 'claude-code', notices: [], steps: [step] }] }
    const view: PlanView = {
      plan,
      previews: [[{ path: step.path, before: '{}', after: '{}', changed: false, patch: '', secrets: [] }]],
      secrets: [],
    }
    const { service } = fakeService({ version: 1, tools: ['claude-code'] }, { plan: async () => view })
    const app = await start(service)
    await app.press('a', KEY.enter)
    expect(await app.until('Everything is already up to date.')).toContain('(already up to date)')
    await app.press(KEY.escape)
    expect(app.frame()).toContain('Pick the agent tools')
    app.unmount()
  })

  it('refuses an invalid draft from the apply flow and stays on its confirmation', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [], provider: { name: 'old', apiKey: '' } })
    const app = await start(service)
    await app.press('a')
    expect(app.frame()).toContain('Apply the configuration')
    await app.press(KEY.enter)
    // The save refused the invalid draft; the flow falls back to its confirmation.
    expect(app.frame()).toContain('Fix 1 problem(s) before saving. provider.apiKey: must not be empty')
    expect(app.frame()).toContain('Apply the configuration')
    expect(saved).toEqual([])
    await app.press(KEY.escape)
    // The close re-renders the page under the flow; a tick settles it.
    await tick()
    expect(app.frame()).toContain('Pick the agent tools')
    app.unmount()
  })

  it('asks before quitting with unapplied changes, and a second q still quits', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('1', KEY.enter, ' ', KEY.escape, 'q')
    expect(app.frame()).toContain('Quit without applying?')
    // Focus opens on Stay, the safe choice.
    expect(app.frame()).toContain('▸ Stay')
    expect(app.frame()).toContain('Esc  cancel')
    await app.press('q')
    // The app has exited: nothing reads keys any more, so a key changes nothing on screen.
    const after = app.frame()
    await app.press('2')
    expect(app.frame()).toBe(after)
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

  it('toggles a workflow preset in, and back out, writing skills and agents together', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('5', KEY.enter)
    expect(app.frame()).toContain('○ Project init and everyday commands')
    // The list opens on the Presets heading; step down onto the first preset under it.
    await app.press(KEY.down, KEY.enter)
    expect(app.frame()).toContain('◉ Project init and everyday commands')
    expect(app.frame()).toContain('to apply')
    await saveThroughFlow(app)
    expect(saved.at(-1)).toEqual({
      version: 1,
      tools: [],
      skills: [{ source: 'zcf', skills: ['init-project'] }],
      agents: ['init-architect', 'get-current-datetime'],
    })
    // The flow covered the page, so the list starts over at its heading.
    await app.press(KEY.down, KEY.enter)
    expect(app.frame()).toContain('○ Project init and everyday commands')
    await app.press('a', KEY.enter)
    expect(saved.at(-1)).toEqual({ version: 1, tools: [] })
    app.unmount()
  })

  it('renders workflow group headings that carry no ordinal and never select', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('5', KEY.enter)
    // The list opens on the Presets heading; Enter on it runs nothing.
    expect(app.frame()).toContain('Presets')
    await app.press(KEY.enter)
    expect(app.frame()).not.toContain('◉')
    // A digit picks the first item under the heading, not the heading itself.
    await app.press('1')
    expect(app.frame()).toContain('›  1 ○ Project init and everyday commands')
    // A click on the heading line selects nothing either.
    const at = app
      .frame()
      .split('\n')
      .findIndex(line => line.includes('Presets'))
    expect(at).toBeGreaterThanOrEqual(0)
    app.stdin.write(`\u001B[<0;30;${at + 1}M`)
    await tick()
    expect(app.frame()).toContain('›  1 ○ Project init and everyday commands')
    expect(app.frame()).not.toContain('◉')
    app.unmount()
  })

  it('builds a custom bundle with agents, catalog skills and an MCP reference, then removes it', async () => {
    const { service, saved } = fakeService({
      version: 1,
      tools: [],
      mcpServers: { github: { type: 'http', url: 'https://g.example' } },
    })
    const app = await start(service)
    await app.press('5', KEY.enter)
    // The new-bundle row sits under the five presets, the agents group and the bundles heading.
    await app.press(
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.enter,
    )
    // The name row opens its editor before anything can be typed into it.
    await app.press(KEY.enter, 'g', 'i', 't', '-', 'f', 'l', 'o', 'w', KEY.enter)
    expect(app.frame()).toContain('Bundle "git-flow"')
    // Rows: name, four agents, catalog, search, github, save. Pick the planner agent.
    await app.press(KEY.down, KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('◉ planner')
    // The MCP reference to the draft's own server.
    await app.press(KEY.down, KEY.down, KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('◉ github')
    // One built-in skill from the catalog.
    await app.press(KEY.up, KEY.up, KEY.enter)
    expect(app.frame()).toContain('Pick the ZCF built-in skills')
    await app.press(KEY.enter)
    expect(app.frame()).toContain('✓ init-project')
    await app.press(KEY.escape)
    // The builder list starts over; with the catalog skill added, save sits at the tenth row.
    await app.press(KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.enter)
    // Saving runs through the apply flow, which covers the page until it is closed.
    await saveThroughFlow(app)
    expect(saved.at(-1)).toEqual({
      version: 1,
      tools: [],
      mcpServers: { github: { type: 'http', url: 'https://g.example' } },
      workflows: [
        {
          name: 'git-flow',
          skills: [{ source: 'zcf', skills: ['init-project'] }],
          agents: ['planner'],
          mcp: ['github'],
        },
      ],
    })
    // The page list starts over at the Presets heading; the new bundle sits under the agents and its heading.
    await app.press(KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down)
    expect(app.frame()).toContain('git-flow')
    // x on the bundle's own row takes it out of the config again.
    await app.press('x')
    expect(app.frame()).not.toContain('git-flow')
    await app.press('a', KEY.enter)
    expect(saved.at(-1)).toEqual({
      version: 1,
      tools: [],
      mcpServers: { github: { type: 'http', url: 'https://g.example' } },
    })
    app.unmount()
  })

  it('toggles the built-in agents inside the workflows page agents group', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    // The agents sit far down the page; a tall terminal keeps the group in view.
    Object.defineProperty(app.stdout, 'rows', { get: () => 40, configurable: true })
    app.stdout.emit('resize')
    await tick()
    await tick()
    await app.press('5', KEY.enter)
    // The agents sit under their own heading, below the five presets.
    await app.press(KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down)
    expect(app.frame()).toContain('○ init-architect')
    await app.press(KEY.enter)
    expect(app.frame()).toContain('◉ init-architect')
    await app.press('a', KEY.enter)
    expect(saved).toEqual([{ version: 1, tools: [], agents: ['init-architect'] }])
    app.unmount()
  })

  it('cycles the magpie face and toggles CCometixLine on the Extras page', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('8', KEY.enter)
    expect(app.frame()).toContain('off')
    await app.press(KEY.right)
    expect(app.frame()).toContain('client (desktop app)')
    await app.press(KEY.right)
    expect(app.frame()).toContain('cli (terminal)')
    await app.press(KEY.left)
    expect(app.frame()).toContain('client (desktop app)')
    await app.press(KEY.down, KEY.enter)
    expect(app.frame()).toContain('◉ CCometixLine')
    await app.press('a', KEY.enter)
    expect(saved).toEqual([{ version: 1, tools: [], extras: { magpie: 'client', ccline: true } }])
    app.unmount()
  })

  it('lists backups, restores one after a confirm, and prunes the old runs', async () => {
    const restored: string[] = []
    let prunes = 0
    // A legacy run from before manifests: no createdAt, so its row shows no date.
    const dated = backupRun('2026-09-01T08-00-00-000Z', '2026-09-01T08:00:00.000Z')
    const legacy: BackupInfo = { id: dated.id, reason: dated.reason, entries: dated.entries }
    const { service } = fakeService(
      { version: 1, tools: [] },
      {
        backups: async () => [legacy, backupRun('2026-10-24T08-00-00-000Z', '2026-10-24T08:00:00.000Z')],
        restoreBackup: async id => {
          restored.push(id)
          return { id: 'undo-1', changed: 1, unchanged: 0, missing: 1, corrupt: 0, outside: 0 }
        },
        pruneBackups: async () => {
          prunes++
          return ['2026-10-20T08-00-00-000Z']
        },
      },
    )
    const app = await start(service)
    await openBackup(app)
    expect(await app.until('2026-10-24 08:00')).toContain('an apply, 2 file(s)')
    // Enter asks before anything goes back; the legacy run is first, without its date.
    // The dialog opens on Cancel, so → moves to Restore before Enter runs it.
    await app.press(KEY.enter)
    expect(app.frame()).toContain('Restore this backup?')
    expect(app.frame()).toContain('The files in backup')
    expect(app.frame()).toContain('2026-09-01T08-00-00-000Z')
    await app.press(KEY.right, KEY.enter)
    expect(await app.until('Restored 1 changed file(s)')).toContain('Restore undo-1 to undo this.')
    expect(restored).toEqual(['2026-09-01T08-00-00-000Z'])
    // Prune sits under the runs, and asks too.
    await app.press(KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('Prune old backups?')
    expect(app.frame()).toContain('The newest 20 backup runs are kept')
    await app.press(KEY.right, KEY.enter)
    expect(await app.until('Removed 1 backup(s)')).toContain('2026-10-20T08-00-00-000Z')
    expect(prunes).toBe(1)
    app.unmount()
  })

  it('switches provider profiles, saves the current one, and removes one', async () => {
    const { service, saved } = fakeService({
      version: 1,
      tools: [],
      provider: { name: 'old', apiKey: 'sk-old' },
      profiles: [{ id: 'relay', name: 'Relay', provider: { name: 'Relay', apiKey: 'sk-relay' } }],
    })
    const app = await start(service)
    await app.press('2', KEY.enter, KEY.down, KEY.enter)
    expect(app.frame()).toContain('Relay')
    expect(app.frame()).not.toContain('active')
    // Enter copies the profile's provider over the top-level one, then goes back.
    await app.press(KEY.enter)
    expect(app.frame()).toContain('One API provider for every tool')
    expect(app.frame()).not.toContain('sk-relay')
    await saveThroughFlow(app)
    expect(saved.at(-1)?.provider).toEqual({ name: 'Relay', apiKey: 'sk-relay' })

    // The switched-to profile is the active one; saving the current provider adds another.
    await app.press(KEY.down, KEY.enter)
    expect(app.frame()).toContain('active')
    await app.press(KEY.down, KEY.enter, 'B', 'a', 'c', 'k', 'u', 'p', KEY.enter)
    expect(app.frame()).toContain('Backup')
    await saveThroughFlow(app)
    expect(saved.at(-1)?.profiles).toEqual([
      { id: 'relay', name: 'Relay', provider: { name: 'Relay', apiKey: 'sk-relay' } },
      { id: 'backup', name: 'Backup', provider: { name: 'Relay', apiKey: 'sk-relay' } },
    ])
    // The flow covered the page: reopen the profiles list, where x takes a profile out.
    await app.press(KEY.down, KEY.enter)
    await app.press('x')
    expect(app.frame()).not.toContain('Relay')
    await app.press('a', KEY.enter)
    expect(saved.at(-1)?.profiles).toEqual([
      { id: 'backup', name: 'Backup', provider: { name: 'Relay', apiKey: 'sk-relay' } },
    ])
    app.unmount()
  })

  it('picks output styles and the default one on the Output styles page', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('6', KEY.enter)
    // The style toggles sit above the default-style row.
    await app.press(KEY.enter)
    expect(app.frame()).toContain('◉ engineer-professional')
    // The default style cycles from unset onto the first built-in style.
    await app.press(KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.right)
    expect(app.frame()).toContain('engineer-professional')
    await app.press('a', KEY.enter)
    expect(saved.at(-1)?.styles).toEqual({
      outputStyles: ['engineer-professional'],
      defaultOutputStyle: 'engineer-professional',
    })
    app.unmount()
  })

  it('warns that unsaved editor changes still sit on top of a restore', async () => {
    const { service } = fakeService(
      { version: 1, tools: [] },
      {
        backups: async () => [backupRun('2026-10-24T08-00-00-000Z', '2026-10-24T08:00:00.000Z')],
        restoreBackup: async () => ({ changed: 1, unchanged: 0, missing: 0, corrupt: 0, outside: 0 }),
      },
    )
    const app = await start(service)
    // Dirty the draft without saving, then restore under it.
    await app.press('1', KEY.enter, ' ', KEY.escape)
    await openBackup(app)
    await app.until('an apply, 2 file(s)')
    await app.press(KEY.enter, KEY.right, KEY.enter)
    expect(await app.until('writes them back over the restored file')).toContain('Restored 1 changed file(s)')
    app.unmount()
  })

  it('flags a page whose root key has a problem, at any of its roots', async () => {
    const { service } = fakeService({ version: 1, tools: [], mirror: 'cn' })
    const app = await start(service)
    // Jump to the broken page so the windowed nav shows its row.
    await app.press('7')
    expect(app.frame()).toMatch(/Settings !/)
    app.unmount()
  })

  it('reports a restore with corrupt and outside files and nothing to undo', async () => {
    const { service } = fakeService(
      { version: 1, tools: [] },
      {
        backups: async () => [backupRun('2026-10-24T08-00-00-000Z', '2026-10-24T08:00:00.000Z')],
        restoreBackup: async () => ({ changed: 0, unchanged: 1, missing: 0, corrupt: 1, outside: 1 }),
      },
    )
    const app = await start(service)
    await openBackup(app)
    await app.until('an apply, 2 file(s)')
    await app.press(KEY.enter, KEY.right, KEY.enter)
    const frame = await app.until('did not match their checksum')
    expect(frame).toContain('outside home')
    // Nothing was copied ahead of this restore, so there is no undo run to name.
    expect(frame).not.toContain('to undo this.')
    app.unmount()
  })

  it('cancels a restore from the confirm, by row and by Esc', async () => {
    const restored: string[] = []
    const { service } = fakeService(
      { version: 1, tools: [] },
      {
        backups: async () => [backupRun('2026-10-24T08-00-00-000Z', '2026-10-24T08:00:00.000Z')],
        restoreBackup: async id => {
          restored.push(id)
          return { changed: 0, unchanged: 0, missing: 0, corrupt: 0, outside: 0 }
        },
      },
    )
    const app = await start(service)
    await openBackup(app)
    await app.until('an apply, 2 file(s)')
    // The dialog opens on Cancel, so Enter brings the list back; the backup is untouched.
    await app.press(KEY.enter)
    expect(app.frame()).toContain('▸ Cancel')
    await app.press(KEY.enter)
    expect(app.frame()).toContain('an apply, 2 file(s)')
    // So does Esc, even with Restore focused.
    await app.press(KEY.enter, KEY.right, KEY.escape)
    expect(app.frame()).toContain('an apply, 2 file(s)')
    expect(restored).toEqual([])
    app.unmount()
  })

  it('says when the backups cannot be listed, restored or pruned', async () => {
    const { service } = fakeService(
      { version: 1, tools: [] },
      {
        backups: async () => {
          throw new Error('unreadable')
        },
      },
    )
    const app = await start(service)
    await openBackup(app)
    expect(await app.until('Failed: unreadable')).toContain('No backups yet.')
    app.unmount()

    const failing = fakeService(
      { version: 1, tools: [] },
      {
        backups: async () => [backupRun('2026-10-24T08-00-00-000Z', '2026-10-24T08:00:00.000Z')],
        restoreBackup: async () => {
          throw new Error('disk gone')
        },
        pruneBackups: async () => {
          throw new Error('disk gone')
        },
      },
    )
    const retry = await start(failing.service)
    await openBackup(retry)
    await retry.until('an apply, 2 file(s)')
    await retry.press(KEY.enter, KEY.right, KEY.enter)
    await retry.until('Failed: disk gone')
    await retry.press(KEY.down, KEY.down, KEY.enter, KEY.right, KEY.enter)
    expect(await retry.until('Failed: disk gone')).toContain('an apply, 2 file(s)')
    retry.unmount()
  })

  it('reopens a saved bundle, renames it and takes its picks back out', async () => {
    const { service, saved } = fakeService({
      version: 1,
      tools: [],
      mcpServers: { github: { type: 'http', url: 'https://g.example' } },
      workflows: [
        {
          name: 'existing',
          agents: ['planner'],
          skills: [{ source: 'zcf', skills: ['feat'] }],
          mcp: ['github'],
        },
      ],
    })
    const app = await start(service)
    await app.press('5', KEY.enter)
    // The bundle sits under the presets, the agents group and the bundles heading.
    await app.press(
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.enter,
    )
    expect(app.frame()).toContain('Bundle "existing"')
    // Rename through the name row's editor.
    await app.press(KEY.enter, '\u0015', 'r', 'e', 'n', 'a', 'm', 'e', 'd', KEY.enter)
    expect(app.frame()).toContain('Bundle "renamed"')
    // The picked agent comes back out.
    await app.press(KEY.down, KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('○ planner')
    // The catalog skill too: its picker opens from the row under the bundle's own sources.
    await app.press(KEY.down, KEY.down, KEY.down, KEY.enter)
    await app.press(KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).not.toContain('✓ feat')
    await app.press(KEY.escape)
    // The MCP reference goes too; with the skill's row gone it sits under the search row.
    await app.press(KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('○ github')
    // The bundle now holds nothing but its name; save sits right below.
    await app.press(KEY.down, KEY.enter)
    await app.press('a', KEY.enter)
    expect(saved.at(-1)?.workflows).toEqual([{ name: 'renamed' }])
    app.unmount()
  })

  it('adds a community skill to a bundle through the search picker', async () => {
    const { service } = fakeService(
      { version: 1, tools: [] },
      {
        searchSkills: async () => ({
          skills: [{ name: 'using-git-worktrees', source: 'obra/superpowers', description: 'Worktrees.' }],
          source: 'remote' as const,
        }),
      },
    )
    const app = await start(service)
    await app.press('5', KEY.enter)
    // The new-bundle row sits under the presets, the agents group and the bundles heading.
    await app.press(
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.down,
      KEY.enter,
    )
    await app.press(KEY.enter, 's', 'e', 'a', 'r', 'c', 'h', '-', '1', KEY.enter)
    // In the builder the agents come first, then the catalog row, then search.
    await app.press(KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('Search skills')
    await app.press(KEY.enter, 'g', 'i', 't', KEY.enter)
    await app.until('using-git-worktrees')
    await app.press(KEY.down, KEY.enter)
    expect(app.frame()).toContain('obra/superpowers · added')
    // Esc closes the picker; the hit stays in the bundle as its own source row.
    await app.press(KEY.escape)
    expect(app.frame()).toContain('Bundle "search-1"')
    // The row sits under the agents; the window only shows it once reached.
    await app.press(KEY.down, KEY.down, KEY.down, KEY.down, KEY.down)
    expect(app.frame()).toContain('obra/superpowers')
    // x on that row takes the hit out of the bundle again.
    await app.press('x')
    expect(app.frame()).not.toContain('obra/superpowers')
    app.unmount()
  })
})

describe('numbers moved', () => {
  it('numbers visible rows and picks one with its digit without running it', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    // One press run: the open-page Enter and the picking digit arrive back to back.
    await app.press('1', KEY.enter, '2')
    // The digit moves the selection to the second row, without toggling it.
    expect(app.frame()).toContain('› 2 ○ Codex')
    expect(app.frame()).not.toContain('◉ Codex')
    // A digit past the visible items is ignored, so Enter still toggles the picked row.
    await app.press('8', KEY.enter)
    expect(app.frame()).toContain('◉ Codex')
    app.unmount()
  })
})

/** A clock that never fires on its own: the test steps the ticker, and counts the intervals it was asked for. */
function manualClock() {
  const intervals = new Map<number, () => void>()
  const timeouts = new Map<number, () => void>()
  let next = 1
  let created = 0
  const clock: Clock = {
    setInterval: callback => {
      created++
      intervals.set(next, callback)
      return next++
    },
    clearInterval: handle => {
      intervals.delete(handle)
    },
    setTimeout: callback => {
      timeouts.set(next, callback)
      return next++
    },
    clearTimeout: handle => {
      timeouts.delete(handle)
    },
  }
  const ticker = new Ticker(clock)
  return {
    clock,
    ticker,
    // Truecolor, so the motion tests drive the gradient paths too: sweeps, the flowing hatch, the tide.
    fx: { clock, ticker, motion: true, colorLevel: 3 } satisfies FxOptions,
    /** Intervals ever created. */
    get created() {
      return created
    },
    /** Intervals still alive. */
    get live() {
      return intervals.size
    },
    fireTimeouts() {
      const due = [...timeouts.values()]
      timeouts.clear()
      for (const callback of due) callback()
    },
    /** Advances `frames` frames, letting each one render. */
    async step(frames = 1) {
      for (let i = 0; i < frames; i++) {
        ticker.tick()
        // oxlint-disable-next-line no-await-in-loop
        await tick()
      }
    },
  }
}

/** Runs `body` with chalk painting at `level`, so the frames carry the escape codes Ink would write. */
async function withChalk(level: 0 | 1 | 2 | 3, body: () => Promise<void>) {
  const before = chalk.level
  chalk.level = level
  try {
    await body()
  } finally {
    chalk.level = before
  }
}

/** The parameters of every SGR escape in `text`, such as `1` or `38;2;26;166;179`. */
function sgr(text: string): string[] {
  return text
    .split('\u001B[')
    .slice(1)
    .map(part => part.slice(0, part.indexOf('m')))
}

/** The truecolor foregrounds in `text`, as `r;g;b`. */
function truecolors(text: string): Set<string> {
  return new Set(
    sgr(text)
      .filter(code => code.startsWith('38;2;'))
      .map(code => code.slice(5)),
  )
}

/** Whether `text` sets any foreground or background colour; resets (39, 49) and attributes do not count. */
function colours(text: string): boolean {
  return sgr(text).some(code => {
    const first = Number(code.split(';')[0])
    return (first >= 30 && first <= 38) || (first >= 40 && first <= 48) || (first >= 90 && first <= 107)
  })
}

/** The sidebar's part of a frame line at 120 columns: what follows the panel's right edge. */
function sidebarPart(line: string): string {
  return line.slice(line.lastIndexOf('││') + 2)
}

/** The title of a step in `twoToolPlan`. */
function stepTitle(tool: 'claude' | 'codex', n: number): string {
  return `${tool} step ${n}`
}

/** A plan of two tools, three steps each, every title its own. */
function twoToolPlan(secret = 'sk-run-secret-123456'): { plan: Plan; view: PlanView } {
  const steps = (tool: string): Plan['tools'][number]['steps'] =>
    [1, 2, 3].map(n => ({
      kind: 'command',
      title: { key: `${tool} step ${n}` },
      command: 'npm',
      args: ['i', `${tool}-${n}`, ...(n === 1 ? [`--token=${secret}`] : [])],
    }))
  const plan: Plan = {
    tools: [
      { tool: 'claude-code', notices: [], steps: steps('claude') },
      { tool: 'codex', notices: [], steps: steps('codex') },
    ],
  }
  return {
    plan,
    view: {
      plan,
      previews: [
        [null, null, null],
        [null, null, null],
      ],
      secrets: [secret],
    },
  }
}

/** An apply the test drives: each event is sent by hand, and the run ends when the test says so. */
function heldApply() {
  let send: ((event: Parameters<NonNullable<Parameters<ZcfService['apply']>[0]>>[0]) => void) | undefined
  let finish: ((outcome: Awaited<ReturnType<ZcfService['apply']>>) => void) | undefined
  const apply: ZcfService['apply'] = onStep => {
    send = onStep
    return new Promise(resolve => {
      finish = resolve
    })
  }
  return {
    apply,
    send: (event: Parameters<NonNullable<Parameters<ZcfService['apply']>[0]>>[0]) => send?.(event),
    finish: (outcome: Awaited<ReturnType<ZcfService['apply']>>) => finish?.(outcome),
  }
}

/** The raw line (escape codes kept) whose text holds `text`. */
function rawLineWith(raw: string, text: string): string {
  const lines = raw.split('\n')
  return lines.find(line => stripVTControlCharacters(line).includes(text)) ?? ''
}

/** The line of `frame` that holds `text`. */
function lineWith(frame: string, text: string): string {
  return frame.split('\n').find(line => line.includes(text)) ?? ''
}

const SHIFT_TAB = '\u001B[Z'

describe('Tide theme', () => {
  it('keeps body text at 4.5:1 or better on both backgrounds', () => {
    for (const [palette, base] of [
      [DARK, '#000000'],
      [LIGHT, '#ffffff'],
    ] as const) {
      for (const tone of ['fg', 'dim', 'ok', 'warn', 'err', 'accent'] as const)
        expect(contrast(palette[tone], base), `${tone} on ${base}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('reads the background from ZCF_THEME, then COLORFGBG, and defaults to dark', () => {
    expect(detectBackground({ ZCF_THEME: 'light' })).toBe('light')
    expect(detectBackground({ ZCF_THEME: 'dark', COLORFGBG: '0;15' })).toBe('dark')
    expect(detectBackground({ COLORFGBG: '0;15' })).toBe('light')
    expect(detectBackground({ COLORFGBG: '0;7' })).toBe('light')
    expect(detectBackground({ COLORFGBG: '15;0' })).toBe('dark')
    expect(detectBackground({})).toBe('dark')
    expect(createTheme(3, detectBackground({ ZCF_THEME: 'light' })).palette).toBe(LIGHT)
  })

  it('turns colour off for NO_COLOR, and motion off for reduced motion, CI, dumb terminals and pipes', () => {
    expect(detectColorLevel({ NO_COLOR: '1' }, 3)).toBe(0)
    expect(detectColorLevel({}, 3)).toBe(3)
    expect(detectColorLevel({}, 1)).toBe(1)
    expect(detectMotion({}, true)).toBe(true)
    expect(detectMotion({ ZCF_REDUCED_MOTION: '1' }, true)).toBe(false)
    expect(detectMotion({ CI: '1' }, true)).toBe(false)
    expect(detectMotion({ TERM: 'dumb' }, true)).toBe(false)
    expect(detectMotion({}, false)).toBe(false)
    // NO_COLOR alone keeps the glyph motion.
    expect(detectMotion({ NO_COLOR: '1' }, true)).toBe(true)
  })

  it('paints the wordmark on the gradient, in cyan on 16 colours, and in no colour under NO_COLOR', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    await withChalk(3, async () => {
      const rich = await start(service, { columns: 120, fx: { colorLevel: 3, background: 'dark' } })
      const row = rawLineWith(rich.raw(), '██████╗  ██████╗')
      expect(truecolors(row).size).toBeGreaterThanOrEqual(3)
      rich.unmount()

      const named = await start(service, { columns: 120, fx: { colorLevel: 1, background: 'dark' } })
      const cyanRow = rawLineWith(named.raw(), '██████╗  ██████╗')
      expect(cyanRow).toContain('\u001B[36m')
      expect(truecolors(cyanRow).size).toBe(0)
      named.unmount()

      const none = await start(service, { columns: 120, fx: { colorLevel: 0, background: 'dark' } })
      const plainRow = rawLineWith(none.raw(), '██████╗  ██████╗')
      expect(colours(plainRow)).toBe(false)
      none.unmount()
    })
  })

  it('shows selection without colour: inverse nav row and button, glyphs for every state', async () => {
    const { service } = fakeService({ version: 1, tools: ['claude-code'] })
    await withChalk(1, async () => {
      const app = await start(service, { fx: { colorLevel: 0 } })
      expect(rawLineWith(app.raw(), '1 Agent tools')).toContain('\u001B[7m')
      expect(colours(app.raw())).toBe(false)
      expect(app.frame()).toContain('◉ Claude Code')
      expect(app.frame()).toContain('○ Codex')
      await app.press('a')
      expect(rawLineWith(app.raw(), '▸ Apply')).toContain('\u001B[7m')
      // Moving the focus moves the marker and the inverse, never the buttons themselves.
      const before = lineWith(app.frame(), 'Cancel')
      await app.press(KEY.left)
      const after = lineWith(app.frame(), 'Cancel')
      expect(after).toContain('▸ Cancel')
      expect(after.length).toBe(before.length)
      expect(after.indexOf('Apply')).toBe(before.indexOf('Apply'))
      expect(rawLineWith(app.raw(), '▸ Cancel')).toContain('\u001B[7m')
      app.unmount()
    })
  })

  it('fits 80x24, 90x28, 120x30 and 160x40 without wrapping, the wordmark whole on wide ones', async () => {
    const { service } = fakeService({ version: 1, tools: ['claude-code'] })
    for (const [columns, rows] of [
      [80, 24],
      [90, 28],
      [120, 30],
      [160, 40],
    ] as const) {
      // oxlint-disable-next-line no-await-in-loop
      const app = await start(service, { columns, rows })
      // A dirty draft puts `● to apply` in the narrow header, where the hatch must still fit.
      // oxlint-disable-next-line no-await-in-loop
      await app.press('1', KEY.enter, KEY.down, ' ', KEY.escape)
      for (const view of ['editor', 'confirm'] as const) {
        // oxlint-disable-next-line no-await-in-loop
        if (view === 'confirm') await app.press('a')
        const lines = app.frame().split('\n')
        expect(lines, `${columns}x${rows} ${view}`).toHaveLength(rows)
        // Every tool row stays on its one line: the next row's ordinal is on the very next line.
        const first = lines.findIndex(line => line.includes('◉ Claude Code'))
        const ordinals = lines
          .slice(first, first + 7)
          .map(line => /\b(\d) [◉○] /.exec(line)?.[1] ?? '?')
          .join('')
        expect(view === 'confirm' ? '1234567' : ordinals, `${columns}x${rows}`).toBe('1234567')
        for (const line of lines) expect(textWidth(line), `${columns}x${rows}: ${line}`).toBeLessThanOrEqual(columns)
        // Wide terminals show the whole wordmark; narrow ones the header, its hatch only ever after the facts.
        const wide = columns >= 112
        const header = lines[0]!
        expect(LOGO_ROWS.every(logo => app.frame().includes(logo.trimEnd()))).toBe(wide)
        expect(wide || header.includes('● to apply')).toBe(true)
        const hatch = header.indexOf('╱')
        expect(wide || hatch === -1 || hatch > header.indexOf('● to apply')).toBe(true)
      }
      app.unmount()
    }
  })

  it('draws nothing but the tide line around the wordmark, still at rest and rolling while busy', async () => {
    const plan = twoToolPlan()
    let release: (() => void) | undefined
    const { service } = fakeService(
      { version: 1, tools: ['claude-code'] },
      {
        plan: () =>
          new Promise(resolve => {
            release = () => resolve(plan.view)
          }),
      },
    )
    const time = manualClock()
    const app = await start(service, { columns: 120, fx: time.fx })
    const around = () => {
      const lines = app.frame().split('\n')
      const top = lines.findIndex(line => line.includes(LOGO_ROWS[0]))
      return { above: sidebarPart(lines[top - 1]!), below: sidebarPart(lines[top + LOGO_ROWS.length]!) }
    }
    expect(around().above).not.toContain('╱')
    expect(around().below).toContain('▁▂▃')
    expect(around().below).not.toContain('╱')
    // The launch sweep plays; the tide stays still through it.
    const rest = around().below
    await time.step(3)
    expect(around().below).toBe(rest)
    // Planning rolls it. Planning starts once the save resolves, so wait for the sidebar
    // to say so before stepping a frame, however long the save takes.
    await app.press('a', KEY.enter)
    await app.until('applying…')
    const first = around().below
    await time.step(1)
    expect(around().below).not.toBe(first)
    release?.()
    app.unmount()
  })
})

describe('Tide motion', () => {
  it('holds no timer once the launch sweep is over, and again after the success shimmer', async () => {
    const plan = twoToolPlan()
    const run = heldApply()
    const { service } = fakeService(
      { version: 1, tools: ['claude-code'] },
      { plan: async () => plan.view, apply: run.apply },
    )
    const time = manualClock()
    const app = await start(service, { columns: 120, fx: time.fx })
    expect(time.ticker.running).toBe(true)
    await time.step(20)
    expect(time.ticker.subscribers).toBe(0)
    expect(time.ticker.running).toBe(false)
    expect(time.live).toBe(0)

    await app.press('a', KEY.enter)
    await time.step(5)
    run.finish({
      results: plan.plan.tools.map(toolPlan => ({
        tool: toolPlan.tool,
        ok: true,
        steps: toolPlan.steps.map(step => ({ step, status: 'done' as const })),
      })),
      backupDir: '/home/me/b',
    })
    // The result card mounts once the run's outcome is in; it then grows over four frames.
    await app.until('6/6 steps')
    await time.step(4)
    expect(app.frame()).toContain('Applied — 6 changed')
    // The shimmer and the wordmark's second sweep play once, then stop.
    expect(time.ticker.running).toBe(true)
    await time.step(20)
    expect(time.ticker.subscribers).toBe(0)
    expect(time.live).toBe(0)
    app.unmount()
  })

  it('never starts the ticker under reduced motion, and shows the still frames', async () => {
    const plan = twoToolPlan()
    const run = heldApply()
    const { service } = fakeService(
      { version: 1, tools: ['claude-code'] },
      { plan: async () => plan.view, apply: run.apply },
    )
    const time = manualClock()
    const app = await start(service, { columns: 120, fx: { ...time.fx, motion: false } })
    await app.press('a')
    // No grow: the confirmation is whole at once.
    expect(app.frame()).toContain('Apply the configuration')
    await app.press(KEY.enter)
    expect(await app.until('claude step 1')).toContain('… claude step 1')
    // The planning wave and the tide are the still ramp.
    expect(app.frame()).toContain('▁▂▃▅▆▇▆▅▃▂▁▁▂▃▄▅▄▃▂▁▁▂▄▅')
    expect(time.created).toBe(0)
    run.finish({ results: [], backupDir: '/home/me/b' })
    await app.until('▸ Back to editor')
    expect(time.created).toBe(0)
    app.unmount()
  })

  it('acts on keys during the launch sweep and the dialog grow', async () => {
    const { service, saved } = fakeService({ version: 1, tools: ['claude-code'] })
    const time = manualClock()
    const app = await start(service, { columns: 120, fx: time.fx })
    expect(time.ticker.running).toBe(true)
    // a during the sweep opens the confirmation at once; it grows over four frames.
    await app.press('a')
    expect(app.frame()).toContain('Esc  cancel')
    expect(app.frame()).not.toContain('Apply the configuration')
    // Esc during the grow closes it.
    await app.press(KEY.escape)
    expect(app.frame()).toContain('Pick the agent tools')
    await app.press('a')
    await time.step(4)
    expect(app.frame()).toContain('Apply the configuration')
    expect(saved).toEqual([])
    app.unmount()
  })

  it('shows the boot screen only for a slow load', async () => {
    let finish: (() => void) | undefined
    const { service } = fakeService(
      { version: 1, tools: [] },
      {
        load: () =>
          new Promise(resolve => {
            finish = () =>
              resolve({
                path: '/home/me/.ufomiao/zcf/config.json',
                draft: { version: 1, tools: [] },
                exists: true,
                issues: [],
              })
          }),
      },
    )
    const time = manualClock()
    const app = render(<App service={service} lang="en" home="/home/me" fx={time.fx} />)
    await tick()
    expect(app.lastFrame() ?? '').not.toContain('Loading your config')
    time.fireTimeouts()
    await tick()
    const frame = stripVTControlCharacters(app.lastFrame() ?? '')
    expect(frame).toContain('Loading your config…')
    for (const logo of LOGO_ROWS) expect(frame).toContain(logo.trimEnd())
    expect(frame).not.toContain('╱')
    finish?.()
    await tick()
    await tick()
    expect(stripVTControlCharacters(app.lastFrame() ?? '')).toContain('Pick the agent tools')
    app.unmount()

    // Under reduced motion the boot screen is the still wordmark and a still spinner.
    const still = manualClock()
    const quiet = render(<App service={service} lang="en" home="/home/me" fx={{ ...still.fx, motion: false }} />)
    still.fireTimeouts()
    await tick()
    expect(stripVTControlCharacters(quiet.lastFrame() ?? '')).toContain('… Loading your config…')
    expect(still.created).toBe(0)
    quiet.unmount()
  })
})

describe('Tide run view', () => {
  it('ticks each step off as its event arrives, and a failure ends in the failure card', async () => {
    const plan = twoToolPlan()
    const run = heldApply()
    let plans = 0
    const { service } = fakeService(
      { version: 1, tools: ['claude-code'] },
      {
        plan: async () => {
          plans++
          return plan.view
        },
        apply: run.apply,
      },
    )
    const app = await start(service, { columns: 120, rows: 40 })
    await app.press('a', KEY.enter)
    await app.until('0/6 steps')
    const step = stepTitle
    // Each tool's first step is running (the still spinner), the rest are waiting.
    expect(lineWith(app.frame(), step('claude', 2))).toContain('○ claude step 2')
    expect(lineWith(app.frame(), step('codex', 3))).toContain('○ codex step 3')
    expect(lineWith(app.frame(), step('claude', 1))).toContain('… claude step 1')

    const steps = (tool: number) => plan.plan.tools[tool]!.steps
    const events: [number, number, 'done' | 'unchanged' | 'failed' | 'skipped', string][] = [
      [0, 0, 'done', '✓'],
      [1, 0, 'unchanged', '·'],
      [0, 1, 'done', '✓'],
      [1, 1, 'failed', '✗'],
      [1, 2, 'skipped', '-'],
      [0, 2, 'done', '✓'],
    ]
    for (const [count, [tool, index, status, mark]] of events.entries()) {
      run.send({
        tool: plan.plan.tools[tool]!.tool,
        index,
        result: { step: steps(tool)[index]!, status, ...(status === 'failed' ? { detail: 'boom\nmore' } : {}) },
      })
      // oxlint-disable-next-line no-await-in-loop
      await tick()
      expect(app.frame()).toContain(`${count + 1}/6 steps`)
      expect(lineWith(app.frame(), `${tool === 0 ? 'claude' : 'codex'} step ${index + 1}`)).toContain(
        `${mark} ${tool === 0 ? 'claude' : 'codex'} step ${index + 1}`,
      )
    }
    expect(lineWith(app.frame(), 'Codex')).toContain('✗')
    run.finish({
      results: [
        { tool: 'claude-code', ok: true, steps: steps(0).map(s => ({ step: s, status: 'done' as const })) },
        {
          tool: 'codex',
          ok: false,
          steps: [
            { step: steps(1)[0]!, status: 'unchanged' },
            { step: steps(1)[1]!, status: 'failed', detail: 'boom\nmore' },
            { step: steps(1)[2]!, status: 'skipped' },
          ],
        },
      ],
      backupDir: '/home/me/b',
    })
    const frame = await app.until('1 tool(s) failed')
    expect(frame).toContain('✗ 1 tool(s) failed — Codex: boom')
    expect(frame).toContain('The other tools finished')
    expect(lineWith(frame, 'Claude Code')).toContain('✓')
    // The failure card opens on Back to editor, with Retry beside it; Retry plans again.
    expect(frame).toContain('▸ Back to editor')
    await app.press(KEY.left, KEY.enter)
    await app.until('0/6 steps')
    expect(plans).toBe(2)
    app.unmount()
  })

  it('never shows a secret in the confirmation, the run or the result card', async () => {
    const secret = 'sk-run-secret-123456'
    const plan = twoToolPlan(secret)
    const run = heldApply()
    const { service } = fakeService(
      { version: 1, tools: ['claude-code'], provider: { name: 'p', apiKey: 'sk-old-key-000000' } },
      { plan: async () => plan.view, apply: run.apply },
    )
    const app = await start(service, { columns: 120, rows: 40 })
    const frames: string[] = []
    // A new key makes the draft dirty, so the confirmation lists the provider change.
    await app.press('2', KEY.enter)
    const at = app
      .frame()
      .split('\n')
      .findIndex(line => line.includes('API key'))
    expect(at).toBeGreaterThanOrEqual(0)
    await app.press(KEY.down, KEY.enter, 's', 'k', '-', KEY.enter, KEY.escape)
    await app.press('a')
    frames.push(app.frame())
    await app.press(KEY.enter)
    frames.push(await app.until('0/6 steps'))
    run.send({
      tool: 'codex',
      index: 0,
      result: { step: plan.plan.tools[1]!.steps[0]!, status: 'failed', detail: `denied for ${secret}` },
    })
    await tick()
    frames.push(app.frame())
    run.finish({
      results: [
        {
          tool: 'codex',
          ok: false,
          steps: [{ step: plan.plan.tools[1]!.steps[0]!, status: 'failed', detail: `denied for ${secret}` }],
        },
      ],
      backupDir: '/home/me/b',
    })
    frames.push(await app.until('tool(s) failed'))
    expect(frames.at(-1)).toContain('denied for sk-')
    for (const frame of frames) {
      expect(frame).not.toContain(secret)
      expect(frame).not.toContain('sk-old-key-000000')
    }
    app.unmount()
  })
})

describe('Tide dialogs', () => {
  it('moves the apply confirmation focus with arrows and Tab, and runs only the focused button', async () => {
    const { service, saved } = fakeService({ version: 1, tools: ['claude-code'] })
    const app = await start(service)
    await app.press('a')
    expect(app.frame()).toContain('▸ Apply')
    await app.press(KEY.right)
    expect(app.frame()).toContain('▸ Apply')
    await app.press(KEY.left)
    expect(app.frame()).toContain('▸ Cancel')
    await app.press(KEY.left)
    expect(app.frame()).toContain('▸ Cancel')
    await app.press('\t')
    expect(app.frame()).toContain('▸ Apply')
    await app.press('\t')
    expect(app.frame()).toContain('▸ Cancel')
    await app.press(SHIFT_TAB)
    expect(app.frame()).toContain('▸ Apply')
    await app.press(KEY.up)
    expect(app.frame()).toContain('▸ Cancel')
    await app.press(KEY.down)
    expect(app.frame()).toContain('▸ Apply')
    // Enter on Cancel closes without saving; Esc with Apply focused does too.
    await app.press(KEY.left, KEY.enter)
    expect(app.frame()).toContain('Pick the agent tools')
    await app.press('a', KEY.escape)
    expect(app.frame()).toContain('Pick the agent tools')
    expect(saved).toEqual([])
    app.unmount()
  })

  it('runs a dialog button on a click', async () => {
    const { service, saved } = fakeService({ version: 1, tools: ['claude-code'] })
    const app = await start(service)
    await app.press('a')
    const lines = app.frame().split('\n')
    const row = lines.findIndex(line => line.includes('▸ Apply'))
    const col = lines[row]!.indexOf('Cancel')
    app.stdin.write(`\u001B[<0;${col + 1};${row + 1}M`)
    await tick()
    await tick()
    expect(app.frame()).toContain('Pick the agent tools')
    expect(saved).toEqual([])
    app.unmount()
  })

  it('keeps ↑↓ for scrolling on the result card, and moves its focus with ←→ and Tab', async () => {
    const plan = twoToolPlan()
    const { service } = fakeService(
      { version: 1, tools: ['claude-code'] },
      {
        plan: async () => plan.view,
        apply: async () => ({
          results: plan.plan.tools.map(toolPlan => ({
            tool: toolPlan.tool,
            ok: true,
            steps: toolPlan.steps.map(step => ({ step, status: 'done' as const })),
          })),
          backupDir: '/home/me/b',
        }),
      },
    )
    // Short enough that the six steps outgrow the list above the card.
    const app = await start(service, { rows: 20 })
    await app.press('a', KEY.enter)
    await app.until('▸ Back to editor')
    expect(app.frame()).toContain('↑↓  scroll')
    const top = app.frame()
    await app.press(KEY.down)
    expect(app.frame()).toContain('▸ Back to editor')
    // The list moved; the focus did not.
    expect(app.frame()).not.toBe(top)
    await app.press(KEY.right)
    expect(app.frame()).toContain('▸ Quit')
    await app.press(KEY.right)
    expect(app.frame()).toContain('▸ Quit')
    await app.press('\t')
    expect(app.frame()).toContain('▸ Back to editor')
    await app.press(SHIFT_TAB)
    expect(app.frame()).toContain('▸ Quit')
    await app.press(KEY.left, KEY.escape)
    expect(app.frame()).toContain('Pick the agent tools')
    app.unmount()
  })

  it('opens the quit dialog on Stay, and Apply first opens the confirmation', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('1', KEY.enter, ' ', KEY.escape, 'q')
    expect(app.frame()).toContain('▸ Stay')
    await app.press(KEY.right)
    expect(app.frame()).toContain('▸ Apply first')
    await app.press(KEY.right)
    expect(app.frame()).toContain('▸ Quit anyway')
    await app.press(KEY.right)
    expect(app.frame()).toContain('▸ Quit anyway')
    await app.press('\t')
    expect(app.frame()).toContain('▸ Stay')
    await app.press(SHIFT_TAB)
    expect(app.frame()).toContain('▸ Quit anyway')
    await app.press(KEY.up, KEY.up)
    expect(app.frame()).toContain('▸ Stay')
    // Stay closes the dialog and keeps the edits.
    await app.press(KEY.enter)
    expect(app.frame()).toContain('Pick the agent tools')
    expect(app.frame()).toContain('to apply')
    // Esc cancels too.
    await app.press('q', KEY.escape)
    expect(app.frame()).not.toContain('Quit without applying?')
    await app.press('q', KEY.right, KEY.enter)
    expect(app.frame()).toContain('Apply the configuration')
    app.unmount()
  })

  it('stops the restore focus at the ends and wraps it with Tab', async () => {
    const restored: string[] = []
    const { service } = fakeService(
      { version: 1, tools: [] },
      {
        backups: async () => [backupRun('2026-10-24T08-00-00-000Z', '2026-10-24T08:00:00.000Z')],
        restoreBackup: async id => {
          restored.push(id)
          return { changed: 0, unchanged: 0, missing: 0, corrupt: 0, outside: 0 }
        },
      },
    )
    const app = await start(service)
    await openBackup(app)
    await app.until('an apply, 2 file(s)')
    await app.press(KEY.enter)
    expect(app.frame()).toContain('▸ Cancel')
    await app.press(KEY.left)
    expect(app.frame()).toContain('▸ Cancel')
    await app.press(KEY.right, KEY.right)
    expect(app.frame()).toContain('▸ Restore')
    await app.press('\t')
    expect(app.frame()).toContain('▸ Cancel')
    await app.press(SHIFT_TAB, KEY.enter)
    expect(await app.until('Restored')).toContain('an apply, 2 file(s)')
    expect(restored).toEqual(['2026-10-24T08-00-00-000Z'])
    app.unmount()
  })
})

describe('Tide QA regressions', () => {
  it('masks a planned secret, and a draft one, when planning or applying throws', async () => {
    const secret = 'QAFAKE-TOKEN-12345'
    const step = { kind: 'command' as const, title: { key: 'Install' }, command: 'fake', args: [secret] }
    const { service } = fakeService(
      { version: 1, tools: ['claude-code'] },
      {
        plan: async () => ({
          plan: { tools: [{ tool: 'claude-code', notices: [], steps: [step] }] },
          previews: [[null]],
          secrets: [secret],
        }),
        apply: async () => {
          throw new Error(`denied ${secret}`)
        },
      },
    )
    const app = await start(service, { columns: 120 })
    await app.press('a', KEY.enter)
    const frame = await app.until('denied')
    expect(frame).toContain('✗ Could not plan: denied')
    expect(frame).not.toContain(secret)
    app.unmount()

    // Planning fails before any plan names its secrets: the draft's own key is masked.
    const key = 'QAFAKE-APIKEY-67890'
    const profileKey = 'QAFAKE-PROFILE-24680'
    const early = fakeService(
      {
        version: 1,
        tools: ['claude-code'],
        provider: { name: 'p', apiKey: key },
        profiles: [{ id: 'relay', name: 'Relay', provider: { name: 'Relay', apiKey: profileKey } }],
      },
      {
        plan: async () => {
          throw new Error(`rejected key ${key} and ${profileKey}`)
        },
      },
    )
    const second = await start(early.service, { columns: 120 })
    await second.press('a', KEY.enter)
    const failed = await second.until('rejected key')
    expect(failed).not.toContain(key)
    expect(failed).not.toContain(profileKey)
    second.unmount()
  })

  it('keeps MCP env values out of the confirmation after a rename', async () => {
    const secret = 'QAFAKE-MCP-12345'
    // env before type, so a truncated line could not hide the leak.
    const { service } = fakeService({
      version: 1,
      tools: [],
      mcpServers: { x: { env: { T: secret }, type: 'stdio', command: 'x' } },
    })
    const app = await start(service, { columns: 120 })
    await app.press('3', KEY.enter, KEY.enter, KEY.enter, 'y', KEY.enter, 'a')
    expect(app.frame()).toContain('mcpServers:')
    expect(app.frame()).toContain('env: T')
    expect(app.frame()).not.toContain(secret)
    app.unmount()
  })

  it('bounds a long confirmation at 80x24, keeping the title, both lists and the buttons', async () => {
    const { service } = fakeService({
      version: 1,
      tools: ['claude-code', 'codex'],
      skills: [{ source: 'owner/repo', skills: Array.from({ length: 12 }, (_, i) => `skill-${i + 1}`) }],
    })
    const app = await start(service, { columns: 80, rows: 24 })
    await app.press('a')
    const frame = app.frame()
    expect(frame.split('\n')).toHaveLength(24)
    for (const text of ['Apply the configuration', 'Tools: Claude Code', 'Tools: Codex', '▸ Apply', 'Cancel', 'more'])
      expect(frame).toContain(text)
    app.unmount()
  })
})

describe('Tide text width', () => {
  it('measures mixed Latin and CJK labels the way Ink lays them out', () => {
    const labels = [
      'Agent 工具',
      '供应商：配置（新）。',
      'MCP 服务；x',
      '已装 2/3',
      'ｆｕｌｌ ｗｉｄｔｈ',
      '— · … ◉ ○ ▸ ━ ╱',
      '界面语言: 简体中文 (L)',
      '확인',
    ]
    for (const label of labels) {
      // A box exactly as wide as textWidth says: too narrow truncates the label, too wide pads before the bar.
      const { lastFrame, unmount } = render(
        <Box width={60}>
          <Box width={textWidth(label)} flexShrink={0}>
            <Text wrap="truncate-end">{label}</Text>
          </Box>
          <Text>|</Text>
        </Box>,
      )
      expect({ label, drawn: lastFrame()?.trimEnd() }).toEqual({ label, drawn: `${label}|` })
      unmount()
    }
  })

  it('counts wrapped lines the way Ink wraps them', () => {
    const texts = [
      createTranslator('en')('tui.result.others'),
      createTranslator('zh-CN')('tui.result.others'),
      'short',
      'a-very-long-unbroken-token-that-runs-past-the-line-width-twice-over',
      '供应商：配置（新）。 和 MCP 服务；以及更多中文内容一直写到超过这一行的宽度',
    ]
    for (const width of [12, 24, 51, 58])
      for (const text of texts) {
        const { lastFrame, unmount } = render(
          <Box width={width}>
            <Text>{text}</Text>
          </Box>,
        )
        expect({ text, width, lines: wrappedLines(text, width) }).toEqual({
          text,
          width,
          lines: (lastFrame() ?? '').split('\n').length,
        })
        unmount()
      }
  })
})

/** A frame as terminal cells: a wide character fills its cell and leaves the next one empty (''). */
function cellGrid(frame: string): string[][] {
  return frame.split('\n').map(line => {
    const cells: string[] = []
    for (const char of line) {
      cells.push(char)
      if (textWidth(char) === 2) cells.push('')
    }
    return cells
  })
}

const BORDER = new Set(['│', '╭', '╮', '╰', '╯', '─'])

/** What a box's top or bottom edge is drawn with. */
const EDGE = new Set(['╭', '╮', '╰', '╯', '─'])

/**
 * Every problem with the boxes in a frame: a line wider than the terminal, a side
 * that leaves its column, a bottom edge that does not run corner to corner, or a box
 * whose border touches another one's beside it.
 */
function boxProblems(frame: string, columns: number): string[] {
  const grid = cellGrid(frame)
  const at = (row: number, col: number) => grid[row]?.[col] ?? ' '
  const problems: string[] = []
  for (const [row, cells] of grid.entries())
    if (cells.length > columns) problems.push(`row ${row} is ${cells.length} cells wide`)
  for (const [top, cells] of grid.entries()) {
    for (const [left, cell] of cells.entries()) {
      if (cell !== '╭') continue
      const right = cells.indexOf('╮', left + 1)
      if (right < 0) {
        problems.push(`╭ at ${top}:${left} has no ╮`)
        continue
      }
      let bottom = top + 1
      while (bottom < grid.length && at(bottom, left) === '│') bottom++
      if (at(bottom, left) !== '╰') {
        problems.push(`left side from ${top}:${left} breaks at row ${bottom} (${JSON.stringify(at(bottom, left))})`)
        continue
      }
      if (at(bottom, right) !== '╯') problems.push(`box ${top}:${left} ends at ${bottom}:${right} without ╯`)
      for (let col = left + 1; col < right; col++)
        if (at(bottom, col) !== '─') problems.push(`bottom of box ${top}:${left} breaks at col ${col}`)
      // Nor right above or below another's edge: the rows beside its top and bottom stay clear of edges.
      for (let col = left; col <= right; col++) {
        if (EDGE.has(at(top - 1, col))) problems.push(`box ${top}:${left} touches an edge above at col ${col}`)
        if (EDGE.has(at(bottom + 1, col))) problems.push(`box ${top}:${left} touches an edge below at col ${col}`)
      }
      for (let row = top + 1; row < bottom; row++) {
        if (at(row, right) !== '│') problems.push(`right side of box ${top}:${left} breaks at row ${row}`)
        // A border never sits right against another box's: one blank cell at least.
        if (BORDER.has(at(row, left - 1)))
          problems.push(`box ${top}:${left} touches a border on its left at row ${row}`)
        if (BORDER.has(at(row, right + 1)))
          problems.push(`box ${top}:${left} touches a border on its right at row ${row}`)
      }
    }
  }
  return problems
}

/** An install step whose title translates, so it reads in the UI's language. */
function installStep(tool: 'claude-code' | 'codex', n: number): Plan['tools'][number]['steps'][number] {
  return {
    kind: 'command',
    title: { key: 'step.install', params: { tool } },
    command: 'npm',
    args: ['i', '-g', `${tool}-${n}`],
  }
}

/** A plan whose steps carry translated titles, for the run view in either language. */
function translatedPlan(): { plan: Plan; view: PlanView } {
  const step = installStep
  const plan: Plan = {
    tools: [
      { tool: 'claude-code', notices: [], steps: [step('claude-code', 1), step('claude-code', 2)] },
      {
        tool: 'codex',
        notices: [{ level: 'warning', message: { key: 'notice.notInstalled', params: { tool: 'codex' } } }],
        // The fallback stands in for a failed install; it only shows once it has run.
        steps: [
          step('codex', 1),
          {
            kind: 'command',
            title: { key: 'step.install', params: { tool: 'codex' } },
            command: 'npm',
            args: ['i', '-g', 'codex'],
            fallback: true,
          },
        ],
      },
      { tool: 'gemini-cli', notices: [], steps: [] },
    ],
  }
  return { plan, view: { plan, previews: [[null, null], [null, null], []], secrets: [] } }
}

/** A draft whose confirmation lists many picks with CJK names. */
const CJK_DRAFT: Draft = {
  version: 1,
  tools: ['claude-code', 'codex'],
  skills: [{ source: 'owner/技能库', skills: Array.from({ length: 9 }, (_, i) => `中文技能-${i + 1}（测试）`) }],
  mcpServers: { context7: { type: 'stdio', command: 'npx' } },
}

const SIZES = [
  [80, 24],
  [90, 28],
  [120, 30],
  [160, 40],
] as const

describe('Tide box guard', () => {
  it('flags a side out of its column, a CJK cell miscount and borders that touch', () => {
    const straight = ['╭──╮', '│中│', '╰──╯'].join('\n')
    expect(boxProblems(straight, 4)).toEqual([])
    // One cell short on the right: the side leaves its column.
    expect(boxProblems(['╭──╮', '│a│', '╰──╯'].join('\n'), 4)).toContain('right side of box 0:0 breaks at row 1')
    // A wide character counted as one cell pushes the side out, and the line overflows.
    expect(boxProblems(['╭──╮', '│中a│', '╰──╯'].join('\n'), 4).length).toBeGreaterThan(0)
    expect(boxProblems(['╭─╮╭─╮', '│ ││ │', '╰─╯╰─╯'].join('\n'), 6)).toContain(
      'box 0:0 touches a border on its right at row 1',
    )
    // A box sitting right on another's bottom edge.
    expect(boxProblems(['╭───╮', '│╭─╮│', '││ ││', '│╰─╯│', '╰───╯'].join('\n'), 5)).toContain(
      'box 1:1 touches an edge below at col 1',
    )
  })
})

describe.each(['en', 'zh-CN'] as const)('Tide straight lines in %s', lang => {
  describe.each(SIZES)('at %ix%i', (columns, rows) => {
    const check = (frame: string, what: string) => {
      // The label rides along, so a failure says which frame broke.
      expect({ what, rows: frame.split('\n').length, problems: boxProblems(frame, columns) }).toEqual({
        what,
        rows,
        problems: [],
      })
    }

    it('keeps every page and the quit dialog straight', async () => {
      const { service } = fakeService(CJK_DRAFT)
      const app = await start(service, { lang, langPinned: true, columns, rows })
      for (const digit of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
        // oxlint-disable-next-line no-await-in-loop
        await app.press(digit)
        check(app.frame(), `page ${digit}`)
      }
      await app.press('1', KEY.enter, ' ', KEY.escape, 'q')
      check(app.frame(), 'quit dialog')
      expect(app.frame(), 'quit dialog').toContain('▸')
      app.unmount()
    })

    it('keeps the confirmation, the run and both result cards straight', async () => {
      const { view } = translatedPlan()
      let runs = 0
      let finish: ((outcome: Awaited<ReturnType<ZcfService['apply']>>) => void) | undefined
      const { service } = fakeService(CJK_DRAFT, {
        plan: async () => view,
        apply: () =>
          new Promise(resolve => {
            runs++
            finish = resolve
          }),
      })
      const app = await start(service, { lang, langPinned: true, columns, rows })
      await app.press('a')
      check(app.frame(), 'confirmation')
      expect(app.frame(), 'confirmation').toContain('▸')
      await app.press(KEY.enter)
      await tick()
      check(app.frame(), 'run view')
      const results = (ok: boolean) =>
        view.plan.tools.map((toolPlan, index) => ({
          tool: toolPlan.tool,
          ok: ok || index === 0,
          steps: toolPlan.steps.map(step => ({
            step,
            status: ok || index === 0 ? ('done' as const) : ('failed' as const),
            detail: '失败：权限不足',
          })),
        }))
      finish?.({ results: results(false), backupDir: '/home/me/b' })
      await tick()
      await tick()
      check(app.frame(), 'failure card')
      expect(app.frame(), 'failure card').toContain('▸')
      // Retry runs again; this time it works.
      await app.press(KEY.left, KEY.enter)
      await tick()
      expect(runs).toBe(2)
      finish?.({ results: results(true), backupDir: '/home/me/b' })
      await tick()
      await tick()
      check(app.frame(), 'success card')
      expect(app.frame(), 'success card').toContain('▸')
      app.unmount()
    })

    it('keeps the restore and prune dialogs straight', async () => {
      const { service } = fakeService(CJK_DRAFT, {
        backups: async () => [backupRun('2026-10-24T08-00-00-000Z', '2026-10-24T08:00:00.000Z')],
      })
      const app = await start(service, { lang, langPinned: true, columns, rows })
      await openBackup(app)
      await app.until('2026-10-24 08:00')
      await app.press(KEY.enter)
      check(app.frame(), 'restore dialog')
      expect(app.frame(), 'restore dialog').toContain('▸')
      await app.press(KEY.escape, KEY.down, KEY.enter)
      check(app.frame(), 'prune dialog')
      expect(app.frame(), 'prune dialog').toContain('▸')
      app.unmount()
    })
  })
})

describe('Tide pieces', () => {
  it('runs the real clock only while something subscribes', () => {
    vi.useFakeTimers()
    try {
      const ticker = new Ticker(systemClock)
      let frames = 0
      const stop = ticker.subscribe(() => frames++)
      expect(ticker.running).toBe(true)
      vi.advanceTimersByTime(FRAME_MS * 3)
      expect(frames).toBe(3)
      // A newer driver takes over; letting go of the older one leaves it in place.
      let driven = ''
      const first = ticker.drive(() => (driven += 'a'))
      ticker.drive(() => (driven += 'b'))
      first()
      ticker.tick()
      expect(driven).toBe('b')
      stop()
      expect(ticker.running).toBe(false)
      expect(vi.getTimerCount()).toBe(0)
      // A timeout fires once and leaves nothing behind; a cleared one never fires.
      let fired = 0
      systemClock.setTimeout(() => fired++, 150)
      systemClock.clearTimeout(systemClock.setTimeout(() => fired++, 150))
      vi.advanceTimersByTime(150)
      expect(fired).toBe(1)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('maps colour levels and fills for every kind of terminal', () => {
    expect(detectColorLevel({}, 2)).toBe(2)
    expect(detectColorLevel({}, 0)).toBe(0)
    expect(createTheme(1, 'dark').fill('err')).toEqual({ color: 'black', backgroundColor: 'red', bold: true })
    expect(createTheme(3, 'light').fill('err').backgroundColor).toBe(LIGHT.err)
    expect(createTheme(0, 'dark').fill('accent')).toEqual({ inverse: true, bold: true })
    // One column is the first stop; twelve bands at most, however wide.
    expect(gradientColumns(DARK.stops, 1)).toEqual([DARK.stops[0]])
    expect(new Set(gradientColumns(DARK.stops, 90)).size).toBeLessThanOrEqual(12)
  })

  it('shares the confirmation lines between its lists, taking from the longer one first', () => {
    expect(fitLists(2, 3, 10)).toEqual([2, 3])
    // A cut list spends a line on its "more" note.
    expect(fitLists(2, 12, 6)).toEqual([2, 3])
    expect(fitLists(12, 2, 6)).toEqual([3, 2])
    // An empty list still takes its placeholder line.
    expect(fitLists(0, 12, 4)).toEqual([0, 2])
  })

  it('quits at once from a clean editor', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('q')
    const after = app.frame()
    await app.press('2')
    expect(app.frame()).toBe(after)
    app.unmount()
  })

  it('scrolls a finished run by line and by page, and quits from its card', async () => {
    const steps: Plan['tools'][number]['steps'] = Array.from({ length: 20 }, (_, i) => ({
      kind: 'command',
      title: { key: `long step ${i + 1}` },
      command: 'npm',
      args: ['i', `x${i + 1}`],
    }))
    const plan: Plan = { tools: [{ tool: 'claude-code', notices: [], steps }] }
    const { service } = fakeService(
      { version: 1, tools: ['claude-code'] },
      {
        plan: async () => ({ plan, previews: [steps.map(() => null)], secrets: [] }),
        apply: async () => ({
          results: [{ tool: 'claude-code', ok: true, steps: steps.map(step => ({ step, status: 'done' as const })) }],
          backupDir: '/home/me/b',
        }),
      },
    )
    const app = await start(service, { rows: 24 })
    await app.press('a', KEY.enter)
    await app.until('▸ Back to editor')
    expect(app.frame()).toContain('long step 1 ')
    await app.press('\u001B[6~')
    expect(app.frame()).not.toContain('long step 1 ')
    await app.press('\u001B[5~')
    expect(app.frame()).toContain('long step 1 ')
    await app.press(' ', 'k')
    expect(app.frame()).not.toContain('long step 1 ')
    const at = app
      .frame()
      .split('\n')
      .findIndex(line => line.includes('long step'))
    for (let i = 0; i < 20; i++) app.stdin.write(`\u001B[<64;40;${at + 1}M`)
    await tick()
    await tick()
    expect(app.frame()).toContain('long step 1 ')
    // Quit on the card ends the app: keys reach nothing after it.
    await app.press(KEY.right, KEY.enter)
    const after = app.frame()
    await app.press(KEY.left)
    expect(app.frame()).toBe(after)
    app.unmount()
  })
})

describe('Tide QA round 4', () => {
  it('marks a tool that recovered through its fallback as done, keeping the failed step', async () => {
    const install: Plan['tools'][number]['steps'][number] = {
      kind: 'command',
      title: { key: 'update via updater' },
      command: 'claude',
      args: ['update'],
    }
    const fallback: Plan['tools'][number]['steps'][number] = {
      kind: 'command',
      title: { key: 'install via npm' },
      command: 'npm',
      args: ['i', '-g', 'claude'],
      fallback: true,
    }
    const configure: Plan['tools'][number]['steps'][number] = {
      kind: 'command',
      title: { key: 'configure it' },
      command: 'claude',
      args: ['config'],
    }
    const plan: Plan = { tools: [{ tool: 'claude-code', notices: [], steps: [install, fallback, configure] }] }
    const { service } = fakeService(
      { version: 1, tools: ['claude-code'] },
      {
        plan: async () => ({ plan, previews: [[null, null, null]], secrets: [] }),
        apply: async onStep => {
          const steps = [
            { step: install, status: 'failed' as const, detail: 'updater broke' },
            { step: fallback, status: 'done' as const },
            { step: configure, status: 'done' as const },
          ]
          for (const [index, result] of steps.entries()) onStep?.({ tool: 'claude-code', index, result })
          return { results: [{ tool: 'claude-code', ok: true, steps }], backupDir: '/home/me/b' }
        },
      },
    )
    const app = await start(service, { columns: 120 })
    await app.press('a', KEY.enter)
    const frame = await app.until('Applied — 2 changed')
    expect(lineWith(frame, 'Claude Code')).toContain('✓')
    expect(lineWith(frame, 'Claude Code')).not.toContain('✗')
    expect(lineWith(frame, 'update via updater')).toContain('✗')
    expect(lineWith(frame, 'install via npm')).toContain('✓')
    app.unmount()
  })

  it('keeps the failure card, and its focus, while a retry is still saving', async () => {
    const plan = twoToolPlan()
    let release: (() => void) | undefined
    let saves = 0
    let applies = 0
    const { service } = fakeService(
      { version: 1, tools: ['claude-code'] },
      {
        save: () => {
          saves++
          // The first save goes through; the retry's is held.
          return saves === 1 ? Promise.resolve() : new Promise(resolve => (release = resolve))
        },
        plan: async () => plan.view,
        apply: async () => {
          applies++
          return {
            results: [
              {
                tool: 'claude-code',
                ok: false,
                steps: [{ step: plan.plan.tools[0]!.steps[0]!, status: 'failed', detail: 'boom' }],
              },
            ],
            backupDir: '/home/me/b',
          }
        },
      },
    )
    const app = await start(service, { columns: 120 })
    await app.press('a', KEY.enter)
    await app.until('tool(s) failed')
    expect(app.frame()).toContain('▸ Back to editor')
    // Click Retry, the focus still on Back to editor.
    const lines = app.frame().split('\n')
    const row = lines.findIndex(line => line.includes('Retry'))
    app.stdin.write(`\u001B[<0;${lines[row]!.indexOf('Retry') + 1};${row + 1}M`)
    await tick()
    await tick()
    expect(saves).toBe(2)
    expect(app.frame()).not.toContain('already up to date')
    expect(app.frame()).not.toContain('▸ Quit')
    expect(app.frame()).toContain('tool(s) failed')
    // Once the save is in, the retry plans and applies again.
    release?.()
    for (let waited = 0; waited < 40; waited++) {
      if (applies >= 2) break
      // oxlint-disable-next-line no-await-in-loop
      await tick()
    }
    expect(applies).toBe(2)
    app.unmount()
  })
})
