# ZCF 配置导出和导入功能规划文档

> **变更说明**: 根据用户反馈,将导出格式从 tar.gz 改为 zip,以提升跨平台兼容性和用户体验。

## 项目背景概述

ZCF (Zero-Config Code Flow) 是一个用于自动配置 Claude Code 和 Codex 环境的 CLI 工具。当前版本 v3.5.0 已支持:

- **双工具配置**: 同时支持 Claude Code 和 Codex 环境配置
- **完善的配置管理**: TOML 格式配置、多配置文件管理、配置切换
- **备份系统**: 自动备份机制 (~/.claude/backup/)
- **工具集成**: CCR 代理、Cometix 状态栏、MCP 服务
- **国际化支持**: 完整的 zh-CN 和 en 双语支持
- **跨平台兼容**: Windows、macOS、Linux、Termux

用户在配置完成后,希望能够:
1. 将配置快速迁移到新设备
2. 在团队间共享标准配置
3. 保存配置快照用于快速恢复

## 确认的决策

基于项目现状和用户需求,已确定以下技术决策:

- ✅ **导出格式**: 使用 `.zip` 压缩包格式,包含配置文件和元数据 **[已修改]**
- ✅ **安全策略**: 默认脱敏 API 密钥,提供选项允许包含敏感信息
- ✅ **命令方式**: 新增 `zcf export` 和 `zcf import` 命令
- ✅ **交互体验**: 支持交互式菜单和命令行参数两种方式
- ✅ **配置范围**: 支持选择性导出(完整配置/仅工作流/仅 MCP 等)
- ✅ **平台兼容**: 导入时自动处理跨平台路径差异
- ✅ **版本控制**: 导出文件包含版本信息,导入时进行兼容性检查
- ✅ **与现有系统集成**: 复用现有的备份机制和配置管理系统

### Zip 格式选择的优势 **[新增说明]**

选择 zip 格式而非 tar.gz 的主要原因:

1. **跨平台原生支持**: Windows 系统原生支持 zip 格式,无需额外工具
2. **用户熟悉度高**: zip 是最通用的压缩格式,用户可直接双击查看内容
3. **简化实现**: Node.js 生态有成熟的 zip 库 (adm-zip, jszip),API 更简洁
4. **选择性解压**: zip 支持单文件解压,便于用户手动检查或提取特定文件
5. **元数据存储**: zip 格式对文件属性和目录结构的保留更友好

## 整体规划概览

### 项目目标

为 ZCF 项目添加配置导出和导入功能,实现以下核心目标:

1. **便携性**: 用户能够轻松导出完整配置到单个文件
2. **可迁移性**: 支持跨设备、跨平台的配置迁移
3. **安全性**: 智能处理敏感信息,避免泄露 API 密钥
4. **灵活性**: 支持选择性导出和导入特定配置项
5. **可靠性**: 导入前验证配置完整性和兼容性
6. **用户友好**: 提供清晰的交互提示和进度反馈

### 技术栈 **[已修改]**

- **核心语言**: TypeScript (ESM-only)
- **压缩库**: `adm-zip` (推荐) 或 `jszip` **[已修改]**
  - `adm-zip`: 同步 API,更简单直接,适合 CLI 场景
  - `jszip`: 异步 API,支持流式处理,适合大文件
- **文件操作**: 现有的 `fs-operations.ts` 工具
- **路径处理**: `pathe` (跨平台路径支持)
- **国际化**: i18next 系统 (zh-CN + en)
- **交互界面**: `inquirer` (现有依赖)
- **配置格式**: JSON 元数据 + 原始配置文件
- **测试框架**: Vitest (现有测试架构)

### 主要阶段

本功能开发分为以下 4 个主要阶段:

1. **第一阶段: 基础架构设计** - 类型定义、工具函数、元数据结构
2. **第二阶段: 导出功能实现** - 配置收集、脱敏处理、zip 打包
3. **第三阶段: 导入功能实现** - 解压验证、平台适配、配置应用
4. **第四阶段: 集成与优化** - CLI 命令集成、测试完善、文档更新

## 详细任务分解

### 第一阶段: 基础架构设计

**目标**: 建立配置导出导入功能的核心类型系统和工具函数基础

#### 任务 1.1: 定义配置导出导入类型系统

- **目标**: 创建完整的 TypeScript 类型定义,确保类型安全
- **输入**:
  - 现有的配置类型 (`src/types/config.ts`, `src/types/claude-code-config.ts`, `src/types/toml-config.ts`)
  - 项目现有的类型系统架构
- **输出**:
  - 新增类型文件 `src/types/export-import.ts`
  - 包含以下核心接口:
    ```typescript
    // 导出配置选项
    interface ExportOptions {
      codeType: 'claude-code' | 'codex' | 'all'
      scope: 'all' | 'workflows' | 'mcp' | 'settings'
      customItems?: ExportItem[]
      includeSensitive: boolean
      outputPath?: string
    }

    // 导出包元数据
    interface ExportMetadata {
      version: string           // ZCF 版本
      exportDate: string        // 导出时间戳
      platform: string          // 源平台
      codeType: 'claude-code' | 'codex' | 'all'
      scope: string[]           // 导出范围
      hasSensitiveData: boolean // 是否包含敏感信息
      files: ExportFileInfo[]   // 文件清单
    }

    // 导入配置选项
    interface ImportOptions {
      packagePath: string
      targetCodeType?: 'claude-code' | 'codex'
      mergeStrategy: 'replace' | 'merge' | 'skip-existing'
      importSensitive: boolean
      backup: boolean
    }

    // 验证结果
    interface ValidationResult {
      valid: boolean
      errors: string[]
      warnings: string[]
      metadata: ExportMetadata
    }
    ```
- **涉及文件**:
  - `src/types/export-import.ts` (新建)
  - `src/types/config.ts` (可能需要扩展)
- **估计工作量**: 2-3 小时
- **验收标准**:
  - [ ] 所有接口完整定义并通过 TypeScript 编译
  - [ ] 类型定义支持所有计划的功能场景
  - [ ] 在 `src/types/export-import.ts` 中添加详细的 JSDoc 注释

#### 任务 1.2: 创建导出导入工具模块 **[已修改]**

- **目标**: 实现配置导出导入的核心工具函数
- **输入**:
  - 任务 1.1 定义的类型系统
  - 现有的文件操作工具 (`src/utils/fs-operations.ts`)
- **输出**:
  - 新增工具文件 `src/utils/export-import/core.ts`
  - 实现以下核心函数:
    - `collectConfigFiles()` - 收集配置文件
    - `sanitizeSensitiveData()` - 脱敏处理
    - `createZipPackage()` - 创建 zip 导出包 **[已修改]**
    - `extractZipPackage()` - 解压 zip 导入包 **[已修改]**
    - `validatePackage()` - 验证包完整性
    - `adaptPlatformPaths()` - 平台路径适配
  - 技术实现细节:
    - 使用 `adm-zip` 库进行 zip 压缩和解压
    - 同步 API 简化错误处理和流程控制
    - 支持压缩级别配置 (默认标准压缩)
- **涉及文件**:
  - `src/utils/export-import/core.ts` (新建)
  - `src/utils/export-import/index.ts` (新建,导出所有工具)
  - `package.json` (添加 `adm-zip` 依赖) **[已修改]**
- **估计工作量**: 3-5 小时 **[已调整,zip 实现更简单]**
- **验收标准**:
  - [ ] 所有工具函数实现并通过单元测试
  - [ ] 支持 zip 格式的创建和解压 **[已修改]**
  - [ ] 脱敏逻辑正确处理 API 密钥等敏感信息
  - [ ] 跨平台路径转换正确 (Windows ↔ Unix)
  - [ ] zip 包可被标准工具正确解压查看 **[新增]**

#### 任务 1.3: 设计元数据清单结构

- **目标**: 定义导出包的元数据格式,确保可追溯性和兼容性检查
- **输入**:
  - 任务 1.1 的类型定义
  - ZCF 版本管理机制
- **输出**:
  - 元数据 JSON Schema 定义
  - 示例 `manifest.json`:
    ```json
    {
      "version": "3.5.0",
      "exportDate": "2026-01-01T10:30:00Z",
      "platform": "win32",
      "codeType": "claude-code",
      "scope": ["settings", "workflows", "mcp"],
      "hasSensitiveData": false,
      "files": [
        {
          "path": ".claude/settings.json",
          "type": "settings",
          "size": 1024,
          "checksum": "sha256:abc123..."
        },
        {
          "path": ".claude/zcf-config.toml",
          "type": "profiles",
          "size": 512,
          "checksum": "sha256:def456..."
        }
      ]
    }
    ```
- **涉及文件**:
  - `src/utils/export-import/manifest.ts` (新建)
- **估计工作量**: 2-3 小时
- **验收标准**:
  - [ ] 元数据结构完整,包含版本和文件校验信息
  - [ ] 实现元数据的创建和验证函数
  - [ ] 支持未来版本的向前兼容性检查

#### 任务 1.4: 实现国际化翻译键

- **目标**: 为导出导入功能添加完整的 i18n 支持
- **输入**:
  - 现有的 i18n 系统架构 (`src/i18n/`)
  - 功能的所有用户交互文本
- **输出**:
  - 新增翻译命名空间:
    - `src/i18n/locales/zh-CN/export.json`
    - `src/i18n/locales/en/export.json`
    - `src/i18n/locales/zh-CN/import.json`
    - `src/i18n/locales/en/import.json`
  - 翻译内容包括:
    - 菜单选项和提示
    - 进度消息
    - 错误和警告信息
    - 成功确认消息
- **涉及文件**:
  - `src/i18n/locales/zh-CN/export.json` (新建)
  - `src/i18n/locales/en/export.json` (新建)
  - `src/i18n/locales/zh-CN/import.json` (新建)
  - `src/i18n/locales/en/import.json` (新建)
- **估计工作量**: 2-3 小时
- **验收标准**:
  - [ ] 所有用户可见文本都有 zh-CN 和 en 翻译
  - [ ] 翻译键命名符合项目规范 (namespace:key)
  - [ ] 通过 i18n 完整性测试

---

### 第二阶段: 导出功能实现

**目标**: 实现配置导出核心逻辑,生成可迁移的配置包

#### 任务 2.1: 实现配置文件收集器

- **目标**: 根据用户选择收集需要导出的配置文件
- **输入**:
  - 用户选择的导出范围 (`ExportOptions`)
  - 当前系统的配置文件路径
- **输出**:
  - `src/utils/export-import/collector.ts` 实现:
    - `collectClaudeCodeConfig()` - 收集 Claude Code 配置
    - `collectCodexConfig()` - 收集 Codex 配置
    - `collectWorkflows()` - 收集工作流文件
    - `collectMcpConfig()` - 收集 MCP 配置
    - `collectAllConfig()` - 收集完整配置
  - 返回文件路径数组和元数据
- **涉及文件**:
  - `src/utils/export-import/collector.ts` (新建)
  - 依赖 `src/constants.ts` 中的路径常量
- **估计工作量**: 4-5 小时
- **验收标准**:
  - [ ] 正确识别所有相关配置文件
  - [ ] 支持选择性收集特定类型配置
  - [ ] 处理配置文件不存在的情况
  - [ ] 通过单元测试验证各种收集场景

#### 任务 2.2: 实现敏感信息脱敏处理

- **目标**: 智能检测和处理配置中的敏感信息
- **输入**:
  - 收集到的配置文件内容
  - 用户的脱敏选项 (`includeSensitive`)
- **输出**:
  - `src/utils/export-import/sanitizer.ts` 实现:
    - `detectSensitiveData()` - 检测敏感字段
    - `sanitizeConfig()` - 脱敏处理
    - `restoreSensitiveData()` - (导入时) 恢复敏感数据
  - 脱敏规则:
    - `ANTHROPIC_API_KEY` → `***REDACTED***`
    - `ANTHROPIC_AUTH_TOKEN` → `***REDACTED***`
    - CCR `APIKEY` → `***REDACTED***`
    - 其他自定义 API 密钥字段
- **涉及文件**:
  - `src/utils/export-import/sanitizer.ts` (新建)
- **估计工作量**: 3-4 小时
- **验收标准**:
  - [ ] 正确识别所有已知敏感字段
  - [ ] 脱敏后配置仍然是有效的 JSON/TOML
  - [ ] 提供明确标记哪些字段被脱敏
  - [ ] 通过测试验证脱敏和恢复逻辑

#### 任务 2.3: 实现 Zip 导出包创建器 **[已修改]**

- **目标**: 将收集的配置文件和元数据打包为 .zip 文件
- **输入**:
  - 收集的配置文件列表
  - 处理后的配置内容
  - 元数据对象
- **输出**:
  - `src/utils/export-import/packager.ts` 实现:
    - `createZipPackage()` - 创建 zip 压缩包 **[已修改]**
    - `generateManifest()` - 生成清单文件
    - `calculateChecksum()` - 计算文件校验和
  - 包结构:
    ```
    zcf-export-{timestamp}.zip                    [已修改扩展名]
    ├── manifest.json          (元数据)
    ├── configs/
    │   ├── claude-code/
    │   │   ├── settings.json
    │   │   ├── zcf-config.toml
    │   │   └── ...
    │   └── codex/
    │       ├── settings.json
    │       └── ...
    ├── workflows/
    │   └── .claude/
    │       └── agents/
    └── mcp/
        └── mcp-settings.json
    ```
  - 技术实现:
    - 使用 `adm-zip` 的 `addFile()` 和 `addLocalFile()` 方法
    - 设置合理的压缩级别 (默认 6,平衡速度和压缩率)
    - 保留文件的相对路径结构
    - 支持 UTF-8 文件名编码
- **涉及文件**:
  - `src/utils/export-import/packager.ts` (新建)
- **估计工作量**: 3-4 小时 **[已调整,zip API 更简洁]**
- **验收标准**:
  - [ ] 生成有效的 zip 压缩包 **[已修改]**
  - [ ] 包内文件结构清晰,易于理解
  - [ ] manifest.json 包含完整的文件清单和校验信息
  - [ ] zip 包可被 Windows、macOS、Linux 的标准工具解压 **[新增]**
  - [ ] 通过测试验证打包和解包的完整性

#### 任务 2.4: 实现导出命令交互界面 **[已修改]**

- **目标**: 创建用户友好的导出配置交互流程
- **输入**:
  - 用户通过 CLI 或交互菜单触发导出
- **输出**:
  - `src/commands/export.ts` 实现:
    - `runExportCommand()` - 导出命令主逻辑
    - 交互式提示:
      1. 选择代码工具类型 (Claude Code / Codex / Both)
      2. 选择导出范围 (完整配置 / 仅工作流 / 仅 MCP / 自定义)
      3. 是否包含敏感信息 (默认 No)
      4. 选择导出路径 (默认当前目录)
      5. 显示收集的文件列表预览
      6. 确认导出并显示进度
      7. 完成后显示导出包路径
  - 支持命令行参数方式:
    ```bash
    zcf export --code-type claude-code --scope full --output ./my-config.zip
    zcf export --code-type both --scope workflows --include-sensitive
    ```
    **[已修改文件扩展名为 .zip]**
- **涉及文件**:
  - `src/commands/export.ts` (新建)
- **估计工作量**: 5-6 小时
- **验收标准**:
  - [ ] 交互式菜单流程清晰,提示信息完整
  - [ ] 支持命令行参数直接导出
  - [ ] 显示进度反馈和最终成功消息
  - [ ] 错误处理完善,提供友好的错误提示
  - [ ] 通过集成测试验证完整导出流程

---

### 第三阶段: 导入功能实现

**目标**: 实现配置导入核心逻辑,支持跨平台配置迁移

#### 任务 3.1: 实现导入包验证器 **[已修改]**

- **目标**: 在导入前验证配置包的完整性和兼容性
- **输入**:
  - 导入的 zip 配置包路径 **[已修改]**
- **输出**:
  - `src/utils/export-import/validator.ts` 实现:
    - `validatePackageStructure()` - 验证包结构
    - `validateManifest()` - 验证元数据
    - `validateFileIntegrity()` - 验证文件完整性 (checksum)
    - `checkVersionCompatibility()` - 检查版本兼容性
    - `validateZipFormat()` - 验证 zip 文件格式 **[新增]**
  - 验证规则:
    - zip 文件格式有效且未损坏 **[新增]**
    - 包结构完整 (manifest.json 存在)
    - 所有清单中列出的文件都存在
    - 文件校验和匹配
    - ZCF 版本兼容 (主版本号一致)
    - 目标平台支持
- **涉及文件**:
  - `src/utils/export-import/validator.ts` (新建)
- **估计工作量**: 4-5 小时
- **验收标准**:
  - [ ] 正确检测损坏或不完整的包
  - [ ] 识别版本不兼容情况并给出清晰提示
  - [ ] 返回详细的验证结果 (错误/警告)
  - [ ] 通过测试验证各种验证场景
  - [ ] 能识别非 zip 格式或损坏的 zip 文件 **[新增]**

#### 任务 3.2: 实现跨平台路径适配器

- **目标**: 自动处理配置中的路径在不同平台间的转换
- **输入**:
  - 源平台信息 (来自 manifest)
  - 目标平台信息 (当前系统)
  - 配置文件内容
- **输出**:
  - `src/utils/export-import/path-adapter.ts` 实现:
    - `adaptConfigPaths()` - 适配配置中的路径
    - `convertWindowsPath()` - Windows 路径转换
    - `convertUnixPath()` - Unix 路径转换
    - `normalizeMcpPaths()` - 特殊处理 MCP 命令路径
  - 适配规则:
    - Windows → Unix: `C:\Users\...` → `/home/...`
    - Unix → Windows: `/home/...` → `C:\Users\...`
    - 环境变量展开: `%USERPROFILE%` ↔ `$HOME`
    - MCP 命令路径: `npx` / `node` / 绝对路径处理
- **涉及文件**:
  - `src/utils/export-import/path-adapter.ts` (新建)
  - 依赖 `src/utils/platform.ts` 的平台检测
- **估计工作量**: 4-5 小时
- **验收标准**:
  - [ ] 正确转换 Windows ↔ Unix 路径格式
  - [ ] 处理特殊路径 (用户目录、环境变量)
  - [ ] MCP 服务路径在跨平台导入后可用
  - [ ] 通过跨平台测试验证

#### 任务 3.3: 实现配置合并策略

- **目标**: 根据用户选择的策略合并导入配置与现有配置
- **输入**:
  - 导入的配置内容
  - 现有配置内容
  - 用户选择的合并策略
- **输出**:
  - `src/utils/export-import/merger.ts` 实现:
    - `mergeConfigs()` - 主合并逻辑
    - `replaceStrategy()` - 完全替换现有配置
    - `mergeStrategy()` - 智能合并 (类似现有的 deepMerge)
    - `skipExistingStrategy()` - 跳过已存在项
    - `resolveConflicts()` - 冲突解决提示
  - 合并策略:
    - **replace**: 完全替换现有配置
    - **merge**: 深度合并,导入配置优先
    - **skip-existing**: 仅导入不存在的项
  - 特殊处理:
    - MCP 服务合并: 避免重复,合并服务列表
    - 工作流合并: 检测同名工作流冲突
    - Profile 合并: 检测同名配置文件冲突
- **涉及文件**:
  - `src/utils/export-import/merger.ts` (新建)
  - 依赖现有的 `src/utils/object-utils.ts` (deepMerge)
- **估计工作量**: 5-6 小时
- **验收标准**:
  - [ ] 三种合并策略都正确实现
  - [ ] 检测并处理配置冲突 (提示用户确认)
  - [ ] 合并后配置仍然有效且符合 schema
  - [ ] 通过测试验证各种合并场景

#### 任务 3.4: 实现导入命令交互界面 **[已修改]**

- **目标**: 创建用户友好的导入配置交互流程
- **输入**:
  - 用户通过 CLI 或交互菜单触发导入
  - 导入包文件路径
- **输出**:
  - `src/commands/import.ts` 实现:
    - `runImportCommand()` - 导入命令主逻辑
    - 交互式提示:
      1. 选择导入包文件 (文件路径输入 + 验证)
      2. 显示包元数据信息 (版本、平台、范围)
      3. 选择目标代码工具 (如果包含 both)
      4. 选择合并策略 (replace / merge / skip-existing)
      5. 是否导入敏感信息 (如果包含)
      6. 是否在导入前创建备份 (默认 Yes)
      7. 显示将要导入的文件列表预览
      8. 检测潜在冲突并提示确认
      9. 确认导入并显示进度
      10. 完成后显示导入摘要和备份路径
  - 支持命令行参数方式:
    ```bash
    zcf import ./my-config.zip --merge-strategy merge --backup
    zcf import ./team-config.zip --code-type claude-code --no-backup
    ```
    **[已修改文件扩展名为 .zip]**
- **涉及文件**:
  - `src/commands/import.ts` (新建)
- **估计工作量**: 6-7 小时
- **验收标准**:
  - [ ] 交互式菜单流程清晰,提示信息完整
  - [ ] 支持命令行参数直接导入
  - [ ] 显示验证结果和潜在问题警告
  - [ ] 自动创建备份 (除非用户禁用)
  - [ ] 显示进度反馈和详细的导入摘要
  - [ ] 错误处理完善,导入失败时能回滚
  - [ ] 通过集成测试验证完整导入流程

---

### 第四阶段: 集成与优化

**目标**: 将导出导入功能集成到 ZCF CLI,完善测试和文档

#### 任务 4.1: CLI 命令注册与菜单集成 **[已修改]**

- **目标**: 将 export/import 命令集成到 ZCF CLI 系统
- **输入**:
  - 已实现的 `export.ts` 和 `import.ts` 命令
  - 现有的 CLI 入口 (`src/index.ts`)
  - 现有的菜单系统 (`src/commands/menu.ts`)
- **输出**:
  - 修改 `src/index.ts`:
    - 注册 `export` 命令: `zcf export [options]`
    - 注册 `import` 命令: `zcf import <package-path> [options]`
  - 修改 `src/commands/menu.ts`:
    - 在主菜单添加 "导出配置" 选项
    - 在主菜单添加 "导入配置" 选项
  - 命令选项定义:
    ```typescript
    // export 命令
    --code-type <type>        // claude-code | codex | both
    --scope <scope>           // full | workflows | mcp | settings | custom
    --include-sensitive       // 包含敏感信息
    --output <path>           // 输出路径 (默认 .zip 扩展名)
    --lang <lang>             // 语言 (zh-CN | en)

    // import 命令
    <package-path>            // 必填: 导入包路径 (.zip 文件)
    --code-type <type>        // 目标代码工具
    --merge-strategy <strategy> // replace | merge | skip-existing
    --include-sensitive       // 导入敏感信息
    --no-backup               // 不创建备份
    --lang <lang>             // 语言
    ```
    **[已修改注释说明 zip 格式]**
- **涉及文件**:
  - `src/index.ts` (修改)
  - `src/commands/menu.ts` (修改)
- **估计工作量**: 3-4 小时
- **验收标准**:
  - [ ] `zcf export` 和 `zcf import` 命令可用
  - [ ] 所有命令选项正确解析
  - [ ] 主菜单显示导出导入选项
  - [ ] 帮助信息 (`zcf export --help`) 清晰完整

#### 任务 4.2: 编写单元测试 **[已修改]**

- **目标**: 为所有新增的工具函数编写单元测试
- **输入**:
  - `src/utils/export-import/` 下的所有工具模块
- **输出**:
  - 单元测试文件:
    - `tests/utils/export-import/collector.test.ts`
    - `tests/utils/export-import/sanitizer.test.ts`
    - `tests/utils/export-import/packager.test.ts` **[包含 zip 格式测试]**
    - `tests/utils/export-import/validator.test.ts` **[包含 zip 验证测试]**
    - `tests/utils/export-import/path-adapter.test.ts`
    - `tests/utils/export-import/merger.test.ts`
  - 测试覆盖:
    - 正常流程测试
    - 边界条件测试
    - 错误处理测试
    - Mock 文件系统操作
    - Zip 格式特定测试 (损坏文件、大文件、UTF-8 文件名) **[新增]**
  - 目标覆盖率: **80%** (符合项目标准)
- **涉及文件**:
  - `tests/utils/export-import/` (新建目录和测试文件)
- **估计工作量**: 8-10 小时
- **验收标准**:
  - [ ] 所有工具函数都有对应的单元测试
  - [ ] 测试覆盖率达到 80% 以上
  - [ ] 所有测试通过 (`pnpm test`)
  - [ ] Mock 策略合理,测试隔离良好
  - [ ] Zip 格式相关功能有充分测试 **[新增]**

#### 任务 4.3: 编写集成测试 **[已修改]**

- **目标**: 测试完整的导出导入流程
- **输入**:
  - `src/commands/export.ts` 和 `src/commands/import.ts`
- **输出**:
  - 集成测试文件:
    - `tests/commands/export.test.ts`
    - `tests/commands/import.test.ts`
    - `tests/integration/export-import-flow.test.ts`
  - 测试场景:
    - 完整导出 → 导入流程
    - 跨平台路径转换测试
    - 配置合并冲突解决测试
    - 版本兼容性测试
    - 备份和回滚测试
    - Zip 格式兼容性测试 (使用系统 zip 工具验证) **[新增]**
- **涉及文件**:
  - `tests/commands/export.test.ts` (新建)
  - `tests/commands/import.test.ts` (新建)
  - `tests/integration/export-import-flow.test.ts` (新建)
- **估计工作量**: 6-8 小时
- **验收标准**:
  - [ ] 完整流程测试通过
  - [ ] 跨平台场景正确模拟并测试
  - [ ] 所有集成测试通过
  - [ ] 覆盖主要的用户使用场景
  - [ ] 生成的 zip 包可被标准工具验证 **[新增]**

#### 任务 4.4: 更新项目文档 **[已修改]**

- **目标**: 更新 README 和相关文档说明新功能
- **输入**:
  - 已实现的导出导入功能
  - 现有的项目文档 (`README.md`, `docs/`)
- **输出**:
  - 更新 `README.md`:
    - 在 "CLI Usage" 部分添加 export/import 示例
    - 说明 zip 格式的优势 **[新增]**
  - 更新 `CLAUDE.md`:
    - 在 "CLI Usage" 部分添加命令说明
    - 在 "Module Index" 添加 export-import 工具模块
  - 创建用户指南:
    - `docs/guides/config-export-import.md` (中文)
    - `docs/guides/config-export-import.en.md` (英文)
  - 内容包括:
    - 功能介绍
    - 使用场景
    - 详细的命令示例
    - Zip 格式的跨平台优势说明 **[新增]**
    - 常见问题解答
    - 跨平台注意事项
    - 手动查看和编辑 zip 包的说明 **[新增]**
- **涉及文件**:
  - `README.md` (修改)
  - `CLAUDE.md` (修改)
  - `docs/guides/config-export-import.md` (新建)
  - `docs/guides/config-export-import.en.md` (新建)
- **估计工作量**: 4-5 小时
- **验收标准**:
  - [ ] README 包含导出导入功能的基本说明
  - [ ] CLAUDE.md 更新完整且准确
  - [ ] 用户指南详细且易懂,包含实际示例
  - [ ] 中英文文档完整对应
  - [ ] 说明 zip 格式的优势和使用方法 **[新增]**

#### 任务 4.5: 性能优化与错误处理增强 **[已修改]**

- **目标**: 优化大配置文件的处理性能,增强错误处理
- **输入**:
  - 初步实现的导出导入功能
  - 性能测试结果
- **输出**:
  - 性能优化:
    - 使用 adm-zip 的流式 API (如果处理大文件) **[已修改]**
    - 压缩选项优化 (平衡速度和压缩比,默认级别 6)
    - 进度反馈优化 (显示百分比和估计时间)
    - Zip 格式本身已有良好压缩率,无需额外优化 **[新增]**
  - 错误处理增强:
    - 详细的错误消息和恢复建议
    - 导入失败时自动回滚机制
    - 网络中断或磁盘空间不足的处理
    - 损坏 zip 包的友好错误提示 **[已修改]**
    - Zip 格式错误的具体提示 (如非 zip 文件、部分损坏等) **[新增]**
- **涉及文件**:
  - `src/utils/export-import/packager.ts` (优化)
  - `src/commands/export.ts` (增强错误处理)
  - `src/commands/import.ts` (增强错误处理)
- **估计工作量**: 3-4 小时 **[已调整,zip 处理更简单]**
- **验收标准**:
  - [ ] 处理大配置包 (>10MB) 时性能良好
  - [ ] 所有错误情况都有清晰的提示
  - [ ] 导入失败时能正确回滚
  - [ ] 进度显示准确且及时
  - [ ] Zip 格式错误有友好提示 **[新增]**

---

## 验收标准总结

### 功能完整性验收 **[已修改]**

- [ ] **导出功能**:
  - 支持选择性导出 (完整/工作流/MCP/设置)
  - 支持 Claude Code 和 Codex 两种工具
  - 正确脱敏敏感信息 (可选保留)
  - 生成有效的 .zip 压缩包 **[已修改]**
  - 包含完整的元数据清单
  - Zip 包可被标准工具直接查看 **[新增]**

- [ ] **导入功能**:
  - 验证 zip 包完整性和版本兼容性 **[已修改]**
  - 跨平台路径自动适配
  - 支持三种合并策略 (replace/merge/skip)
  - 导入前自动备份现有配置
  - 导入失败时能回滚

- [ ] **用户体验**:
  - 交互式菜单清晰友好
  - 支持命令行参数快速操作
  - 完整的 zh-CN 和 en 双语支持
  - 进度反馈及时准确
  - 错误提示详细且提供解决方案
  - Zip 格式用户熟悉度高 **[新增]**

### 测试覆盖验收 **[已修改]**

- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 所有核心工具函数都有测试
- [ ] 集成测试覆盖主要用户场景
- [ ] 跨平台兼容性测试通过
- [ ] Zip 格式相关功能有充分测试 **[新增]**
- [ ] 所有测试在 CI 中通过

### 文档完整性验收 **[已修改]**

- [ ] README 更新包含新功能说明
- [ ] CLAUDE.md 更新完整且准确
- [ ] 用户指南详细且包含实际示例
- [ ] 中英文文档完整对应
- [ ] 代码注释清晰 (JSDoc)
- [ ] 说明 zip 格式的优势和使用方法 **[新增]**

### 代码质量验收

- [ ] 通过 ESLint 检查 (`pnpm lint`)
- [ ] 通过 TypeScript 类型检查 (`pnpm typecheck`)
- [ ] 遵循项目编码规范 (@antfu/eslint-config)
- [ ] 代码可读性和可维护性良好

---

## 潜在风险和应对措施

### 风险 1: 跨平台路径转换复杂性

**描述**: Windows 和 Unix 系统的路径格式差异较大,MCP 服务的命令路径可能包含绝对路径或环境变量,转换逻辑复杂。

**影响**: 中等 - 可能导致导入后配置不可用

**应对措施**:
1. **充分测试**: 编写详细的跨平台路径转换测试用例
2. **智能检测**: 自动检测路径类型并选择合适的转换策略
3. **用户提示**: 在导入后提示用户验证关键路径 (如 MCP 命令)
4. **文档说明**: 在文档中明确说明跨平台导入的限制和注意事项
5. **回退机制**: 提供手动编辑导入后配置的指导

### 风险 2: 大配置文件的性能问题 **[已修改]**

**描述**: 如果用户的配置包含大量工作流、MCP 服务或自定义文件,打包和解压可能较慢。

**影响**: 低 - 用户体验下降,但不影响功能 **[已调整,zip 处理更高效]**

**应对措施**:
1. **优化的 zip 实现**: adm-zip 对常规配置文件处理效率高 **[已修改]**
2. **进度反馈**: 实时显示进度百分比和估计时间
3. **压缩优化**: 选择合适的压缩级别 (默认级别 6,速度和压缩率平衡)
4. **异步操作**: 后台执行耗时操作,不阻塞用户界面
5. **性能测试**: 测试大配置 (>100MB) 的处理性能
6. **Zip 格式优势**: 相比 tar.gz,zip 的随机访问性能更好 **[新增]**

### 风险 3: 敏感信息泄露

**描述**: 用户可能误导出包含 API 密钥的配置包并分享给他人。

**影响**: 高 - 安全风险

**应对措施**:
1. **默认脱敏**: 默认不包含敏感信息,需显式选择才包含
2. **明确警告**: 选择包含敏感信息时显示明显的安全警告
3. **文件命名提示**: 包含敏感信息的包文件名添加 `-sensitive` 后缀
4. **文档强调**: 在文档中强调不要分享包含敏感信息的包
5. **元数据标记**: 在 manifest 中明确标记 `hasSensitiveData: true`

### 风险 4: 版本不兼容导致导入失败

**描述**: 不同版本的 ZCF 配置结构可能不同,导入旧版本或新版本的配置可能失败。

**影响**: 中等 - 导入失败,用户体验差

**应对措施**:
1. **版本检查**: 导入前检查主版本号一致性
2. **兼容性层**: 为可预见的版本差异提供迁移逻辑
3. **清晰提示**: 版本不兼容时给出清晰的错误信息和解决方案
4. **向前兼容**: 设计元数据结构时考虑未来扩展性
5. **降级导入**: 允许用户选择"尽力导入"模式,跳过不兼容项

### 风险 5: 配置合并冲突处理不当

**描述**: 在 merge 策略下,导入配置可能与现有配置冲突 (如同名工作流、同名 Profile)。

**影响**: 中等 - 可能覆盖用户的自定义配置

**应对措施**:
1. **冲突检测**: 导入前检测所有潜在冲突
2. **交互确认**: 发现冲突时让用户选择处理方式 (覆盖/重命名/跳过)
3. **自动备份**: 导入前强制创建备份 (除非用户禁用)
4. **详细日志**: 记录所有合并操作,便于事后检查
5. **回滚机制**: 导入失败时自动从备份恢复

### 风险 6: 与现有备份系统的冲突

**描述**: 项目已有备份系统 (`backupExistingConfig()`),导入功能的备份可能导致混淆。

**影响**: 低 - 可能产生冗余备份

**应对措施**:
1. **复用机制**: 复用现有的备份函数和备份目录结构
2. **命名区分**: 导入备份使用特殊前缀 (如 `import_backup_`)
3. **统一管理**: 在文档中说明所有备份的用途和位置
4. **清理策略**: 提供备份清理建议 (如保留最近 N 个)

### 风险 7: Zip 文件编码问题 **[新增]**

**描述**: Zip 格式对文件名编码的处理在不同平台可能不一致,特殊字符或非 ASCII 字符可能导致问题。

**影响**: 低 - 文件名乱码或解压失败

**应对措施**:
1. **UTF-8 编码**: 使用 UTF-8 编码处理文件名,adm-zip 默认支持
2. **文件名验证**: 在打包前验证文件名不包含非法字符
3. **测试覆盖**: 测试包含特殊字符的文件名 (中文、emoji 等)
4. **文档说明**: 在文档中说明文件名最佳实践
5. **降级方案**: 如果遇到编码问题,提供 ASCII-only 模式选项

---

## 功能范围决策 **[已确定]**

> **决策时间**: 2026-01-03
> **决策状态**: ✅ 已全部确认

以下决策已由用户确认,将作为本次实施的最终范围:

### 决策 1: 增量导出功能

**用户选择**: ✅ **方案 A - 不支持增量导出**

**实施说明**:
- 每次导出均为完整配置导出
- 实现逻辑简单清晰,开发复杂度低
- 配置文件通常较小 (<10MB),完整导出性能足够
- 不需要维护变更追踪机制

**未来扩展**: 可在后续版本中根据用户反馈考虑增量导出

---

### 决策 2: 云端存储集成

**用户选择**: ✅ **方案 A - 仅本地文件导出导入**

**实施说明**:
- 导出功能仅生成本地 .zip 文件
- 导入功能仅读取本地 .zip 文件
- 无外部服务依赖,安全性高
- 用户需自行管理配置包的传输和存储

**未来扩展**: 可在后续版本中添加 GitHub Gist、S3 等云端存储支持

---

### 决策 3: 配置模板市场

**用户选择**: ✅ **方案 A - 不创建模板市场**

**实施说明**:
- 聚焦核心的导出导入功能
- 不涉及模板库、服务端、审核机制等额外开发
- 用户可通过手动分享 .zip 文件实现配置共享
- 降低维护成本和复杂度

**未来扩展**: 可在社区成熟后考虑建立官方或社区模板市场

---

### 决策 4: 导出包加密

**用户选择**: ✅ **方案 A - 不支持加密**

**实施说明**:
- 依赖默认的敏感信息脱敏机制
- 用户如需加密,可使用系统级工具 (如 7-Zip 加密、GPG 等)
- 简化实现,避免密钥管理复杂度
- 在导出包含敏感信息时,会明确警告用户

**未来扩展**: 如用户有强烈需求,可在后续版本中添加密码加密支持

---

### 决策影响总结

基于以上决策,本次实施将聚焦于:

✅ **核心功能**:
- 完整的配置导出 (支持选择性范围)
- 安全的敏感信息脱敏
- Zip 格式压缩包生成
- 跨平台配置导入
- 智能路径适配
- 配置合并策略 (replace/merge/skip)
- 备份和回滚机制

❌ **不包含功能**:
- 增量导出
- 云端存储集成
- 配置模板市场
- 导出包加密

⏭️ **未来可扩展**:
- 所有决策中的「未来扩展」选项均可在后续版本中根据用户反馈实现

---

## 用户反馈区

请在此区域补充您对整体规划的意见和建议:

```
用户补充内容:

---
(请在此处填写您的反馈、问题或额外需求)
---

```

---

## 实施时间线估算 **[已调整]**

基于以上任务分解,预估总开发时间:

| 阶段 | 任务数 | 预估时间 | 备注 |
|------|--------|----------|------|
| 第一阶段: 基础架构设计 | 4 | 9-11 小时 | 类型定义、zip 工具模块、i18n **[已调整]** |
| 第二阶段: 导出功能实现 | 4 | 15-19 小时 | 收集、脱敏、zip 打包、交互 **[已调整]** |
| 第三阶段: 导入功能实现 | 4 | 19-23 小时 | 验证、适配、合并、交互 |
| 第四阶段: 集成与优化 | 5 | 24-31 小时 | 测试、文档、优化 **[已调整]** |
| **总计** | **17 任务** | **67-84 小时** | 约 8-10 个工作日 **[已优化,zip 实现更简单]** |

**注意**: 以上时间估算为纯开发时间,不包括代码审查、调试和修复时间。建议预留 20-30% 的缓冲时间。

**时间调整说明**:
- Zip 库 (adm-zip) 的 API 比 tar + zlib 组合更简洁,减少实现复杂度
- Zip 格式是 Node.js 生态的主流选择,有更多成熟示例参考
- 整体开发时间预计减少 3-5 小时

---

## 后续扩展方向

功能成功实施后,可考虑以下扩展:

1. **云端同步**: 支持 GitHub Gist 或其他云存储服务
2. **配置模板**: 提供官方和社区的预配置模板
3. **差异对比**: 导入前显示新旧配置的差异 (类似 git diff)
4. **配置历史**: 维护配置版本历史,支持回退到任意版本
5. **团队协作**: 支持团队配置的合并和冲突解决
6. **自动同步**: 定期自动导出配置到指定位置
7. **加密导出**: 支持密码或 GPG 加密导出包 (根据用户需求) **[新增]**
8. **选择性解压**: 利用 zip 格式优势,支持仅解压特定文件 **[新增]**
