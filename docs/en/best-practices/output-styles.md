---
title: Output Style Strategy
---

# Output Style Strategy

Output styles are high-priority system prompts, suitable for defining team standards, coding standards, and AI behavior guidelines. By configuring different output styles, you can control AI assistant personality and working methods.

## What is Output Style

Output styles are Markdown files stored in the `prompts/output-style/` directory, defining AI assistant's:

- 🎭 **Personality Traits**: AI's speaking style and behavior
- 📝 **Coding Standards**: Code style, comment requirements, naming conventions
- ✅ **Quality Standards**: Code review standards, testing requirements
- 🔍 **Working Methods**: Problem analysis methods, decision processes

## Management Methods

### Install Output Styles

Specify styles to install via `--output-styles` parameter during initialization:

```bash
# Install all output styles
npx zcf init -o all

# Install specific styles
npx zcf init -o engineer-professional,nekomata-engineer

# Skip output style installation
npx zcf init -o skip
```

### Switch Output Style

#### Switch in Main Menu

```bash
npx zcf
# Select 6 (Configure AI Memory & Output Style)
# Then select output style management
```

#### Switch in Project

**Claude Code**:
```
/set-output-style engineer-professional
```

**Codex**:
Edit `systemPromptStyle` in `config.toml` or use system prompt configuration.

### Edit Output Style

Output style files are located in `prompts/output-style/` directory:

```bash
# View installed styles
ls -la ~/.claude/prompts/output-style/

# Edit specific style
vim ~/.claude/prompts/output-style/engineer-professional.md

# Create custom style
vim ~/.claude/prompts/output-style/my-custom-style.md
```

## Pre-configured Output Styles

<div align="center">
  <a href="https://github.com/Haleclipse">
    <img src="/assets/Haleclipse.webp" alt="Halley-chan" width="200" style="border-radius: 10px;"/>
  </a>
  <p>Tsundere <a href="https://github.com/Haleclipse">Halley-chan</a> Ojou-sama (￣▽￣)ゞ</p>
</div>

ZCF provides the following pre-configured output styles:

| Style ID | Name | Features | Use Case |
|---------|------|------|---------|
| `engineer-professional` | Professional Engineer | Rigorous, professional, focuses on code quality | Formal projects, enterprise environments |
| `nekomata-engineer` | Nekomata Engineer | Light and friendly, maintains professionalism | Personal projects, relaxed atmosphere |
| `laowang-engineer` | Laowang Engineer | Humorous and down-to-earth, direct and effective | Chinese projects, domestic teams |
| `ojousama-engineer` | Ojousama Engineer | Elegant and refined, focuses on details | Specific scenarios, stylized projects |

### Built-in Output Styles

In addition to pre-configured styles, the following built-in styles are also supported (always available):

- `default`: Default output style
- `explanatory`: Explanatory style, focuses on detailed explanation
- `learning`: Learning style, focuses on teaching and explanation

## Practice Recommendations

### 1. Write Team Standards into Output Style

Output style is an ideal place to define team development standards:

```markdown
# ~/.claude/prompts/output-style/team-standards.md

## Coding Standards

- Use TypeScript, strict mode
- Functions no more than 50 lines
- Must write unit tests
- Use ESLint and Prettier
- Follow SOLID principles

## Code Review Requirements

- All PRs must go through code review
- Ensure test coverage > 80%
- Check performance impact
- Verify security
```

### 2. Create Multiple Styles for On-Demand Switching

Create different output styles for different scenarios:

```bash
# During development: Use professional engineer style
/set-output-style engineer-professional

# During code review: Use review-specific style
/set-output-style code-review

# During documentation: Use documentation style
/set-output-style documentation
```

### 3. Project-Specific Styles

For projects requiring independent styles, use project-level output styles:

```
# Create in project root directory
Project Root/.claude/output-style/project-specific.md

# Use in conversation
/set-output-style project-specific
```

Project-specific styles override global styles but only take effect in that project.

### 4. Style Priority

Output style priority:

1. **Project-Specific Style** (`.claude/output-style/` or `.codex/output-style/`)
2. **Global Default Style** (default settings in `~/.claude/prompts/output-style/`)
3. **Built-in Style** (`default`, `explanatory`, `learning`)

### 5. Version Control

Include team output styles in version control:

```bash
# Create team style repository
mkdir team-output-styles
cp ~/.claude/prompts/output-style/team-standards.md team-output-styles/

# Include in Git
git add team-output-styles/
git commit -m "Add team output style standards"

# Team member sync
git pull
cp team-output-styles/team-standards.md ~/.claude/prompts/output-style/
```

## Output Style Structure

Typical output style file structure:

```markdown
# Output Style Name

## Personality Traits
Describe AI's speaking style and behavior

## Coding Standards
- Code style requirements
- Naming conventions
- Comment requirements

## Quality Standards
- Code review standards
- Testing requirements
- Performance standards

## Working Methods
- Problem analysis methods
- Decision processes
- Collaboration methods
```

## Custom Output Styles

### Create Custom Style

1. **Create Style File**:
```bash
vim ~/.claude/prompts/output-style/my-style.md
```

2. **Write Style Content**:
```markdown
# My Custom Style

You are a professional full-stack engineer, focusing on:
- Code quality and maintainability
- Performance optimization
- Security considerations
- User experience

## Coding Standards
- Use TypeScript
- Follow Airbnb code standards
- Write complete type definitions
- Must include error handling

## Working Methods
- Understand requirements before coding
- Write tests for test-driven development
- Focus on code reuse
- Continuous refactoring and optimization
```

3. **Use Custom Style**:
```bash
# Set default style
npx zcf
# Select 6, then select my-style

# Or use in project
/set-output-style my-style
```

### Team Shared Styles

Share custom styles with team:

```bash
# 1. Export style file
cp ~/.claude/prompts/output-style/team-style.md ./team-styles/

# 2. Include in version control
git add team-styles/
git commit -m "Add team output style"

# 3. Team members import
git pull
cp team-styles/team-style.md ~/.claude/prompts/output-style/
```

## Best Practices

### 1. Layered Definition of Standards

- **Global Style**: Team-common coding standards and standards
- **Project Style**: Project-specific requirements and constraints
- **Role Style**: Styles for different roles (developer, reviewer, document writer)

### 2. Keep Styles Concise

Output styles should be concise and clear, avoid being too verbose:

- ✅ **Recommended**: Core standards and key requirements
- ❌ **Not Recommended**: Overly detailed details (should be in project documentation)

### 3. Regular Style Updates

As projects develop and teams grow, regularly update output styles:

```bash
# Regular review and update
vim ~/.claude/prompts/output-style/engineer-professional.md

# Update after team discussion
git add prompts/output-style/
git commit -m "Update output style standards"
```

### 4. Test Style Effects

After creating new style, test its effects:

```bash
# 1. Set new style
/set-output-style my-new-style

# 2. Conduct test conversation
Please help me implement a simple Todo feature

# 3. Evaluate if output meets expectations

# 4. Adjust style based on feedback
```

### 5. Document Styles

Write documentation for custom styles:

```markdown
# team-standards.md

## Style Description

This style defines our team's development standards and quality standards.

## Usage Scenarios

- Formal project development
- Code review
- Technical review

## Update History

- 2025-01-15: Initial version
- 2025-02-01: Added performance requirements
```

## Notes

### Claude Code Version Requirements

- ⚠️ **Version Requirement**: Claude Code version must be > 1.0.81 to support output styles
- ✅ **Check Version**: Use `npx zcf check-updates` to check and update
- 📝 **Migration Note**: Global memory rules from old versions have been migrated to `engineer-professional` style

### Style File Locations

- **Claude Code**: `~/.claude/prompts/output-style/`
- **Codex**: `~/.codex/prompts/output-style/` (if supported)
- **Project Level**: `.claude/output-style/` or `.codex/output-style/`

### Style Conflict Handling

If multiple styles exist simultaneously:

1. Project-level style takes priority
2. Global default style is next
3. Built-in style as fallback

## Related Resources

- [Template System](../advanced/templates.md) - Detailed templates and output styles
- [Configuration Management](../features/multi-config.md) - Multi-configuration and backup
- [Usage Tips](tips.md) - More practical tips

> 💡 **Tip**: Proper use of output styles can greatly improve code quality and development efficiency. It's recommended to unify output style standards within teams and customize appropriately based on project characteristics. Output styles should be concise and clear, focusing on core standards and key requirements.


