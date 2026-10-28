import type { Plan } from '@zcf/core'
import type { Draft, PlanView, ZcfService } from '@zcf/ui-kit'
import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'

import type { Lang } from '../src/i18n'
import { createTranslator } from '../src/i18n'
import { App } from '../src/tui/app'
import { Banner } from '../src/tui/banner'

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
    searchSkills: async () => ({ skills: [], source: 'none' }),
    ...overrides,
  }
  return { service, saved, bases }
}

async function start(service: ZcfService, options: { lang?: Lang; langPinned?: boolean } = {}) {
  const app = render(
    <App service={service} lang={options.lang ?? 'en'} langPinned={options.langPinned ?? false} home="/home/me" />,
  )
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
  // One tick is not always enough for the config to load on a busy machine, and a key
  // pressed while it still loads lands on the loading screen and silently moves focus.
  await until('~/.ufomiao/zcf/config.json')
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
    // An unset select shows its first option, the schema default, with no extra placeholder.
    expect(app.frame()).toContain('official sources')
    expect(app.frame()).not.toContain('(default)')
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

  it('shows the v3 banner with the tagline and version at the top', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    expect(app.frame()).toContain('Zero-Config Code Flow')
    expect(app.frame()).toContain('One config for your AI tools')
    app.unmount()
  })

  it('trims a subtitle wider than its slot instead of pushing the box apart', () => {
    // 16 CJK characters are 32 columns wide; the slot is 30, so one character has to go.
    const wide = render(<Banner t={(key: string) => (key === 'tui.bannerSubtitle' ? '零'.repeat(16) : key)} />)
    expect(wide.lastFrame()).toContain('零'.repeat(15))
    expect(wide.lastFrame()).not.toContain('零'.repeat(16))
    wide.unmount()
  })

  it('switches the interface language from the header with L, saving it at once', async () => {
    const zh = createTranslator('zh-CN')
    const { service, saved, bases } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    expect(app.frame()).toContain('Interface language: Auto (L)')

    // auto → en: the value moves and is saved on its own, without Ctrl+S.
    await app.press('l')
    expect(app.frame()).toContain('Interface language: English (L)')
    expect(saved).toEqual([{ version: 1, tools: [], language: 'en' }])
    expect(bases).toEqual([{ version: 1, tools: [] }])
    expect(app.frame()).not.toContain('unsaved')

    // en → zh-CN: the whole UI switches, not just the header.
    await app.press('l')
    expect(await app.until(zh('tui.page.tools'))).toContain(zh('tui.keys.nav'))
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
    expect(app.frame()).not.toContain('L lang')
    expect(app.frame()).toContain('↑↓ choose · 1-9 go · Enter open · Ctrl+S save · q quit')
    await app.press('l')
    expect(app.frame()).toContain('Settings')
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
    // To the Provider page, down to the name field, and into its text input.
    await app.press(KEY.down, KEY.enter, KEY.down, KEY.enter)
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
    await app.press(KEY.down, KEY.down, KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('Config language')
    // An unset select shows its first option, which is the schema default (selectValue).
    expect(app.frame()).toContain('English')
    expect(app.frame()).not.toContain('(default)')
    // The interface language lives in the header now, not among these fields.
    expect(app.frame()).not.toMatch(/^ {2}Interface language/m)
    // Config language sits under the mirror: from the default, the next option is zh-CN.
    await app.press(KEY.down, KEY.right)
    expect(app.frame()).toContain('简体中文')
    await app.press(KEY.save)
    expect(saved).toEqual([{ version: 1, tools: [], configLanguage: 'zh-CN' }])
    app.unmount()
  })

  it('starts in the config language, unless --lang or ZCF_LANG pinned it', async () => {
    const zh = createTranslator('zh-CN')
    const follows = await start(fakeService({ version: 1, tools: [], language: 'zh-CN' }).service)
    expect(await follows.until(zh('tui.page.tools'))).toContain(zh('tui.keys.nav'))
    follows.unmount()

    const pinned = await start(fakeService({ version: 1, tools: [], language: 'zh-CN' }).service, {
      lang: 'en',
      langPinned: true,
    })
    expect(pinned.frame()).toContain('Settings')
    expect(pinned.frame()).not.toContain(zh('tui.page.tools'))
    pinned.unmount()
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

  it('picks built-in skills from the catalog beside a custom source', async () => {
    const { service, saved } = fakeService({ version: 1, tools: [], skills: [{ source: 'a/a' }] })
    const app = await start(service)
    await app.press(KEY.down, KEY.down, KEY.down, KEY.enter)
    // The list starts at the custom source; the catalog row is below it.
    await app.press(KEY.down, KEY.enter)
    expect(app.frame()).toContain('Pick the ZCF built-in skills to install')
    expect(app.frame()).toContain('Analyze changes and write conventional commit messages')
    await app.press(KEY.down, KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('✓ git-commit')
    await app.press(KEY.up, KEY.up, KEY.up, KEY.enter)
    expect(app.frame()).toContain('✓ init-project')
    await app.press(KEY.escape)
    expect(app.frame()).toContain('ZCF built-in skills')
    expect(app.frame()).toContain('git-commit, init-project')
    // One row for the catalog, not a second one repeating the same picked skills.
    expect(app.frame().match(/ZCF built-in skills/g)).toHaveLength(1)
    await app.press(KEY.save)
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
    await app.press(KEY.down, KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('ZCF built-in skills')
    expect(app.frame()).toContain('feat')
    // The built-in row itself opens the catalog, so Enter on it goes straight to the checkboxes.
    await app.press(KEY.enter)
    expect(app.frame()).toContain('✓ feat')
    await app.press(KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).not.toContain('✓ feat')
    await app.press(KEY.escape)
    await app.press(KEY.save)
    expect(saved).toEqual([{ version: 1, tools: [] }])
    app.unmount()
  })

  it('keeps a single built-in row for a zcf source that names no skills', async () => {
    // `{ source: 'zcf' }` with no list means every built-in skill; it already has a row.
    const { service, saved } = fakeService({ version: 1, tools: [], skills: [{ source: 'zcf' }] })
    const app = await start(service)
    await app.press(KEY.down, KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('ZCF built-in skills')
    expect(app.frame()).toContain('all skills')
    expect(app.frame().match(/ZCF built-in skills/g)).toHaveLength(1)
    // Removing it leaves the stand-in row, which a plain source takes over again.
    await app.press('x')
    expect(app.frame()).toContain('+ ZCF built-in skills')
    await app.press(KEY.down, KEY.down, KEY.enter, 'a', '/', 'b', KEY.enter)
    expect(app.frame()).toContain('a/b')
    await app.press(KEY.save)
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
    await app.press(KEY.down, KEY.down, KEY.down, KEY.enter)
    // The list starts at the existing source; the search row is two rows below it.
    await app.press(KEY.down, KEY.down, KEY.enter)
    expect(app.frame()).toContain('Search skills')
    await app.press(KEY.enter, 'g', 'i', 't', KEY.enter)
    await app.until('using-git-worktrees')
    expect(app.frame()).toContain('obra/superpowers')
    await app.press(KEY.down, KEY.enter)
    expect(app.frame()).toContain('obra/superpowers · added')
    await app.press(KEY.escape, KEY.save)
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
    await app.press(KEY.down, KEY.down, KEY.down, KEY.enter, KEY.down, KEY.enter)
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
    await app.press(KEY.down, KEY.down, KEY.down, KEY.enter, KEY.down, KEY.enter)
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
    Object.defineProperty(app.stdout, 'rows', { get: () => 24, configurable: true })
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
    expect(lines[39]).toContain('Ctrl+S')
    app.unmount()
  })

  it('folds the banner to one line in a terminal too short for the box art', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    Object.defineProperty(app.stdout, 'rows', { get: () => 12 })
    app.stdout.emit('resize')
    await tick()
    await tick()
    // The boxed banner alone is 11 lines; in 12 rows it would push the app off screen.
    const lines = app.frame().split('\n')
    expect(lines).toHaveLength(12)
    expect(lines[0]).toContain('ZCF')
    expect(lines[0]).not.toContain('╔')
    expect(lines[11]).toContain('Ctrl+S')
    app.unmount()
  })

  it('folds the banner one row below the fold line, and holds the box well above it', async () => {
    // The box, the status row, a panel around a window of nav entries, the key bar
    // and a status message add up to 22 rows; the fold line keeps a row of slack for
    // the measured minimum drifting between platforms, so 22 folds and 24 holds the box.
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    Object.defineProperty(app.stdout, 'rows', { get: () => 22, configurable: true })
    app.stdout.emit('resize')
    await tick()
    await tick()
    expect(app.frame().split('\n')[0]).toContain('ZCF')
    Object.defineProperty(app.stdout, 'rows', { get: () => 24, configurable: true })
    app.stdout.emit('resize')
    await tick()
    await tick()
    const lines = app.frame().split('\n')
    expect(lines).toHaveLength(24)
    expect(lines[0]).toContain('╔')
    expect(lines[23]).toContain('Ctrl+S')
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
    await app.press(KEY.enter)
    // A click selects the row and runs what Enter would run: the Codex checkbox turns on.
    await click(lineOf('[ ] Codex'), 40)
    expect(await app.until('[x] Codex')).toContain('[x] Codex')
    // A click on a nav entry opens that page.
    await click(lineOf('2 Provider'), 5)
    expect(await app.until('One API provider for every tool.')).toContain('One API provider for every tool.')
    app.unmount()
  })

  it('ignores a click on the page text above the list', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press(KEY.enter)
    const at = app
      .frame()
      .split('\n')
      .findIndex(line => line.includes('Pick the agent tools'))
    expect(at).toBeGreaterThanOrEqual(0)
    app.stdin.write(`\u001B[<0;40;${at + 1}M`)
    await tick()
    // The intro line is above every row: nothing toggles and the draft stays clean.
    const frame = app.frame()
    expect(frame).toContain('[ ] Claude Code')
    expect(frame).not.toContain('●')
    app.unmount()
  })

  it('moves the page choice with the wheel on the nav column', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    const at = app
      .frame()
      .split('\n')
      .findIndex(line => line.includes('2 Provider'))
    expect(at).toBeGreaterThanOrEqual(0)
    // The wheel turns the page choice down to Provider and back up to Tools.
    app.stdin.write(`\u001B[<65;5;${at + 1}M`)
    expect(await app.until('One API provider for every tool.')).toContain('One API provider for every tool.')
    app.stdin.write(`\u001B[<64;5;${at + 1}M`)
    expect(await app.until('Pick the agent tools')).toContain('Pick the agent tools')
    app.unmount()
  })

  it('groups the nav into sections with headers and digit-prefixed pages', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    const frame = app.frame()
    expect(frame).toContain('Init config')
    expect(frame).toContain('1 Agent tools')
    expect(frame).toContain('2 Provider')
    expect(frame).toContain('6 Apply')
    // The empty sections hold their place too once the terminal is tall enough.
    Object.defineProperty(app.stdout, 'rows', { get: () => 40, configurable: true })
    app.stdout.emit('resize')
    await tick()
    await tick()
    const tall = app.frame()
    for (const header of ['Init config', 'Workflows', 'More tools', 'Backup']) expect(tall).toContain(header)
    app.unmount()
  })

  it('jumps to a page by its digit, ignoring digits with no page behind them', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press('4')
    expect(app.frame()).toContain('Search skills')
    await app.press('1')
    expect(app.frame()).toContain('Pick the agent tools')
    // Only six pages exist this wave: 7-9 and 0 name none, so the page stays.
    await app.press('7', '9', '0')
    expect(app.frame()).toContain('Pick the agent tools')
    app.unmount()
  })

  it('numbers visible rows and picks one with its digit without running it', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press(KEY.enter)
    expect(app.frame()).toContain('› 1 [ ] Claude Code')
    expect(app.frame()).toContain('  2 [ ] Codex')
    // The digit moves the selection only; Enter still does the toggling.
    await app.press('2')
    expect(app.frame()).toContain('› 2 [ ] Codex')
    expect(app.frame()).not.toContain('[x] Codex')
    // A digit past the visible window is ignored.
    await app.press('5')
    expect(app.frame()).toContain('› 2 [ ] Codex')
    await app.press(KEY.enter)
    expect(app.frame()).toContain('[x] Codex')
    app.unmount()
  })

  it('keeps digit keys for the text editor while a row is edited', async () => {
    const { service, saved } = fakeService({
      version: 1,
      tools: [],
      provider: { name: 'old', apiKey: 'sk-very-secret' },
    })
    const app = await start(service)
    await app.press(KEY.down, KEY.enter, KEY.down, KEY.enter)
    await app.press('\u007F\u007F\u007F', '4', '2')
    await app.press(KEY.enter, KEY.save)
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
      .findIndex(line => line.includes('Workflows'))
    expect(at).toBeGreaterThanOrEqual(0)
    app.stdin.write(`\u001B[<0;5;${at + 1}M`)
    await tick()
    // The page did not change, and the nav keeps the focus: j still moves the page choice.
    expect(app.frame()).toContain('Pick the agent tools')
    await app.press('j')
    expect(app.frame()).toContain('One API provider for every tool.')
    app.unmount()
  })

  it('windows the nav in a short terminal, keeping the open page in view', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    Object.defineProperty(app.stdout, 'rows', { get: () => 24, configurable: true })
    app.stdout.emit('resize')
    await tick()
    await tick()
    const lines = app.frame().split('\n')
    expect(lines).toHaveLength(24)
    expect(app.frame()).toContain('1 Agent tools')
    expect(app.frame()).not.toContain('Backup')
    // Moving down the pages pulls the later rows into the window.
    await app.press('j', 'j', 'j', 'j', 'j')
    expect(app.frame()).toContain('› 6 Apply')
    expect(app.frame()).toContain('↑')
    app.unmount()
  })

  it('moves the selection with the mouse wheel', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press(KEY.enter)
    // One wheel turn down moves one row, to Codex — wait for the pointer to move before
    // the next key, so it reads the selection the wheel just made.
    app.stdin.write('\u001B[<65;40;14M')
    expect(await app.until('› 2 [ ] Codex')).toContain('› 2 [ ] Codex')
    await app.press(KEY.enter)
    expect(app.frame()).toContain('[x] Codex')
    app.unmount()
  })

  it('opens a text editor with a mouse click', async () => {
    const { service } = fakeService({ version: 1, tools: [] })
    const app = await start(service)
    await app.press(KEY.down, KEY.down, KEY.down, KEY.enter, KEY.down, KEY.enter)
    const at = app
      .frame()
      .split('\n')
      .findIndex(line => line.includes('keyword'))
    expect(at).toBeGreaterThanOrEqual(0)
    app.stdin.write(`\u001B[<0;30;${at + 1}M`)
    // The click opened the query editor, the way Enter does.
    expect(await app.until('Enter confirm')).toContain('Enter confirm')
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
    await app.press(KEY.down, KEY.down, KEY.down, KEY.enter, KEY.down, KEY.enter)
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
    await retry.press(KEY.down, KEY.down, KEY.down, KEY.enter, KEY.down, KEY.enter)
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
    expect(app.frame()).toContain('› 4 Remove the provider')
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

  it('scrolls the plan output with the mouse wheel', async () => {
    const steps: Plan['tools'][number]['steps'] = Array.from({ length: 10 }, (_, i) => ({
      kind: 'command',
      title: { key: 'step.install', params: { tool: 'claude-code' } },
      command: 'npm',
      args: ['i', '-g', `x${i}`],
    }))
    const plan: Plan = { tools: [{ tool: 'claude-code', notices: [], steps }] }
    const view: PlanView = { plan, previews: [steps.map(() => null)], secrets: [] }
    const { service } = fakeService({ version: 1, tools: ['claude-code'] }, { plan: async () => view })
    const app = await start(service)
    await app.press(KEY.down, KEY.down, KEY.down, KEY.down, KEY.down, KEY.enter)
    const at = app
      .frame()
      .split('\n')
      .findIndex(line => line.includes('$ npm i -g x0'))
    expect(at).toBeGreaterThanOrEqual(0)
    // Ten steps overflow the window; the wheel rolls the plan to its end.
    for (let i = 0; i < 12; i++) {
      app.stdin.write(`\u001B[<65;40;${at + 1}M`)
      // oxlint-disable-next-line no-await-in-loop
      await tick()
    }
    const frame = app.frame()
    expect(frame).not.toContain('$ npm i -g x0')
    expect(frame).toContain('$ npm i -g x9')
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
