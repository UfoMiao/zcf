---
title: Workflow System
---

# Workflow System

ZCF pre-configures multiple workflows through `WORKFLOW_CONFIG_BASE` and automatically imports them during initialization or updates:

## Pre-configured Workflows Overview

| ID | Category | Default | Command File | Description | Claude Code | Codex |
| --- | --- | --- | --- | --- | ----------- | ----- |
| `commonTools` | common | Yes | `init-project.md` | Provides project initialization and common tool commands | ✅ | ❌ |
| `sixStepsWorkflow` | sixStep | Yes | `workflow.md` | Six-stage structured development workflow (Research→Ideation→Planning→Execution→Optimization→Review) | ✅ | ✅ |
| `featPlanUx` | plan | Yes | `feat.md` | Feature development workflow, includes planning and UI/UX agents | ✅ | ❌ |
| `gitWorkflow` | git | Yes | `git-commit.md` etc. | Git commit, rollback, cleanup, worktree management | ✅ | ✅ |
| `bmadWorkflow` | bmad | Yes | `bmad-init.md` | BMad agile process entry | ✅ | ❌ |

> ⚠️ **Note**: Codex currently only supports `sixStepsWorkflow` (six-stage workflow) and `gitWorkflow` (Git workflow). Other workflows are not yet available in Codex.

## Installation and Updates

- `zcf init` imports all workflows by default. Users can selectively install via `--workflows`.
- `zcf update` re-executes workflow import after template updates to ensure content synchronization.
- Workflow files are automatically installed to Claude Code/Codex's `prompts/workflows/` directory.

## Agent Auto Installation

- For workflows requiring agents (like `featPlanUx`), ZCF will synchronously copy `agents/planner.md`, `agents/ui-ux-designer.md`.
- Supports automatic processing based on `autoInstallAgents` field.

## Command Format

ZCF workflows use different command prefixes in different tools:

| Tool | Command Prefix | Examples |
|------|---------|------|
| **Claude Code** | `/zcf:` or `/` | `/zcf:workflow`, `/git-commit` |
| **Codex** | `/prompts:` | `/prompts:workflow`, `/prompts:git-commit` |

> 💡 **Tip**: Codex uses `/prompts:` prefix to access all workflow skills, while Claude Code uses `/zcf:` prefix or direct `/` prefix.

## Usage Recommendations

- When using workflows for the first time, you can ask AI to output task progress documents for easy continuation in new conversations
  - Claude Code: `/zcf:workflow <task description>`
  - Codex: `/prompts:workflow <task description>`
- Use with Git workflows to quickly complete the cycle of requirement breakdown → coding → commit
- After completing key milestones, request AI to generate progress summaries for easy cross-conversation continuity


