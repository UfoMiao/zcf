/**
 * Claude Code多配置管理相关类型定义
 */

export interface ClaudeCodeProfile {
  id: string // 配置唯一标识
  name: string // 显示名称
  authType: 'api_key' | 'auth_token' | 'ccr_proxy'
  apiKey?: string // API密钥（明文存储）
  baseUrl?: string // 自定义API URL
  description?: string // 配置描述
  createdAt?: string // 创建时间
  updatedAt?: string // 更新时间
}

export interface ClaudeCodeConfigData {
  currentProfileId: string // 当前激活的配置ID
  profiles: Record<string, ClaudeCodeProfile> // 配置集合
  version: string // 配置版本
}

export interface ApiConfigDefinition {
  name: string // 配置名称（必需）
  type: 'api_key' | 'auth_token' | 'ccr_proxy' // 认证类型（必需）
  key?: string // API密钥（api_key和auth_token必需）
  url?: string // 自定义URL（可选）
  description?: string // 配置描述（可选）
  default?: boolean // 是否设为默认配置（可选）
}

export interface ClaudeCodeConfigManagerResult {
  success: boolean
  backupPath?: string
  error?: string
  addedProfile?: ClaudeCodeProfile
  updatedProfile?: ClaudeCodeProfile
  deletedProfiles?: string[]
  remainingProfiles?: ClaudeCodeProfile[]
  newCurrentProfileId?: string
}

// 操作结果类型
export interface OperationResult {
  success: boolean
  error?: string
  backupPath?: string
}

// 配置验证错误类型
export interface ConfigValidationError {
  field: string
  message: string
  value?: any
}

// 配置操作类型
export type ConfigOperationType = 'add' | 'update' | 'delete' | 'switch' | 'list' | 'sync'
