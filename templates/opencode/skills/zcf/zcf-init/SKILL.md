---
name: zcf-init
description: Initialize a new project with ZCF conventions and prompt templates.
version: 1.0.0
namespace: zcf
disable-model-invocation: true
---

# ZCF Project Initialization

Use this skill when the user asks to initialize or bootstrap a new project.

## Steps

1. Greet the user and confirm the target project path.
2. Ask for the primary language (zh-CN or en) if not provided.
3. Create a root-level `CLAUDE.md` with project context and conventions.
4. Generate module-level `CLAUDE.md` indexes for each source directory.
5. Summarize what was created and how to update the context later.

## Output style

- Be concise and structured.
- Use the project language for all generated documentation.
- Do not modify existing files without explicit permission.

## Safety rules

- Never commit or push changes automatically.
- Never expose API keys or secrets in generated documentation.
