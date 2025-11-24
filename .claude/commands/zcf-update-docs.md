---
description: Automatically check code changes since last tag and update documentation in docs/ directory (en, zh-CN, ja-JP) and CLAUDE.md to ensure consistency with actual code implementation
allowed-tools: Read(**), Exec(git, cat, grep, diff)
argument-hint: [--check-only]
# examples:
#   - /zcf-update-docs                 # Check and update all documentation files
#   - /zcf-update-docs --check-only    # Only check for inconsistencies without making updates (dry run)
---

# ZCF Update Docs - Documentation Synchronization

Automatically check code changes since last tag and update documentation in `docs/` directory (multilingual: en, zh-CN, ja-JP) and CLAUDE.md to ensure consistency with actual code implementation.

## Usage

```bash
/zcf-update-docs [--check-only]
```

## Parameters

- `--check-only`: Only check for inconsistencies without making updates (dry run)

## Context

- Analyze all code changes since the last Git tag
- Check if documentation needs updates in docs/ directory structure
- Ensure CLI commands, features, and workflows documentation match actual code
- Maintain multilingual documentation consistency across en, zh-CN, ja-JP
- Update CLAUDE.md for development-related changes

## Your Role

You are a professional documentation maintainer responsible for:

1. Analyzing code changes and their impact on documentation
2. Identifying documentation sections that need updates
3. Ensuring documentation accuracy and consistency
4. Maintaining multilingual synchronization

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

Based on file changes, determine which documentation files in `docs/` need updates:

**Code Changes → Documentation Mapping:**

1. **CLI Commands** (`src/commands/*.ts`) → `docs/{lang}/cli/`
   - `src/commands/init.ts` → `cli/init.md` - Installation and initialization
   - `src/commands/menu.ts` → `cli/menu.md` - Interactive menu system
   - `src/commands/update.ts` → `cli/update.md` - Update workflows
   - `src/commands/ccr.ts` → `cli/ccr.md` - CCR proxy management
   - `src/commands/ccu.ts` → `cli/ccu.md` - Usage analysis
   - `src/commands/uninstall.ts` → `cli/uninstall.md` - Uninstallation
   - `src/commands/config-switch.ts` → `cli/config-switch.md` - Config switching
   - `src/commands/check-updates.ts` → `cli/check-updates.md` - Version check

2. **Features** → `docs/{lang}/features/`
   - `src/utils/installer.ts`, `src/utils/claude-config.ts` → `features/claude-code.md`
   - `src/utils/code-tools/codex*` → `features/codex.md`
   - `src/config/workflows.ts` → `features/workflows.md`
   - `src/config/mcp-services.ts` → `features/mcp.md`
   - `src/utils/ccr/` → `features/ccr.md`
   - `src/utils/cometix/` → `features/cometix.md`
   - `src/utils/config.ts` → `features/multi-config.md`

3. **Workflows** (`src/config/workflows.ts`, `templates/*/workflow/`) → `docs/{lang}/workflows/`
   - Workflow definitions → `workflows/index.md`
   - Specific workflow templates → `workflows/{workflow-name}.md`

4. **Advanced Configuration** → `docs/{lang}/advanced/`
   - `src/types/config.ts`, `src/utils/config.ts` → `advanced/configuration.md`
   - `src/config/api-providers.ts` → `advanced/api-providers.md`
   - `templates/` → `advanced/templates.md`
   - `src/i18n/` → `advanced/i18n.md`

5. **Getting Started** → `docs/{lang}/getting-started/`
   - `src/commands/init.ts`, `src/utils/installer.ts` → `getting-started/installation.md`
   - General introduction → `getting-started/index.md`

6. **Development** → `docs/{lang}/development/` and `CLAUDE.md`
   - Architecture changes → `development/architecture.md` + `CLAUDE.md`
   - Testing changes → `development/testing.md` + `CLAUDE.md`
   - Contributing guidelines → `development/contributing.md`
   - Package.json scripts → `CLAUDE.md`

### 4. Check Current Documentation

Read and analyze current documentation structure:

```bash
# Check if documentation directories exist
DOCS_LANGS=("en" "zh-CN" "ja-JP")
DOCS_CATEGORIES=(
  "getting-started"
  "cli"
  "features"
  "workflows"
  "advanced"
  "best-practices"
  "development"
)

echo "📁 Checking documentation structure..."

for LANG in "${DOCS_LANGS[@]}"; do
  if [ ! -d "docs/$LANG" ]; then
    echo "❌ Warning: docs/$LANG directory not found"
  else
    echo "✅ Found: docs/$LANG/"
    for CATEGORY in "${DOCS_CATEGORIES[@]}"; do
      if [ ! -d "docs/$LANG/$CATEGORY" ]; then
        echo "  ⚠️  Missing category: $CATEGORY"
      else
        echo "  ✅ Category: $CATEGORY"
      fi
    done
  fi
done

# Check CLAUDE.md
if [ ! -f "CLAUDE.md" ]; then
  echo "❌ Warning: CLAUDE.md not found"
else
  echo "✅ Found: CLAUDE.md"
fi
```

### 5. Verify CLI Commands Consistency

Compare CLI commands implementation with documentation:

**Check Points:**
- Command names, options, and parameters
- Command descriptions and usage examples
- Interactive menu options and flow
- Keyboard shortcuts and navigation
- Exit and back options
- Multilingual prompt translations

**Code Sources → Documentation Files:**
- `src/commands/menu.ts`, `src/i18n/locales/*/menu.json` → `docs/{lang}/cli/menu.md`
- `src/commands/init.ts`, `src/i18n/locales/*/cli.json` → `docs/{lang}/cli/init.md`
- `src/commands/update.ts` → `docs/{lang}/cli/update.md`
- `src/commands/ccr.ts` → `docs/{lang}/cli/ccr.md`
- `src/commands/ccu.ts` → `docs/{lang}/cli/ccu.md`
- `src/commands/uninstall.ts` → `docs/{lang}/cli/uninstall.md`
- `src/commands/config-switch.ts` → `docs/{lang}/cli/config-switch.md`
- `src/commands/check-updates.ts` → `docs/{lang}/cli/check-updates.md`

### 6. Verify Features Documentation

Ensure features documentation matches actual implementation:

**Check Points:**
1. Claude Code configuration capabilities
2. Codex CLI integration and setup
3. Workflow system and categories
4. MCP service integration
5. CCR proxy management
6. Cometix status line
7. Multi-config and backup system
8. API provider presets

**Code Sources → Documentation Files:**
- `src/utils/installer.ts`, `src/utils/claude-config.ts` → `docs/{lang}/features/claude-code.md`
- `src/utils/code-tools/codex*.ts`, `templates/codex/` → `docs/{lang}/features/codex.md`
- `src/config/workflows.ts` → `docs/{lang}/features/workflows.md`
- `src/config/mcp-services.ts` → `docs/{lang}/features/mcp.md`
- `src/utils/ccr/` → `docs/{lang}/features/ccr.md`
- `src/utils/cometix/` → `docs/{lang}/features/cometix.md`
- `src/utils/config.ts` → `docs/{lang}/features/multi-config.md`

### 7. Generate Update Report

Create a detailed report of findings:

```markdown
## Documentation Update Report

### Files Changed Since $LAST_TAG
- [List of relevant changed files categorized by module]

### Documentation Files Requiring Updates

#### docs/en/ (English Documentation)
- [ ] getting-started/installation.md - Installation and setup
- [ ] cli/*.md - CLI command documentation
- [ ] features/*.md - Feature descriptions
- [ ] workflows/*.md - Workflow guides
- [ ] advanced/*.md - Advanced configuration
- [ ] development/*.md - Development documentation

#### docs/zh-CN/ (Chinese Documentation)
- [ ] getting-started/installation.md - 安装和设置
- [ ] cli/*.md - CLI 命令文档
- [ ] features/*.md - 功能说明
- [ ] workflows/*.md - 工作流指南
- [ ] advanced/*.md - 高级配置
- [ ] development/*.md - 开发文档

#### docs/ja-JP/ (Japanese Documentation)
- [ ] getting-started/installation.md - インストールとセットアップ
- [ ] cli/*.md - CLI コマンドドキュメント
- [ ] features/*.md - 機能説明
- [ ] workflows/*.md - ワークフローガイド
- [ ] advanced/*.md - 高度な設定
- [ ] development/*.md - 開発ドキュメント

#### CLAUDE.md (Root Development Documentation)
- [ ] Development commands (package.json scripts)
- [ ] Architecture and module structure
- [ ] Testing guidelines and coverage
- [ ] Workflow system implementation
- [ ] Code standards and conventions

### Specific Inconsistencies Found
[Detailed list of mismatches between code and documentation, organized by file]
```

### 8. Update Documentation Files

If not in check-only mode, update the documentation:

```bash
if [ "$CHECK_ONLY" = false ]; then
  echo "📝 Updating documentation files in docs/ directory..."
  
  # Update docs/en/ (English Documentation)
  # - CLI commands: Update docs/en/cli/*.md based on src/commands/*.ts
  # - Features: Update docs/en/features/*.md based on feature implementations
  # - Workflows: Update docs/en/workflows/*.md based on src/config/workflows.ts
  # - Getting Started: Update docs/en/getting-started/*.md based on installation flow
  # - Advanced: Update docs/en/advanced/*.md based on configuration and templates
  # - Development: Update docs/en/development/*.md based on architecture changes
  # - Use translations from src/i18n/locales/en/*.json
  
  # Update docs/zh-CN/ (Chinese Documentation)
  # - Maintain same structure and sections as English version
  # - Use proper Chinese translations from src/i18n/locales/zh-CN/*.json
  # - Update all corresponding CLI, features, workflows, etc.
  # - Ensure technical terms and examples are properly localized
  
  # Update docs/ja-JP/ (Japanese Documentation)
  # - Maintain same structure and sections as English version
  # - Use proper Japanese translations (maintain consistency with project style)
  # - Update all corresponding CLI, features, workflows, etc.
  # - Ensure proper Japanese formatting and terminology
  
  # Update CLAUDE.md (Root Development Documentation)
  # - Update development commands if package.json scripts changed
  # - Update architecture section if new modules added
  # - Update testing section if test structure changed
  # - Update workflow system if src/config/workflows.ts changed
  # - Update module index if directory structure changed
  # - Maintain English-only for development documentation
  
  # Update SUMMARY.md for each language
  # - Ensure table of contents matches actual file structure
  # - Update links if files were added/removed/renamed
  # - Maintain consistent ordering across all languages
  
  echo "✅ Documentation files updated in docs/ directory"
else
  echo "ℹ️ Check-only mode: No files were modified"
fi
```

### 9. Validation

Perform final validation checks:

```bash
echo -e "\n🔍 Performing validation checks..."

# Check for broken internal links in all language versions
echo "Checking internal links in docs/en/, docs/zh-CN/, docs/ja-JP/..."

# Verify SUMMARY.md matches actual file structure
echo "Validating SUMMARY.md table of contents..."

# Ensure structure consistency across languages
echo "Checking structural consistency across en, zh-CN, ja-JP..."

# Verify code examples still work
echo "Verifying code examples and command syntax..."

# Validate markdown formatting
echo "Validating markdown format..."

# Check translation completeness
echo "Checking multilingual translation completeness..."

# Verify CLI command documentation matches implementation
echo "Verifying CLI command documentation accuracy..."

# Validate feature documentation completeness
echo "Checking feature documentation coverage..."

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

### docs/{lang}/ Directory Structure (en, zh-CN, ja-JP)

Each language directory contains the following categories:

1. **getting-started/** - Installation and quick start
   - `index.md` - Quick start guide
   - `installation.md` - Installation guide (Must match `src/commands/init.ts`)

2. **cli/** - CLI command documentation
   - `index.md` - Commands overview
   - `init.md`, `update.md`, `menu.md`, etc. (Must match `src/commands/*.ts`)

3. **features/** - Feature descriptions
   - `index.md` - Features overview
   - `claude-code.md`, `codex.md`, `workflows.md`, etc. (Must match implementations)

4. **workflows/** - Workflow guides
   - `index.md` - Workflow overview
   - Specific workflow documentation (Must match `src/config/workflows.ts`)

5. **advanced/** - Advanced configuration
   - `configuration.md`, `api-providers.md`, `templates.md`, etc.

6. **best-practices/** - Best practices and tips
   - Usage tips and optimization strategies

7. **development/** - Development documentation
   - `architecture.md`, `contributing.md`, `testing.md`

8. **SUMMARY.md** - Table of contents for each language

### CLAUDE.md Structure (Root Development Documentation)

1. **Project Overview**
2. **Architecture Overview** (Must match actual module structure)
3. **Module Index** (Must match src/ directory structure)
4. **CLI Usage**
5. **Running and Development** (Must match `package.json` scripts)
6. **Development Guidelines**
7. **Testing Strategy**
8. **AI Team Configuration**

## Important Notes

⚠️ **Critical Requirements:**
- **ALWAYS** ensure CLI command documentation matches actual implementation in `src/commands/`
- **ALWAYS** verify feature descriptions match actual code behavior
- **ALWAYS** maintain structural consistency across all language versions (en, zh-CN, ja-JP)
- **ALWAYS** update SUMMARY.md when file structure changes
- **NEVER** remove existing content without verification
- **NEVER** break markdown formatting or internal links
- **NEVER** create inconsistency between language versions

📌 **Best Practices:**
- Use actual i18n translations from `src/i18n/locales/{lang}/*.json`
- Preserve existing formatting and style conventions
- Update code examples to reflect current implementation
- Include new features and commands added since last tag
- Remove or mark deprecated features that no longer exist
- Maintain parallel structure across en, zh-CN, ja-JP directories
- Keep CLAUDE.md focused on development-specific information

🔍 **Validation Checklist:**
- [ ] CLI command docs match `src/commands/*.ts` implementation
- [ ] Feature docs match actual feature implementations
- [ ] Workflow docs match `src/config/workflows.ts` definitions
- [ ] Installation guide matches `src/commands/init.ts` flow
- [ ] Configuration docs match types in `src/types/*.ts`
- [ ] MCP service docs match `src/config/mcp-services.ts`
- [ ] Structure consistency across en, zh-CN, ja-JP directories
- [ ] SUMMARY.md matches actual file structure for each language
- [ ] All internal links are valid and not broken
- [ ] Code examples and command syntax are correct
- [ ] Translations use proper i18n strings from codebase
- [ ] Markdown formatting is valid in all files
- [ ] Codex integration documentation is comprehensive
- [ ] CCR, Cometix, CCusage features are accurately documented
- [ ] API provider presets documentation is up-to-date
- [ ] CLAUDE.md reflects current architecture and development practices

---

**Now starting documentation update process...**