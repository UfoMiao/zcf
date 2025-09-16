---
description: Initialize project AI context, generate/update root-level and module-level CLAUDE.md indexes
allowed-tools: Read(**), Write(CLAUDE.md, **/CLAUDE.md)
argument-hint: <PROJECT_SUMMARY_OR_NAME>
---

## Usage

`/init-project <PROJECT_SUMMARY_OR_NAME>`

## Objective

Initialize project AI context using a mixed strategy of "concise at root + detailed at module level":

- Generate/update `CLAUDE.md` at repository root (high-level vision, architecture overview, module index, global standards).
- Generate/update local `CLAUDE.md` in identified module directories (interfaces, dependencies, entry points, tests, key files, etc.).
- ✨ **For improved readability, automatically generate Mermaid structure diagrams in the root `CLAUDE.md` and add navigation breadcrumbs to each module `CLAUDE.md`**.

## Orchestration Instructions

**Step 1**: Call the `get-current-datetime` sub-agent to obtain the current timestamp.

**Step 2**: Call the `init-architect` sub-agent once, with input:

- `project_summary`: $ARGUMENTS
- `current_timestamp`: (timestamp from step 1)

## Execution Strategy (Agent adapts automatically, no user parameters needed)

- **Stage A: Repository Census (Lightweight)**
  Quickly count files and directories, identify module roots (package.json, pyproject.toml, go.mod, apps/_, packages/_, services/\*, etc.).
- **Stage B: Module Priority Scanning (Medium)**
  For each module, perform targeted reading and sampling of "entry/interfaces/dependencies/tests/data models/quality tools".
- **Stage C: Deep Supplementation (As Needed)**
  If repository is small or module scale is small, expand reading scope; if large, perform batch supplemental scanning on high-risk/high-value paths.
- **Coverage Measurement and Resumability**
  Output "scanned files / estimated total files, covered module ratio, ignored/skipped reasons" and list "recommended next-step deep-dive sub-paths". When running `/init-project` repeatedly, perform **incremental updates** and **breakpoint resumable scanning** based on previous index.

## Security and Boundaries

- Only read/write documentation and indexes, do not modify source code.
- Ignore common generated artifacts and binary large files by default.
- Print "summary" in main dialog, write full content to repository.

## Output Requirements

- Print "Initialization Result Summary" in main dialog, including:
  - Whether root-level `CLAUDE.md` was created/updated, major section overview.
  - Number of identified modules and their path list.
  - Generation/update status of each module's `CLAUDE.md`.
  - ✨ **Explicitly mention "Generated Mermaid structure diagram" and "Added navigation breadcrumbs for N modules"**.
  - Coverage and major gaps.
  - If not fully read: explain "why stopped here" and list **recommended next steps** (e.g., "suggest priority supplemental scanning: packages/auth/src/controllers").
