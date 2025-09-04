import type { MockedFunction } from 'vitest'
import type { SupportedLang } from '../../src/constants'
import process from 'node:process'
import { vi } from 'vitest'

/**
 * 创建标准的inquirer prompt mock
 */
export function createPromptMock(): MockedFunction<any> {
  return vi.fn()
}

/**
 * 创建文件系统mock
 */
export function createFsMock(options: {
  existingFiles?: string[]
  existingDirs?: string[]
} = {}): {
  existsSync: MockedFunction<any>
  mkdirSync: MockedFunction<any>
  writeFileSync: MockedFunction<any>
  readFileSync: MockedFunction<any>
  copyFileSync: MockedFunction<any>
  unlinkSync: MockedFunction<any>
  rmSync: MockedFunction<any>
  readdirSync: MockedFunction<any>
} {
  const { existingFiles = [], existingDirs = [] } = options

  return {
    existsSync: vi.fn((path: string) => {
      return existingFiles.includes(path) || existingDirs.includes(path)
    }),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    copyFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    rmSync: vi.fn(),
    readdirSync: vi.fn(),
  }
}

/**
 * 创建标准的命令执行环境
 */
export function createTestEnvironment(): { cleanup: () => void } {
  const originalArgv = process.argv
  const originalExit = process.exit

  const cleanup = (): void => {
    process.argv = originalArgv
    process.exit = originalExit
    vi.clearAllMocks()
    vi.restoreAllMocks()
  }

  // Mock console
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})

  // Mock process.exit
  vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

  return { cleanup }
}

/**
 * 模拟完整的用户交互流程
 */
export class InteractionSimulator {
  private responses: any[] = []
  private currentIndex = 0

  addResponse(response: any): InteractionSimulator {
    this.responses.push(response)
    return this
  }

  addResponses(...responses: any[]): InteractionSimulator {
    this.responses.push(...responses)
    return this
  }

  getMock(): MockedFunction<any> {
    return vi.fn().mockImplementation(() => {
      if (this.currentIndex >= this.responses.length) {
        throw new Error('No more responses configured')
      }
      const response = this.responses[this.currentIndex]
      this.currentIndex++
      return Promise.resolve(response)
    })
  }

  reset(): void {
    this.currentIndex = 0
    this.responses = []
  }
}

/**
 * 创建API配置mock数据
 */
export function createApiConfig(overrides = {}): { url: string, key: string, authType: 'api_key' | 'auth_token' } {
  return {
    url: 'https://api.test.com',
    key: 'test-api-key',
    authType: 'api_key' as const,
    ...overrides,
  }
}

/**
 * 创建MCP配置mock数据
 */
export function createMcpConfig(servers = {}): { mcpServers: Record<string, any>, completedOnboarding: boolean } {
  return {
    mcpServers: {
      ...servers,
    },
    completedOnboarding: false,
  }
}

/**
 * 运行CLI命令
 */
export async function runCliCommand(args: string[]): Promise<void> {
  process.argv = ['node', 'zcf', ...args]

  // Clear module cache to force re-import
  const cliPath = require.resolve('../../src/cli')
  delete require.cache[cliPath]

  // Re-import to trigger execution
  await import('../../src/cli')
}

/**
 * 断言函数被调用并返回期望值
 */
export function expectCalledWith<T extends (...args: any[]) => any>(
  fn: MockedFunction<T>,
  args: Parameters<T>,
  returnValue?: ReturnType<T>,
): void {
  expect(fn).toHaveBeenCalledWith(...args)
  if (returnValue !== undefined) {
    expect(fn).toHaveReturnedWith(returnValue)
  }
}

/**
 * 创建测试场景
 */
export interface TestScenario {
  name: string
  setup: () => void
  execute: () => Promise<void>
  verify: () => void
}

export class ScenarioRunner {
  private scenarios: TestScenario[] = []

  add(scenario: TestScenario): ScenarioRunner {
    this.scenarios.push(scenario)
    return this
  }

  async runAll(): Promise<void> {
    for (const scenario of this.scenarios) {
      console.log(`Running scenario: ${scenario.name}`)
      scenario.setup()
      await scenario.execute()
      scenario.verify()
    }
  }
}

/**
 * Mock工厂 - 确保一致性
 */
export class MockFactory {
  static createInstallerMocks(): {
    checkClaudeInstalled: MockedFunction<any>
    installClaudeCode: MockedFunction<any>
    isClaudeCodeInstalled: MockedFunction<any>
  } {
    return {
      checkClaudeInstalled: vi.fn(),
      installClaudeCode: vi.fn(),
      isClaudeCodeInstalled: vi.fn(),
    }
  }

  static createConfigMocks(): {
    checkExistingConfig: MockedFunction<any>
    backupExistingConfig: MockedFunction<any>
    copyConfigFiles: MockedFunction<any>
    configureApi: MockedFunction<any>
    applyAiLanguageDirective: MockedFunction<any>
    getExistingApiConfig: MockedFunction<any>
    ensureClaudeDir: MockedFunction<any>
    updateApiConfigValue: MockedFunction<any>
  } {
    return {
      checkExistingConfig: vi.fn(),
      backupExistingConfig: vi.fn(),
      copyConfigFiles: vi.fn(),
      configureApi: vi.fn(),
      applyAiLanguageDirective: vi.fn(),
      getExistingApiConfig: vi.fn(),
      ensureClaudeDir: vi.fn(),
      updateApiConfigValue: vi.fn(),
    }
  }

  static createPromptMocks(): {
    selectScriptLanguage: MockedFunction<any>
    selectAiOutputLanguage: MockedFunction<any>
    resolveAiOutputLanguage: MockedFunction<any>
  } {
    return {
      selectScriptLanguage: vi.fn(),
      selectAiOutputLanguage: vi.fn(),
      resolveAiOutputLanguage: vi.fn(),
    }
  }

  static createMcpMocks(): {
    configureMcpServers: MockedFunction<any>
    addCompletedOnboarding: MockedFunction<any>
    backupMcpConfig: MockedFunction<any>
    buildMcpServerConfig: MockedFunction<any>
    fixWindowsMcpConfig: MockedFunction<any>
    mergeMcpServers: MockedFunction<any>
    readMcpConfig: MockedFunction<any>
    writeMcpConfig: MockedFunction<any>
  } {
    return {
      configureMcpServers: vi.fn(),
      addCompletedOnboarding: vi.fn(),
      backupMcpConfig: vi.fn(),
      buildMcpServerConfig: vi.fn(),
      fixWindowsMcpConfig: vi.fn(),
      mergeMcpServers: vi.fn(),
      readMcpConfig: vi.fn(),
      writeMcpConfig: vi.fn(),
    }
  }
}

/**
 * 测试数据生成器
 */
export class TestDataGenerator {
  static languages: SupportedLang[] = ['zh-CN', 'en']

  static getRandomLanguage(): SupportedLang {
    return this.languages[Math.floor(Math.random() * this.languages.length)]
  }

  static generateApiKey(prefix = 'key'): string {
    return `${prefix}-${Math.random().toString(36).substring(7)}`
  }

  static generateUrl(domain = 'api.test.com'): string {
    return `https://${domain}/v1/api`
  }
}
