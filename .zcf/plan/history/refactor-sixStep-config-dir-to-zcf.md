# 重构 sixStep Workflow 的 Plan 目录统一为 .zcf

**任务描述**: 重构 templates 中的 sixStep 的 prompt，将 plan 放置位置的 `$CONFIG_DIR` 统一更改为 `.zcf`，无论是 claude-code 还是 codex，并且同步更新相应文档和测试代码

**创建时间**: 2025-12-15

---

## 任务上下文

### 背景
- 当前 sixStep workflow 模板使用 `$CONFIG_DIR` 变量来指定 plan 文件的存放位置
- Claude Code 会将 `$CONFIG_DIR` 替换为 `.claude`
- Codex 会将 `$CONFIG_DIR` 替换为 `.codex`
- 用户希望统一使用 `.zcf` 作为 plan 文件的存放目录

### 目标
1. 将 sixStep workflow 模板中的 `$CONFIG_DIR` 直接改为 `.zcf`
2. 删除 Claude Code 和 Codex 中的 `$CONFIG_DIR` 替换逻辑
3. 更新相关测试文件，删除 `$CONFIG_DIR` 替换相关的测试
4. 更新文档说明统一使用 `.zcf` 目录

---

## 详细执行计划

### 阶段 1: 修改模板文件

#### 1.1 修改中文版 sixStep workflow 模板
- **文件**: `templates/common/workflow/sixStep/zh-CN/workflow.md`
- **操作**: 将所有 `$CONFIG_DIR` 替换为 `.zcf`
- **位置**:
  - 第 36 行: `$CONFIG_DIR/plan/任务名.md` → `.zcf/plan/任务名.md`
  - 第 154 行: `$CONFIG_DIR/plan/任务名.md` → `.zcf/plan/任务名.md`
  - 第 179 行: `├── $CONFIG_DIR/` → `├── .zcf/`

#### 1.2 修改英文版 sixStep workflow 模板
- **文件**: `templates/common/workflow/sixStep/en/workflow.md`
- **操作**: 将所有 `$CONFIG_DIR` 替换为 `.zcf`
- **位置**:
  - 第 59 行: `$CONFIG_DIR/plan/task-name.md` → `.zcf/plan/task-name.md`
  - 第 190 行: `$CONFIG_DIR/plan/task-name.md` → `.zcf/plan/task-name.md`
  - 第 215 行: `├── $CONFIG_DIR/` → `├── .zcf/`

---

### 阶段 2: 删除替换逻辑

#### 2.1 删除 Claude Code 的替换逻辑
- **文件**: `src/utils/workflow-installer.ts`
- **位置**: 第 30 行
- **操作**: 删除 `return content.replace(/\$CONFIG_DIR/g, '.claude')`
- **说明**: 由于模板已直接使用 `.zcf`，不再需要变量替换

#### 2.2 删除 Codex 的替换逻辑
- **文件**: `src/utils/code-tools/codex.ts`
- **位置**: 第 1356 行
- **操作**: 删除 `return content.replace(/\$CONFIG_DIR/g, '.codex')`
- **说明**: 由于模板已直接使用 `.zcf`，不再需要变量替换

---

### 阶段 3: 更新测试文件

#### 3.1 更新 workflow-installer.test.ts
- **文件**: `tests/unit/utils/workflow-installer.test.ts`
- **操作**: 删除或修改 `$CONFIG_DIR` 替换相关的测试用例
- **涉及测试**:
  - `should process template variables for sixStep workflow ($CONFIG_DIR -> .claude)`
  - 其他包含 `$CONFIG_DIR` mock 数据的测试

#### 3.2 更新 codex.test.ts
- **文件**: `tests/unit/utils/code-tools/codex.test.ts`
- **操作**: 删除或修改 `$CONFIG_DIR` 替换相关的测试用例
- **涉及测试**: 包含 `$CONFIG_DIR` 变量替换验证的测试

#### 3.3 更新 codex-common-templates.test.ts
- **文件**: `tests/unit/utils/code-tools/codex-common-templates.test.ts`
- **操作**: 删除或修改所有 `$CONFIG_DIR` 替换相关的测试用例
- **涉及测试**:
  - `should process template variables for sixStep workflow ($CONFIG_DIR -> .codex)`
  - `should replace $CONFIG_DIR with .codex (not .claude)`
  - 其他包含 `$CONFIG_DIR` mock 数据的测试

---

### 阶段 4: 更新文档

#### 4.1 更新 templates/CLAUDE.md
- **文件**: `templates/CLAUDE.md`
- **操作**: 更新文档说明
- **修改内容**:
  - 移除 `$CONFIG_DIR` 变量支持的描述
  - 说明 sixStep workflow 统一使用 `.zcf` 目录存放 plan 文件
  - 更新相关示例和说明

---

### 阶段 5: 测试验证

#### 5.1 运行单元测试
- **命令**: `pnpm test`
- **验证点**:
  - 所有测试通过
  - 没有破坏现有功能
  - 新的 `.zcf` 目录逻辑正常工作

#### 5.2 手动验证
- 验证 Claude Code 安装 sixStep workflow 后使用 `.zcf` 目录
- 验证 Codex 安装 sixStep workflow 后使用 `.zcf` 目录

---

## 预期结果

1. ✅ sixStep workflow 模板直接使用 `.zcf` 目录
2. ✅ Claude Code 和 Codex 不再进行 `$CONFIG_DIR` 变量替换
3. ✅ 所有相关测试更新并通过
4. ✅ 文档准确反映新的实现方式
5. ✅ 两个工具的 plan 文件统一存放在 `.zcf/plan/` 目录

---

## 影响范围

### 代码文件
- `templates/common/workflow/sixStep/zh-CN/workflow.md`
- `templates/common/workflow/sixStep/en/workflow.md`
- `src/utils/workflow-installer.ts`
- `src/utils/code-tools/codex.ts`

### 测试文件
- `tests/unit/utils/workflow-installer.test.ts`
- `tests/unit/utils/code-tools/codex.test.ts`
- `tests/unit/utils/code-tools/codex-common-templates.test.ts`

### 文档文件
- `templates/CLAUDE.md`

---

## 风险评估

- **低风险**: 模板文件修改，影响范围明确
- **低风险**: 删除替换逻辑，简化代码
- **低风险**: 测试文件更新，确保质量
- **无风险**: 文档更新

---

## 完成标准

- [ ] 所有模板文件中的 `$CONFIG_DIR` 已替换为 `.zcf`
- [ ] 替换逻辑已从代码中删除
- [ ] 所有相关测试已更新并通过
- [ ] 文档已更新并准确反映实现
- [ ] 手动验证两个工具都使用 `.zcf` 目录
