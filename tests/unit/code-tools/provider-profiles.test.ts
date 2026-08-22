import { describe, expect, it } from 'vitest'
import {
  createClaudeCodeProviderProfile,
  serializeClaudeCodeProviderProfile,
} from '../../../src/code-tools/claude-code/legacy-init'
import {
  createCodexProviderProfile,
  serializeCodexProvider,
} from '../../../src/code-tools/codex/providers'

describe('provider profile serialization boundaries', () => {
  it('normalizes and serializes Claude Code provider data', async () => {
    const profile = await createClaudeCodeProviderProfile({
      name: 'Internal Claude',
      provider: 'custom',
      type: 'auth_token',
      key: 'secret',
      url: 'https://example.test/anthropic',
      primaryModel: 'primary',
      defaultHaikuModel: 'small',
      defaultSonnetModel: 'medium',
      defaultOpusModel: 'large',
    })

    expect(profile).toEqual({
      id: 'internal-claude',
      name: 'Internal Claude',
      provider: 'custom',
      baseUrl: 'https://example.test/anthropic',
      auth: {
        type: 'auth_token',
        credential: 'secret',
        envKey: 'ANTHROPIC_AUTH_TOKEN',
      },
      models: {
        primary: 'primary',
        small: 'small',
        medium: 'medium',
        large: 'large',
      },
      default: undefined,
    })
    expect(serializeClaudeCodeProviderProfile(profile, 'stored-id')).toMatchObject({
      id: 'stored-id',
      authType: 'auth_token',
      apiKey: 'secret',
      defaultHaikuModel: 'small',
      defaultSonnetModel: 'medium',
      defaultOpusModel: 'large',
    })
  })

  it('preserves the Claude Code CCR proxy auth type', async () => {
    const profile = await createClaudeCodeProviderProfile({
      name: 'CCR',
      type: 'ccr_proxy',
    })

    expect(profile.auth).toEqual({
      type: 'ccr_proxy',
      credential: undefined,
      envKey: undefined,
    })
    expect(serializeClaudeCodeProviderProfile(profile).authType).toBe('ccr_proxy')
  })

  it('normalizes and serializes Codex provider data', () => {
    const profile = createCodexProviderProfile({
      name: 'Internal Codex',
      provider: 'custom',
      type: 'api_key',
      key: 'secret',
      url: 'https://example.test/openai',
      primaryModel: 'gpt-test',
    })

    expect(profile).toMatchObject({
      id: 'internal-codex',
      baseUrl: 'https://example.test/openai',
      auth: {
        type: 'api_key',
        credential: 'secret',
        envKey: 'INTERNAL_CODEX_API_KEY',
      },
      models: { primary: 'gpt-test' },
      protocol: 'responses',
    })
    expect(serializeCodexProvider(profile)).toMatchObject({
      id: 'internal-codex',
      baseUrl: 'https://example.test/openai',
      tempEnvKey: 'INTERNAL_CODEX_API_KEY',
      model: 'gpt-test',
      wireApi: 'responses',
    })
  })
})
