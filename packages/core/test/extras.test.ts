import { describe, expect, it } from 'vitest'

import { planExtras } from '../src/adapters/extras'
import type { AdapterContext } from '../src/adapters/types'
import type { ZcfConfig } from '../src/schema/config'
import { BUILTIN_AGENT_IDS, parseZcfConfig } from '../src/schema/config'
import { WORKFLOW_PRESETS } from '../src/workflow-presets'
import { fakeRunner } from './helpers'

const HOME = '/home/me'

function context(overrides: Partial<AdapterContext> = {}, files: Record<string, string> = {}): AdapterContext {
  return {
    home: HOME,
    platform: 'linux',
    env: {},
    runner: fakeRunner(),
    readFile: async path => files[path],
    ...overrides,
  }
}

function config(input: Record<string, unknown>): ZcfConfig {
  const result = parseZcfConfig({ version: 1, ...input })
  if (!result.success) throw new Error(JSON.stringify(result.issues))
  return result.config
}

const commandLine = (step: { kind: string; command?: string; args?: string[] }) =>
  step.kind === 'command' && step.args ? [step.command, ...step.args].join(' ') : undefined

describe('planExtras', () => {
  it('installs magpie with its installer script, mirrored in China', async () => {
    const plans = await planExtras(config({ extras: { magpie: 'client' } }), context())
    expect(plans).toHaveLength(1)
    expect(plans[0]!.tool).toBe('magpie')
    expect(commandLine(plans[0]!.steps[0]!)).toBe(
      'bash -c set -o pipefail; curl -fsSL https://usemagpie.ai/install.sh | sh -s --',
    )
    expect(plans[0]!.notices.map(notice => notice.message.key)).toContain('notice.magpieClient')

    // The mirror flag goes to the installer through `sh -s --`, not to curl. The value is
    // the bare proxy: the installer puts it in front of the whole github.com release URL,
    // so one that already ends in github.com would double it (a real 404, checked by hand).
    const china = await planExtras(config({ extras: { magpie: 'cli' } }), context({ mirror: 'china' }))
    expect(commandLine(china[0]!.steps[0]!)).toBe(
      'bash -c set -o pipefail; curl -fsSL https://usemagpie.ai/install.sh | sh -s -- --mirror https://gh-proxy.com',
    )
    expect(china[0]!.notices.map(notice => notice.message.key)).toContain('notice.magpieCli')
  })

  it('only notices when magpie already answers on PATH', async () => {
    const ctx = context({ runner: fakeRunner({ 'magpie --version': { stdout: '1.0.0\n' } }) })
    const plans = await planExtras(config({ extras: { magpie: 'client' } }), ctx)
    expect(plans[0]!.steps).toEqual([])
    expect(plans[0]!.notices.map(notice => notice.message.key)).toContain('notice.extraInstalled')
  })

  it('offers the desktop download on Windows instead of the POSIX script', async () => {
    const plans = await planExtras(config({ extras: { magpie: 'client' } }), context({ platform: 'win32' }))
    expect(plans[0]!.steps).toEqual([])
    expect(plans[0]!.notices.map(notice => notice.message.key)).toContain('notice.magpieWindows')
  })

  it('installs ccline from npm and warns when Claude Code is not selected', async () => {
    const plans = await planExtras(config({ tools: ['codex'], extras: { ccline: true } }), context())
    expect(plans[0]!.tool).toBe('ccline')
    // npm 12 blocks install scripts unless allowed, and ccline's postinstall is what puts
    // the binary in ~/.claude/ccline; without the flag the statusLine points at nothing.
    expect(commandLine(plans[0]!.steps[0]!)).toBe('npm install -g --allow-scripts=@cometix/ccline @cometix/ccline')
    expect(plans[0]!.notices.map(notice => notice.message.key)).toContain('notice.cclineNeedsTool')

    const quiet = await planExtras(config({ tools: ['claude-code'], extras: { ccline: true } }), context())
    expect(quiet[0]!.notices).toEqual([])
    const installed = context({ runner: fakeRunner({ 'ccline --version': { stdout: '1.2.0\n' } }) })
    const none = await planExtras(config({ extras: { ccline: true } }), installed)
    expect(none[0]!.steps).toEqual([])
  })

  it('plans nothing without extras', async () => {
    expect(await planExtras(config({}), context())).toEqual([])
  })
})

describe('WORKFLOW_PRESETS', () => {
  it('lists the five v3 presets over built-in skills and agents only', () => {
    expect(WORKFLOW_PRESETS.map(preset => preset.id)).toEqual(['common', 'six-steps', 'feat', 'git', 'bmad'])
    for (const preset of WORKFLOW_PRESETS) {
      for (const agent of preset.agents) expect(BUILTIN_AGENT_IDS).toContain(agent)
      for (const source of preset.skills) {
        expect(source.source).toBe('zcf')
        expect(source.skills.length).toBeGreaterThan(0)
      }
    }
  })
})
