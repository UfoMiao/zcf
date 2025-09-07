---
description: Automate version release and code commit using changeset
allowed-tools: Read(**), Exec(git, pnpm, node, date, cat, gh)
argument-hint: [-p|--patch] [-mi|--minor] [-ma|--major] [<version>]
# examples:
#   - /zcf-release                     # Default patch version bump
#   - /zcf-release -p                  # Patch version bump (2.9.11 → 2.9.12)
#   - /zcf-release -mi                 # Minor version bump (2.9.11 → 2.10.0)
#   - /zcf-release -ma                 # Major version bump (2.9.11 → 3.0.0)
#   - /zcf-release 1.5.0               # Exact version (→ 1.5.0)
#   - /zcf-release 3.0.0-alpha.1       # Pre-release version (→ 3.0.0-alpha.1)
---

# ZCF Release - Automated Release and Commit

Automate version release and code commit using changeset.

## Usage

```bash
/zcf-release [-p|-mi|-ma|<version>]
```

## Parameters

- `-p` or `--patch`: Patch version (default) - bug fixes, minor changes
- `-mi` or `--minor`: Minor version - new features, backward compatible
- `-ma` or `--major`: Major version - breaking changes, incompatible
- `<version>`: Specific version number (e.g., 1.2.3, 2.0.0-beta.1) - directly use provided version

## Context

- Automatically analyze code changes and generate bilingual CHANGELOG
- Use changeset for version management
- Create release branch and pull request for protected main branch
- Auto commit code changes (NO manual tags)
- Support GitHub Actions auto publish to npm with automatic tagging after PR merge

## Your Role

You are a professional release management assistant responsible for:

1. Analyzing code changes
2. Generating standardized CHANGELOG
3. Executing version release process

## Execution Flow

Parse arguments: $ARGUMENTS

### 1. Parameter Parsing

```bash
VERSION_TYPE="patch"  # Default to patch version
SPECIFIC_VERSION=""   # For user-specified exact version

# Check if argument looks like a version number (matches semver pattern)
if [[ "$ARGUMENTS" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-].*)?$ ]]; then
  SPECIFIC_VERSION="$ARGUMENTS"
  VERSION_TYPE="custom"
  echo "🚀 Preparing to release exact version: $SPECIFIC_VERSION"
else
  case "$ARGUMENTS" in
    -p|--patch)
      VERSION_TYPE="patch"
      ;;
    -mi|--minor)
      VERSION_TYPE="minor"
      ;;
    -ma|--major)
      VERSION_TYPE="major"
      ;;
    "")
      VERSION_TYPE="patch"
      ;;
    *)
      echo "❌ Unknown parameter: $ARGUMENTS"
      echo "Usage: /zcf-release [-p|-mi|-ma|<version>]"
      echo "Examples:"
      echo "  /zcf-release -p          # Patch version bump"
      echo "  /zcf-release -mi         # Minor version bump"
      echo "  /zcf-release -ma         # Major version bump"
      echo "  /zcf-release 1.2.3       # Exact version"
      echo "  /zcf-release 2.0.0-beta.1 # Pre-release version"
      exit 1
      ;;
  esac
  echo "🚀 Preparing to release $VERSION_TYPE version"
fi
```

### 2. Check Working Directory Status

Check if the current working directory meets release conditions:

```bash
# Ensure in project root directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found, please run in project root"
  exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "⚠️  Detected uncommitted changes:"
  git status --short
  echo ""
  read -p "Commit these changes first? [Y/n] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo "Please commit changes before releasing"
    exit 1
  fi
fi

echo "✅ Working directory status OK"
```

### 3. Analyze Version Changes

Analyze all changes since last release:

```bash
# Get last release tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$LAST_TAG" ]; then
  echo "📊 No previous version tag found, analyzing all commits"
  COMMITS=$(git log --oneline)
else
  echo "📊 Last version: $LAST_TAG"
  echo "Analyzing changes since $LAST_TAG..."
  COMMITS=$(git log $LAST_TAG..HEAD --oneline)
fi

# Show commit history
echo -e "\n📝 Changes:"
echo "$COMMITS"

# Analyze file changes
echo -e "\n📁 File change statistics:"
if [ -z "$LAST_TAG" ]; then
  git diff --stat
else
  git diff --stat $LAST_TAG..HEAD
fi
```

### 4. Generate CHANGELOG Content

Based on code change analysis, I will generate CHANGELOG following these standards:

**Format Requirements**:

1. Chinese description first, English description second
2. No mixing Chinese and English on the same line
3. Organize by category: New Features, Optimization, Fixes, Documentation, etc.
4. Each entry should be concise and clear

**Example Format**:

```markdown
## 新功能

- 添加技术执行指南文档，提供命令执行最佳实践
- 支持自动化发版命令 /zcf-release
- Windows 路径自动加引号处理

## New Features

- Add technical execution guidelines with command best practices
- Support automated release command /zcf-release
- Automatic quote handling for Windows paths

## 优化

- 优先使用 ripgrep 提升搜索性能
- 改进模板文件组织结构

## Optimization

- Prioritize ripgrep for better search performance
- Improve template file organization

## 修复

- 修复 Windows 路径反斜杠丢失问题

## Fixes

- Fix Windows path backslash escaping issue
```

### 5. Create Changeset

Create changeset file based on analysis:

```bash
# Generate timestamp
TIMESTAMP=$(date +%Y%m%d%H%M%S)
CHANGESET_FILE=".changeset/release-$TIMESTAMP.md"

# Create changeset file
echo "📝 Creating changeset file..."
if [ "$VERSION_TYPE" = "custom" ]; then
  # For specific version, use the exact version number
  cat > "$CHANGESET_FILE" << EOF
---
"zcf": $SPECIFIC_VERSION
---

[Bilingual CHANGELOG content generated based on actual changes]
EOF
  echo "✅ Changeset file created with exact version: $SPECIFIC_VERSION"
else
  # For version type (patch/minor/major), use the type
  cat > "$CHANGESET_FILE" << EOF
---
"zcf": $VERSION_TYPE
---

[Bilingual CHANGELOG content generated based on actual changes]
EOF
  echo "✅ Changeset file created with version type: $VERSION_TYPE"
fi
```

### 6. Update Version Number

Use changeset to update version number and CHANGELOG:

```bash
echo "🔄 Updating version number and CHANGELOG..."
pnpm changeset version

# Note: The changeset version command will automatically:
# 1. Update package.json version
# 2. Generate/update CHANGELOG.md
# 3. DELETE the temporary changeset file in .changeset/ directory
# No manual cleanup needed!

# Get new version number
NEW_VERSION=$(node -p "require('./package.json').version")
if [ "$VERSION_TYPE" = "custom" ]; then
  echo "📦 New version set to: v$NEW_VERSION (specified: $SPECIFIC_VERSION)"
else
  echo "📦 New version: v$NEW_VERSION"
fi

# Show CHANGELOG update
echo -e "\n📋 CHANGELOG has been updated, please review the content"
echo "✅ Temporary changeset file has been automatically deleted"
```

### 7. Create Release Branch and Commit

Create release branch first, then commit changes to avoid polluting main branch:

````bash
echo "🚀 Creating release branch..."

# Create and switch to release branch BEFORE committing
RELEASE_BRANCH="release/v$NEW_VERSION"
git checkout -b "$RELEASE_BRANCH"

echo "💾 Committing release changes..."

# Add all changes
git add .

# Prepare commit message
COMMIT_MSG="chore: release v$NEW_VERSION

- Update version to $NEW_VERSION
- Update CHANGELOG.md
- Generated by /zcf-release command"

# Create release commit on release branch
git commit -m "$COMMIT_MSG"

# Push release branch to remote and set upstream tracking
git push -u origin "$RELEASE_BRANCH"

# If push fails due to conflicts, use force-with-lease to safely overwrite
# git push --force-with-lease origin "$RELEASE_BRANCH"

# Set upstream tracking if not set automatically
git branch --set-upstream-to=origin/$RELEASE_BRANCH $RELEASE_BRANCH

### 8. Create Pull Request

```bash
echo "📋 Creating pull request..."

# Create pull request using gh CLI (English only)
gh pr create --title "🚀 Release v$NEW_VERSION" --body "$(cat <<'EOF'
## Release Summary

This release includes important changes, please review CHANGELOG.md for details.

## Testing Status

✅ All tests passing
✅ ESLint checks passed  
✅ TypeScript type checks passed
✅ Build successful

## Release Notes

⚠️ **IMPORTANT**: After merge, GitHub Actions will automatically:
- Create release tag
- Publish to npm  
- Generate GitHub Release

🤖 Generated by /zcf-release command
EOF
)"

echo -e "\n✅ Release preparation complete!"
echo "📦 Version v$NEW_VERSION is ready"
echo "🔗 Pull request created successfully"
echo ""
echo "⚠️  IMPORTANT: Review and merge the PR to trigger the release"
echo "⚠️  Do NOT create or push tags manually!"
echo "🤖 After PR merge, GitHub Actions will automatically:"
echo "   - Create the release tag"
echo "   - Publish to npm"
echo "   - Generate GitHub Release"
echo "👀 View release status: https://github.com/UfoMiao/zcf/actions"
````

## Complete Workflow Summary

1. **Preparation Phase**: Check parameters (version type or exact version), working directory status
2. **Analysis Phase**: Analyze commit history and file changes
3. **Generation Phase**: Create bilingual CHANGELOG
4. **Execution Phase**: Update version (automatic bump or exact version)
5. **Branch Creation Phase**: Create release branch BEFORE committing
6. **Commit Phase**: Commit changes on release branch
7. **PR Creation Phase**: Push release branch and create pull request
8. **Review & Release Phase**: Manual PR review and merge, then GitHub Actions auto publish

## Important Notes

⚠️ **CRITICAL**: **NEVER create or push Git tags manually!** GitHub Actions will automatically:

- Create the version tag after successful PR merge
- Generate GitHub Release
- Publish to npm registry

Manual tags will cause conflicts with the automated release process!

### New Protected Branch Workflow:

- 🛡️ **Main branch is protected**: Cannot push directly to main
- 🌿 **Release branch created**: Automatic creation of `release/v{version}` branch
- 📋 **Pull Request required**: All releases must go through PR review process
- ✅ **Manual approval needed**: PR must be reviewed and merged manually
- 🤖 **Auto-release after merge**: GitHub Actions triggers after PR merge

### Additional Notes:

- Ensure all code has been tested before running release command
- CHANGELOG must follow bilingual format standards
- When using version types (-p/-mi/-ma), choose the correct type for your changes
- When providing exact version numbers, ensure they follow semantic versioning (e.g., 1.2.3, 2.0.0-beta.1)
- Exact version numbers bypass automatic version determination - use carefully
- Carefully review CHANGELOG content in the created PR before merging
- **No manual cleanup needed**: `changeset version` automatically deletes temporary changeset files
- The `.changeset/` directory should only contain config files, not temporary release files
- **Requires `gh` CLI**: Ensure GitHub CLI is installed and authenticated for PR creation

**Version Parameter Examples**:
- `/zcf-release` or `/zcf-release -p` - Auto patch bump (2.9.11 → 2.9.12)
- `/zcf-release -mi` - Auto minor bump (2.9.11 → 2.10.0)  
- `/zcf-release -ma` - Auto major bump (2.9.11 → 3.0.0)
- `/zcf-release 1.5.0` - Exact version (→ 1.5.0)
- `/zcf-release 3.0.0-alpha.1` - Pre-release version (→ 3.0.0-alpha.1)

---

**Now starting release process...**
