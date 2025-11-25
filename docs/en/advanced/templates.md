---
title: Templates and Output Styles
---

# Templates and Output Styles

ZCF provides a complete template system, including workflow templates, output style templates, and system prompt templates. These templates support multiple languages (Chinese and English) and can be customized to meet team-specific needs.

## Template System Overview

ZCF's template system is divided into the following levels:

1. **Workflow Templates**: Structured development workflows
2. **Output Style Templates**: AI assistant personality and output styles
3. **System Prompt Templates**: Project-level system prompts and standards
4. **MCP Service Templates**: MCP service usage guides

## Template Directory Structure

### Claude Code Templates

```
templates/claude-code/
├── common/                      # Common configuration templates
│   └── settings.json           # Claude settings template
├── zh-CN/                      # Chinese template collection
│   ├── output-styles/         # Output style templates
│   │   ├── engineer-professional.md
│   │   ├── nekomata-engineer.md
│   │   ├── laowang-engineer.md
│   │   └── ojousama-engineer.md
│   └── workflow/              # Workflow templates
│       ├── common/            # Common tools workflow
│       ├── plan/              # Planning workflow
│       ├── sixStep/          # Six-stage workflow
│       ├── bmad/              # BMad enterprise workflow
│       └── git/               # Git workflow
└── en/                         # English template collection
    ├── output-styles/         # Output style templates
    └── workflow/              # Workflow templates (same structure)
```

### Codex Templates

```
templates/codex/
├── common/                     # Common configuration templates
│   └── config.toml            # Codex configuration template
├── zh-CN/                      # Chinese template collection
│   ├── system-prompt/         # System prompt templates
│   └── workflow/              # Workflow templates
│       ├── sixStep/          # Six-stage workflow
│       └── git/              # Git workflow
└── en/                         # English template collection
    ├── system-prompt/         # System prompt templates
    └── workflow/              # Workflow templates (same structure)
```

## Output Style Templates

Output styles define AI assistant personality and output methods. These templates are stored in the `prompts/output-style/` directory.

### Pre-configured Output Styles

<div align="center">
  <a href="https://github.com/Haleclipse">
    <img src="/assets/Haleclipse.webp" alt="Halley-chan" width="200" style="border-radius: 10px;"/>
  </a>
  <p>Tsundere <a href="https://github.com/Haleclipse">Halley-chan</a> Ojou-sama (￣▽￣)ゞ</p>
</div>

| Style ID | Name | Description | Use Case |
|---------|------|------|---------|
| `engineer-professional` | Professional Engineer | Professional, rigorous engineer style | Formal projects, enterprise environments |
| `nekomata-engineer` | Nekomata Engineer | Light, friendly nekomata style | Personal projects, relaxed atmosphere |
| `laowang-engineer` | Laowang Engineer | Humorous, down-to-earth Chinese style | Chinese projects, domestic teams |
| `ojousama-engineer` | Ojousama Engineer | Elegant, refined style | Specific scenarios, stylized projects |

### Built-in Output Styles

In addition to pre-configured styles, built-in styles are also supported:

- `default` - Default output style
- `explanatory` - Explanatory style, focuses on explanation
- `learning` - Learning style, focuses on teaching

### Install Output Styles

```bash
# Install all output styles
npx zcf init -o all

# Install specific styles
npx zcf init -o engineer-professional,nekomata-engineer

# Set default output style
npx zcf init -o all -d engineer-professional

# Skip output style installation
npx zcf init -o skip
```

### Switch Output Style

**Claude Code**:
```
/set-output-style engineer-professional
```

**Codex**:
Configure through system prompt or edit `systemPromptStyle` in `config.toml`.

### Custom Output Styles

1. **Edit Template File**:
```bash
# Find template file
cd ~/.claude/prompts/output-style/

# Edit or create new style
vim my-custom-style.md
```

2. **Use During Initialization**:
```bash
# Initialize first, then manually copy custom style
cp my-custom-style.md ~/.claude/prompts/output-style/
```

3. **Team Sharing**:
```bash
# Include custom style in version control
git add prompts/output-style/my-custom-style.md
git commit -m "Add custom output style"
```

## Workflow Templates

Workflow templates define structured development processes. Each workflow includes command templates and optional agent templates.

### Workflow Types

#### 1. Common Tools Workflow (`common/`)

**Commands**:
- `init-project.md` - Project initialization command

**Agents**:
- `init-architect.md` - Initialization architect
- `get-current-datetime.md` - Time tool

**Purpose**: Provide project initialization, common tools, and time handling functionality

#### 2. Planning Workflow (`plan/`)

**Commands**:
- `feat.md` - Feature development command

**Agents**:
- `planner.md` - Planner
- `ui-ux-designer.md` - UI/UX Designer

**Purpose**: New feature design and planning

#### 3. Six-Stage Workflow (`sixStep/`)

**Commands**:
- `workflow.md` - Six-stage development process (Research→Ideate→Plan→Execute→Optimize→Review)

**Purpose**: Structured development process

#### 4. BMad Workflow (`bmad/`)

**Commands**:
- `bmad-init.md` - BMad initialization

**Agents**:
- Complete enterprise-level development team simulation (PO, PM, Architect, Developer, QA, etc.)

**Purpose**: Enterprise-level agile development process

#### 5. Git Workflow (`git/`)

**Commands**:
- `git-commit.md` - Smart Git commit
- `git-rollback.md` - Safe rollback
- `git-cleanBranches.md` - Clean merged branches
- `git-worktree.md` - Git worktree management

**Purpose**: Git operation automation

### Workflow Installation

```bash
# Install all workflows
npx zcf init -w all

# Install specific workflows
npx zcf init -w sixStepsWorkflow,gitWorkflow

# Skip workflow installation
npx zcf init -w skip
```

### Custom Workflows

1. **Fork Repository and Modify Templates**:
```bash
# 1. Fork ZCF repository
git clone https://github.com/your-org/zcf.git
cd zcf

# 2. Modify templates
vim templates/claude-code/zh-CN/workflow/custom/my-workflow.md

# 3. Build and test
pnpm build
npm link
```

2. **Use During Initialization**:
```bash
# Initialize using custom template directory
npx zcf init -w custom
```

3. **Team Publishing Custom Templates**:
```bash
# Publish npm package containing custom templates
npm publish @your-org/zcf-templates
```

## System Prompt Templates

System prompt templates define project-level AI behavior standards and guidelines.

### CLAUDE.md

`CLAUDE.md` is Claude Code's project memory file, recommended structure:

```markdown
# Project Configuration

## Language Instructions
Use Chinese to reply

## Coding Standards
- Use TypeScript
- Follow ESLint rules
- Use 2-space indentation

## Workflow Standards
Use six-stage workflow for development
```

### Project Memory Best Practices

1. **Hierarchical Organization**:
```
Project Root/
├── CLAUDE.md              # Global configuration (concise)
└── .claude/
    ├── plan/              # Plan documents
    ├── memory/            # Project memory
    │   ├── architecture.md
    │   ├── api-design.md
    │   └── coding-standards.md
    └── workflows/         # Workflow templates
```

2. **Avoid Excessive Context**:
- Global `CLAUDE.md` only keeps necessary settings
- Complex standards go into output styles or project memory
- Use `/zcf:init-project` to generate hierarchical structure

3. **Regular Updates**:
```bash
# Update templates and prompts
npx zcf update -g zh-CN
```

## Template Language Support

ZCF supports templates in two languages:

### Chinese Templates (`zh-CN`)

- Complete Chinese localization
- Chinese AI interaction mode
- Chinese technical documentation standards
- Chinese workflow descriptions

### English Templates (`en`)

- Complete English localization
- English AI interaction mode
- English technical documentation standards
- English workflow descriptions

### Language Switching

```bash
# Initialize using Chinese templates
npx zcf init -c zh-CN

# Initialize using English templates
npx zcf init -c en

# Switch language during update
npx zcf update -c en
```

## Template Update Strategy

### Update Methods

| Method | Command | Description |
|------|------|------|
| **Complete Update** | `npx zcf update` | Update all templates |
| **Documents Only** | `npx zcf init --config-action docs-only` | Only update prompts and documents |
| **Merge Update** | `npx zcf init --config-action merge` | Merge new templates into existing configuration |

### Preserve Custom Content

If you modified templates, it's recommended to:

1. **Backup Custom Templates**:
```bash
# Backup custom templates
tar -czf my-custom-templates.tar.gz ~/.claude/workflows/custom/
```

2. **Use Version Control**:
```bash
# Include custom templates in Git
git add ~/.claude/workflows/custom/
git commit -m "Add custom workflow templates"
```

3. **Check During Updates**:
```bash
# Compare differences before updating
diff -r ~/.claude/workflows/ ~/.claude/backup/latest/workflows/
```

## Team Collaboration

### Unified Templates

Unify template standards within team:

1. **Create Team Template Repository**:
```bash
# Create template repository
mkdir team-zcf-templates
cd team-zcf-templates
git init

# Add template files
cp -r ~/.claude/workflows/team-* ./
git add .
git commit -m "Initial team templates"
```

2. **Team Member Sync**:
```bash
# Pull team templates
git pull origin main
cp -r team-* ~/.claude/workflows/
```

### Template Version Management

- Use semantic versioning for template changes
- Provide migration guides for major changes
- Maintain backward compatibility as much as possible
- Test template updates on existing configurations

## Troubleshooting

### Templates Not Installed

If templates are not correctly installed:

```bash
# Reinstall templates
npx zcf init --config-action new

# Check template directories
ls -la ~/.claude/workflows/
ls -la ~/.claude/prompts/output-style/
```

### Custom Templates Lost

If custom templates are lost after update:

```bash
# Restore from backup
cp -r ~/.claude/backup/backup_*/workflows/custom/ ~/.claude/workflows/

# Or restore from version control
git checkout HEAD -- ~/.claude/workflows/custom/
```

### Language Mismatch

If template language doesn't match configuration:

```bash
# Reinitialize and specify language
npx zcf init --config-action backup -c zh-CN

# Or only update template language
npx zcf update -c zh-CN
```

## Related Resources

- [Workflow System](../features/workflows.md) - Detailed workflow information
- [Output Style Strategy](../best-practices/output-styles.md) - Output style management
- [Configuration Management](configuration.md) - Configuration management guide

> 💡 **Tip**: Proper use of template system can greatly improve development efficiency. It's recommended to unify template standards within teams and regularly update templates to get latest features.


