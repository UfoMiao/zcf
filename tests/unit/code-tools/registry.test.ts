import type { CodeToolAdapter, CodeToolDefinition } from '../../../src/code-tools'
import { describe, expect, it, vi } from 'vitest'
import { createBuiltinCodeToolRegistry } from '../../../src/code-tools'
import { CodeToolRegistry } from '../../../src/code-tools/registry'

function createAdapter(id: string, aliases: string[]): CodeToolAdapter {
  const definition = {
    id,
    displayNameKey: `common:${id}`,
    aliases,
    paths: {
      homeDir: `/tmp/${id}`,
      configFiles: [],
    },
    skillsAgents: [],
    installation: {
      command: id,
      npmPackage: id,
      supportedMethods: ['npm'],
    },
  } as unknown as CodeToolDefinition

  return {
    definition,
    detectInstalled: vi.fn().mockResolvedValue(false),
    validateInitOptions: vi.fn(),
    init: vi.fn(),
    update: vi.fn(),
    uninstall: vi.fn(),
    menu: {
      items: [],
      uninstallLabelKey: 'uninstall:completeUninstall',
      uninstallDescriptionKey: 'uninstall:completeUninstallDesc',
      updateLabelKey: 'menu:menuOptions.updateCcusage',
      updateDescriptionKey: 'menu:menuDescriptions.updateCcusage',
      updateAction: 'update',
      run: vi.fn(),
    },
  }
}

describe('codeToolRegistry', () => {
  it('registers all built-ins and resolves canonical ids and aliases', () => {
    const registry = createBuiltinCodeToolRegistry()

    expect(registry.listIds()).toEqual(['claude-code', 'codex'])
    expect(registry.resolve('CC')?.definition.id).toBe('claude-code')
    expect(registry.resolve('cx')?.definition.id).toBe('codex')
    expect(registry.resolve('gemini')).toBeUndefined()
  })

  it('exposes the capability matrix from adapter methods', () => {
    const registry = createBuiltinCodeToolRegistry()

    expect(registry.supports('claude-code', 'providers')).toBe(true)
    expect(registry.supports('codex', 'configurations')).toBe(true)
    expect(registry.supports('claude-code', 'backup')).toBe(true)
    expect(registry.supports('codex', 'menu')).toBe(true)
  })

  it('rejects an alias collision atomically', () => {
    const registry = new CodeToolRegistry()
    registry.register(createAdapter('first', ['one', 'shared']))

    expect(() => registry.register(createAdapter('second', ['two', 'shared']))).toThrow()
    expect(registry.resolve('two')).toBeUndefined()
    expect(registry.resolve('second')).toBeUndefined()
    expect(registry.list()).toHaveLength(1)
  })

  it('rejects duplicate keys inside one adapter without partial mutation', () => {
    const registry = new CodeToolRegistry()

    expect(() => registry.register(createAdapter('tool', ['tool']))).toThrow()
    expect(registry.resolve('tool')).toBeUndefined()
    expect(registry.list()).toHaveLength(0)
  })

  it('rejects an id that collides with an existing alias', () => {
    const registry = new CodeToolRegistry()
    registry.register(createAdapter('first', ['second']))

    expect(() => registry.register(createAdapter('second', ['other']))).toThrow()
    expect(registry.resolve('other')).toBeUndefined()
    expect(registry.listIds()).toEqual(['first'])
  })

  it('throws for unknown tools and reports all direct capabilities', () => {
    const registry = new CodeToolRegistry()
    const adapter = createAdapter('tool', ['alias'])
    registry.register(adapter)

    expect(registry.has('ALIAS')).toBe(true)
    expect(() => registry.get('missing')).toThrow()
    expect(registry.supports('tool', 'init')).toBe(true)
    expect(registry.supports('tool', 'update')).toBe(true)
    expect(registry.supports('tool', 'uninstall')).toBe(true)
    expect(registry.supports('missing', 'init')).toBe(false)
  })

  it('detects installed tools while isolating detection failures', async () => {
    const registry = new CodeToolRegistry()
    const installed = createAdapter('installed', [])
    const absent = createAdapter('absent', [])
    const broken = createAdapter('broken', [])
    vi.mocked(installed.detectInstalled).mockResolvedValue(true)
    vi.mocked(absent.detectInstalled).mockResolvedValue(false)
    vi.mocked(broken.detectInstalled).mockRejectedValue(new Error('detection failed'))
    registry.register(installed)
    registry.register(absent)
    registry.register(broken)

    await expect(registry.detectInstalled()).resolves.toEqual([installed])
  })
})
