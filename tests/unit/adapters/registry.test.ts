import type { AgentAdapter } from '../../../src/adapters/adapter-interface'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function createStubAdapter(
  id: string,
  aliases: string[] = [],
  installed: boolean = false,
): AgentAdapter {
  return {
    id,
    displayName: id,
    aliases,
    homeDir: `/tmp/${id}`,
    configFiles: [],
    templateDir: `templates/${id}`,
    skillSpec: { skillsDir: `/tmp/${id}/skills`, manifestName: 'SKILL.md', scopes: ['global'] },
    isInstalled: vi.fn().mockResolvedValue(installed),
    install: vi.fn(),
    update: vi.fn(),
    uninstall: vi.fn(),
    backup: vi.fn().mockResolvedValue(null),
  }
}

describe('adapter registry', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('registers and resolves adapters by id', async () => {
    const { registerAgent, resolveAgent } = await import('../../../src/adapters/registry')
    const adapter = createStubAdapter('alpha')
    registerAgent(adapter)
    expect(resolveAgent('alpha')).toBe(adapter)
  })

  it('resolves adapters by alias', async () => {
    const { registerAgent, resolveAgent } = await import('../../../src/adapters/registry')
    const adapter = createStubAdapter('beta', ['b'])
    registerAgent(adapter)
    expect(resolveAgent('b')).toBe(adapter)
    expect(resolveAgent('B')).toBe(adapter)
  })

  it('throws when registering duplicate ids', async () => {
    const { registerAgent } = await import('../../../src/adapters/registry')
    registerAgent(createStubAdapter('gamma'))
    expect(() => registerAgent(createStubAdapter('gamma'))).toThrow('already registered')
  })

  it('throws when registering duplicate aliases', async () => {
    const { registerAgent } = await import('../../../src/adapters/registry')
    registerAgent(createStubAdapter('one', ['x']))
    expect(() => registerAgent(createStubAdapter('two', ['x']))).toThrow('alias already in use')
  })

  it('lists all registered adapters and ids', async () => {
    const { registerAgent, listAgents, listAgentIds } = await import('../../../src/adapters/registry')
    const a = createStubAdapter('a')
    const b = createStubAdapter('b')
    registerAgent(a)
    registerAgent(b)
    expect(listAgents()).toContain(a)
    expect(listAgents()).toContain(b)
    expect(listAgentIds()).toEqual(expect.arrayContaining(['a', 'b']))
  })

  it('detects installed agents', async () => {
    const { registerAgent, detectInstalledAgents } = await import('../../../src/adapters/registry')
    const installed = createStubAdapter('installed', [], true)
    const missing = createStubAdapter('missing', [], false)
    registerAgent(installed)
    registerAgent(missing)
    const result = await detectInstalledAgents()
    expect(result).toContain(installed)
    expect(result).not.toContain(missing)
  })

  it('reports registration status for ids and aliases', async () => {
    const { registerAgent, isAgentRegistered } = await import('../../../src/adapters/registry')
    registerAgent(createStubAdapter('delta', ['d']))
    expect(isAgentRegistered('delta')).toBe(true)
    expect(isAgentRegistered('d')).toBe(true)
    expect(isAgentRegistered('unknown')).toBe(false)
  })
})
