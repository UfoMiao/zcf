# Templates Module

**Last Updated**: Sun Jul 12 00:25:00 CST 2026
[Root](../CLAUDE.md) > **templates**

## Module Responsibilities

Template system module providing multilingual configuration templates, AI personality styles, and workflow skill definitions for both Claude Code and Codex environments. Supports Chinese (zh-CN) and English (en) locales with comprehensive workflow coverage.

## Entry Points and Startup

- **Main Template Directories**:
  - `claude-code/` - Claude Code specific templates
  - `codex/` - Codex specific templates
  - `common/` - Shared configuration templates
  - `skills/` - ZCF workflow skills (installed via `npx -y skills add`)

## External Interfaces

### Template Structure

```
templates/
├── common/                   # Shared templates (cross code-tool)
│   └── output-styles/       # AI personality styles
│       ├── en/
│       └── zh-CN/
├── skills/                  # ZCF workflow skills (Claude Code skills format)
│   ├── zh-CN/
│   │   ├── workflow/SKILL.md
│   │   ├── feat/SKILL.md
│   │   ├── init-project/SKILL.md
│   │   ├── git-commit/SKILL.md
│   │   ├── git-rollback/SKILL.md
│   │   ├── git-clean-branches/SKILL.md
│   │   ├── git-worktree/SKILL.md
│   │   └── bmad-init/SKILL.md
│   └── en/
│       └── ... (same skill set)
├── claude-code/              # Claude Code templates
│   ├── common/
│   ├── zh-CN/
│   └── en/
└── codex/                   # Codex templates
    ├── common/
    ├── zh-CN/
    └── en/
```

### Template Categories

#### 1. Output Styles (AI Personalities)

- **engineer-professional** - Professional engineering style
- **nekomata-engineer** - Nekomata engineer personality
- **laowang-engineer** - Laowang engineer personality
- **ojousama-engineer** - Ojou-sama engineer personality
- **rem-engineer** - Rem maid engineer personality
- **default** - Default output style
- **explanatory** - Explanatory style
- **learning** - Learning-focused style

#### 2. Workflow Skills

##### Common Tools Workflow
- **Skills**: `init-project`
- **Agents**: `init-architect`, `get-current-datetime`
- **Purpose**: Essential development tools and project initialization

##### Planning Workflow (Plan)
- **Skills**: `feat`, `workflow`
- **Agents**: `planner`, `ui-ux-designer`
- **Purpose**: Feature planning and UX design

##### Six-Step Workflow
- **Skills**: `zcf-update-docs`, `zcf-pr`, `zcf-release`
- **Purpose**: Structured development process

##### BMAD Workflow
- **Skills**: Enterprise-level workflow skills (BMad uses its own command layout)
- **Purpose**: Business model and architecture design

##### Git Workflow
- **Skills**: `git-commit`, `git-worktree`, `git-clean-branches`, `git-rollback`
- **Purpose**: Version control management with conventional commits, worktree management, branch cleanup, and rollback operations

## Key Dependencies and Configuration

### Template Processing

- **Language Support**: zh-CN and en locales
- **Code Tool Support**: Claude Code and Codex
- **Template Format**: Markdown-based configuration files (`SKILL.md` for workflow skills)
- **Variable Substitution**: Dynamic content replacement

### Configuration Integration

- **Workflow Installer**: Integration with `src/utils/workflow-installer.ts`
- **Skills Installer**: Integration with `src/utils/skills-installer.ts` (`npx -y skills add`)
- **Language Detection**: Integration with `src/i18n/` system
- **Platform Support**: Cross-platform path handling

## Data Models

### Template Organization

```typescript
interface TemplateStructure {
  codeTool: 'claude-code' | 'codex'
  locale: 'zh-CN' | 'en'
  category: 'common' | 'output-styles' | 'skills'
  workflow?: {
    type: 'common' | 'plan' | 'sixStep' | 'bmad' | 'git'
    skills: string[]
    agents: string[]
  }
}
```

### Output Style Configuration

```typescript
interface OutputStyle {
  id: string
  name: { 'zh-CN': string, 'en': string }
  description: { 'zh-CN': string, 'en': string }
  template: string
  personality: string
}
```

## Testing and Quality

### Template Validation

- **File**: `tests/templates/chinese-templates.test.ts`
- **Coverage**: Template completeness and format validation
- **Validation**: Markdown syntax and variable substitution

### Quality Metrics

- **Template Coverage**: 100% for both locales
- **Code Tool Support**: Claude Code and Codex fully supported
- **Workflow Coverage**: 5 major workflow categories
- **Output Styles**: 7 AI personality styles

## Common Issues

- **Path Handling**: Cross-platform path compatibility
- **Encoding**: UTF-8 encoding for multilingual content
- **Template Variables**: Proper variable substitution
- **Skills Installation**: Installed via skills CLI to `~/.agents/skills/` with symlinks in `~/.claude/skills/`

## Related Files

- `src/utils/workflow-installer.ts` - Template installation logic
- `src/utils/skills-installer.ts` - Skills CLI wrapper
- `src/config/workflows.ts` - Workflow configuration definitions
- `src/i18n/` - Internationalization support
- `tests/templates/` - Template validation tests

## Change Log (Module-Specific)

### Recent Updates

- Migrated ZCF workflow templates from commands to skills under `templates/skills/{locale}/`
- Skills installed via `npx -y skills add` with symlink mode for Claude Code
- Consolidated output-styles/system-prompt templates to `templates/common/output-styles/`
- Added Codex template support for dual code tool architecture
- Enhanced template validation and testing coverage

## FAQ

### Q: How to add a new workflow skill?

1. Create skill directory under `templates/skills/{locale}/{skill-name}/`
2. Add `SKILL.md` with Claude Code skills frontmatter
3. Update `src/config/workflows.ts` with new workflow definition
4. Add translations in `src/i18n/locales/{locale}/workflow.ts`

### Q: How to add a new output style?

1. Create style file in `templates/common/output-styles/{locale}/`
2. Define style configuration with name and description
3. Add style to available options in configuration
4. Test style rendering with sample content

### Q: How to support a new language?

1. Create new locale directory under `templates/skills/{new-locale}/`
2. Copy existing skills and translate `SKILL.md` content
3. Update i18n system to support new locale
4. Add locale to supported languages list

### Q: How to maintain template consistency?

- Use template validation tests
- Follow naming conventions
- Maintain parallel structure across locales
- Document template variables and usage
