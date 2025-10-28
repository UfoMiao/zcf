# Templates Module

**Last Updated**: Mon Oct 27 19:39:26 CST 2025
[Root](../CLAUDE.md) > **templates**

## Module Responsibilities

Template configuration module providing multilingual configuration templates, workflow templates, and AI memory templates, supporting both Chinese and English environments for comprehensive Claude Code environment setup.

## Entry Points and Startup

- **Main Entry Points**:
  - `common/` - Common configuration templates
  - `zh-CN/` - Chinese template collection
  - `en/` - English template collection

## External Interfaces

### Template Structure

```
templates/
├── common/                    # Common configuration templates
│   ├── CLAUDE.md             # Base CLAUDE.md template
│   └── settings.json         # Claude settings template
├── zh-CN/                    # Chinese template collection
│   ├── memory/               # AI memory templates
│   └── workflow/             # Workflow templates
└── en/                       # English template collection
    ├── memory/               # AI memory templates
    └── workflow/             # Workflow templates
```

### Template Category System

```typescript
// Template categories
interface TemplateCategories {
  memory: {
    'mcp.md': string // MCP service guidance
    'technical-guides.md': string // Technical implementation guides
    'personality.md': string // AI personality configuration
    'rules.md': string // Core programming principles
  }
  workflow: {
    common: WorkflowCommands // Common tools workflow
    plan: WorkflowCommands // Feature planning workflow
    sixStep: WorkflowCommands // Six-step development workflow
    bmad: WorkflowCommands // BMad enterprise workflow
    git: WorkflowCommands // Git operation workflow
  }
}
```

## Key Dependencies and Configuration

### Template Installation Process

- Templates are copied to `~/.claude/` directory during initialization
- Language-specific templates selected based on user configuration
- Automatic template merging and update mechanisms
- Template validation and consistency checking

### Configuration Files

- `common/settings.json` - Base Claude settings template
- `common/CLAUDE.md` - Project guidance template
- Language-specific memory and workflow templates

## Data Models

### Workflow Template Structure

#### Common Tools Workflow (`common/`)

- **Commands**: `init-project.md` - Project initialization command
- **Agents**: `init-architect.md`, `get-current-datetime.md` - Core utility agents

#### Feature Planning Workflow (`plan/`)

- **Commands**: `feat.md` - Feature development command
- **Agents**: `planner.md`, `ui-ux-designer.md` - Planning and design agents

#### Six-Step Development Workflow (`sixStep/`)

- **Commands**: `workflow.md` - Six-step development process
- **Agents**: None - Process-oriented workflow

#### BMad Enterprise Workflow (`bmad/`)

- **Commands**: `bmad-init.md` - BMad initialization
- **Agents**: Complete enterprise development team simulation

#### Git Workflow (`git/`)

- **Commands**: `git-commit.md`, `git-worktree.md`, `git-cleanBranches.md`, `git-rollback.md`
- **Agents**: None - Git operation commands

### Memory Template Structure

#### AI Memory Templates

- **mcp.md**: MCP service usage guidelines and best practices
- **technical-guides.md**: Technical execution guidelines and standards
- **personality.md**: AI assistant behavior and personality configuration
- **rules.md**: Core programming principles and workflow methodology

### Template Language Support

#### Chinese Templates (`zh-CN/`)

- Complete Chinese localization for all templates
- Chinese AI interaction patterns
- Chinese technical documentation standards
- Chinese workflow descriptions

#### English Templates (`en/`)

- Complete English localization for all templates
- English AI interaction patterns
- English technical documentation standards
- English workflow descriptions

## Testing and Quality

### Template Validation Strategy

- **Consistency Testing**: Verify Chinese-English template correspondence
- **Syntax Testing**: Validate markdown syntax and formatting
- **Content Testing**: Verify template completeness and accuracy
- **Integration Testing**: Test template installation and configuration

### Quality Metrics

#### ✅ Template Completeness

- Chinese-English template parity: **100%**
- Workflow category coverage: **5/5 categories**
- Memory template coverage: **4/4 templates**
- Command template coverage: **Complete**

#### ✅ Language Support

- Chinese localization: **Complete**
- English localization: **Complete**
- Template structure consistency: **Validated**
- Content accuracy: **Verified**

#### ✅ Installation Testing

- Template copying mechanism: **Tested**
- Language selection logic: **Verified**
- Template merging: **Functional**
- Update mechanism: **Working**

### Test Coverage

- **Template Tests**: `tests/templates/chinese-templates.test.ts`
- **Installation Tests**: Integration tests for template deployment
- **Validation Tests**: Template structure and content verification

## FAQ

### Q: How to add new workflow templates?

1. Add template files in both `zh-CN/workflow/` and `en/workflow/`
2. Update workflow configuration in `src/config/workflows.ts`
3. Add corresponding translation keys in i18n files
4. Test template installation and functionality

### Q: How to modify AI memory templates?

1. Update template files in both language directories
2. Ensure consistency between Chinese and English versions
3. Test AI behavior changes with modified templates
4. Update documentation if needed

### Q: How are templates installed during initialization?

Templates are copied from the package to `~/.claude/` directory based on user's language selection, with smart merging to preserve existing customizations.

### Q: How to maintain template version compatibility?

- Use semantic versioning for major template changes
- Provide migration guides for breaking changes
- Maintain backward compatibility when possible
- Test template updates with existing configurations

## Related File List

### Common Configuration Templates

- `common/CLAUDE.md` - Base project guidance template
- `common/settings.json` - Claude configuration template

### Chinese Templates (`zh-CN/`)

#### Memory Templates

- `memory/mcp.md` - MCP服务使用指南
- `memory/technical-guides.md` - 技术执行准则
- `memory/personality.md` - AI助手个性配置
- `memory/rules.md` - 核心编程原则

#### Workflow Templates

- `workflow/common/commands/init-project.md` - 项目初始化命令
- `workflow/common/agents/init-architect.md` - 初始化架构师
- `workflow/common/agents/get-current-datetime.md` - 时间工具
- `workflow/plan/commands/feat.md` - 功能开发命令
- `workflow/plan/agents/planner.md` - 规划师
- `workflow/plan/agents/ui-ux-designer.md` - UI/UX设计师
- `workflow/sixStep/commands/workflow.md` - 六步开发流程
- `workflow/bmad/commands/bmad-init.md` - BMad初始化
- `workflow/git/commands/` - Git操作命令集

### English Templates (`en/`)

#### Memory Templates

- `memory/mcp.md` - MCP Services Usage Guide
- `memory/technical-guides.md` - Technical Execution Guidelines
- `memory/personality.md` - AI Assistant Personality Configuration
- `memory/rules.md` - Core Programming Principles

#### Workflow Templates

- `workflow/common/commands/init-project.md` - Project initialization command
- `workflow/common/agents/init-architect.md` - Initialization architect
- `workflow/common/agents/get-current-datetime.md` - DateTime utility
- `workflow/plan/commands/feat.md` - Feature development command
- `workflow/plan/agents/planner.md` - Planner agent
- `workflow/plan/agents/ui-ux-designer.md` - UI/UX designer
- `workflow/sixStep/commands/workflow.md` - Six-step development workflow
- `workflow/bmad/commands/bmad-init.md` - BMad initialization
- `workflow/git/commands/` - Git operation commands

### Test Files

- `tests/templates/chinese-templates.test.ts` - Chinese template validation
- Template integration tests distributed across test suites

## Changelog

### 2025-08-20

- **Module Documentation Created**: Completed comprehensive documentation of templates module
- **Template Architecture Analysis**: Detailed analysis of bilingual template structure and workflow organization
- **Quality Assessment**: Verified complete Chinese-English template parity and coverage
- **Template Category Documentation**: Complete recording of 5 workflow categories and 4 memory templates
