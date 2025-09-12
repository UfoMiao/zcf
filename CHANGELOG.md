# Changelog

## 2.12.12

### Patch Changes

- ## New Features
  - Add comprehensive WSL environment support with detection and configuration
  - Support for WSL (Windows Subsystem for Linux) installation and setup
  - Enhanced platform detection for improved cross-platform compatibility

  ## 新功能
  - 添加全面的 WSL 环境支持，包含检测和配置功能
  - 支持 WSL (Windows 子系统 Linux) 安装和设置
  - 增强平台检测，提升跨平台兼容性

  ## Documentation
  - Update WSL support documentation and platform compatibility guide
  - Add comprehensive Japanese README translation
  - Update automated release command documentation with detailed examples
  - Improve WSL environment setup instructions

  ## 文档更新
  - 更新 WSL 支持文档和平台兼容性指南
  - 添加完整的日语 README 翻译
  - 更新自动化发版命令文档，提供详细示例
  - 改进 WSL 环境设置说明

  ## Optimization
  - Improve platform.ts with enhanced WSL detection logic
  - Add comprehensive test coverage for platform detection
  - Optimize installation process for WSL environments
  - Enhance internationalization support for installation messages

  ## 优化
  - 改进 platform.ts，增强 WSL 检测逻辑
  - 为平台检测添加全面测试覆盖
  - 优化 WSL 环境的安装流程
  - 增强安装消息的国际化支持

## 2.12.11

### Patch Changes

- ## 新功能
  - 实现CCR API密钥自动审批管理，支持长度限制和智能存储
  - 添加智能安装管理系统，支持全局/本地Claude Code安装检测和用户选择
  - 重构Claude配置管理模块，将 mcp.ts 重命名为更清晰的 claude-config.ts
  - 扩展配置接口支持 customApiKeyResponses 字段和API密钥状态管理

  ## New Features
  - Implement CCR API key auto-approval management with length limits and intelligent storage
  - Add intelligent installation management system with global/local Claude Code detection and user choice
  - Refactor Claude configuration management module, rename mcp.ts to clearer claude-config.ts
  - Extend configuration interface to support customApiKeyResponses field and API key status management

  ## 优化
  - 优化猫娘工程师输出样式模板，使用全角波浪号提升显示效果
  - 增强错误处理机制，提供更友好的i18n错误提示信息
  - 改进文件系统操作工具，添加可执行文件检测和递归删除功能
  - 扩展ZCF配置持久化，支持安装方式偏好设置

  ## Optimization
  - Optimize nekomata engineer output style template with full-width tilde for better display
  - Enhance error handling with more user-friendly i18n error messages
  - Improve file system operation tools with executable detection and recursive removal
  - Extend ZCF configuration persistence to support installation method preferences

  ## 修复
  - 修复ESLint hook路径解析问题，确保项目级代码规范一致性
  - 完善Windows平台MCP配置路径处理和特殊字符转义
  - 优化CCR代理配置工作流中的错误容错和恢复机制

  ## Fixes
  - Fix ESLint hook path resolution for consistent project-wide code standards
  - Improve Windows platform MCP configuration path handling and special character escaping
  - Optimize error tolerance and recovery in CCR proxy configuration workflow

  ## 文档
  - 更新README徽章链接，添加JSDoc API参考文档
  - 添加双语API密钥审批功能使用说明
  - 完善安装管理系统的中英文文档说明

  ## Documentation
  - Update README badge links and add JSDoc API reference documentation
  - Add bilingual API key approval feature usage instructions
  - Complete Chinese and English documentation for installation management system

  ## 测试
  - 添加19个全面的TDD测试用例覆盖API密钥审批功能
  - 新增573个安装管理器测试用例，包含边界条件和错误场景
  - 增强CCR配置测试，添加现有配置保护场景验证
  - 扩展文件系统操作测试，确保跨平台兼容性

  ## Testing
  - Add 19 comprehensive TDD test cases covering API key approval functionality
  - Add 573 installation manager test cases including boundary conditions and error scenarios
  - Enhance CCR configuration tests with existing configuration protection scenario verification
  - Extend file system operation tests to ensure cross-platform compatibility

  ## 重大变更
  - 安装工作流现在需要用户在检测到多个Claude Code安装时进行选择
  - 用户可以在全局安装（推荐）和本地安装方法之间选择
  - API密钥管理现在自动处理已拒绝密钥向已批准列表的迁移

  ## Breaking Changes
  - Installation workflow now requires user choice when multiple Claude Code installations are detected
  - Users can select between global (recommended) or local installation methods
  - API key management now automatically handles rejected key migration to approved list

## 2.12.10

### Patch Changes

- ## 配置完善
  - 补充遗漏的 mcp\_\_open-websearch 服务配置
  - 完善Claude Code默认配置模板

  ## Configuration Enhancement
  - Add missing mcp\_\_open-websearch service configuration
  - Complete Claude Code default configuration template

## 2.12.9

### Patch Changes

- ## 新功能
  - 添加开放网页搜索 MCP 服务，支持多搜索引擎
  - 实现受保护分支工作流，支持 PR 创建功能
  - 优化提交规则配置，允许灵活的主题大小写

  ## New Features
  - Add Open Web Search MCP service with multi-engine support
  - Implement protected branch workflow with PR creation support
  - Optimize commit lint rules with flexible subject case handling

  ## 文档
  - 更新 README 文件，添加开放网页搜索服务说明
  - 完善 ZCF 发版命令文档，增强自动化发版指南

  ## Documentation
  - Update README files to include Open Web Search service documentation
  - Enhance ZCF release command documentation with automation guidelines

  ## 修复
  - 修复 Spec Workflow 文档内容位置错误
  - 改进 MCP 服务配置结构和测试覆盖

  ## Fixes
  - Fix Spec Workflow documentation content positioning
  - Improve MCP service configuration structure and test coverage

## 2.12.8

### Patch Changes

- ## 新功能
  - 添加自定义模型选择功能
  - 集成Husky和commitlint实现提交规范验证
  - 实现跨平台TypeScript ESLint钩子
  - 增强自动更新器，支持跳过提示功能
  - 新增mcp\_\_ide到允许列表配置

  ## New Features
  - Add custom model selection functionality
  - Integrate Husky and commitlint for conventional commit validation
  - Implement cross-platform TypeScript ESLint hook
  - Enhance auto-updater with skip prompt support
  - Add mcp\_\_ide to allowed list in settings configuration

  ## 重构与优化
  - 移除独立Claude配置文件，内联规则到Claude钩子中
  - 修复所有ESLint错误并增强类型安全性
  - 优化Husky钩子时机策略
  - 改进Windows CI兼容性和测试稳定性
  - 升级BMad到4.42.1版本

  ## Refactoring & Optimization
  - Remove separate Claude config file and inline rules in hooks
  - Fix all ESLint errors and enhance type safety
  - Optimize Husky hooks with better timing strategy
  - Improve Windows CI compatibility and test robustness
  - Upgrade BMad to version 4.42.1

  ## 依赖更新
  - 更新pnpm和主要依赖包
  - 移除模板文件的ESLint忽略配置
  - 修复settings.json格式问题

  ## Dependency Updates
  - Update pnpm and major dependencies
  - Remove templates from ESLint ignore configuration
  - Fix settings.json formatting issues

  ## 测试改进
  - 改进npm包集成测试的稳定性和诊断功能
  - 增强Windows CI兼容性测试
  - 添加国际化完整性验证测试

  ## Testing Improvements
  - Improve npm package integration test robustness and diagnostics
  - Enhance Windows CI compatibility testing
  - Add i18n integrity validation tests

  ## 文档更新
  - 添加pnpm 10升级修复执行计划
  - 更新项目文档和国际化翻译

  ## Documentation Updates
  - Add pnpm 10 upgrade fix execution plan
  - Update project documentation and i18n translations

## 2.12.7

### Patch Changes

- ## 新功能
  - 新增 i18n 完整性测试套件，自动验证翻译文件完整性和一致性
  - 新增 NPM 包集成测试，确保构建过程中 i18n 文件正确分发
  - 增强现有测试套件，提供完整的 i18n 模拟支持

  ## New Features
  - Add i18n integrity test suite to automatically validate translation completeness and consistency
  - Add NPM package integration test to ensure proper i18n file distribution in builds
  - Enhance existing test suites with comprehensive i18n mocking support

  ## 修复
  - 修复 CLI 帮助文本格式问题，移除章节标题中的多余冒号
  - 统一所有语言文件中的格式规范，改进用户体验

  ## Fixes
  - Fix CLI help text formatting by removing redundant colons from section headers
  - Standardize formatting across all language files for improved user experience

  ## 优化
  - 优化测试覆盖率配置，排除开发专用目录
  - 更新 .gitignore 配置，排除 NPM 测试产物和临时文件
  - 改进构建脚本中的测试覆盖率命令

  ## Optimization
  - Optimize test coverage configuration to exclude development-only directories
  - Update .gitignore to exclude npm test artifacts and temporary files
  - Improve test coverage command in build scripts

## 2.12.6

### Patch Changes

- ## 修复
  - 改进 i18n 国际化系统的包路径解析机制
  - 支持 NPM 包安装后的路径查找（/node_modules/zcf/dist/i18n/locales）
  - 添加包根目录自动检测，通过搜索 package.json 定位
  - 增加多种备用路径支持，提升各种打包结构的兼容性
  - 优化生产部署环境的国际化文件加载

  ## Fixes
  - Improve i18n package path resolution mechanism
  - Support path finding after NPM package installation (/node_modules/zcf/dist/i18n/locales)
  - Add automatic package root detection by searching for package.json
  - Add multiple fallback path support for better compatibility with various bundling structures
  - Optimize i18n file loading in production deployment environments

## 2.12.5

### Patch Changes

- ## 文档优化
  - 修正 Spec 工作流仪表板说明，移除误导性的自动启动描述
  - 提供手动启动仪表板的正确命令和 VS Code 扩展选项
  - 改善用户体验，将仪表板设为可选而非干扰性功能

  ## 功能修复
  - 简化 CCR 菜单配置检查逻辑
  - 修复 CCR 配置验证流程

  ## 架构重构
  - 实现 i18next 国际化系统，完全替换原有语言检测方法
  - 将翻译文件从 TypeScript 转换为 JSON 格式，提升性能和维护性
  - 重构 i18n 模块架构，采用命名空间组织方式
  - 优化跨平台兼容性和代码质量

  ## Documentation Enhancement
  - Fix Spec Workflow dashboard description by removing misleading automatic launch info
  - Provide correct manual dashboard launch command and VS Code extension option
  - Improve user experience by making dashboard optional rather than intrusive

  ## Bug Fixes
  - Simplify CCR menu configuration check logic
  - Fix CCR configuration validation process

  ## Architecture Refactor
  - Implement i18next internationalization system, completely replacing previous language detection
  - Convert translation files from TypeScript to JSON format for better performance and maintainability
  - Refactor i18n module architecture with namespace-based organization
  - Improve cross-platform compatibility and code quality

  🤖 Generated with [Claude Code](https://claude.ai/code)

## 2.12.4

### Patch Changes

- ## 新功能
  - 新增 spec-workflow MCP 工作流支持，提供规范化开发流程管理
  - 重构 MCP 服务配置架构，采用专用模块化设计

  ## 架构优化
  - 重构 MCP 服务配置到专用模块 `src/config/mcp-services.ts`
  - 实现类型安全的 MCP 服务定义和翻译系统
  - 优化版本检查器实现，提升工具链稳定性

  ## 文档完善
  - 更新命令文档，完善 zcf-release 和 zcf-update-docs 使用说明
  - 改进 README 文档，增加 spec-workflow 集成说明
  - 完善模板变更日志和 bmad 工作流文档

  ## 测试增强
  - 新增 MCP 服务配置模块完整测试覆盖
  - 优化 MCP 选择器测试用例
  - 修复边缘测试文件管理问题

  ## 配置改进
  - 增强 MCP 服务多语言支持 (zh-CN/en)
  - 更新拼写检查字典配置
  - 改进类型定义和代码组织结构

  ## New Features
  - Add spec-workflow MCP integration for standardized development process management
  - Refactor MCP services configuration with dedicated modular architecture

  ## Architecture Optimization
  - Extract MCP services configuration to dedicated `src/config/mcp-services.ts` module
  - Implement type-safe MCP service definitions with translation system
  - Optimize version checker implementation for improved toolchain stability

  ## Documentation Enhancement
  - Update command documentation with comprehensive zcf-release and zcf-update-docs guides
  - Improve README documentation with spec-workflow integration details
  - Enhance template changelog and bmad workflow documentation

  ## Testing Enhancement
  - Add comprehensive test coverage for MCP services configuration module
  - Optimize MCP selector test cases
  - Fix edge test file management issues

  ## Configuration Improvements
  - Enhance MCP services multilingual support (zh-CN/en)
  - Update spell check dictionary configuration
  - Improve type definitions and code organization structure

## 2.12.3

### Patch Changes

- ## 模板优化
  - 优化 BMad 初始化命令模板，提升系统设置引导体验
  - 增强英文 bmad-init 模板描述，提供更全面的工作流程说明（+76 行）
  - 完善中文 bmad-init 模板功能覆盖，改进用户初始化体验（+74 行）
  - 改进模板文档结构，提供更清晰的 BMad 系统配置指导
  - 更新猫娘工程师输出样式模板，增强自称和用户称呼规范
  - 完善猫娘工程师身份认知描述，优化双语模板一致性

  ## Template Optimization
  - Optimize BMad initialization command templates for improved system setup guidance
  - Enhance English bmad-init template descriptions with comprehensive workflow coverage (+76 lines)
  - Improve Chinese bmad-init template functionality with better user initialization experience (+74 lines)
  - Refine template documentation structure with clearer BMad system configuration guidance
  - Update nekomata engineer output style templates with enhanced self-reference and user address specifications
  - Improve nekomata engineer identity recognition descriptions with bilingual template consistency

  注：本版本变更主要涉及 BMad 模板优化。其他 BMad 系统文件的批量更新为 bmad-init 触发的自动同步，非 ZCF 核心功能变更。

  Note: This version primarily focuses on BMad template optimization. Other bulk BMad system file updates are automatic synchronizations triggered by bmad-init, not ZCF core functionality changes.

## 2.12.2

### Patch Changes

- ## 新功能
  - 增强老王工程师输出样式，添加全面的技术工作标准和操作确认机制
  - 为高风险操作增加危险操作确认机制，包括文件删除、Git 操作等
  - 集成编程原则（KISS、YAGNI、DRY、SOLID）到工作流程中
  - 建立持续问题解决的行为指导原则

  ## New Features
  - Enhance laowang-engineer output style with comprehensive technical work standards and operation confirmation mechanism
  - Add dangerous operation confirmation mechanism for high-risk tasks including file deletion, Git operations
  - Integrate programming principles (KISS, YAGNI, DRY, SOLID) into workflow processes
  - Establish persistent problem-solving behavioral guidelines

  ## 优化
  - 更新猫娘工程师角色名称，从 Nova 更改为幽浮喵（UFO Nya）以保持品牌一致性
  - 简化配置文件中的过时注释，提升代码可读性
  - 标准化输出样式模板的格式，移除冗余部分
  - 改进模板文档的颜文字使用示例和情感表达指导

  ## Optimization
  - Update nekomata engineer character name from Nova to UFO Nya for better brand consistency
  - Simplify outdated comments in configuration files to improve code readability
  - Standardize format of output style templates by removing redundant sections
  - Improve kaomoji usage examples and emotional expression guidance in template documentation

  ## 修复
  - 统一所有模板中关于 Git 提交的警告信息格式
  - 修复配置操作中的注释不准确问题
  - 保持中英文模板之间的一致性

  ## Fixes
  - Unify format of Git commit warning messages across all templates
  - Fix inaccurate comments in configuration operations
  - Maintain consistency between Chinese and English templates

## 2.12.1

### Patch Changes

- ## 修复
  - 修复版本检查器中的 require() 调用问题，替换为 ESM 兼容的动态 import
  - 修复 ESM 模块加载兼容性问题

  ## Fixes
  - Fix require() calls in version-checker, replace with ESM-compatible dynamic import
  - Fix ESM module loading compatibility issues

  ## 优化
  - 提升代码质量和开发体验
  - 优化 output-style 功能的类型定义和错误处理
  - 改进测试用例覆盖率和代码组织结构
  - 增强 ESLint 配置以提升代码质量

  ## Optimization
  - Enhance code quality and development experience
  - Improve output-style feature type definitions and error handling
  - Better test coverage and code organization
  - Enhanced ESLint configuration for better code quality

  ## 文档
  - 增强 AI output-style 功能相关文档
  - 更新 README 文件中的功能说明
  - 完善 CLAUDE.md 配置指南

  ## Documentation
  - Enhance AI output-style feature documentation
  - Update README files with feature descriptions
  - Improve CLAUDE.md configuration guidelines

## 2.12.0

### Minor Changes

- ## 重构与新功能
  - 将 AI 个性化配置重构为输出样式系统，提供更灵活的 Claude Code 输出定制
  - 新增三种预设输出样式：专业工程师、老王工程师、猫娘工程师
  - 为 git-worktree 工作流程增加环境文件自动拷贝功能

  ## Refactoring and New Features
  - Refactor AI personality configuration to output styles system for more flexible Claude Code output customization
  - Add three preset output styles: professional engineer, laowang engineer, and nekomata engineer
  - Add automatic environment file copying feature for git-worktree workflow

  ## 优化与改进
  - 优化拼写检查配置，提升文档质量控制
  - 统一初始化命令引用为 /init-project
  - 增强项目文档同步和 AI 上下文信息

  ## Optimization and Improvements
  - Optimize spell checking configuration for better document quality control
  - Unify initialization command reference to /init-project
  - Enhance project documentation synchronization and AI context information

  ## 测试覆盖
  - 新增输出样式系统的完整测试覆盖
  - 优化配置操作相关测试用例
  - 增强 CLI 设置功能的测试稳定性

  ## Test Coverage
  - Add comprehensive test coverage for output styles system
  - Optimize configuration operation related test cases
  - Enhance test stability for CLI setup functionality

## 2.11.0

### Minor Changes

- ## 新功能
  - Git worktree 命令增加智能 IDE 检测和自动打开功能，支持 VS Code、Cursor、WebStorm 等
  - 新增通用工具工作流，包含 init-project 命令和相关代理
  - 添加全面的模块文档系统，包含命令、工具、类型等模块的 CLAUDE.md
  - 引入 ESLint 配置和代码格式化标准

  ## New Features
  - Add intelligent IDE detection and auto-open functionality to git-worktree command, supporting VS Code, Cursor, WebStorm, etc.
  - Add common tools workflow with init-project command and related agents
  - Add comprehensive module documentation system including CLAUDE.md for commands, utils, types modules
  - Introduce ESLint configuration and code formatting standards

  ## 优化
  - 重构测试目录结构，从 test 重命名为 tests 提高一致性
  - 优化 AI 上下文和项目文档结构
  - 增强多语言模板和工作流文档
  - 改进 Git 工作流命令文档

  ## Optimization
  - Refactor test directory structure, rename from test to tests for better consistency
  - Optimize AI context and project documentation structure
  - Enhance multilingual templates and workflow documentation
  - Improve Git workflow command documentation

  ## 代码质量
  - 统一代码格式化和 ESLint 规则
  - 清理旧测试文件并重新组织
  - 同步文档与最新代码变更

  ## Code Quality
  - Unify code formatting and ESLint rules
  - Clean up old test files and reorganize structure
  - Sync documentation with latest code changes

  ## 鸣谢
  - 感谢 @konbakuyomu 提供的层级初始化方案和原始 md

  ## Acknowledgments
  - Thanks to @konbakuyomu for providing the hierarchical initialization scheme and original markdown

## 2.10.2

### Patch Changes

- ## 文档改进
  - 添加项目行为准则和贡献指南，规范开源协作流程
  - 完善开发指南和架构文档，提升开发者体验
  - 改进 README 文档，添加 CCometixLine TUI 配置功能说明

  ## 功能完善
  - 增强 CCometixLine 菜单选项，提供交互式终端 UI 配置
  - 优化 CCometixLine 命令处理和错误处理机制
  - 完善相关国际化翻译和测试用例

  ## Documentation Improvements
  - Add Code of Conduct and Contributing Guidelines to standardize open-source collaboration
  - Enhanced development guidelines and architecture documentation for better developer experience
  - Improved README documentation with CCometixLine TUI configuration feature descriptions

  ## Feature Enhancements
  - Enhanced CCometixLine menu options with interactive terminal UI configuration
  - Optimized CCometixLine command processing and error handling mechanisms
  - Improved internationalization translations and corresponding test cases

## 2.10.1

### Patch Changes

- ## 新功能
  - 实现 CCR 代理配置跳过提示模式，支持非交互式部署
  - 扩展 `--skip-prompt` 选项对 CCR 代理配置的支持

  ## New Features
  - Implement skip-prompt mode for CCR proxy configuration with non-interactive deployment support
  - Extend `--skip-prompt` option support for CCR proxy configuration

  ## 修复
  - 修复版本检查器中 ccline 包名和作用域配置问题

  ## Fixes
  - Fix package name and scope configuration in version checker for ccline

## 2.10.0

### Minor Changes

- ## 新功能
  - 添加 `--skip-prompt` 非交互模式选项，支持自动化脚本集成
  - 新增快捷参数映射，简化命令行使用体验

  ## New Features
  - Add `--skip-prompt` non-interactive mode option for automation script integration
  - Add shortcut parameter mapping for simplified command-line experience

  ## 优化
  - 优化 init 命令测试套件性能，提升开发体验
  - 完善工作流安装器错误处理机制

  ## Optimization
  - Optimize init command test suite performance for better development experience
  - Improve workflow installer error handling mechanism

  ## 文档
  - 更新 README 双语文档，新增非交互模式使用说明
  - 完善功能特性说明和使用示例

  ## Documentation
  - Update bilingual README documentation with non-interactive mode usage
  - Improve feature descriptions and usage examples

  ## 测试
  - 新增 582 行 `--skip-prompt` 功能专项测试
  - 增强 CLI 设置相关测试覆盖率
  - 优化现有测试用例的稳定性

  ## Testing
  - Add 582 lines of specialized tests for `--skip-prompt` functionality
  - Enhance CLI setup test coverage
  - Improve stability of existing test cases

## 2.9.11

### Patch Changes

- ## 新功能
  - 新增 OpusPlan 模型选项，支持用 Opus 做计划，Sonnet 编写代码的混合策略
  - 添加 Opus 独占模式选项，提供更高质量但更高成本的处理能力

  ## New Features
  - Add OpusPlan model option - use Opus for planning and Sonnet for coding (recommended hybrid strategy)
  - Add Opus-only mode option for higher quality but higher cost processing

  ## 优化
  - 重构预设选择排序逻辑，提升用户体验
  - 优化代码导入顺序，提升可读性
  - 改进模型配置选项的描述文本

  ## Optimization
  - Refactor preset selection ordering logic for better user experience
  - Optimize code import ordering for better readability
  - Improve model configuration option descriptions

  ## 修复
  - 修复配置验证逻辑
  - 完善测试覆盖率

  ## Fixes
  - Fix configuration validation logic
  - Improve test coverage

## 2.9.10

### Patch Changes

- ## 新功能
  - 添加 CCometixLine 状态栏配置支持，提供完整的状态栏设置功能
  - 实现状态栏验证器，确保配置的有效性和一致性
  - 新增状态栏配置工具，支持基础和高级模板选择

  ## New Features
  - Add CCometixLine status line configuration support with complete setup functionality
  - Implement status line validator to ensure configuration validity and consistency
  - Add status line configuration utility with basic and advanced template options

  ## 文档优化
  - 重新组织 CCometixLine 相关文档结构，提升可读性
  - 更新项目截图，展示最新功能界面
  - 优化 CLI 帮助文本，提供更清晰的使用指导

  ## Documentation
  - Reorganize CCometixLine documentation structure for better readability
  - Update project screenshots showcasing latest feature interfaces
  - Improve CLI help text for clearer usage guidance

  ## 测试增强
  - 新增状态栏配置功能的全面测试覆盖
  - 添加集成测试确保功能稳定性
  - 增强现有测试用例的健壮性

  ## Testing
  - Add comprehensive test coverage for status line configuration features
  - Include integration tests to ensure functionality stability
  - Enhance robustness of existing test suites

## 2.9.9

### Patch Changes

- ## 新功能
  - 添加 Cometix 集成支持 - 基于 Rust 的高性能 Claude Code 状态栏工具，集成 Git 信息和实时使用量跟踪
  - 新增 Cometix 命令管理和安装器
  - 实现完整的 Cometix 菜单系统和用户交互
  - 支持 Cometix 错误处理和状态管理

  ## New Features
  - Add Cometix integration support - High-performance Rust-based Claude Code statusline tool with Git integration and real-time usage tracking
  - Implement Cometix command management and installer
  - Provide complete Cometix menu system and user interaction
  - Support Cometix error handling and state management

  ## 优化
  - 重构工具模块结构，改进代码组织
  - 增强国际化支持，新增 Cometix 相关翻译
  - 完善菜单系统的多语言支持

  ## Optimization
  - Refactor tool module structure for better code organization
  - Enhanced internationalization with Cometix-related translations
  - Improve menu system multilingual support

  ## 测试
  - 新增 Cometix 功能的全面测试覆盖
  - 添加命令管理、安装器和菜单的单元测试

  ## Testing
  - Add comprehensive test coverage for Cometix functionality
  - Implement unit tests for command management, installer and menu features

## 2.9.8

### Patch Changes

- ## 新功能
  - 添加 git-worktree 命令，支持在 .zcf/ 目录下管理多个工作树
  - 支持 worktree 的创建、列表、删除和迁移操作
  - 自动配置 git 忽略规则，避免 worktree 目录被意外提交
  - 支持 IDE 快速打开 worktree (VS Code, Cursor, WebStorm)
  - 支持跨 worktree 内容迁移，包括未提交更改和 stash 内容

  ## New Features
  - Add git-worktree command for managing multiple working trees in .zcf/ directory
  - Support worktree add, list, remove, and migrate operations
  - Automatically configure git ignore rules to prevent worktree directories from being committed
  - Support quick IDE opening for worktrees (VS Code, Cursor, WebStorm)
  - Support content migration across worktrees, including uncommitted changes and stash content

## 2.9.7

### Patch Changes

- ## 优化
  - 移除版本检查缓存机制，实现实时版本检查
  - 简化 getLatestVersion 函数逻辑，直接查询 npm registry
  - 避免缓存过期导致的版本检测延迟问题

  ## Optimization
  - Remove version cache mechanism for real-time version checking
  - Simplify getLatestVersion function logic to directly query npm registry
  - Avoid version detection delays caused by cache expiry

  ## 文档
  - 添加赞助者信息到 README 文件

  ## Documentation
  - Add sponsors section to README files

## 2.9.6

### Patch Changes

- ## 新功能
  - 在 ZCF 菜单中添加检查更新选项 (+)，支持一键检查并更新 Claude Code 和 CCR 版本
  - 支持通过菜单直接访问检查更新功能，提升用户体验

  ## New Features
  - Add check updates option (+) to ZCF menu for one-click checking and updating Claude Code and CCR versions
  - Support direct access to check updates feature via menu, improving user experience

  ## 文档
  - 更新中英文 README 文档，说明新的菜单选项使用方法
  - 同步菜单功能描述与实际代码实现

  ## Documentation
  - Update bilingual README documentation with new menu option usage
  - Synchronize menu feature descriptions with actual code implementation

  ## 测试
  - 添加完整的 TDD 测试用例覆盖新功能
  - 确保菜单选项验证和处理逻辑的正确性

  ## Testing
  - Add comprehensive TDD test coverage for new functionality
  - Ensure correctness of menu option validation and handling logic

## 2.9.5

### Patch Changes

- ## 修复
  - 改进 CCR 包检测和替换逻辑，确保正确安装 @musistudio/claude-code-router 包
  - 修复当旧的错误包存在时的安装流程问题
  - 移除导致 CI 测试失败的时间相关断言

  ## 优化
  - 增强包检测机制，同时验证命令存在性和正确包的安装状态
  - 优化 CCR 安装状态结构，提供更详细的安装信息

  ## Fixes
  - Improve CCR package detection and replacement logic to ensure correct @musistudio/claude-code-router package installation
  - Fix installation flow issues when old incorrect package exists
  - Remove flaky time-based test assertions causing CI failures

  ## Optimization
  - Enhance package detection mechanism to verify both command existence and correct package installation status
  - Optimize CCR installation status structure for more detailed installation information

## 2.9.4

### Patch Changes

- ## 修复
  - 改进 CCR 包检测和替换逻辑
  - 即使 ccr 命令存在也会检查是否安装了错误的包
  - 在安装正确的包之前自动卸载 claude-code-router
  - 确保始终安装正确的 @musistudio/claude-code-router 包

  ## Fixes
  - Improve CCR package detection and replacement logic
  - Check for incorrect package even when ccr command exists
  - Automatically uninstall claude-code-router before installing the correct package
  - Ensure @musistudio/claude-code-router is always correctly installed

## 2.9.3

### Patch Changes

- ## 修复
  - 修正 CCR 包名从 `claude-code-router` 到 `@musistudio/claude-code-router`
  - 更新所有相关引用和测试用例
  - 在 README 中添加 v2.9.1 版本用户的重要提示

  ## Fixes
  - Correct CCR package name from `claude-code-router` to `@musistudio/claude-code-router`
  - Update all related references and test cases
  - Add important note for v2.9.1 users in README

## 2.9.2

### Patch Changes

- ## 修复
  - 修正 CCR 包名引用，统一使用 @musistudio/claude-code-router
  - 移除版本检查和自动更新中的错误包名回退逻辑
  - 更新测试文件中的包名引用

  ## Fixes
  - Correct CCR package name references to use @musistudio/claude-code-router consistently
  - Remove incorrect package name fallback logic in version checking and auto-update
  - Update package name references in test files

## 2.9.1

### Patch Changes

- ## 修复
  - 移除工具描述中重复的 ccusage GitHub 链接

  ## Fixes
  - Remove duplicate ccusage GitHub link from tools description

  ## 文档
  - 更新帮助命令，补充新功能说明
  - 优化 ccr 和 ccu 命令描述
  - 添加 check-updates 命令文档
  - 增加 check 快捷方式说明

  ## Documentation
  - Update help command with new features documentation
  - Optimize ccr and ccu command descriptions
  - Add check-updates command documentation
  - Add check shortcut alias documentation

## 2.9.0

### Minor Changes

- ## 新功能
  - 新增 Git 工作流命令套件，包含智能提交、安全回滚、分支清理功能
  - 添加 /zcf-update-docs 命令，自动检查并同步文档与代码实现
  - Git 命令支持自动暂存、智能生成提交信息、批量分支清理
  - 感谢@konbakuyomu 提供的 git commands

  ## New Features
  - Add Git workflow command suite with smart commit, safe rollback, and branch cleanup
  - Add /zcf-update-docs command for automatic documentation synchronization
  - Git commands support auto-staging, intelligent commit message generation, and batch branch cleanup
  - Thank you to @konbakuyomu for providing these Git commands

  ## 优化
  - 完善工作流安装系统，支持模块化命令安装
  - 更新界面截图，展示最新的用户界面

  ## Optimization
  - Improve workflow installation system with modular command installation support
  - Update screenshots to show the latest user interface

  ## 测试
  - 为 Git 工作流添加全面的单元测试和边缘测试
  - 增加工作流配置和安装器的测试覆盖率

  ## Testing
  - Add comprehensive unit tests and edge tests for Git workflow
  - Increase test coverage for workflow configuration and installer

  ## 文档
  - 更新 README 文档，添加 Git 命令的详细说明
  - 同步中英文文档，保持内容一致性

  ## Documentation
  - Update README documentation with detailed Git command descriptions
  - Synchronize Chinese and English documentation for consistency

## 2.8.2

### Patch Changes

- ## 修复
  - 改进 CCR start 命令的错误处理机制
  - 优化 CCR 安装程序逻辑和测试覆盖

  ## 文档
  - 增强 MCP 服务使用指南，添加详细的使用场景和示例
  - 完善技术执行指南，新增 AI 助手行为准则
  - 改进文档结构和格式，提升可读性
  - 更新中英文版本的内存模板

  ## Fixes
  - Improve error handling for CCR start command
  - Optimize CCR installer logic and test coverage

  ## Documentation
  - Enhance MCP service usage guide with detailed use cases and examples
  - Improve technical execution guidelines with AI assistant behavior principles
  - Refine documentation structure and formatting for better readability
  - Update memory templates for both Chinese and English versions

## 2.8.1

### Patch Changes

- ## 新功能
  - 添加版本检查和自动更新功能，支持 CCR 和 Claude Code 的版本检查与更新
  - 新增默认模型配置选项，改进语言配置提示体验
  - 新增 `check-updates` 命令，用于检查和更新工具到最新版本

  ## New Features
  - Add version check and auto-update functionality for CCR and Claude Code
  - Add default model configuration option and improve language configuration prompts
  - Add `check-updates` command to check and update tools to latest versions

  ## 优化
  - 改进测试覆盖率，添加边缘测试用例
  - 增强 CCR 功能文档，添加自动更新说明

  ## Optimization
  - Improve test coverage with edge case tests
  - Enhance CCR feature documentation with auto-update instructions

  ## 文档
  - 更新 README 文件，添加新功能说明
  - 完善赞助信息，添加支付二维码

  ## Documentation
  - Update README files with new feature descriptions
  - Add sponsor information with payment QR codes

## 2.8.0

### Minor Changes

- ## 新功能
  - 添加 CCR (Claude Code Runner) 代理配置支持，帮助企业用户配置 Claude Code 代理
  - 实现 CCR 交互式管理菜单，支持预设配置和自定义代理设置
  - 为所有 inquirer 列表提示添加序号，改善用户体验
  - CCR 支持跳过选项，允许用户手动配置

  ## New Features
  - Add CCR (Claude Code Runner) proxy configuration support for enterprise users
  - Implement interactive CCR management menu with preset configurations and custom proxy settings
  - Add sequential numbers to all inquirer list prompts for better user experience
  - Support skip option in CCR for manual configuration

  ## 优化
  - 重构 i18n 系统为模块化结构，提升代码组织性和可维护性
  - 改进配置合并逻辑，更好地处理复杂配置场景
  - 优化初始化流程中的功能显示和选择

  ## Optimization
  - Refactor i18n system to modular structure for better code organization and maintainability
  - Improve configuration merge logic for better handling of complex scenarios
  - Optimize feature display and selection in initialization flow

  ## 测试
  - 为 CCR 功能添加全面的单元测试和边缘测试
  - 新增 prompt-helpers 工具函数的测试覆盖

  ## Testing
  - Add comprehensive unit tests and edge tests for CCR features
  - Add test coverage for prompt-helpers utility functions

  ## 文档
  - 更新 README 文件，添加 CCR 功能的详细文档
  - 完善命令行参数说明和使用示例

  ## Documentation
  - Update README files with detailed CCR feature documentation
  - Improve command-line parameter descriptions and usage examples

## 2.7.1

### Patch Changes

- ## 修复
  - 改进用户提示信息，在 Exa API Key 输入提示中添加获取链接
  - 在选项输入提示中添加不区分大小写的说明
  - 优化中英文翻译的一致性

  ## Fixes
  - Improve user prompts by adding URL to Exa API key input prompt
  - Add case-insensitive note to choice input prompt
  - Optimize consistency of Chinese and English translations

  ## 文档
  - 更新 CHANGELOG 中 ccu 命令的描述

  ## Documentation
  - Update ccu command description in CHANGELOG

## 2.7.0

### Minor Changes

- ## 新功能
  - 新增 `ccu` 命令用于 Claude Code 用量分析
  - 实现 Claude Code 使用情况统计和分析工具
  - 菜单界面新增 CCU (Claude Code Usage) 选项
  - 完善用量统计消息的多语言支持

  ## New Features
  - Add `ccu` command for Claude Code usage analysis
  - Implement Claude Code usage statistics and analysis tools
  - Add CCU (Claude Code Usage) option to menu interface
  - Add multilingual support for usage statistics messages

  ## 测试
  - 为 ccu 命令添加全面的单元测试
  - 为用量分析模块添加边界测试覆盖

  ## Testing
  - Add comprehensive unit tests for ccu command
  - Add edge case test coverage for usage analysis module

  ## 文档
  - 更新 README 添加 ccu 命令说明
  - 更新项目计划文档

  ## Documentation
  - Update README with ccu command documentation
  - Update project planning documentation

## 2.6.1

### Patch Changes

- ## 文档
  - 更新 zcf-release 命令文档，强调不手动创建标签的重要性
  - 改进发布流程说明，明确 GitHub Actions 自动化处理

  ## Documentation
  - Update zcf-release command documentation to emphasize no manual tag creation
  - Improve release workflow documentation, clarify GitHub Actions automation

## 2.6.0

### Minor Changes

- ## 新功能
  - 新增 BMad (Business-Minded Agile Development) 企业级工作流系统
  - 支持模块化工作流安装，可选择安装六步工作流、功能规划或 BMad 工作流
  - 添加完整的 BMad 代理团队（PO、PM、架构师、开发、QA、SM、分析师、UX 专家）
  - 新增工作流依赖管理和自动清理旧版本文件功能
  - 国际化架构重构，提取所有字符串到独立的 i18n 模块
  - 添加多选提示的共享常量，改善用户交互体验

  ## New Features
  - Add BMad (Business-Minded Agile Development) enterprise workflow system
  - Support modular workflow installation with selectable workflows (Six Steps, Feature Planning, BMad)
  - Add complete BMad agent team (PO, PM, Architect, Dev, QA, SM, Analyst, UX Expert)
  - Add workflow dependency management and automatic cleanup of old version files
  - Refactor i18n architecture with all strings extracted to separate modules
  - Add shared constant for multiselect hints to improve user interaction

  ## 优化
  - 重构模板目录结构，按功能分类组织（memory、workflow）
  - 改进工作流配置系统，支持类别、顺序和自动安装代理
  - 优化配置操作测试覆盖率达到 100%
  - 增强工作流安装器测试，覆盖率达到 86.57%

  ## Optimization
  - Restructure template directory by function categories (memory, workflow)
  - Improve workflow configuration system with categories, ordering, and auto-install agents
  - Optimize config operations test coverage to 100%
  - Enhance workflow installer tests with 86.57% coverage

  ## 文档
  - 更新 README 文档，添加 BMad 工作流说明和使用指南
  - 更新 CLAUDE.md，添加工作流系统架构说明
  - 修正交互式菜单描述，与实际实现保持一致
  - 添加 cspell 配置文件，支持代码拼写检查

  ## Documentation
  - Update README with BMad workflow descriptions and usage guide
  - Update CLAUDE.md with workflow system architecture
  - Fix interactive menu descriptions to match implementation
  - Add cspell configuration for code spell checking

## 2.5.2

### Patch Changes

- ## 修复
  - 移除配置文件不存在时的强制退出判断，支持无权限环境下的优雅降级
  - 为 zcf 配置读写添加静默错误处理，提升兼容性

  ## Fixes
  - Remove forced exit when config file doesn't exist, support graceful degradation in permission-restricted environments
  - Add silent error handling for zcf config read/write operations, improving compatibility

## 2.5.1

### Patch Changes

- ## 新功能
  - 将 Exa MCP 服务改为本地环境变量配置方式，提升安全性
  - 支持通过环境变量传递 API 密钥，避免在命令行参数中暴露

  ## New Features
  - Switch Exa MCP service to local environment-based configuration for better security
  - Support passing API keys through environment variables to avoid exposure in command arguments

  ## 优化
  - 增强 buildMcpServerConfig 函数以支持环境变量配置
  - 改进 MCP 服务配置的测试覆盖率

  ## Optimization
  - Enhance buildMcpServerConfig function to support environment variable configuration
  - Improve test coverage for MCP service configuration

  ## 文档
  - 更新 README 中的项目名称引用
  - 添加 DeepWiki 徽章到中英文文档

  ## Documentation
  - Update project name references in README
  - Add DeepWiki badge to both English and Chinese documentation

  ## 其他
  - 升级 GitHub Actions 中的 Codecov action 到 v5

  ## Others
  - Upgrade Codecov action to v5 in GitHub Actions

## 2.5.0

### Minor Changes

- ## 新功能
  - 添加完整的测试套件，包括单元测试和集成测试
  - 新增测试覆盖率报告功能
  - 支持 vitest 测试框架的多种运行模式
  - 添加测试辅助工具和 mock 支持
  - 新增 CI/CD 测试覆盖率检查

  ## New Features
  - Add comprehensive test suite including unit and integration tests
  - Add test coverage reporting functionality
  - Support multiple vitest test framework run modes
  - Add test helpers and mock support
  - Add CI/CD test coverage checks

  ## 优化
  - 重构 CLI 架构，将命令设置逻辑分离到独立模块
  - 改进项目文档结构，README 英文版改为 README_zh.md
  - 更新 CLAUDE.md 开发指南，添加详细的测试说明
  - 优化 CI 工作流程，集成测试覆盖率检查

  ## Optimization
  - Refactor CLI architecture, separate command setup logic to standalone module
  - Improve project documentation structure, rename README English version to README_zh.md
  - Update CLAUDE.md development guide with detailed testing instructions
  - Optimize CI workflow with integrated test coverage checks

  ## 文档
  - 新增完整的测试文档 (test/README.md)
  - 更新开发命令说明，添加测试相关命令
  - 完善架构说明，包含测试策略和覆盖率目标

  ## Documentation
  - Add comprehensive testing documentation (test/README.md)
  - Update development command instructions with testing commands
  - Improve architecture documentation including test strategy and coverage goals

## 2.4.1

### Patch Changes

- ## 修复
  - 修复权限配置合并时的冗余和无效项问题
  - 自动清理 v2.0 之前版本的无效 `mcp__.*` 权限配置
  - 移除以模板权限开头的冗余权限（如存在 `Bash` 时移除 `Bash(*)`）
  - 优化 Windows 系统检测提示的显示逻辑

  ## Fixes
  - Fix redundant and invalid items in permission configuration merging
  - Automatically clean up invalid `mcp__.*` permission configs from versions before v2.0
  - Remove redundant permissions that start with template permissions (e.g., remove `Bash(*)` when `Bash` exists)
  - Optimize Windows system detection message display logic

  ## 技术改进
  - 新增 `permission-cleaner` 工具模块，提供可复用的权限清理函数
  - 改进权限合并逻辑，确保配置文件的整洁性

  ## Technical Improvements
  - Add `permission-cleaner` utility module providing reusable permission cleanup functions
  - Improve permission merging logic to ensure configuration file cleanliness

## 2.4.0

### Minor Changes

- ## 新功能
  - 添加环境变量和权限导入功能，支持从 settings.json 批量导入配置
  - 添加文档更新检查功能，任务完成后自动提醒更新相关文档
  - 更新技术执行指南，添加文档更新检查流程
  - 优化交互式菜单，支持配置环境变量和权限

  ## New Features
  - Add environment variables and permissions import feature, support bulk import from settings.json
  - Add documentation update check functionality, auto-remind to update docs after task completion
  - Update technical execution guidelines with documentation update check process
  - Enhance interactive menu with environment variables and permissions configuration

  ## 文档更新
  - 更新 README.md 和 README_EN.md，补充 v2.1-v2.3 版本特性说明
  - 更新 CLAUDE.md，添加完整的版本特性更新历史
  - 更新截图，反映最新的交互界面

  ## Documentation Updates
  - Update README.md and README_EN.md with v2.1-v2.3 version features
  - Update CLAUDE.md with complete version feature update history
  - Update screenshots to reflect latest interactive interface

## 2.3.0

### Minor Changes

- ## 新功能
  - 添加危险操作确认机制，提升 Claude Code 使用安全性
  - 优化技术执行指南文档，减少 token 消耗约 30%

  ## New Features
  - Add dangerous operations confirmation mechanism for improved Claude Code safety
  - Optimize technical execution guidelines documentation, reducing token consumption by ~30%

  ## 详细说明

  ### 危险操作确认

  需要用户确认的操作：
  - 文件系统：删除、批量修改、移动系统文件
  - 代码提交：git commit、push、reset --hard
  - 系统配置：环境变量、系统设置、权限变更
  - 数据操作：数据库删除、结构变更、批量更新
  - 网络请求：发送敏感数据、调用生产 API
  - 包管理：全局安装/卸载、更新核心依赖

  ### Details

  ### Dangerous Operations Confirmation

  Operations requiring user confirmation:
  - File System: Delete, bulk modifications, move system files
  - Code Commits: git commit, push, reset --hard
  - System Config: Environment variables, system settings, permissions
  - Data Operations: Database deletions, schema changes, bulk updates
  - Network Requests: Send sensitive data, call production APIs
  - Package Management: Global install/uninstall, update core dependencies

## 2.2.0

### Minor Changes

- ## 新功能
  - 添加技术执行指南文档，提供命令执行最佳实践
  - 新增 /zcf-release 自动化发版命令
  - 支持跨平台路径处理，自动为包含空格的路径添加引号
  - 优先使用 ripgrep 提升文件内容搜索性能

  ## New Features
  - Add technical execution guidelines with command best practices
  - Add /zcf-release automated release command
  - Support cross-platform path handling with automatic quotes for paths with spaces
  - Prioritize ripgrep for better file content search performance

  ## 文档更新
  - 新增中英文技术指南模板文件
  - 更新项目级 CLAUDE.md 模板

  ## Documentation Updates
  - Add technical guide template files in Chinese and English
  - Update project-level CLAUDE.md template

## 2.1.2

### Patch Changes

- ## 优化
  - 优化初始化流程，移除文档更新的特殊处理
  - 简化配置步骤，提升用户体验
  - 减少不必要的代码复杂度

  ## Optimization
  - Optimize initialization process and remove special handling for document updates
  - Simplify configuration steps to improve user experience
  - Reduce unnecessary code complexity

## 2.1.1

### Patch Changes

- 修复 npm 发布透明日志冲突问题

  Fix npm publish transparency log conflict issue

## 2.1.0

### Minor Changes

- faca88e: 新增 Termux 环境支持和增强的命令检测功能
  - 支持在 Termux 环境下运行 ZCF
  - 增强命令检测机制，自动识别可用命令

- 429794a: 修复中文模板文件的 description 字段使用中文描述
  - 将 workflow.md 的英文描述改为中文
  - 扩充 feat.md 的中文描述，使其更详细
  - 优化 workflow 命令的需求完整性评分机制

- 8b19bde: 修复 API 配置修改后无法返回菜单的问题
  - 修复部分修改功能执行后无法正确返回菜单
  - 改进菜单导航流程

- 22aa4cf: 替换 @posva/prompts 为 inquirer 解决 UI 渲染问题
  - 解决交互式界面渲染异常
  - 提升用户交互体验

---

- faca88e: Add Termux environment support with enhanced command detection
  - Support running ZCF in Termux environment
  - Enhanced command detection to automatically identify available commands

- 429794a: Fix Chinese template files description fields to use Chinese descriptions
  - Changed workflow.md description from English to Chinese
  - Enhanced feat.md Chinese description with more details
  - Optimized workflow command requirement scoring mechanism

- 8b19bde: Fixed the issue where some modification functions could not return to the menu
  - Fixed menu return issue after API configuration modifications
  - Improved menu navigation flow

- 22aa4cf: Replace @posva/prompts with inquirer to resolve UI rendering issues
  - Resolved interactive UI rendering anomalies
  - Enhanced user interaction experience

## 2.0.1

### Patch Changes

- 修复配置文件路径显示 undefined 的问题
  - 修复在更新配置时输出消息显示 "配置文件已复制到 undefined" 的问题
  - 现在会正确显示实际的配置目录路径（如 ~/.claude）

  Fixed undefined output in config file path display
  - Fixed issue where update command showed "Config files copied to undefined"
  - Now correctly displays the actual config directory path (e.g., ~/.claude)

## 2.0.0

### Major Changes

- ## ZCF 2.0.0 - 重大更新

  ### 新增功能

  #### 交互式菜单系统
  - 新增 `zcf menu` 命令（默认命令改为显示菜单）
  - 提供可视化配置管理界面
  - 支持所有功能的图形化操作

  #### AI 个性化配置
  - 支持多种预设 AI 人格（专业助手、猫娘助手、友好助手、导师模式）
  - 支持自定义 AI 人格
  - AI 输出语言独立配置

  #### 配置管理增强
  - API 配置支持部分修改
  - 新增默认模型配置功能
  - 新增 AI 记忆管理功能
  - 配置合并支持深度合并
  - 新增 ZCF 缓存清理功能

  #### 项目结构优化
  - 模板文件重构：CLAUDE.md 拆分为 rules.md、personality.md 和 mcp.md
  - 新增项目级 CLAUDE.md 模板
  - 代码模块化重构，提升可维护性

  ### 改进
  - 命令行体验优化
  - 错误处理增强
  - 跨平台兼容性提升

  ### 破坏性变更
  - `zcf` 默认命令从初始化改为显示菜单
  - 初始化命令改为 `zcf init` 或 `zcf i`
  - 模板文件结构调整

  ***

  ## ZCF 2.0.0 - Major Update

  ### New Features

  #### Interactive Menu System
  - Added `zcf menu` command (default command now shows menu)
  - Provides visual configuration management interface
  - Supports graphical operation for all features

  #### AI Personality Configuration
  - Support multiple preset AI personalities (Professional, Catgirl, Friendly, Mentor)
  - Support custom AI personality
  - Independent AI output language configuration

  #### Enhanced Configuration Management
  - API configuration supports partial modification
  - Added default model configuration
  - Added AI memory management
  - Configuration merge supports deep merge
  - Added ZCF cache cleanup

  #### Project Structure Optimization
  - Template files refactoring: CLAUDE.md split into rules.md, personality.md, and mcp.md
  - Added project-level CLAUDE.md template
  - Code modularization for better maintainability

  ### Improvements
  - Optimized CLI experience
  - Enhanced error handling
  - Improved cross-platform compatibility

  ### Breaking Changes
  - `zcf` default command changed from initialization to showing menu
  - Initialization command changed to `zcf init` or `zcf i`
  - Template file structure adjustment

## 1.2.0

### Minor Changes

- 添加 Windows 平台 MCP 配置支持
  - 自动检测 Windows 系统并使用兼容的 `cmd /c npx` 命令格式
  - 修复现有配置中的 Windows 兼容性问题
  - 添加平台检测工具函数 `isWindows()` 和 `getMcpCommand()`
  - 优化 MCP 配置生成逻辑，提取公共代码避免重复
  - 在 Windows 系统上显示友好提示信息
  - 更新中英文文档说明 Windows 支持

  Add Windows platform MCP configuration support
  - Auto-detect Windows system and use compatible `cmd /c npx` command format
  - Fix Windows compatibility issues in existing configurations
  - Add platform detection utilities `isWindows()` and `getMcpCommand()`
  - Optimize MCP config generation logic, extract common code to avoid duplication
  - Show friendly prompt on Windows systems
  - Update README documentation for Windows support

## 1.1.6

### Patch Changes

- **功能增强：配置完 API key 后自动添加 hasCompletedOnboarding 标志**
  - 在 ClaudeConfiguration 类型中添加 hasCompletedOnboarding 字段
  - 新增 addCompletedOnboarding() 函数自动设置完成标志
  - API 配置成功后自动跳过 Claude Code 官方登录流程
  - 重命名 McpConfiguration 为 ClaudeConfiguration 更准确反映用途

  **Feature Enhancement: Auto-add hasCompletedOnboarding flag after API key configuration**
  - Added hasCompletedOnboarding field to ClaudeConfiguration type
  - Implemented addCompletedOnboarding() function to automatically set completion flag
  - Automatically skip Claude Code official login process after successful API configuration
  - Renamed McpConfiguration to ClaudeConfiguration for more accurate representation

## 1.1.5

### Patch Changes

- **重构配置管理：优化 settings 配置管理**
  - **消除重复配置**: 移除 `configureApi` 函数中的硬编码配置
  - **单一数据源**: 从模板 `settings.json` 读取默认配置
  - **提升可维护性**: 配置修改只需更新模板文件
  - **遵循 DRY 原则**: 消除代码和模板间的配置重复

  **Refactor Configuration Management: Optimize settings configuration management**
  - **Removed duplicate configuration**: Eliminated hardcoded settings in `configureApi` function
  - **Single source of truth**: Now reads default settings from template `settings.json`
  - **Improved maintainability**: Configuration changes only need to be made in template file
  - **Following DRY principle**: Eliminated configuration duplication between code and templates

## 1.1.4

### Patch Changes

- **功能增强：增强 API 配置功能，支持选择 AUTH_TOKEN 或 API_KEY 认证方式**
  - 用户现在可以选择使用 ANTHROPIC_AUTH_TOKEN（OAuth 认证）或 ANTHROPIC_API_KEY（密钥认证）
  - 每个认证选项都提供了清晰的描述说明
  - 根据用户选择设置正确的环境变量
  - 更新了中英文文档说明

  **Feature Enhancement: Enhanced API configuration with AUTH_TOKEN or API_KEY authentication options**
  - Users can now choose between ANTHROPIC_AUTH_TOKEN (OAuth authentication) or ANTHROPIC_API_KEY (key authentication)
  - Each authentication option provides clear descriptive explanations
  - Sets correct environment variables based on user selection
  - Updated documentation in both Chinese and English

## 1.1.3

### Patch Changes

- **功能增强：添加 AI 输出语言选择功能**
  - 🌏 **新增 AI 输出语言选择**：用户可在初始化和更新时选择 AI 回复的语言
    - 支持多种预设语言（中文、英文等）
    - 支持自定义语言输入
    - 智能记忆用户偏好，避免重复询问

  - 🔧 **代码优化**：
    - 重构代码结构，提取公共方法到 `utils/prompts.ts`
    - 消除 init 和 update 命令中的重复代码
    - 优化 settings.json 配置结构，消除重复文件

  - 📝 **文档更新**：
    - 更新 README 文档，添加多语言支持说明
    - 移除模板中的硬编码语言指令

  **Feature Enhancement: Added AI output language selection functionality**
  - 🌏 **Added AI output language selection**: Users can choose AI response language during initialization and updates
    - Support for multiple preset languages (Chinese, English, etc.)
    - Support for custom language input
    - Smart memory of user preferences to avoid repeated prompts

  - 🔧 **Code optimization**:
    - Refactored code structure, extracted common methods to `utils/prompts.ts`
    - Eliminated duplicate code in init and update commands
    - Optimized settings.json configuration structure, eliminated duplicate files

  - 📝 **Documentation updates**:
    - Updated README documentation with multilingual support instructions
    - Removed hardcoded language directives from templates

## 1.1.2

### Patch Changes

- **样式优化和文档改进**
  - **样式**: 更新 banner 文本对齐方式，提升视觉一致性
  - **文档**:
    - 移除 README 文件中的支持模型章节
    - 添加项目截图到 README 和 README_EN
    - 更新文档管理路径说明，明确计划存储位置为项目根目录下的 `.claude/plan/` 目录
    - 优化 README 文档中的命令说明和格式

  **Style optimization and documentation improvements**
  - **Style**: Updated banner text alignment for improved visual consistency
  - **Documentation**:
    - Removed supported models section from README file
    - Added project screenshots to README and README_EN
    - Updated documentation management path instructions, clarified plan storage location as `.claude/plan/` directory in project root
    - Optimized command descriptions and formatting in README documentation

## 1.1.1

### Patch Changes

- **优化文案和使用体验**
  - 更新文案：将"仅更新 Prompt 文档"改为"仅更新工作流相关 md"，更准确地描述功能
  - 改进快速开始指南：清晰区分首次使用和已有环境两种场景
  - 添加双语帮助信息：CLI help 命令现在同时显示中英文说明
  - 优化用户引导：明确说明 `npx zcf` 用于完整初始化，`npx zcf u` 用于仅导入工作流

  **Optimized copy and user experience**
  - Updated copy: Changed "Update Prompt documents only" to "Update workflow-related md only" for more accurate functionality description
  - Improved quick start guide: Clear distinction between first-time use and existing environment scenarios
  - Added bilingual help information: CLI help command now displays both Chinese and English instructions
  - Optimized user guidance: Clarified that `npx zcf` is for complete initialization, `npx zcf u` is for workflow import only

## 1.1.0

### Minor Changes

- **重大功能更新**
  - 添加 update 命令支持增量更新配置
  - 优化命令执行逻辑和错误处理
  - 改进用户体验和交互提示
  - 重构配置管理模块
  - 更新 README 文档

  **Major feature updates**
  - Added update command for incremental configuration updates
  - Optimized command execution logic and error handling
  - Improved user experience and interactive prompts
  - Refactored configuration management module
  - Updated README documentation

## 1.0.3

### Patch Changes

- **修复 commandExists 函数逻辑错误**
  - 修复了 commandExists 函数始终返回 true 的问题
  - 现在正确检查命令执行的 exitCode 来判断命令是否存在
  - 撤销了 1.0.2 版本中不必要的 Windows 特殊处理
  - 简化了安装流程，提升代码可维护性

  **Fixed commandExists function logic error**
  - Fixed the issue where commandExists function always returned true
  - Now correctly checks command execution exitCode to determine if command exists
  - Reverted unnecessary Windows special handling from version 1.0.2
  - Simplified installation process and improved code maintainability

## 1.0.2

### Patch Changes

- **修复 Windows 安装后 PATH 未刷新问题**
  - 添加 Windows 系统专属提示，提醒用户重新打开终端窗口
  - 优化安装验证逻辑，增加延迟检测
  - 改进安装流程追踪，仅在新安装时显示额外提醒

  **Fixed Windows PATH not refreshed after installation issue**
  - Added Windows-specific prompts to remind users to reopen terminal window
  - Optimized installation verification logic with delayed detection
  - Improved installation process tracking, showing extra reminders only for new installations

## 1.0.1

### Patch Changes

- **更新依赖，增加自动发布流水线**

  **Updated dependencies and added automated release pipeline**

## [1.0.0] - 2025-08-03

### Features

- **初始版本发布**
- 支持中英文双语配置
- 自动检测并安装 Claude Code
- 智能配置文件管理（备份、合并、跳过）
- MCP 服务自动配置
- 支持多种 MCP 服务：Context7、DeepWiki、Exa、Playwright 等
- 交互式命令行界面
- 跨平台支持（Windows、macOS、Linux）

**Initial version release**

- Support for Chinese and English bilingual configuration
- Automatic detection and installation of Claude Code
- Intelligent configuration file management (backup, merge, skip)
- Automatic MCP service configuration
- Support for multiple MCP services: Context7, DeepWiki, Exa, Playwright, etc.
- Interactive command line interface
- Cross-platform support (Windows, macOS, Linux)
