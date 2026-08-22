import { homedir } from 'node:os'
import { isAbsolute, relative, resolve } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { CODE_TOOL_DEFINITIONS } from '../../src/code-tools/definitions'
import {
  ClAUDE_CONFIG_FILE,
  CLAUDE_DIR,
  CODEX_DIR,
  ZCF_CONFIG_DIR,
} from '../../src/constants'

function expectPathInside(parent: string, child: string): void {
  const relativePath = relative(resolve(parent), resolve(child))
  expect(relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))).toBe(true)
}

describe('test environment isolation', () => {
  it('uses a temporary virtual home instead of the real user home', () => {
    expect(process.env.ZCF_TEST_HOME).toBeTruthy()
    expect(process.env.ZCF_TEST_REAL_HOME).toBeTruthy()
    expect(process.env.ZCF_TEST_RUN_HOME).toBeTruthy()
    expect(process.env.HOME).toBe(process.env.ZCF_TEST_HOME)
    expect(process.env.USERPROFILE).toBe(process.env.ZCF_TEST_HOME)
    expect(homedir()).toBe(process.env.ZCF_TEST_HOME)
    expect(process.env.ZCF_TEST_HOME).not.toBe(process.env.ZCF_TEST_REAL_HOME)
    expect(process.env.ZCF_TEST_HOME).not.toBe(process.env.ZCF_TEST_RUN_HOME)
    expect(process.env.ZCF_TEST_RUN_HOME).not.toBe(process.env.ZCF_TEST_REAL_HOME)
  })

  it('keeps all code-tool configuration roots inside the virtual home', () => {
    const testHome = process.env.ZCF_TEST_HOME!
    const paths = [
      CLAUDE_DIR,
      ClAUDE_CONFIG_FILE,
      CODEX_DIR,
      ZCF_CONFIG_DIR,
      process.env.CODEX_HOME!,
      process.env.CLAUDE_CONFIG_DIR!,
      ...CODE_TOOL_DEFINITIONS.flatMap(definition => [
        definition.paths.homeDir,
        definition.paths.memoryFile,
        definition.paths.skillsDir,
        ...definition.paths.configFiles.map(file => file.path),
      ].filter((path): path is string => Boolean(path))),
    ]

    for (const path of paths)
      expectPathInside(testHome, path)
  })

  it('redirects package-manager and cache writes into the virtual home', () => {
    const testHome = process.env.ZCF_TEST_HOME!
    const paths = [
      process.env.npm_config_cache,
      process.env.NPM_CONFIG_CACHE,
      process.env.npm_config_prefix,
      process.env.NPM_CONFIG_PREFIX,
      process.env.npm_config_userconfig,
      process.env.NPM_CONFIG_USERCONFIG,
      process.env.HOMEBREW_CACHE,
      process.env.HOMEBREW_TEMP,
      process.env.XDG_CACHE_HOME,
      process.env.XDG_CONFIG_HOME,
    ]

    for (const path of paths) {
      expect(path).toBeTruthy()
      expectPathInside(testHome, path!)
    }
  })
})
