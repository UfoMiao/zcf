import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runInstall } from '../../../src/core/install-runner'

const renderCommon = vi.fn().mockResolvedValue([])

vi.mock('../../../src/core/template-engine', () => ({
  TemplateEngine: vi.fn().mockImplementation(() => ({
    renderCommon,
  })),
}))

describe('runInstall', () => {
  beforeEach(() => {
    renderCommon.mockClear()
  })

  function createStubAdapter(): any {
    return {
      id: 'claude-code',
      install: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
      uninstall: vi.fn(),
    }
  }

  function createCtx(): any {
    return { lang: 'en' }
  }

  it('delegates to adapter.install and then renders common templates', async () => {
    const { TemplateEngine } = await import('../../../src/core/template-engine')
    const adapter = createStubAdapter()
    const ctx = createCtx()

    await runInstall(adapter, {}, ctx)

    expect(adapter.install).toHaveBeenCalledWith({}, ctx)
    expect(TemplateEngine).toHaveBeenCalledWith({ force: undefined })
    expect(renderCommon).toHaveBeenCalledWith('templates/common', adapter)
  })

  it('passes force option to the template engine', async () => {
    const { TemplateEngine } = await import('../../../src/core/template-engine')
    const adapter = createStubAdapter()
    const ctx = createCtx()

    await runInstall(adapter, { force: true }, ctx)

    expect(TemplateEngine).toHaveBeenCalledWith({ force: true })
  })

  it('uses a custom common directory when provided', async () => {
    const adapter = createStubAdapter()
    const ctx = createCtx()

    await runInstall(adapter, { commonDir: '/custom/common' }, ctx)

    expect(renderCommon).toHaveBeenCalledWith('/custom/common', adapter)
  })

  it('skips common templates when commonDir is false', async () => {
    const adapter = createStubAdapter()
    const ctx = createCtx()

    await runInstall(adapter, { commonDir: false }, ctx)

    expect(adapter.install).toHaveBeenCalled()
    expect(renderCommon).not.toHaveBeenCalled()
  })
})
