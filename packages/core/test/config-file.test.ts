import { writeFile } from 'node:fs/promises'

import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import { defaultConfigPath, loadConfigFile } from '../src/config-file'
import { tempDir } from './helpers'

describe('loadConfigFile', () => {
  it('lives under ~/.ufomiao/zcf by default', () => {
    expect(defaultConfigPath('/home/me')).toBe('/home/me/.ufomiao/zcf/zcf.json')
  })

  it('reports a missing file', async () => {
    expect(await loadConfigFile(join(await tempDir(), 'zcf.json'))).toEqual({
      success: false,
      missing: true,
      issues: [],
    })
  })

  it('accepts comments and trailing commas', async () => {
    const path = join(await tempDir(), 'zcf.json')
    await writeFile(path, '{\n  // my tools\n  "version": 1,\n  "tools": ["claude-code",],\n}\n')
    expect(await loadConfigFile(path)).toMatchObject({
      success: true,
      config: {
        tools: ['claude-code'],
      },
    })
  })

  it('reports JSON syntax errors and schema problems', async () => {
    const dir = await tempDir()
    await writeFile(join(dir, 'broken.json'), '{\n  "version": ')
    await writeFile(join(dir, 'invalid.json'), '{ "version": 9 }')
    expect(await loadConfigFile(join(dir, 'broken.json'))).toEqual({
      success: false,
      issues: [{ path: 'line 2, column 14', message: 'ValueExpected' }],
    })
    expect(await loadConfigFile(join(dir, 'invalid.json'))).toMatchObject({
      success: false,
      issues: [{ path: 'version' }],
    })
  })
})
