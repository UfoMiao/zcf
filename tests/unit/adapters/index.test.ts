import { beforeEach, describe, expect, it, vi } from 'vitest'

const registered: Array<{ id: string }> = []
const agentIds: string[] = []

vi.mock('../../../src/adapters/registry', () => ({
  registerAgent: vi.fn((adapter: { id: string }) => {
    if (agentIds.includes(adapter.id)) {
      throw new Error(`Adapter ${adapter.id} already registered`)
    }
    registered.push(adapter)
    agentIds.push(adapter.id)
  }),
  listAgentIds: vi.fn(() => [...agentIds]),
}))

vi.mock('../../../src/adapters/claude-code', () => ({
  claudeCodeAdapter: { id: 'claude-code' },
}))

vi.mock('../../../src/adapters/codex', () => ({
  codexAdapter: { id: 'codex' },
}))

vi.mock('../../../src/adapters/opencode', () => ({
  opencodeAdapter: { id: 'opencode' },
}))

describe('adapters/index', () => {
  beforeEach(() => {
    registered.length = 0
    agentIds.length = 0
  })

  it('registers all built-in adapters when none are present', async () => {
    const { registerAllAgents } = await import('../../../src/adapters/index')
    registerAllAgents()

    expect(registered.map(a => a.id)).toEqual(expect.arrayContaining(['claude-code', 'codex', 'opencode']))
  })

  it('registers missing adapters individually instead of skipping the whole group', async () => {
    const { registerAllAgents } = await import('../../../src/adapters/index')
    agentIds.push('claude-code')

    registerAllAgents()

    expect(registered.map(a => a.id)).toEqual(['codex', 'opencode'])
  })

  it('is idempotent when all adapters are already registered', async () => {
    const { registerAllAgents } = await import('../../../src/adapters/index')
    agentIds.push('claude-code', 'codex', 'opencode')

    registerAllAgents()

    expect(registered).toEqual([])
  })
})
