import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCodexProviderProfile, serializeCodexProvider } from '../../../src/code-tools/codex/providers'
import { updateCodexApiFields, upsertCodexProvider } from '../../../src/utils/code-tools/codex-toml-updater'
import { parseToml } from '../../../src/utils/toml-edit'

const storage = vi.hoisted(() => ({ content: '' }))
vi.mock('../../../src/utils/fs-operations', () => ({
  exists: () => true,
  ensureDir: vi.fn(),
  readFile: () => storage.content,
  writeFile: (_path: string, content: string) => { storage.content = content },
}))

beforeEach(() => {
  storage.content = '[mcp_servers.saved]\ncommand = "saved-command"\n'
})

describe.each([
  ['minimax', 'https://api.minimax.io/v1'],
  ['minimax-cn', 'https://api.minimax.cn/v1'],
])('%s Codex configuration output', (provider, baseUrl) => {
  it.each([undefined, 'MiniMax-M3', 'MiniMax-M2.7', 'saved-custom-model'])('writes model %s without changing unrelated settings', (primaryModel) => {
    const config = serializeCodexProvider(createCodexProviderProfile({
      name: provider,
      provider,
      primaryModel,
      url: primaryModel ? 'https://saved.example.test/v1' : undefined,
    }))
    upsertCodexProvider(config.id, config)
    updateCodexApiFields({ model: config.model, modelProvider: config.id })
    expect(parseToml(storage.content)).toMatchObject({
      model: primaryModel || 'MiniMax-M3.1-Flash',
      model_provider: provider,
      model_providers: {
        [provider]: {
          model: primaryModel || 'MiniMax-M3.1-Flash',
          base_url: primaryModel ? 'https://saved.example.test/v1' : baseUrl,
          wire_api: 'responses',
        },
      },
      mcp_servers: { saved: { command: 'saved-command' } },
    })
  })
})
