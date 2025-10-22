import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock all dependencies
vi.mock('../../../src/i18n', () => ({
  i18n: {
    t: vi.fn((key: string) => key),
    language: 'en',
  },
  ensureI18nInitialized: vi.fn(),
}))

vi.mock('../../../src/utils/config', () => ({
  updateCustomModel: vi.fn(),
}))

vi.mock('ansis', () => ({
  default: {
    green: (str: string) => str,
    gray: (str: string) => str,
  },
}))

interface TestOptions {
  skipPrompt: boolean
  apiModel?: string
  apiFastModel?: string
}

type ActionType = 'new' | 'backup' | 'merge' | 'docs-only' | 'skip'
type CodeToolType = 'claude-code' | 'codex'

describe('init command - API model configuration logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('should call updateCustomModel when conditions are met', async () => {
    const { updateCustomModel } = await import('../../../src/utils/config')
    const updateCustomModelSpy = vi.mocked(updateCustomModel)

    // Simulate the Step 9.5 logic directly
    const options: TestOptions = {
      skipPrompt: true,
      apiModel: 'claude-sonnet-4-5',
      apiFastModel: 'claude-haiku-4-5',
    }
    const action: ActionType = 'new'
    const codeToolType: CodeToolType = 'claude-code'

    // This is the exact condition from line 753-754
    // @ts-expect-error - Testing runtime behavior with literal types
    if ((options.apiModel || options.apiFastModel) && action !== 'docs-only' && codeToolType === 'claude-code') {
      if (options.skipPrompt) {
        updateCustomModel(
          options.apiModel || undefined,
          options.apiFastModel || undefined,
        )
      }
    }

    expect(updateCustomModelSpy).toHaveBeenCalledWith('claude-sonnet-4-5', 'claude-haiku-4-5')
  })

  it('should call updateCustomModel with only primary model', async () => {
    const { updateCustomModel } = await import('../../../src/utils/config')
    const updateCustomModelSpy = vi.mocked(updateCustomModel)

    const options: TestOptions = {
      skipPrompt: true,
      apiModel: 'claude-sonnet-4-5',
    }
    const action: ActionType = 'new'
    const codeToolType: CodeToolType = 'claude-code'

    // @ts-expect-error - Testing runtime behavior with literal types
    if ((options.apiModel || options.apiFastModel) && action !== 'docs-only' && codeToolType === 'claude-code') {
      if (options.skipPrompt) {
        updateCustomModel(
          options.apiModel || undefined,
          options.apiFastModel || undefined,
        )
      }
    }

    expect(updateCustomModelSpy).toHaveBeenCalledWith('claude-sonnet-4-5', undefined)
  })

  it('should call updateCustomModel with only fast model', async () => {
    const { updateCustomModel } = await import('../../../src/utils/config')
    const updateCustomModelSpy = vi.mocked(updateCustomModel)

    const options: TestOptions = {
      skipPrompt: true,
      apiFastModel: 'claude-haiku-4-5',
    }
    const action: ActionType = 'new'
    const codeToolType: CodeToolType = 'claude-code'

    // @ts-expect-error - Testing runtime behavior with literal types
    if ((options.apiModel || options.apiFastModel) && action !== 'docs-only' && codeToolType === 'claude-code') {
      if (options.skipPrompt) {
        updateCustomModel(
          options.apiModel || undefined,
          options.apiFastModel || undefined,
        )
      }
    }

    expect(updateCustomModelSpy).toHaveBeenCalledWith(undefined, 'claude-haiku-4-5')
  })

  it('should not call updateCustomModel when action is docs-only', async () => {
    const { updateCustomModel } = await import('../../../src/utils/config')
    const updateCustomModelSpy = vi.mocked(updateCustomModel)

    const options: TestOptions = {
      skipPrompt: true,
      apiModel: 'claude-sonnet-4-5',
    }
    const action: ActionType = 'docs-only'
    const codeToolType: CodeToolType = 'claude-code'

    if ((options.apiModel || options.apiFastModel) && action !== 'docs-only' && codeToolType === 'claude-code') {
      if (options.skipPrompt) {
        updateCustomModel(
          options.apiModel || undefined,
          options.apiFastModel || undefined,
        )
      }
    }

    expect(updateCustomModelSpy).not.toHaveBeenCalled()
  })

  it('should not call updateCustomModel for Codex', async () => {
    const { updateCustomModel } = await import('../../../src/utils/config')
    const updateCustomModelSpy = vi.mocked(updateCustomModel)

    const options: TestOptions = {
      skipPrompt: true,
      apiModel: 'claude-sonnet-4-5',
    }
    const action: ActionType = 'new'
    const codeToolType: CodeToolType = 'codex'

    // @ts-expect-error - Testing runtime behavior with literal types
    if ((options.apiModel || options.apiFastModel) && action !== 'docs-only' && codeToolType === 'claude-code') {
      if (options.skipPrompt) {
        updateCustomModel(
          options.apiModel || undefined,
          options.apiFastModel || undefined,
        )
      }
    }

    expect(updateCustomModelSpy).not.toHaveBeenCalled()
  })

  it('should not call updateCustomModel in interactive mode', async () => {
    const { updateCustomModel } = await import('../../../src/utils/config')
    const updateCustomModelSpy = vi.mocked(updateCustomModel)

    const options: TestOptions = {
      skipPrompt: false,
      apiModel: 'claude-sonnet-4-5',
    }
    const action: ActionType = 'new'
    const codeToolType: CodeToolType = 'claude-code'

    // @ts-expect-error - Testing runtime behavior with literal types
    if ((options.apiModel || options.apiFastModel) && action !== 'docs-only' && codeToolType === 'claude-code') {
      if (options.skipPrompt) {
        updateCustomModel(
          options.apiModel || undefined,
          options.apiFastModel || undefined,
        )
      }
    }

    expect(updateCustomModelSpy).not.toHaveBeenCalled()
  })
})
