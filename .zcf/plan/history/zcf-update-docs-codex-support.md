# ZCF Update Docs - Codex Support Implementation Plan

## 项目背景

为 zcf-update-docs.md 添加 Codex 相关文档检测功能，支持多语言 README 更新，与 Claude Code 检测同等优先级。

## 总体目标

扩展现有的 zcf-update-docs.md 文档更新脚本，添加 Codex 工具的文档检测和更新功能，确保：
- Codex 相关文件变更能被正确检测
- 多语言 README 文件能同步更新 Codex 功能描述
- 检测优先级与 Claude Code 保持一致
- 不影响现有 Claude Code 检测功能

## 技术方案

采用**并行检测架构**：在现有 Claude Code 检测逻辑基础上，添加 Codex 的并行检测机制，保持代码结构清晰和功能独立。

## 详细实施步骤

### 第一阶段：扩展文件变更检测逻辑

#### 步骤 1.1：添加 Codex 关键区域检测
- **文件位置**：`.claude/commands/zcf-update-docs.md` 第 87-123 行
- **修改内容**：在现有 6 个 "Critical Areas to Check" 后添加第 7 个区域
- **检测文件路径**：
  - `src/utils/code-tools/codex*` - Codex 核心工具
  - `templates/codex/` - Codex 模板文件
  - `src/i18n/locales/*/codex.json` - Codex 国际化文件
- **预期结果**：检测脚本能识别 Codex 相关文件变更

#### 步骤 1.2：确认文档检测目标
- **文件位置**：`.claude/commands/zcf-update-docs.md` 第 130-135 行
- **修改内容**：确认现有 DOCS_TO_CHECK 数组已包含多语言 README
- **检测文件**：README.md, README_zh-CN.md, README_ja.md, CLAUDE.md
- **预期结果**：支持完整的多语言文档检测

### 第二阶段：添加 Codex 功能验证逻辑

#### 步骤 2.1：扩展菜单系统检测
- **文件位置**：`.claude/commands/zcf-update-docs.md` 第 147-161 行
- **修改内容**：在现有菜单检测基础上添加 Codex 菜单项检测
- **检测内容**：
  - Codex 菜单选项和描述
  - Codex 相关的导航流程
  - 多语言菜单翻译一致性
- **预期结果**：文档中的 Codex 菜单描述与代码实现一致

#### 步骤 2.2：扩展初始化流程检测
- **文件位置**：`.claude/commands/zcf-update-docs.md` 第 162-179 行
- **修改内容**：添加 Codex 初始化步骤检测
- **检测内容**：
  - Codex CLI 安装流程
  - API 配置步骤
  - 系统提示词配置
  - 工作流安装过程
- **预期结果**：README 中的 Codex 安装步骤与实际代码匹配

### 第三阶段：更新文档生成逻辑

#### 步骤 3.1：扩展更新报告生成
- **文件位置**：`.claude/commands/zcf-update-docs.md` 第 184-218 行
- **修改内容**：在现有报告模板中添加 Codex 相关检测项
- **报告内容**：
  - Codex 功能描述更新需求
  - 多语言 README 同步状态
  - Codex 配置一致性检查结果
- **预期结果**：报告包含完整的 Codex 不一致性检测结果

#### 步骤 3.2：扩展文档更新逻辑
- **文件位置**：`.claude/commands/zcf-update-docs.md` 第 220-254 行
- **修改内容**：在现有更新逻辑中添加 Codex 功能描述更新
- **更新策略**：
  - 基于 `src/utils/code-tools/codex.ts` 更新功能描述
  - 使用 `src/i18n/locales/*/codex.json` 进行多语言同步
  - 保持与 Claude Code 更新逻辑的一致性
- **预期结果**：自动同步 Codex 功能描述到三个 README 文件

### 第四阶段：添加 Codex 验证检查

#### 步骤 4.1：扩展验证逻辑
- **文件位置**：`.claude/commands/zcf-update-docs.md` 第 256-276 行
- **修改内容**：在现有验证中添加 Codex 配置文件验证
- **验证内容**：
  - Codex 模板文件完整性
  - 配置文件格式正确性
  - 多语言翻译同步性
- **预期结果**：确保 Codex 模板文件与文档描述一致

#### 步骤 4.2：更新验证清单
- **文件位置**：`.claude/commands/zcf-update-docs.md` 第 341-350 行
- **修改内容**：在现有清单基础上添加 Codex 相关验证项
- **清单项目**：
  - [ ] Codex 命令匹配代码实现
  - [ ] Codex 配置选项与类型定义一致
  - [ ] Codex 模板文件与工作流配置同步
  - [ ] Codex 多语言翻译完整性
- **预期结果**：完整的 Codex 功能验证清单

## 预期交付物

1. **修改后的 zcf-update-docs.md**：支持 Codex 检测的完整文档更新脚本
2. **扩展的检测逻辑**：7 个关键检测区域（原 6 个 + Codex）
3. **多语言支持**：三个 README 文件的 Codex 功能同步机制
4. **验证机制**：完整的 Codex 配置验证清单

## 风险评估

- **风险等级**：低
- **影响范围**：仅扩展现有功能，不破坏 Claude Code 检测
- **回滚方案**：基于现有文件的扩展，容易恢复到原始状态
- **测试策略**：每个步骤都有明确的预期结果，便于验证

## 技术细节

### Codex 检测优先级（与 Claude Code 同等）

```markdown
7. **Codex Integration** (`src/utils/code-tools/codex*`, `templates/codex/`, `src/i18n/locales/*/codex.json`)
   - Codex CLI installation and configuration
   - API providers and authentication
   - System prompts and workflows
   - MCP service integration
   - Multi-language template support
```

### 多语言 README 更新策略

- **README.md**：更新 Codex 功能描述和使用说明（英文）
- **README_zh-CN.md**：基于 `src/i18n/locales/zh-CN/codex.json` 更新中文描述
- **README_ja.md**：保持与英文版结构一致的日文描述

---

**执行时间**：2025-09-29
**负责人**：浮浮酱 (猫娘工程师)
**项目状态**：准备执行