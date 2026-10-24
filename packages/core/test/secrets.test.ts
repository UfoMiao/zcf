import { describe, expect, it } from 'vitest'

import { sensitiveValues } from '../src/io/secrets'

describe('sensitiveValues', () => {
  it('collects string values under credential-like keys at any depth', () => {
    const data = {
      env: { ANTHROPIC_AUTH_TOKEN: 'tok-1', ANTHROPIC_API_KEY: 'key-1', ANTHROPIC_BASE_URL: 'https://example.com' },
      mcpServers: { a: { headers: { Authorization: 'Bearer abc' }, env: { DB_PASSWORD: 'pw', CLIENT_SECRET: 's' } } },
      list: [{ private_key: 'pk' }],
      theme: 'dark',
      apiKeyCount: 3,
    }
    expect(sensitiveValues(data).toSorted()).toEqual(['Bearer abc', 'key-1', 'pk', 'pw', 's', 'tok-1'])
  })

  it('ignores non-objects', () => {
    expect(sensitiveValues(undefined)).toEqual([])
    expect(sensitiveValues('token')).toEqual([])
  })
})
