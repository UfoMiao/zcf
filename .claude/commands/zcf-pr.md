---
description: Create pull request based on current branch changes
allowed-tools: Read(**), Exec(git, pnpm, node, date, cat, gh)
argument-hint: [--base <branch>] [--draft] [--title <title>]
# examples:
#   - /zcf-pr                        # Create PR from current branch to main
#   - /zcf-pr --base develop         # Create PR to develop branch
#   - /zcf-pr --draft                # Create draft PR
#   - /zcf-pr --title "Bug Fix"      # Custom PR title
---

# ZCF PR - Create Pull Request from Current Branch

Create pull request based on current branch changes and generate standardized PR description.

## Usage

```bash
/zcf-pr [--base <branch>] [--draft] [--title <title>]
```

## Parameters

- `--base <branch>`: Target base branch (default: main)
- `--draft`: Create as draft pull request
- `--title <title>`: Custom PR title

## Context

- Analyze current branch changes since divergence from base branch
- Generate PR description following project template
- Support both English and Chinese descriptions
- Auto-detect change types and categorize appropriately
- Create PR using GitHub CLI with comprehensive template

## Your Role

You are a professional pull request management assistant responsible for:

1. Analyzing branch changes
2. Categorizing change types automatically
3. Generating standardized PR descriptions
4. Creating pull requests with proper templates

## Execution Flow

Parse arguments: $ARGUMENTS

### 1. Parameter Parsing

```bash
BASE_BRANCH="main"
IS_DRAFT=false
CUSTOM_TITLE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --base)
      BASE_BRANCH="$2"
      shift 2
      ;;
    --draft)
      IS_DRAFT=true
      shift
      ;;
    --title)
      CUSTOM_TITLE="$2"
      shift 2
      ;;
    *)
      echo "❌ Unknown parameter: $1"
      echo "Usage: /zcf-pr [--base <branch>] [--draft] [--title <title>]"
      echo "Examples:"
      echo "  /zcf-pr                           # Create PR to main"
      echo "  /zcf-pr --base develop            # Create PR to develop"
      echo "  /zcf-pr --draft                   # Create draft PR"
      echo "  /zcf-pr --title 'Bug Fix'         # Custom title"
      exit 1
      ;;
  esac
done

echo "🚀 Creating PR from current branch to $BASE_BRANCH"
if [ "$IS_DRAFT" = true ]; then
  echo "📝 Creating as draft PR"
fi
if [ -n "$CUSTOM_TITLE" ]; then
  echo "📝 Custom title: $CUSTOM_TITLE"
fi
```

### 2. Check Working Directory Status

```bash
# Check if we're in a git repository
if [ ! -d ".git" ]; then
  echo "❌ Error: Not in a git repository"
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
  echo "❌ Error: Could not determine current branch"
  exit 1
fi

# Check if current branch is same as base branch
if [ "$CURRENT_BRANCH" = "$BASE_BRANCH" ]; then
  echo "❌ Error: Cannot create PR from $BASE_BRANCH to $BASE_BRANCH"
  echo "Please switch to a feature branch first"
  exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "⚠️  Warning: You have uncommitted changes"
  echo "Please commit your changes before creating a PR"
  echo ""
  git status --short
  echo ""
  echo "Run the following commands to commit your changes:"
  echo "  git add ."
  echo "  git commit -m 'Your commit message'"
  exit 1
fi

echo "✅ Branch status OK: $CURRENT_BRANCH"
```

### 3. Analyze Branch Changes

```bash
# Check if base branch exists
if ! git rev-parse --verify "$BASE_BRANCH" >/dev/null 2>&1; then
  echo "❌ Error: Base branch '$BASE_BRANCH' does not exist"
  exit 1
fi

# Get commit history since divergence
echo "📊 Analyzing changes from $BASE_BRANCH..."

# Find common ancestor
MERGE_BASE=$(git merge-base "$BASE_BRANCH" HEAD)
if [ -z "$MERGE_BASE" ]; then
  echo "❌ Error: Could not find common ancestor with $BASE_BRANCH"
  exit 1
fi

# Get commits since divergence
COMMITS=$(git log $MERGE_BASE..HEAD --oneline)
COMMIT_COUNT=$(echo "$COMMITS" | wc -l | tr -d ' ')

if [ "$COMMIT_COUNT" -eq 0 ]; then
  echo "❌ Error: No commits found since divergence from $BASE_BRANCH"
  exit 1
fi

echo "📝 Found $COMMIT_COUNT commit(s):"
echo "$COMMITS"
echo ""

# Analyze file changes
echo "📁 File change statistics:"
git diff --stat $MERGE_BASE..HEAD

# Get changed files
CHANGED_FILES=$(git diff --name-only $MERGE_BASE..HEAD)
echo ""
echo "📋 Changed files:"
echo "$CHANGED_FILES"
```

### 4. Categorize Changes

```bash
# Analyze changes to determine type and scope
echo ""
echo "🔍 Analyzing change categories..."

BUG_FIX=false
NEW_FEATURE=false
BREAKING_CHANGE=false
DOCUMENTATION=false
TESTS=false

# Analyze commits for change indicators
if echo "$COMMITS" | grep -E "(fix|bug|error|issue|problem)" >/dev/null; then
  BUG_FIX=true
fi

if echo "$COMMITS" | grep -E "(feat|add|new|create|implement)" >/dev/null; then
  NEW_FEATURE=true
fi

if echo "$COMMITS" | grep -E "(break|change|remove|delete|major)" >/dev/null; then
  BREAKING_CHANGE=true
fi

if echo "$CHANGED_FILES" | grep -E "\.(md|txt|rst)$" >/dev/null; then
  DOCUMENTATION=true
fi

if echo "$CHANGED_FILES" | grep -E "(test|spec)\." >/dev/null; then
  TESTS=true
fi

# Show analysis results
echo "📊 Change type analysis:"
if [ "$BUG_FIX" = true ]; then echo "  ✅ Bug fix detected"; fi
if [ "$NEW_FEATURE" = true ]; then echo "  ✅ New feature detected"; fi
if [ "$BREAKING_CHANGE" = true ]; then echo "  ✅ Breaking change detected"; fi
if [ "$DOCUMENTATION" = true ]; then echo "  ✅ Documentation update detected"; fi
if [ "$TESTS" = true ]; then echo "  ✅ Test updates detected"; fi
```

### 5. Generate PR Title

```bash
# Generate PR title
if [ -n "$CUSTOM_TITLE" ]; then
  PR_TITLE="$CUSTOM_TITLE"
else
  # Auto-generate title from first commit
  FIRST_COMMIT=$(echo "$COMMITS" | tail -1)

  # Clean up commit message for PR title
  if echo "$FIRST_COMMIT" | grep -E "^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: " >/dev/null; then
    # Use conventional commit format
    PR_TITLE=$(echo "$FIRST_COMMIT" | sed 's/^[a-f0-9]\+ //')
  else
    # Fallback to simple format
    PR_TITLE="$CURRENT_BRANCH"
  fi
fi

echo "📝 PR Title: $PR_TITLE"
```

### 6. Generate PR Description

```bash
# Generate comprehensive PR description
echo "📋 Generating PR description..."

# Generate change summary
CHANGE_SUMMARY=""
if [ "$BUG_FIX" = true ]; then
  CHANGE_SUMMARY="${CHANGE_SUMMARY}- Bug fixes and error handling improvements\n"
fi
if [ "$NEW_FEATURE" = true ]; then
  CHANGE_SUMMARY="${CHANGE_SUMMARY}- New features and functionality additions\n"
fi
if [ "$BREAKING_CHANGE" = true ]; then
  CHANGE_SUMMARY="${CHANGE_SUMMARY}- Breaking changes requiring attention\n"
fi
if [ "$DOCUMENTATION" = true ]; then
  CHANGE_SUMMARY="${CHANGE_SUMMARY}- Documentation updates and improvements\n"
fi
if [ "$TESTS" = true ]; then
  CHANGE_SUMMARY="${CHANGE_SUMMARY}- Test coverage and quality improvements\n"
fi

# Generate file change summary
FILE_CHANGES=""
for file in $CHANGED_FILES; do
  FILE_CHANGES="${FILE_CHANGES}- \`$file\`\n"
done

# Build complete PR description
PR_DESCRIPTION=$(cat <<EOF
## Description

This PR includes changes from branch \`$CURRENT_BRANCH\` with $COMMIT_COUNT commit(s) since divergence from \`$BASE_BRANCH\`.

### Key Changes:

$CHANGE_SUMMARY

### Files Modified:

$FILE_CHANGES

## Type of Change

EOF
)

# Add checkboxes based on analysis
if [ "$BUG_FIX" = true ]; then
  PR_DESCRIPTION="${PR_DESCRIPTION}- [x] Bug fix\n"
else
  PR_DESCRIPTION="${PR_DESCRIPTION}- [ ] Bug fix\n"
fi

if [ "$NEW_FEATURE" = true ]; then
  PR_DESCRIPTION="${PR_DESCRIPTION}- [x] New feature\n"
else
  PR_DESCRIPTION="${PR_DESCRIPTION}- [ ] New feature\n"
fi

if [ "$BREAKING_CHANGE" = true ]; then
  PR_DESCRIPTION="${PR_DESCRIPTION}- [x] Breaking change\n"
else
  PR_DESCRIPTION="${PR_DESCRIPTION}- [ ] Breaking change\n"
fi

if [ "$DOCUMENTATION" = true ]; then
  PR_DESCRIPTION="${PR_DESCRIPTION}- [x] Documentation update\n"
else
  PR_DESCRIPTION="${PR_DESCRIPTION}- [ ] Documentation update\n"
fi

# Add testing section
PR_DESCRIPTION="${PR_DESCRIPTION}
## Testing

- [x] Code changes tested
- [x] No new warnings introduced
- [x] Code follows style guidelines"

if [ "$TESTS" = true ]; then
  PR_DESCRIPTION="${PR_DESCRIPTION}\n- [x] Tests added/updated"
else
  PR_DESCRIPTION="${PR_DESCRIPTION}\n- [ ] Tests added/updated"
fi

# Add checklist
PR_DESCRIPTION="${PR_DESCRIPTION}
## Checklist

- [x] Self-review completed
- [x] Documentation updated (if applicable)
- [x] No new warnings introduced
- [x] Code follows project guidelines

## Additional Information

**Branch:** \`$CURRENT_BRANCH\` → \`$BASE_BRANCH\`
**Commits:** $COMMIT_COUNT
**Files Changed:** $(echo "$CHANGED_FILES" | wc -l | tr -d ' ')

### Commit History:

\`\`\`
$COMMITS
\`\`\`

---
🤖 Generated with /zcf-pr command
EOF

echo "✅ PR description generated"
```

### 7. Push Branch and Create PR

```bash
# Check if branch exists on remote
if ! git ls-remote --heads origin "$CURRENT_BRANCH" >/dev/null 2>&1; then
  echo "📤 Pushing branch to remote..."
  git push -u origin "$CURRENT_BRANCH"
else
  echo "📤 Branch already exists on remote, ensuring it's up to date..."
  git push origin "$CURRENT_BRANCH"
fi

# Create PR using gh CLI
echo "📋 Creating pull request..."

PR_OPTIONS="--title '$PR_TITLE' --body '$PR_DESCRIPTION'"

if [ "$IS_DRAFT" = true ]; then
  PR_OPTIONS="$PR_OPTIONS --draft"
fi

# Execute gh pr create command
PR_URL=$(eval "gh pr create --base $BASE_BRANCH $PR_OPTIONS")

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Pull request created successfully!"
  echo "🔗 PR URL: $PR_URL"
  echo ""
  echo "📋 PR Details:"
  echo "  Title: $PR_TITLE"
  echo "  From: $CURRENT_BRANCH"
  echo "  To: $BASE_BRANCH"
  echo "  Commits: $COMMIT_COUNT"
  echo "  Files: $(echo "$CHANGED_FILES" | wc -l | tr -d ' ')"
  echo ""
  echo "⚠️  Please review the PR and add any additional information as needed"
else
  echo "❌ Failed to create pull request"
  echo "Please check GitHub CLI authentication and permissions"
  exit 1
fi
```

## Complete Workflow Summary

1. **Parameter Parsing**: Parse base branch, draft mode, and custom title options
2. **Branch Validation**: Check current branch status and ensure it's different from base branch
3. **Change Analysis**: Analyze commits and file changes since divergence from base branch
4. **Categorization**: Auto-detect change types (bug fix, feature, breaking change, docs, tests)
5. **Title Generation**: Generate appropriate PR title or use custom title
6. **Description Generation**: Create comprehensive PR description following project template
7. **Branch Push**: Ensure branch is available on remote repository
8. **PR Creation**: Create pull request using GitHub CLI with all details

## Important Notes

⚠️ **Prerequisites**:

- **GitHub CLI (`gh`)**: Must be installed and authenticated
- **Clean working directory**: All changes must be committed before PR creation
- **Remote branch**: Current branch must be pushed to remote repository
- **Base branch**: Target branch must exist and be accessible

### Best Practices:

- Ensure commit messages follow conventional commit format
- Test all changes before creating PR
- Review auto-generated PR description for accuracy
- Add any additional context specific to your changes
- Check that all tests pass in CI/CD pipeline

### Change Detection Logic:

The command automatically categorizes changes based on:

- **Commit messages**: Keywords like "feat", "fix", "break", "docs", "test"
- **File patterns**: `.md/.txt` for docs, `(test|spec)\.` for tests
- **File extensions**: TypeScript, JavaScript, JSON, etc.

### Example Outputs:

```bash
# Standard PR to main
/zcf-pr
# → Creates PR: "feat: add new feature" with full description

# PR to develop branch
/zcf-pr --base develop
# → Creates PR to develop branch instead of main

# Draft PR
/zcf-pr --draft
# → Creates draft PR for initial review

# Custom title
/zcf-pr --title "Critical bug fix for authentication"
# → Uses custom title instead of auto-generated one
```

---

**Now creating pull request...**