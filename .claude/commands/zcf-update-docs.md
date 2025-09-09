---
description: Automatically check code changes since last tag and update documentation (README.md, README_zh-CN.md, CLAUDE.md) to ensure consistency with actual code implementation
allowed-tools: Read(**), Exec(git, cat, grep, diff)
argument-hint: [--check-only]
# examples:
#   - /zcf-update-docs                 # Check and update all documentation files
#   - /zcf-update-docs --check-only    # Only check for inconsistencies without making updates (dry run)
---

# ZCF Update Docs - Documentation Synchronization

Automatically check code changes since last tag and update documentation (README.md, README_zh-CN.md, CLAUDE.md) to ensure consistency with actual code implementation.

## Usage

```bash
/zcf-update-docs [--check-only]
```

## Parameters

- `--check-only`: Only check for inconsistencies without making updates (dry run)

## Context

- Analyze all code changes since the last Git tag
- Check if documentation needs updates for each module
- Ensure menu and initialization flow descriptions match actual code
- Maintain bilingual documentation consistency

## Your Role

You are a professional documentation maintainer responsible for:

1. Analyzing code changes and their impact on documentation
2. Identifying documentation sections that need updates
3. Ensuring documentation accuracy and consistency
4. Maintaining bilingual synchronization

## Execution Flow

Parse arguments: $ARGUMENTS

### 1. Parameter Parsing

```bash
CHECK_ONLY=false  # Default to update mode

case "$ARGUMENTS" in
  --check-only)
    CHECK_ONLY=true
    echo "📋 Running in check-only mode (no files will be modified)"
    ;;
  "")
    CHECK_ONLY=false
    echo "✏️ Running in update mode"
    ;;
  *)
    echo "Unknown parameter: $ARGUMENTS"
    echo "Usage: /zcf-update-docs [--check-only]"
    exit 1
    ;;
esac
```

### 2. Get Changes Since Last Tag

Analyze all changes since the last release:

```bash
# Get last release tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$LAST_TAG" ]; then
  echo "⚠️ No previous version tag found, analyzing all files"
  FILES_CHANGED=$(git ls-files)
else
  echo "📊 Last version: $LAST_TAG"
  echo "Analyzing changes since $LAST_TAG..."
  FILES_CHANGED=$(git diff --name-only $LAST_TAG..HEAD)
fi

# Categorize changed files
echo -e "\n📁 Analyzing changed files..."
```

### 3. Identify Documentation Update Areas

Based on file changes, determine which documentation sections need updates:

**Critical Areas to Check:**

1. **Menu System** (`src/commands/menu.ts`, `src/menu/`, `src/i18n/locales/*/menu.ts`)
   - Main menu options and descriptions
   - Submenu structure and navigation
   - Menu item translations

2. **Initialization Flow** (`src/commands/init.ts`, `src/utils/installer.ts`)
   - Installation steps
   - Configuration prompts
   - API setup process
   - MCP service selection

3. **Commands** (`src/commands/*.ts`)
   - Available commands
   - Command options and parameters
   - Usage examples

4. **Workflows** (`src/config/workflows.ts`, `templates/*/workflow/`)
   - Available workflows
   - Workflow descriptions
   - Installation instructions

5. **Configuration** (`src/utils/config.ts`, `src/types.ts`)
   - Configuration file structure
   - Environment variables
   - Settings options

6. **MCP Services** (`src/constants.ts`, `src/utils/claude-config.ts`)
   - Available MCP services
   - Service descriptions
   - Configuration requirements

### 4. Check Current Documentation

Read and analyze current documentation files:

```bash
# Check if documentation files exist
DOCS_TO_CHECK=(
  "README.md"
  "README_zh-CN.md"
  "CLAUDE.md"
)

for DOC in "${DOCS_TO_CHECK[@]}"; do
  if [ ! -f "$DOC" ]; then
    echo "❌ Warning: $DOC not found"
  else
    echo "✅ Found: $DOC"
  fi
done
```

### 5. Verify Menu Consistency

Compare menu structure in code with documentation:

**Check Points:**
- Menu option names and order
- Menu descriptions and help text
- Keyboard shortcuts
- Navigation flow
- Exit options

**Code Sources:**
- `src/commands/menu.ts` - Main menu implementation
- `src/menu/*.ts` - Submenu implementations
- `src/i18n/locales/*/menu.ts` - Menu translations

### 6. Verify Initialization Flow

Ensure initialization steps in documentation match actual implementation:

**Check Points:**
1. Installation detection and prompts
2. API configuration steps
3. MCP service selection
4. Workflow installation options
5. Configuration file generation
6. Success/error messages

**Code Sources:**
- `src/commands/init.ts` - Main initialization logic
- `src/utils/installer.ts` - Installation process
- `src/utils/config.ts` - Configuration setup
- `src/utils/mcp-selector.ts` - MCP selection

### 7. Generate Update Report

Create a detailed report of findings:

```markdown
## Documentation Update Report

### Files Changed Since $LAST_TAG
- [List of relevant changed files]

### Documentation Sections Requiring Updates

#### README.md
- [ ] Menu structure
- [ ] Installation steps
- [ ] Command usage
- [ ] Configuration options

#### README_zh-CN.md
- [ ] 菜单结构
- [ ] 安装步骤
- [ ] 命令使用
- [ ] 配置选项

#### CLAUDE.md
- [ ] Development commands
- [ ] Architecture updates
- [ ] Testing guidelines
- [ ] Workflow system

### Specific Inconsistencies Found
[Detailed list of mismatches between code and documentation]
```

### 8. Update Documentation Files

If not in check-only mode, update the documentation:

```bash
if [ "$CHECK_ONLY" = false ]; then
  echo "📝 Updating documentation files..."
  
  # Update README.md
  # - Update menu structure based on src/commands/menu.ts
  # - Update initialization flow based on src/commands/init.ts
  # - Update command list based on src/commands/*.ts
  # - Update configuration section based on types and constants
  
  # Update README_zh-CN.md
  # - Ensure consistency with README.md content
  # - Use proper Chinese translations from i18n files
  # - Maintain the same structure as English version
  
  # Update CLAUDE.md
  # - Update development commands if package.json scripts changed
  # - Update architecture section if new modules added
  # - Update testing section if test structure changed
  # - Update workflow documentation if workflows modified
  
  echo "✅ Documentation files updated"
else
  echo "ℹ️ Check-only mode: No files were modified"
fi
```

### 9. Validation

Perform final validation checks:

```bash
echo -e "\n🔍 Performing validation checks..."

# Check for broken internal links
echo "Checking internal links..."

# Verify code examples still work
echo "Verifying code examples..."

# Ensure translations are synchronized
echo "Checking translation consistency..."

# Validate markdown formatting
echo "Validating markdown format..."

echo "✅ Validation complete"
```

### 10. Summary Report

Generate final summary:

```bash
echo -e "\n📊 Documentation Update Summary"
echo "================================"
echo "Files analyzed: [count]"
echo "Documentation files updated: [list]"
echo "Sections modified: [count]"
echo ""
echo "Key updates:"
echo "- [List major updates]"
echo ""
if [ "$CHECK_ONLY" = true ]; then
  echo "📋 This was a check-only run. To apply updates, run without --check-only"
else
  echo "✅ Documentation has been synchronized with code"
  echo "📝 Please review the changes before committing"
fi
```

## Documentation Structure Reference

### README.md / README_zh-CN.md Structure

1. **Project Description**
2. **Features**
3. **Installation** (Must match `src/commands/init.ts`)
4. **Usage** 
   - Menu system (Must match `src/commands/menu.ts`)
   - Commands (Must match `src/commands/*.ts`)
5. **Configuration** (Must match types and constants)
6. **MCP Services** (Must match `src/constants.ts`)
7. **Workflows** (Must match `src/config/workflows.ts`)
8. **Development**
9. **License**

### CLAUDE.md Structure

1. **Project Overview**
2. **Development Guidelines**
3. **Development Commands** (Must match `package.json` scripts)
4. **Architecture & Code Organization**
5. **Testing Strategy**
6. **Common Development Tasks**

## Important Notes

⚠️ **Critical Requirements:**
- **ALWAYS** ensure menu descriptions match actual menu implementation
- **ALWAYS** verify initialization flow steps are in correct order
- **ALWAYS** maintain bilingual consistency between README files
- **NEVER** remove existing content without verification
- **NEVER** break markdown formatting or links

📌 **Best Practices:**
- Use actual i18n translations from the codebase
- Preserve existing formatting and style
- Update examples to reflect current implementation
- Include new features and commands added since last tag
- Remove deprecated features that no longer exist

🔍 **Validation Checklist:**
- [ ] Menu options match `src/commands/menu.ts`
- [ ] Init flow matches `src/commands/init.ts`
- [ ] Commands match files in `src/commands/`
- [ ] Workflows match `src/config/workflows.ts`
- [ ] MCP services match `src/constants.ts`
- [ ] Translations are consistent between languages
- [ ] All code examples are executable
- [ ] No broken internal links
- [ ] Markdown formatting is valid

---

**Now starting documentation update process...**