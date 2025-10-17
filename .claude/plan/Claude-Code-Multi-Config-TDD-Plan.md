# Claude Code多配置管理TDD实施计划

## 项目概述

**目标**：为Claude Code添加完整的多配置管理功能，支持配置的增删改查，并扩展config-switch命令统一管理Claude Code和Codex配置。

**技术方案**：采用方案2 - JSON配置参数，保留现有单配置参数的向后兼容性。

## 需求分析

### 当前状态
- ✅ Codex已有完整多配置系统（codex-provider-manager.ts）
- ❌ Claude Code只支持单配置，无法管理多个API配置
- ❌ config-switch命令只支持Codex，不支持Claude Code

### 目标功能
1. **Claude Code多配置管理**：支持添加、删除、更新、切换配置
2. **统一config-switch命令**：同时管理Claude Code和Codex配置
3. **无交互模式支持**：完整的命令行参数支持
4. **向后兼容**：现有单配置方式完全保留

## 实施方案

### 参数设计

```typescript
export interface InitOptions {
  // === 现有参数完全保留 ===
  apiType?: 'auth_token' | 'api_key' | 'ccr_proxy' | 'skip'
  apiKey?: string
  apiUrl?: string
  // ... 其他现有参数

  // === 新增多配置参数 ===
  apiConfigs?: string                    // JSON字符串，定义多个API配置
  apiConfigsFile?: string                // 从文件读取API配置JSON
}

export interface ConfigSwitchOptions {
  codeType?: CodeToolType  // --code-type, -T
  list?: boolean          // --list
  target?: string         // 位置参数：profile名称或provider名称
}
```

### JSON配置格式

```typescript
interface ApiConfigDefinition {
  name: string                           // 配置名称（必需）
  type: 'api_key' | 'auth_token' | 'ccr_proxy'  // 认证类型（必需）
  key?: string                          // API密钥（api_key和auth_token必需）
  url?: string                          // 自定义URL（可选）
  description?: string                  // 配置描述（可选）
  default?: boolean                     // 是否设为默认配置（可选）
}
```

### 配置存储结构

```toml
# ZCF配置 (~/.ufomiao/zcf/config.toml)
[claude_code]
current_profile = "default"

[claude_code.profiles.default]
name = "Default"
auth_type = "api_key"
api_key = "sk-ant-xxx"
base_url = "https://api.anthropic.com"
description = "默认配置"
created_at = "2025-01-XX"
updated_at = "2025-01-XX"

[claude_code.profiles.ccr]
name = "CCR Proxy"
auth_type = "ccr_proxy"
description = "CCR代理配置（动态读取）"
created_at = "2025-01-XX"
updated_at = "2025-01-XX"
```

## TDD实施阶段

### 阶段1：核心数据结构和工具类

#### 1.1 类型定义
**文件**：`src/types/claude-code-config.ts`

```typescript
export interface ClaudeCodeProfile {
  id: string                           // 配置唯一标识
  name: string                         // 显示名称
  authType: 'api_key' | 'auth_token' | 'ccr_proxy'
  apiKey?: string                      // API密钥（明文存储）
  baseUrl?: string                     // 自定义API URL
  description?: string                 // 配置描述
  createdAt?: string                   // 创建时间
  updatedAt?: string                   // 更新时间
}

export interface ClaudeCodeConfigData {
  currentProfileId: string             // 当前激活的配置ID
  profiles: Record<string, ClaudeCodeProfile>  // 配置集合
  version: string                      // 配置版本
}

export interface ApiConfigDefinition {
  name: string
  type: 'api_key' | 'auth_token' | 'ccr_proxy'
  key?: string
  url?: string
  description?: string
  default?: boolean
}
```

#### 1.2 配置管理工具类
**文件**：`src/utils/claude-code-config-manager.ts`

```typescript
export class ClaudeCodeConfigManager {
  static readonly CONFIG_FILE = join(ZCF_CONFIG_DIR, 'claude-code-configs.json')
  static readonly CONFIG_VERSION = '1.0.0'

  // 基础操作
  static readConfig(): ClaudeCodeConfigData | null
  static writeConfig(config: ClaudeCodeConfigData): void
  static createEmptyConfig(): ClaudeCodeConfigData
  static backupConfig(): string | null

  // 配置管理
  static async addProfile(profile: ClaudeCodeProfile): Promise<OperationResult>
  static async updateProfile(id: string, data: Partial<ClaudeCodeProfile>): Promise<OperationResult>
  static async deleteProfile(id: string): Promise<OperationResult>
  static async switchProfile(id: string): Promise<OperationResult>
  static listProfiles(): ClaudeCodeProfile[]
  static getCurrentProfile(): ClaudeCodeProfile | null

  // CCR特殊处理
  static async syncCcrProfile(): Promise<void>
  static async createCcrProfile(): Promise<ClaudeCodeProfile>

  // 工具方法
  static validateProfile(profile: Partial<ClaudeCodeProfile>): string[]
  static generateProfileId(name: string): string
  static isLastProfile(id: string): boolean
}
```

#### 1.3 测试用例
**文件**：`tests/unit/utils/claude-code-config-manager.test.ts`

```typescript
describe('ClaudeCodeConfigManager', () => {
  beforeEach(() => {
    // 设置测试环境
    mockConfigDir()
  })

  describe('基础操作', () => {
    it('应该创建默认配置', () => {})
    it('应该读取现有配置', () => {})
    it('应该写入配置', () => {})
    it('应该备份配置', () => {})
  })

  describe('addProfile', () => {
    it('应该成功添加新配置', () => {})
    it('应该处理重复ID', () => {})
    it('应该验证必填字段', () => {})
    it('应该自动生成ID', () => {})
    it('应该设置时间戳', () => {})
  })

  describe('updateProfile', () => {
    it('应该更新现有配置', () => {})
    it('应该处理不存在的配置', () => {})
    it('应该保留ID和创建时间', () => {})
    it('应该更新时间戳', () => {})
  })

  describe('deleteProfile', () => {
    it('应该删除配置', () => {})
    it('应该防止删除最后一个配置', () => {})
    it('应该处理不存在的配置', () => {})
    it('应该更新当前配置ID', () => {})
  })

  describe('switchProfile', () => {
    it('应该切换到指定配置', () => {})
    it('应该处理不存在的配置', () => {})
    it('应该更新Claude Code设置', () => {})
    it('应该处理CCR配置', () => {})
  })

  describe('syncCcrProfile', () => {
    it('应该同步CCR配置', () => {})
    it('应该处理缺失的CCR配置', () => {})
    it('应该动态更新CCR参数', () => {})
  })
})
```

### 阶段2：CLI交互界面和参数处理

#### 2.1 CLI参数处理
**文件**：修改 `src/commands/init.ts`

```typescript
// 添加新的参数类型
export interface InitOptions {
  // ... 现有参数
  apiConfigs?: string
  apiConfigsFile?: string
}

// 修改验证函数
function validateSkipPromptOptions(options: InitOptions): void {
  // ... 现有验证逻辑

  // 验证新的多配置参数
  if (options.apiConfigs && options.apiConfigsFile) {
    throw new Error('Cannot specify both --api-configs and --api-configs-file')
  }
}

// 修改API配置处理函数
async function handleApiConfiguration(options: InitOptions): Promise<void> {
  // 1. 优先级：apiConfigs > apiConfigsFile > 传统单配置参数
  if (options.apiConfigs) {
    return handleJsonConfigs(options.apiConfigs, options.codeType)
  }

  if (options.apiConfigsFile) {
    return handleConfigFile(options.apiConfigsFile, options.codeType)
  }

  // 2. 传统单配置方式（向后兼容）
  return handleSingleConfig(options)
}

async function handleJsonConfigs(jsonString: string, codeType: CodeToolType): Promise<void> {
  try {
    const configs = JSON.parse(jsonString) as ApiConfigDefinition[]
    await validateApiConfigs(configs)

    if (codeType === 'claude-code') {
      await addClaudeCodeProfiles(configs)
    } else if (codeType === 'codex') {
      await addCodexProviders(configs)
    }
  } catch (error) {
    throw new Error(`Invalid API configs JSON: ${error.message}`)
  }
}
```

#### 2.2 配置处理函数
**文件**：`src/utils/api-config-processor.ts`

```typescript
export async function addClaudeCodeConfigs(configs: ApiConfigDefinition[]): Promise<void> {
  for (const config of configs) {
    const profile = await convertToClaudeCodeProfile(config)
    const result = await ClaudeCodeConfigManager.addProfile(profile)

    if (!result.success) {
      throw new Error(`Failed to add profile "${config.name}": ${result.error}`)
    }

    if (config.default) {
      await ClaudeCodeConfigManager.switchProfile(profile.id)
    }
  }

  // 特殊处理CCR配置
  await ClaudeCodeConfigManager.syncCcrProfile()
}

async function convertToClaudeCodeProfile(config: ApiConfigDefinition): Promise<ClaudeCodeProfile> {
  const profile: ClaudeCodeProfile = {
    id: ClaudeCodeConfigManager.generateProfileId(config.name),
    name: config.name,
    authType: config.type,
    description: config.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (config.type !== 'ccr_proxy' && config.key) {
    profile.apiKey = config.key
  }

  if (config.url) {
    profile.baseUrl = config.url
  }

  return profile
}

export function validateApiConfigs(configs: ApiConfigDefinition[]): void {
  if (!Array.isArray(configs)) {
    throw new Error('API configs must be an array')
  }

  const names = new Set<string>()

  for (const config of configs) {
    // 验证必需字段
    if (!config.name || typeof config.name !== 'string') {
      throw new Error('Each config must have a valid name')
    }

    if (!['api_key', 'auth_token', 'ccr_proxy'].includes(config.type)) {
      throw new Error(`Invalid auth type: ${config.type}`)
    }

    // 验证名称唯一性
    if (names.has(config.name)) {
      throw new Error(`Duplicate config name: ${config.name}`)
    }
    names.add(config.name)

    // 验证API密钥
    if (config.type !== 'ccr_proxy' && !config.key) {
      throw new Error(`Config "${config.name}" requires API key`)
    }
  }
}
```

#### 2.3 测试用例
**文件**：`tests/unit/utils/api-config-processor.test.ts`

```typescript
describe('API配置处理器', () => {
  describe('addClaudeCodeConfigs', () => {
    it('应该成功添加多个配置', () => {})
    it('应该处理默认配置设置', () => {})
    it('应该同步CCR配置', () => {})
    it('应该处理重复配置', () => {})
  })

  describe('convertToClaudeCodeProfile', () => {
    it('应该转换API key配置', () => {})
    it('应该转换auth token配置', () => {})
    it('应该转换CCR代理配置', () => {})
    it('应该设置时间戳', () => {})
  })

  describe('validateApiConfigs', () => {
    it('应该验证有效配置', () => {})
    it('应该拒绝无效配置', () => {})
    it('应该检测重复名称', () => {})
    it('应该验证必需字段', () => {})
  })
})
```

### 阶段3：config-switch命令扩展

#### 3.1 命令接口重构
**文件**：修改 `src/commands/config-switch.ts`

```typescript
export interface ConfigSwitchOptions {
  codeType?: CodeToolType  // --code-type, -T
  list?: boolean          // --list
  target?: string         // 位置参数：profile名称或provider名称
}

export async function configSwitchCommand(options: ConfigSwitchOptions): Promise<void> {
  try {
    ensureI18nInitialized()

    // 处理--list参数
    if (options.list) {
      await handleList(options.codeType)
      return
    }

    // 处理直接切换
    if (options.target) {
      await handleDirectSwitch(options.codeType, options.target)
      return
    }

    // 交互模式
    await handleInteractiveSwitch(options.codeType)
  } catch (error) {
    // 错误处理
  }
}

async function handleList(codeType?: CodeToolType): Promise<void> {
  const targetCodeType = resolveCodeType(codeType)

  if (targetCodeType === 'claude-code') {
    await listClaudeCodeProfiles()
  } else if (targetCodeType === 'codex') {
    await listCodexProviders()
  }
}

async function handleDirectSwitch(codeType?: CodeToolType, target?: string): Promise<void> {
  const targetCodeType = resolveCodeType(codeType)

  if (targetCodeType === 'claude-code') {
    // 支持特殊值：official, ccr, 或配置名称
    if (target === 'official') {
      await switchToOfficialLogin()
    } else if (target === 'ccr') {
      await switchToCcrProxy()
    } else {
      await switchClaudeCodeProfile(target)
    }
  } else if (targetCodeType === 'codex') {
    await switchCodexProvider(target)
  }
}

function resolveCodeType(codeType?: CodeToolType): CodeToolType {
  // 优先级：参数 > ZCF配置 > 默认值(cc)
  if (codeType && isCodeToolType(codeType)) {
    return codeType
  }

  const zcfConfig = readZcfConfig()
  if (zcfConfig?.currentTool && isCodeToolType(zcfConfig.currentTool)) {
    return zcfConfig.currentTool
  }

  return 'claude-code'  // 默认值
}
```

#### 3.2 Claude Code配置切换（修正版 - 与Codex界面一致）
**文件**：`src/utils/claude-code-switcher.ts`

```typescript
export async function listClaudeCodeProfiles(): Promise<void> {
  const profiles = ClaudeCodeConfigManager.listProfiles()
  const currentProfile = ClaudeCodeConfigManager.getCurrentProfile()

  console.log(ansis.cyan(i18n.t('claude-code:claudeCodeProfilesTitle')))
  console.log('')

  if (profiles.length === 0) {
    console.log(ansis.yellow(i18n.t('claude-code:noProfilesAvailable')))
    return
  }

  if (currentProfile) {
    console.log(ansis.green(`${i18n.t('claude-code:currentProfile', { name: currentProfile.name })}`))
    console.log('')
  }

  for (const profile of profiles) {
    const marker = currentProfile?.id === profile.id ? ansis.green('● ') : '  '
    console.log(`${marker}${ansis.cyan(profile.name)}`)

    if (profile.description) {
      console.log(`    ${ansis.gray(profile.description)}`)
    }

    const typeLabel = i18n.t(`claude-code:authType.${profile.authType}`)
    console.log(`    ${ansis.gray(typeLabel)}`)
  }
}

export async function switchClaudeCodeProfile(profileName: string): Promise<void> {
  const profiles = ClaudeCodeConfigManager.listProfiles()
  const targetProfile = profiles.find(p => p.name === profileName || p.id === profileName)

  if (!targetProfile) {
    console.log(ansis.red(i18n.t('claude-code:profileNotFound', { name: profileName })))
    return
  }

  const result = await ClaudeCodeConfigManager.switchProfile(targetProfile.id)

  if (result.success) {
    console.log(ansis.green(i18n.t('claude-code:profileSwitched', { name: targetProfile.name })))
  } else {
    console.log(ansis.red(i18n.t('claude-code:profileSwitchFailed', { error: result.error })))
  }
}

export async function handleInteractiveClaudeCodeSwitch(): Promise<void> {
  const profiles = ClaudeCodeConfigManager.listProfiles()

  if (profiles.length === 0) {
    console.log(ansis.yellow(i18n.t('claude-code:noProfilesAvailable')))
    console.log(ansis.cyan(i18n.t('claude-code:runInitToAddProfiles')))
    return
  }

  const currentProfile = ClaudeCodeConfigManager.getCurrentProfile()

  // 创建与Codex一致的配置选择界面
  const createClaudeCodeConfigChoices = (profiles: ClaudeCodeProfile[], currentProfile?: ClaudeCodeProfile | null): Array<{ name: string, value: string }> => {
    const choices: Array<{ name: string, value: string }> = []

    // 1. 官方登录选项（第一项，与Codex保持一致）
    const isOfficialMode = !currentProfile || (currentProfile.authType === 'api_key' && !currentProfile.baseUrl)
    choices.push({
      name: isOfficialMode
        ? `${ansis.green('● ')}${i18n.t('codex:useOfficialLogin')} ${ansis.yellow('(当前)')}`
        : `  ${i18n.t('codex:useOfficialLogin')}`,
      value: 'official',
    })

    // 2. CCR代理选项（第二项，固定位置）
    const ccrProfile = profiles.find(p => p.authType === 'ccr_proxy')
    const isCcrCurrent = currentProfile?.authType === 'ccr_proxy'
    choices.push({
      name: isCcrCurrent
        ? `${ansis.green('● ')}${i18n.t('claude-code:useCcrProxy')} ${ansis.yellow('(当前)')}`
        : `  ${i18n.t('claude-code:useCcrProxy')}`,
      value: 'ccr',
    })

    // 3. 其他自定义API配置（动态排序）
    const otherProfiles = profiles.filter(p => p.authType !== 'ccr_proxy')
    otherProfiles.forEach((profile) => {
      const isCurrent = currentProfile?.id === profile.id
      choices.push({
        name: isCurrent
          ? `${ansis.green('● ')}${profile.name} - ${ansis.gray(profile.authType)} ${ansis.yellow('(当前)')}`
          : `  ${profile.name} - ${ansis.gray(profile.authType)}`,
        value: profile.id,
      })
    })

    return choices
  }

  const choices = createClaudeCodeConfigChoices(profiles, currentProfile)

  try {
    const { selectedConfig } = await inquirer.prompt<{ selectedConfig: string }>([{
      type: 'list',
      name: 'selectedConfig',
      message: i18n.t('claude-code:selectApiConfig'),
      choices: addNumbersToChoices(choices),
    }])

    if (!selectedConfig) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return
    }

    await handleClaudeCodeConfigSwitch(selectedConfig)
  } catch (error: any) {
    if (error.name === 'ExitPromptError') {
      console.log(ansis.cyan(`\n${i18n.t('common:goodbye')}`))
      return
    }
    throw error
  }
}

async function handleClaudeCodeConfigSwitch(selectedConfig: string): Promise<void> {
  if (selectedConfig === 'official') {
    // 切换到官方登录：清除第三方API配置
    await switchToOfficialLogin()
  } else if (selectedConfig === 'ccr') {
    // 切换到CCR代理：动态读取CCR配置并应用
    await switchToCcrProxy()
  } else {
    // 切换到自定义配置
    await switchToCustomProfile(selectedConfig)
  }
}

async function switchToOfficialLogin(): Promise<void> {
  // 清除Claude Code的第三方API配置，恢复官方登录
  const settings = readJsonConfig<any>(SETTINGS_FILE) || {}
  if (settings.env) {
    delete settings.env.ANTHROPIC_API_KEY
    delete settings.env.ANTHROPIC_AUTH_TOKEN
    delete settings.env.ANTHROPIC_BASE_URL
  }
  writeJsonConfig(SETTINGS_FILE, settings)

  // 更新ZCF配置中的当前配置
  await ClaudeCodeConfigManager.switchToOfficial()

  console.log(ansis.green(i18n.t('claude-code:switchedToOfficial')))
}

async function switchToCcrProxy(): Promise<void> {
  // 动态读取CCR配置并应用
  const ccrConfig = readCcrConfig()
  if (!ccrConfig) {
    console.log(ansis.red(i18n.t('claude-code:ccrConfigNotFound')))
    return
  }

  await configureCcrProxy(ccrConfig)

  // 更新ZCF配置中的当前配置
  await ClaudeCodeConfigManager.switchToCcr()

  console.log(ansis.green(i18n.t('claude-code:switchedToCcr')))
}

async function switchToCustomProfile(profileId: string): Promise<void> {
  const result = await ClaudeCodeConfigManager.switchProfile(profileId)

  if (result.success) {
    const profile = ClaudeCodeConfigManager.getProfileById(profileId)
    if (profile) {
      await applyClaudeCodeProfile(profile)
      console.log(ansis.green(i18n.t('claude-code:profileSwitched', { name: profile.name })))
    }
  } else {
    console.log(ansis.red(i18n.t('claude-code:profileSwitchFailed', { error: result.error })))
  }
}

async function applyClaudeCodeProfile(profile: ClaudeCodeProfile): Promise<void> {
  const settings = readJsonConfig<any>(SETTINGS_FILE) || {}

  if (!settings.env) {
    settings.env = {}
  }

  // 应用配置到Claude Code设置
  if (profile.authType === 'api_key') {
    settings.env.ANTHROPIC_API_KEY = profile.apiKey
    delete settings.env.ANTHROPIC_AUTH_TOKEN
  } else if (profile.authType === 'auth_token') {
    settings.env.ANTHROPIC_AUTH_TOKEN = profile.apiKey
    delete settings.env.ANTHROPIC_API_KEY
  }

  if (profile.baseUrl) {
    settings.env.ANTHROPIC_BASE_URL = profile.baseUrl
  } else {
    delete settings.env.ANTHROPIC_BASE_URL
  }

  writeJsonConfig(SETTINGS_FILE, settings)

  // 设置primaryApiKey
  setPrimaryApiKey()
}
```

#### 3.3 国际化文本添加
**文件**：`src/i18n/locales/zh-CN/claude-code.json`

```json
{
  "useCcrProxy": "使用CCR代理",
  "selectApiConfig": "选择要切换的API配置",
  "claudeCodeProfilesTitle": "Claude Code配置列表",
  "noProfilesAvailable": "暂无可用配置",
  "currentProfile": "当前配置：{name}",
  "profileSwitched": "已切换到配置：{name}",
  "profileSwitchFailed": "配置切换失败：{error}",
  "profileNotFound": "未找到配置：{name}",
  "runInitToAddProfiles": "请运行 'npx zcf init' 添加配置",
  "switchedToOfficial": "已切换到官方登录",
  "switchedToCcr": "已切换到CCR代理",
  "ccrConfigNotFound": "未找到CCR配置",
  "authType": {
    "api_key": "API Key",
    "auth_token": "Auth Token",
    "ccr_proxy": "CCR代理"
  }
}
```

**文件**：`src/i18n/locales/en/claude-code.json`

```json
{
  "useCcrProxy": "Use CCR Proxy",
  "selectApiConfig": "Select API configuration to switch to",
  "claudeCodeProfilesTitle": "Claude Code Configuration List",
  "noProfilesAvailable": "No profiles available",
  "currentProfile": "Current profile: {name}",
  "profileSwitched": "Switched to profile: {name}",
  "profileSwitchFailed": "Failed to switch profile: {error}",
  "profileNotFound": "Profile not found: {name}",
  "runInitToAddProfiles": "Run 'npx zcf init' to add profiles",
  "switchedToOfficial": "Switched to official login",
  "switchedToCcr": "Switched to CCR proxy",
  "ccrConfigNotFound": "CCR configuration not found",
  "authType": {
    "api_key": "API Key",
    "auth_token": "Auth Token",
    "ccr_proxy": "CCR Proxy"
  }
}
```

#### 3.2 Claude Code配置切换
**文件**：`src/utils/claude-code-switcher.ts`

```typescript
export async function listClaudeCodeProfiles(): Promise<void> {
  const profiles = ClaudeCodeConfigManager.listProfiles()
  const currentProfile = ClaudeCodeConfigManager.getCurrentProfile()

  console.log(ansis.cyan(i18n.t('config:claudeCodeProfilesTitle')))
  console.log('')

  if (profiles.length === 0) {
    console.log(ansis.yellow(i18n.t('config:noClaudeCodeProfiles')))
    return
  }

  if (currentProfile) {
    console.log(ansis.green(`${i18n.t('config:currentProfile', { name: currentProfile.name })}`))
    console.log('')
  }

  for (const profile of profiles) {
    const marker = currentProfile?.id === profile.id ? ansis.green('● ') : '  '
    console.log(`${marker}${ansis.cyan(profile.name)}`)

    if (profile.description) {
      console.log(`    ${ansis.gray(profile.description)}`)
    }

    const typeLabel = i18n.t(`config:authType.${profile.authType}`)
    console.log(`    ${ansis.gray(typeLabel)}`)
  }
}

export async function switchClaudeCodeProfile(profileName: string): Promise<void> {
  const profiles = ClaudeCodeConfigManager.listProfiles()
  const targetProfile = profiles.find(p => p.name === profileName || p.id === profileName)

  if (!targetProfile) {
    console.log(ansis.red(i18n.t('config:profileNotFound', { name: profileName })))
    return
  }

  const result = await ClaudeCodeConfigManager.switchProfile(targetProfile.id)

  if (result.success) {
    console.log(ansis.green(i18n.t('config:profileSwitched', { name: targetProfile.name })))
  } else {
    console.log(ansis.red(i18n.t('config:profileSwitchFailed', { error: result.error })))
  }
}

export async function handleInteractiveClaudeCodeSwitch(): Promise<void> {
  const profiles = ClaudeCodeConfigManager.listProfiles()

  if (profiles.length === 0) {
    console.log(ansis.yellow(i18n.t('config:noClaudeCodeProfiles')))
    console.log(ansis.cyan(i18n.t('config:runInitToAddProfiles')))
    return
  }

  const currentProfile = ClaudeCodeConfigManager.getCurrentProfile()
  const choices = profiles.map(profile => ({
    name: currentProfile?.id === profile.id
      ? `${ansis.green('● ')}${profile.name} ${ansis.yellow('(当前)')}`
      : `  ${profile.name}`,
    value: profile.id,
  }))

  try {
    const { selectedProfile } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedProfile',
      message: i18n.t('config:selectProfile'),
      choices: addNumbersToChoices(choices),
    }])

    if (selectedProfile) {
      await switchClaudeCodeProfile(selectedProfile)
    }
  } catch (error: any) {
    if (error.name === 'ExitPromptError') {
      console.log(ansis.cyan(`\n${i18n.t('common:goodbye')}`))
      return
    }
    throw error
  }
}
```

#### 3.3 测试用例
**文件**：`tests/commands/config-switch.test.ts`

```typescript
describe('config-switch命令扩展', () => {
  describe('code-type解析', () => {
    it('应该使用命令行参数指定code-type', () => {})
    it('应该从ZCF配置读取code-type', () => {})
    it('应该使用默认code-type', () => {})
  })

  describe('Claude Code配置切换', () => {
    it('应该列出Claude Code配置', () => {})
    it('应该切换Claude Code配置', () => {})
    it('应该处理不存在的配置', () => {})
    it('应该处理交互模式', () => {})
  })

  describe('向后兼容', () => {
    it('应该保持Codex配置功能', () => {})
    it('应该处理无code-type参数', () => {})
  })
})
```

### 阶段4：集成测试和边界情况

#### 4.1 集成测试
**文件**：`tests/integration/claude-code-config.test.ts`

```typescript
describe('Claude Code配置集成测试', () => {
  describe('完整工作流', () => {
    it('应该完成初始化->添加配置->切换配置的完整流程', () => {})
    it('应该处理CCR配置同步', () => {})
    it('应该处理配置文件损坏', () => {})
  })

  describe('与现有系统集成', () => {
    it('应该与Claude Code设置文件正确交互', () => {})
    it('应该与ZCF配置正确交互', () => {})
    it('应该与CCR配置正确交互', () => {})
  })
})
```

#### 4.2 边界测试
**文件**：`tests/utils/claude-code-config.edge.test.ts`

```typescript
describe('Claude Code配置边界测试', () => {
  describe('错误处理', () => {
    it('应该处理配置文件权限问题', () => {})
    it('应该处理磁盘空间不足', () => {})
    it('应该处理并发访问', () => {})
  })

  describe('数据验证', () => {
    it('应该处理恶意JSON输入', () => {})
    it('应该处理超大配置', () => {})
    it('应该处理特殊字符', () => {})
  })
})
```

## 实施优先级和时间估算

### 第1周：核心数据结构和工具类
- [x] 类型定义（1天）
- [x] 配置管理工具类实现（3天）
- [x] 单元测试编写（2天）
- [x] 测试覆盖率验证（1天）

### 第2周：CLI参数处理和JSON配置
- [x] CLI参数扩展（2天）
- [x] JSON配置处理（2天）
- [x] 与init命令集成（2天）
- [x] 单元测试和集成测试（2天）

### 第3周：config-switch命令扩展
- [x] 命令接口重构（2天）
- [x] Claude Code配置切换实现（3天）
- [x] 交互界面实现（2天）

### 第4周：测试、优化和文档
- [x] 集成测试（2天）
- [x] 边界测试和错误处理（2天）
- [x] 性能优化（1天）
- [x] 文档更新和发布准备（2天）

## 质量保证

### 测试覆盖率要求
- 单元测试覆盖率 ≥ 80%
- 集成测试覆盖主要工作流
- 边界测试覆盖异常情况

### 代码质量要求
- TypeScript严格模式
- ESLint规则遵循
- 代码审查通过

### 文档要求
- API文档完整
- 使用示例清晰
- 迁移指南详细

## 风险和缓解措施

### 技术风险
1. **配置文件损坏**：实现备份和恢复机制
2. **并发访问**：使用文件锁机制
3. **向后兼容**：充分的回归测试

### 用户体验风险
1. **学习成本**：提供详细文档和示例
2. **迁移复杂**：提供迁移工具和指南
3. **错误信息**：友好的错误提示和解决建议

---

**创建时间**：2025-01-14
**最后更新**：2025-01-14
**负责人**：浮浮酱
**版本**：1.0.0