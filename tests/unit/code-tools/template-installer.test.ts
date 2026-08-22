import type { CodeToolDefinition } from '../../../src/code-tools'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installMissingCommonTemplates } from '../../../src/code-tools/template-installer'
import { copyFile } from '../../../src/utils/fs-operations'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))
vi.mock('node:url', () => ({
  fileURLToPath: vi.fn(),
}))
vi.mock('../../../src/utils/fs-operations', () => ({
  copyFile: vi.fn(),
}))

const definition = {
  id: 'example-cli',
  displayName: 'Example CLI',
  displayNameKey: 'common:example',
  aliases: [],
  paths: {
    homeDir: '/home/test/.example',
    templateDir: 'templates/example',
    memoryFile: '/home/test/.example/EXAMPLE.md',
    configFiles: [{
      id: 'settings',
      path: '/home/test/.example/settings.json',
      format: 'json',
      mergeStrategy: 'merge',
    }],
  },
  skillsAgents: ['example-cli'],
  installation: {
    command: 'example',
    npmPackage: '@example/cli',
    supportedMethods: ['npm'],
    recommendedMethods: { macos: ['npm'], linux: ['npm'], windows: ['npm'] },
  },
} as unknown as CodeToolDefinition

describe('installMissingCommonTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fileURLToPath).mockReturnValue('/project/dist/code-tools/template-installer.mjs')
  })

  it('copies missing config and memory templates from adapter metadata', () => {
    vi.mocked(existsSync).mockImplementation(path =>
      String(path).startsWith('/project/templates/'),
    )

    expect(installMissingCommonTemplates(definition)).toEqual([
      '/home/test/.example/settings.json',
      '/home/test/.example/EXAMPLE.md',
    ])
    expect(copyFile).toHaveBeenCalledWith(
      '/project/templates/example/common/settings.json',
      '/home/test/.example/settings.json',
    )
    expect(copyFile).toHaveBeenCalledWith(
      '/project/templates/example/EXAMPLE.md',
      '/home/test/.example/EXAMPLE.md',
    )
  })

  it('does not overwrite existing user files', () => {
    vi.mocked(existsSync).mockReturnValue(true)

    expect(installMissingCommonTemplates(definition)).toEqual([])
    expect(copyFile).not.toHaveBeenCalled()
  })
})
