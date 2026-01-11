# CCometixLine Integration Plan

## Context

CCometixLine 是一个基于 Rust 的高性能 Claude Code 状态栏工具，提供 Git 集成和实时使用量跟踪功能。

## Implementation Summary

### 1. TDD Development Approach

- ✅ 编写全面的测试用例 (19 个测试)
- ✅ 实现最小化功能使测试通过
- ✅ 重构和优化代码结构

### 2. Core Components Implemented

#### 安装和检查模块 (`src/utils/cometix/installer.ts`)

- `isCometixLineInstalled()`: 检查 CCometixLine 安装状态
- `installCometixLine()`: 安装 CCometixLine

#### 命令执行模块 (`src/utils/cometix/commands.ts`)

- `runCometixInstallOrUpdate()`: 执行安装或更新命令
- `runCometixPrintConfig()`: 打印默认配置

#### 菜单管理模块 (`src/utils/cometix/menu.ts`)

- `showCometixMenu()`: 显示 CCometixLine 子菜单
- 提供安装/更新和配置打印选项

#### 公共工具模块 (`src/utils/cometix/common.ts`)

- 定义常量和公共配置
- 抽象化 npm 命令

### 3. Integration Points

#### 初始化流程集成 (`src/commands/init.ts`)

- 在第 11 步添加 CCometixLine 安装提示
- 默认同意安装（按回车）
- 如果已安装则跳过提示

#### 主菜单集成 (`src/commands/menu.ts`)

- 在"其他工具"部分添加 "L. CCometixLine" 选项
- 进入 CCometixLine 管理子菜单
- 支持大小写字母输入

### 4. Internationalization Support

#### 中文翻译 (`src/i18n/locales/zh-CN/cometix.ts`)

- 完整的中文界面支持
- 安装提示和错误消息

#### 英文翻译 (`src/i18n/locales/en/cometix.ts`)

- 完整的英文界面支持
- 与中文版本保持同步

### 5. Quality Assurance

#### 测试覆盖

- 单元测试: 19 个测试用例
- 覆盖安装、命令、菜单三个核心模块
- 边界条件和错误处理测试

#### 代码质量

- TypeScript 类型检查通过
- 遵循现有代码风格和模式
- 复用现有基础设施（错误处理、国际化等）

## Usage Flow

### 初始化时安装

```bash
zcf init
# 会询问: 是否安装CCometixLine - 基于 Rust 的高性能 Claude Code 状态栏工具，集成 Git 信息和实时使用量跟踪？
# 默认 [Y/n]: 按回车即可安装
```

### 通过菜单管理

```bash
zcf
# 选择 L. CCometixLine
# 进入子菜单:
#   1. 安装或更新: npm install -g @cometix/ccline; npm update -g @cometix/ccline
#   2. 打印默认配置: ccline --print
#   0. 返回主菜单
```

## Technical Architecture

### File Structure

```
src/utils/cometix/
├── installer.ts      # 安装检查和安装逻辑
├── commands.ts       # 命令执行逻辑
├── menu.ts          # 菜单交互逻辑
├── common.ts        # 公共常量和工具
├── types.ts         # TypeScript 类型定义
└── errors.ts        # 错误处理类
```

### Integration Points

- `src/commands/init.ts`: 初始化流程集成 (Line 407-429)
- `src/commands/menu.ts`: 主菜单集成 (Line 80-82, 105, 147-150, 172)
- `src/utils/tools.ts`: 工具导出 (Line 108-111)

## Dependencies

- 复用现有的 npm 命令执行逻辑
- 集成现有的国际化基础设施
- 遵循现有的错误处理模式

## Benefits

1. **无缝集成**: 与现有 ZCF 工作流程完全集成
2. **用户友好**: 简单的安装和管理流程
3. **国际化**: 完整的中英文支持
4. **高质量**: TDD 开发确保代码质量
5. **可维护**: 清晰的模块结构和类型安全

## Future Enhancements

- 添加版本检查功能
- 支持配置文件自定义
- 集成到工作流模板中
