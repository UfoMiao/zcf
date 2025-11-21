---
title: Workflow Overview
---

# Workflow Overview

ZCF helps teams standardize development processes through MCP + workflow templates. This chapter introduces the positioning and usage of each workflow.

| Workflow | Use Case | Key Features |
| --- | --- | --- |
| [ZCF Six-Stage Workflow](zcf-workflow.md) | General development tasks | Six-stage closed loop, automatic quality checks, interactive confirmation |
| [Feature Development Workflow](feat.md) | New feature design and implementation | Planning + UI/UX agent collaboration |
| [BMad Agile Process](bmad.md) | Large project agile iterations | Multi-stage ceremony management |
| [Spec Workflow Integration](spec.md) | Requirements documentation and specification generation | Spec MCP integration |
| [Git Smart Commands](git-commands.md) | Git operation automation | Commit, rollback, cleanup, worktree |

## Usage Methods

Use different command prefixes based on the tool used:

### Claude Code

Use the following commands in Claude Code:
- `/zcf:workflow` - Six-stage workflow
- `/zcf:feat` - Feature development workflow
- `/git-commit` - Git commit command
- `/init-project` - Project initialization

### Codex

Use the following commands in Codex (note the `/prompts:` prefix):
- `/prompts:workflow` - Six-stage workflow
- `/prompts:git-commit` - Git commit command
- `/prompts:git-rollback` - Git rollback command
- `/prompts:git-cleanBranches` - Clean merged branches
- `/prompts:git-worktree` - Git worktree management

> ⚠️ **Note**: Codex currently only supports six-stage workflow and Git workflows. Feature development workflow (feat), project initialization (init-project), and BMad workflow are not yet available in Codex.

> 💡 **Tip**: Codex uses `/prompts:` prefix to access all workflow commands, which is Codex's command format specification.

## Usage Recommendations

1. When using workflows for the first time, have AI output task progress documents for easy continuation in new conversations.
2. After completing key milestones, request AI to generate progress summaries for easy cross-conversation continuity.
3. Combine with `best-practices/worktree.md` to improve multi-workspace collaboration efficiency.
4. Use with Git workflows to quickly complete the cycle of requirement breakdown → coding → commit.
