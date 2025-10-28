# Templates Module

**Last Updated**: Mon Oct 27 19:39:26 CST 2025
[Root](../CLAUDE.md) > **templates**

## Module Responsibilities

Template system module providing multilingual configuration templates, AI personality styles, and workflow definitions for both Claude Code and Codex environments. Supports Chinese (zh-CN) and English (en) locales with comprehensive workflow coverage.

## Entry Points and Startup

- **Main Template Directories**:
  - `claude-code/` - Claude Code specific templates
  - `codex/` - Codex specific templates
  - `common/` - Shared configuration templates

## External Interfaces

### Template Structure

```
templates/
├── claude-code/              # Claude Code templates
│   ├── common/              # Common configurations
│   ├── zh-CN/               # Chinese templates
│   │   ├── output-styles/   # AI personality styles
│   │   └── workflow/        # Workflow templates
│   │       ├── common/      # Common tools workflow
│   │       ├── plan/        # Planning workflow
│   │       ├── sixStep/     # Six-step workflow
│   │       ├── bmad/        # BMAD workflow
│   │       └── git/         # Git workflow
│   └── en/                  # English templates
│       ├── output-styles/   # AI personality styles
│       └── workflow/        # Workflow templates
└── codex/                   # Codex templates
    ├── common/              # Common configurations
    ├── zh-CN/               # Chinese templates
    │   └── workflow/        # Workflow templates
    └── en/                  # English templates
        └── workflow/        # Workflow templates
```

### Template Categories

#### 1. Output Styles (AI Personalities)

- **engineer-professional** - Professional engineering style
- **nekomata-engineer** - Nekomata engineer personality
- **laowang-engineer** - Laowang engineer personality
- **default** - Default output style
- **explanatory** - Explanatory style
- **learning** - Learning-focused style

#### 2. Workflow Templates

##### Common Tools Workflow
- **Commands**: `init-project`, `git-commit`, `git-rollback`, `git-cleanBranches`, `git-worktree`
- **Agents**: `init-architect`, `get-current-datetime`
- **Purpose**: Essential development tools and Git operations

##### Planning Workflow (Plan)
- **Commands**: `feat`, `workflow`
- **Agents**: `planner`, `ui-ux-designer`
- **Purpose**: Feature planning and UX design

##### Six-Step Workflow
- **Commands**: `zcf-update-docs`, `zcf-pr`, `zcf-release`
- **Purpose**: Structured development process

##### BMAD Workflow
- **Commands**: Enterprise-level workflow commands
- **Purpose**: Business model and architecture design

##### Git Workflow
- **Commands**: Advanced Git operations
- **Purpose**: Version control management

## Key Dependencies and Configuration

### Template Processing

- **Language Support**: zh-CN and en locales
- **Code Tool Support**: Claude Code and Codex
- **Template Format**: Markdown-based configuration files
- **Variable Substitution**: Dynamic content replacement

### Configuration Integration

- **Workflow Installer**: Integration with `src/utils/workflow-installer.ts`
- **Language Detection**: Integration with `src/i18n/` system
- **Platform Support**: Cross-platform path handling

## Data Models

### Template Organization

```typescript
interface TemplateStructure {
  codeTool: 'claude-code' | 'codex'
  locale: 'zh-CN' | 'en'
  category: 'common' | 'output-styles' | 'workflow'
  workflow?: {
    type: 'common' | 'plan' | 'sixStep' | 'bmad' | 'git'
    commands: string[]
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
- **Output Styles**: 6 AI personality styles

## Common Issues

- **Path Handling**: Cross-platform path compatibility
- **Encoding**: UTF-8 encoding for multilingual content
- **Template Variables**: Proper variable substitution
- **File Permissions**: Executable permissions for command files

## Related Files

- `src/utils/workflow-installer.ts` - Template installation logic
- `src/config/workflows.ts` - Workflow configuration definitions
- `src/i18n/` - Internationalization support
- `tests/templates/` - Template validation tests

## Change Log (Module-Specific)

### Recent Updates

- Added Codex template support for dual code tool architecture
- Enhanced workflow templates with comprehensive command coverage
- Improved AI personality styles with professional variations
- Added cross-platform template compatibility
- Enhanced template validation and testing coverage

## FAQ

### Q: How to add a new workflow template?

1. Create workflow directory under `templates/{code-tool}/{locale}/workflow/`
2. Add command files in `commands/` subdirectory
3. Add agent files in `agents/` subdirectory (if needed)
4. Update `src/config/workflows.ts` with new workflow definition
5. Add translations in `src/i18n/locales/{locale}/workflow.ts`

### Q: How to add a new output style?

1. Create style file in `templates/{code-tool}/{locale}/output-styles/`
2. Define style configuration with name and description
3. Add style to available options in configuration
4. Test style rendering with sample content

### Q: How to support a new language?

1. Create new locale directory under `templates/{code-tool}/{new-locale}/`
2. Copy existing templates and translate content
3. Update i18n system to support new locale
4. Add locale to supported languages list

### Q: How to maintain template consistency?

- Use template validation tests
- Follow naming conventions
- Maintain parallel structure across locales
- Document template variables and usage
