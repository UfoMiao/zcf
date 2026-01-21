# 任务计划：为 Codex 工作流安装增加 Git 工作流选项

## 背景与目标
- 需求：在 Codex 的“工作流导入/安装”流程中，增加“Git 指令 (commit + rollback + cleanBranches + worktree)”选项，描述与 Claude Code 保持一致；用于包含查看暂存区更改等 Git 能力（由 git-commit.md 实现）。
- 范围：仅改动 Codex 导入逻辑，不改模板与 i18n 文案，不触达 dist。

## 实施方案（分组选项，一次导入）
- 在工作流选择列表中新增一个分组项“Git 指令 …”，内部展开为四个 git 提示文件：
  - git-commit.md
  - git-rollback.md
  - git-cleanBranches.md
  - git-worktree.md
- 在交互选择与 skipPrompt 两种模式中，均将该分组展开为具体文件后再复制到 `~/.codex/prompts/`。

## 变更清单
- 修改：`src/utils/code-tools/codex.ts`
  - 新增常量 `GIT_GROUP_SENTINEL`
  - `getAllWorkflowFiles()` 返回 Git 分组项（名称使用 `workflow:workflowOption.gitWorkflow`，路径为哨兵值）
  - 新增 `expandSelectedWorkflowPaths()` 用于将分组展开为文件路径
  - 新增 `getGitPromptFiles()` 解析模板目录下四个 git 提示文件
  - 在交互模式与 skipPrompt 模式下复制文件前调用展开逻辑

## 预期结果
- 运行 Codex 的工作流导入或 Full Init 时，出现“Git 指令 (commit + rollback + cleanBranches + worktree)”选项；选中后在 `~/.codex/prompts/` 中生成四个 git 提示文件。

## 验证步骤
1. 执行导入：在交互模式选择“Git 指令 …”，确认四个文件复制到 `~/.codex/prompts/`。
2. 跳过提示：以 `skipPrompt` 且 `workflows` 包含 i18n 名称“Git 指令 …”运行，确认同样复制成功。
3. 确认“查看暂存区的更改”能力：打开 `git-commit.md`，其内部包含对 `git status`/`git diff` 的读取与暂存/取消暂存建议。

## 设计原则应用
- KISS：选用分组选项+展开的最小改动实现。
- YAGNI：不引入额外命令（例如独立“查看暂存区”指令），由现有 `git-commit.md` 覆盖。
- DRY：统一在一个展开函数中处理交互与跳过两种模式。
- SOLID：把分组展开与文件收集解耦为独立函数，单一职责清晰。

