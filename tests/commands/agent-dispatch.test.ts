import type { AgentAdapter } from '../../src/adapters/adapter-interface'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CODE_TOOL_TYPE } from '../../src/constants'

vi.mock('../../src/adapters', () => ({
  registerAllAgents: vi.fn(),
  resolveAgent: vi.fn(),
  listAgents: vi.fn(),
  listAgentIds: vi.fn(),
}))

vi.mock('../../src/core/install-runner', () => ({
  runInstall: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/utils/zcf-config', () => ({
  readZcfConfigAsync: vi.fn().mockResolvedValue(null),
}))

vi.mock('../../src/i18n', () => {
  const t = vi.fn((key: string, options?: Record<string, unknown>) => {
    const opts = options || {}
    return `${key} ${Object.entries(opts).map(([k, v]) => `${k}=${v}`).join(' ')}`.trim()
  })
  return {
    i18n: {
      isInitialized: true,
      language: 'en',
      t,
    },
    initI18n: vi.fn(),
    changeLanguage: vi.fn(),
    ensureI18nInitialized: vi.fn(),
  }
})

vi.mock('inquirer', () => ({
  default: { prompt: vi.fn() },
}))

const { resolveAgent, listAgents, listAgentIds } = await import('../../src/adapters')
const { runInstall } = await import('../../src/core/install-runner')
const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
const inquirer = await import('inquirer')

function createStubAdapter(id: string, aliases: string[] = []): AgentAdapter {
  return {
    id,
    displayName: id,
    aliases,
    homeDir: `/tmp/${id}`,
    configFiles: [],
    templateDir: `templates/${id}`,
    skillSpec: { skillsDir: `/tmp/${id}/skills`, manifestName: 'SKILL.md', scopes: ['global'] },
    isInstalled: vi.fn().mockResolvedValue(false),
    install: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    uninstall: vi.fn().mockResolvedValue(undefined),
    backup: vi.fn().mockResolvedValue(null),
  }
}

function stubRegistry(adapter: AgentAdapter) {
  vi.mocked(resolveAgent).mockImplementation((id) => {
    if (id === adapter.id || adapter.aliases.includes(id as string))
      return adapter
    return undefined
  })
  vi.mocked(listAgents).mockReturnValue([adapter])
  vi.mocked(listAgentIds).mockReturnValue([adapter.id])
}

describe('agent-dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('resolveAgentAdapter', () => {
    it('resolves an adapter by canonical id', async () => {
      const claude = createStubAdapter('claude-code')
      stubRegistry(claude)

      const { resolveAgentAdapter } = await import('../../src/commands/agent-dispatch')
      const adapter = await resolveAgentAdapter({ agent: 'claude-code' })
      expect(adapter).toBe(claude)
    })

    it('resolves an adapter by alias', async () => {
      const codex = createStubAdapter('codex', ['cx'])
      stubRegistry(codex)

      const { resolveAgentAdapter } = await import('../../src/commands/agent-dispatch')
      const adapter = await resolveAgentAdapter({ codeType: 'cx' })
      expect(adapter).toBe(codex)
    })

    it('falls back to the configured code tool type', async () => {
      const codex = createStubAdapter('codex')
      stubRegistry(codex)
      vi.mocked(readZcfConfigAsync).mockResolvedValue({ codeToolType: 'codex' } as any)

      const { resolveAgentAdapter } = await import('../../src/commands/agent-dispatch')
      const adapter = await resolveAgentAdapter({})
      expect(adapter).toBe(codex)
    })

    it('falls back to the default code tool type when nothing is specified', async () => {
      const claude = createStubAdapter(DEFAULT_CODE_TOOL_TYPE)
      stubRegistry(claude)

      const { resolveAgentAdapter } = await import('../../src/commands/agent-dispatch')
      const adapter = await resolveAgentAdapter({})
      expect(adapter).toBe(claude)
    })

    it('prefers --agent over --code-type when both are provided', async () => {
      const opencode = createStubAdapter('opencode')
      stubRegistry(opencode)

      const { resolveAgentAdapter } = await import('../../src/commands/agent-dispatch')
      const adapter = await resolveAgentAdapter({ agent: 'opencode', codeType: 'codex' })
      expect(adapter).toBe(opencode)
    })
  })

  describe('dispatchInstall', () => {
    it('delegates install to the resolved adapter via runInstall', async () => {
      const codex = createStubAdapter('codex')
      stubRegistry(codex)

      const { dispatchInstall } = await import('../../src/commands/agent-dispatch')
      await dispatchInstall({ agent: 'codex', skipPrompt: true })

      expect(runInstall).toHaveBeenCalledWith(
        codex,
        expect.objectContaining({ agent: 'codex', skipPrompt: true }),
        expect.objectContaining({ lang: expect.any(String), skipPrompt: true }),
      )
    })
  })

  describe('dispatchUpdate', () => {
    it('delegates update to the resolved adapter', async () => {
      const codex = createStubAdapter('codex')
      stubRegistry(codex)

      const { dispatchUpdate } = await import('../../src/commands/agent-dispatch')
      await dispatchUpdate({ agent: 'codex', skipPrompt: true })

      expect(codex.update).toHaveBeenCalledWith(
        expect.objectContaining({ agent: 'codex', skipPrompt: true }),
        expect.objectContaining({ lang: expect.any(String), skipPrompt: true }),
      )
    })
  })

  describe('dispatchUninstall', () => {
    it('delegates uninstall to the resolved adapter', async () => {
      const codex = createStubAdapter('codex')
      stubRegistry(codex)

      const { dispatchUninstall } = await import('../../src/commands/agent-dispatch')
      await dispatchUninstall({ agent: 'codex', mode: 'complete' })

      expect(codex.uninstall).toHaveBeenCalledWith(
        expect.objectContaining({ agent: 'codex', mode: 'complete' }),
        expect.objectContaining({ lang: expect.any(String) }),
      )
    })
  })

  describe('dispatchConfigSwitch', () => {
    it('lists configurations using the adapter', async () => {
      const codex = createStubAdapter('codex')
      codex.listConfigurations = vi.fn().mockResolvedValue([
        { id: 'openai', name: 'OpenAI', isActive: true },
        { id: 'anthropic', name: 'Anthropic' },
      ])
      stubRegistry(codex)
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { dispatchConfigSwitch } = await import('../../src/commands/agent-dispatch')
      await dispatchConfigSwitch(undefined, { agent: 'codex', list: true })

      expect(codex.listConfigurations).toHaveBeenCalled()
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('multi-config:availableConfigurations'))
      logSpy.mockRestore()
    })

    it('switches configuration using the adapter', async () => {
      const codex = createStubAdapter('codex')
      codex.switchConfiguration = vi.fn().mockResolvedValue(undefined)
      stubRegistry(codex)

      const { dispatchConfigSwitch } = await import('../../src/commands/agent-dispatch')
      await dispatchConfigSwitch('openai', { agent: 'codex' })

      expect(codex.switchConfiguration).toHaveBeenCalledWith('openai', expect.any(Object))
    })

    it('prompts interactively when no target is provided', async () => {
      const codex = createStubAdapter('codex')
      codex.listConfigurations = vi.fn().mockResolvedValue([
        { id: 'openai', name: 'OpenAI' },
      ])
      codex.switchConfiguration = vi.fn().mockResolvedValue(undefined)
      stubRegistry(codex)
      vi.mocked(inquirer.default.prompt).mockResolvedValue({ selectedConfig: 'openai' })

      const { dispatchConfigSwitch } = await import('../../src/commands/agent-dispatch')
      await dispatchConfigSwitch(undefined, { agent: 'codex' })

      expect(inquirer.default.prompt).toHaveBeenCalled()
      expect(codex.switchConfiguration).toHaveBeenCalledWith('openai', expect.any(Object))
    })
  })

  describe('dispatchCheckUpdates', () => {
    it('reports update availability using the adapter', async () => {
      const codex = createStubAdapter('codex')
      codex.checkUpdates = vi.fn().mockResolvedValue({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      })
      stubRegistry(codex)
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { dispatchCheckUpdates } = await import('../../src/commands/agent-dispatch')
      await dispatchCheckUpdates({ agent: 'codex' })

      expect(codex.checkUpdates).toHaveBeenCalled()
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('updater:updateAvailable'))
      logSpy.mockRestore()
    })

    it('reports no update available when adapter returns hasUpdate false', async () => {
      const codex = createStubAdapter('codex')
      codex.checkUpdates = vi.fn().mockResolvedValue({ hasUpdate: false })
      stubRegistry(codex)
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { dispatchCheckUpdates } = await import('../../src/commands/agent-dispatch')
      await dispatchCheckUpdates({ agent: 'codex' })

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('updater:noUpdateAvailable'))
      logSpy.mockRestore()
    })
  })
})
