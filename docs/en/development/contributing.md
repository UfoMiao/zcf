---
title: Contribution Guide
---

# Contribution Guide

Welcome contributors to the ZCF project! This document will guide you on how to participate in project development, submit code, and contribute documentation.

## 📋 Table of Contents

- [Before Starting](#before-starting)
- [Development Environment Setup](#development-environment-setup)
- [Contribution Process](#contribution-process)
- [Code Standards](#code-standards)
- [Commit Standards](#commit-standards)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Documentation Contributions](#documentation-contributions)
- [Testing Requirements](#testing-requirements)

## Before Starting

### Prerequisites

- **Node.js**: >= 22
- **Package Manager**: pnpm >= 10.17.1
- **Git**: Latest version
- **IDE**: Recommended VS Code (with TypeScript support)

### Choose Contribution Direction

You can contribute in the following ways:

1. **Feature Development**: Implement new features or improve existing features
2. **Bug Fixes**: Fix issues in the project
3. **Documentation Improvements**: Improve or translate documentation
4. **Test Supplements**: Add test cases to improve coverage
5. **Code Optimization**: Refactor or optimize code quality

## Development Environment Setup

### 1. Fork and Clone Repository

```bash
# Fork repository to your GitHub account
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/zcf.git
cd zcf
```

### 2. Add Upstream Repository

```bash
# Add upstream repository to sync updates
git remote add upstream https://github.com/UfoMiao/zcf.git

# Verify remote repositories
git remote -v
```

### 3. Install Dependencies

```bash
# Install dependencies using pnpm
pnpm install
```

### 4. Verify Installation

```bash
# Run tests to ensure environment is normal
pnpm test:run

# Type checking
pnpm typecheck

# Code checking
pnpm lint
```

### 5. Development Mode

```bash
# Run development version using tsx (supports hot reload)
pnpm dev

# Or directly run compiled version
pnpm build
pnpm start
```

## Contribution Process

### 1. Create Feature Branch

```bash
# Create new branch from latest main branch
git checkout main
git pull upstream main

# Create feature branch (use descriptive name)
git checkout -b feat/your-feature-name
# Or
git checkout -b fix/your-bug-fix
```

**Branch Naming Conventions**:
- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test related
- `chore/` - Build/tool related

### 2. Development

During development:

1. **Write Code**: Follow code standards
2. **Add Tests**: Add test cases for new features or fixes
3. **Update Documentation**: Update related documentation if necessary
4. **Run Checks**: Regularly run lint and tests

```bash
# Regular checks during development
pnpm lint          # Code checking
pnpm typecheck     # Type checking
pnpm test          # Run tests
```

### 3. Commit Changes

```bash
# Add changed files
git add .

# Commit (follow Conventional Commits standards)
git commit -m "feat: add new feature description"
```

### 4. Sync Upstream Changes

Before pushing, ensure your branch includes latest upstream changes:

```bash
# Fetch upstream updates
git fetch upstream

# Merge into your branch
git merge upstream/main

# Or use rebase (recommended, keeps commit history clean)
git rebase upstream/main
```

### 5. Push to Your Fork

```bash
# Push to your fork
git push origin feat/your-feature-name
```

### 6. Create Pull Request

1. Visit your fork on GitHub
2. Click "New Pull Request"
3. Select `UfoMiao/zcf:main` as target branch
4. Fill in PR description (use template)
5. Wait for code review

## Code Standards

### TypeScript Standards

- **Language**: TypeScript (ESM-only)
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: No semicolons (determined by ESLint config)
- **Line Width**: Recommended 100 characters, maximum 120 characters

### Code Style

```typescript
// ✅ Good example
import type { Config } from '../types/config'
import { readConfig } from '../utils/config'

export async function processConfig(): Promise<Config | null> {
  const config = await readConfig()
  return config
}

// ❌ Avoid
import {Config} from "../types/config"; // Using double quotes and semicolons
const config = await readConfig(); // Avoid unnecessary await
```

### Export Standards

- **Prefer named exports**:
  ```typescript
  // ✅ Recommended
  export function processData() {}
  export const CONSTANT = 'value'
  
  // ❌ Avoid
  export default function() {}
  ```

- **Avoid side effects**: Modules should only contain definitions, avoid executing code at module top level

### String Handling

- **Use i18n**: All user-visible strings should go through i18n system
  ```typescript
  // ✅ Recommended
  console.log(i18n.t('common:success'))
  
  // ❌ Avoid hardcoding
  console.log('Success')
  ```

- **Use constants**: Configuration values should be defined as constants
  ```typescript
  // ✅ Recommended
  const DEFAULT_PORT = 3456
  const API_TIMEOUT = 60000
  
  // ❌ Avoid magic numbers
  const port = 3456
  ```

### Error Handling

- **Use type-safe error handling**:
  ```typescript
  try {
    await operation()
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
  }
  ```

## Commit Standards

ZCF follows [Conventional Commits](https://www.conventionalcommits.org/) standards.

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation updates
- `style`: Code formatting (doesn't affect code execution)
- `refactor`: Refactoring (neither new feature nor bug fix)
- `perf`: Performance optimization
- `test`: Adding or modifying tests
- `chore`: Build process or auxiliary tool changes
- `ci`: CI configuration changes

### Examples

```bash
# New feature
git commit -m "feat(config): add multi-config support"

# Bug fix
git commit -m "fix(ccr): resolve port conflict issue"

# Documentation update
git commit -m "docs(readme): update installation instructions"

# With detailed description
git commit -m "feat(workflow): add new workflow template

- Add six-phase workflow template
- Support custom workflow configuration
- Update workflow installer to handle new template"
```

## Pull Request Guidelines

### PR Title

Use same format as commit messages:

```
feat(config): add multi-config support
```

### PR Description Template

```markdown
## Change Type
- [ ] New Feature
- [ ] Bug Fix
- [ ] Documentation Update
- [ ] Code Refactoring
- [ ] Other (please specify)

## Change Description
Briefly describe the changes in this PR...

## Related Issue
Closes #123

## Testing Instructions
Describe how to verify these changes...

## Checklist
- [ ] Code follows project standards
- [ ] Added necessary tests
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Code passed lint check
- [ ] Type checking passed
```

### PR Size

- **Small PR** (recommended): One PR does one thing, easy to review
- **Large PR**: If necessary, create Draft PR first for discussion

### Review Feedback

- Take review comments seriously
- Actively respond to reviewer questions
- Modify and resubmit promptly

## Documentation Contributions

### GitBook Documentation

Documentation is located in `gitbook/zh-CN/` and `gitbook/en/` directories:

```bash
gitbook/zh-CN/
├── README.md
├── getting-started/
├── features/
├── cli/
└── ...
```

**When updating documentation**:
1. Synchronously update Chinese and English documentation
2. Keep documentation structure consistent
3. Check grammar and format

### Code Comments

- **English Comments**: All code comments must use English
- **JSDoc Comments**: Public APIs should have JSDoc comments

```typescript
/**
 * Reads configuration from the specified file
 * @param filePath - Path to the configuration file
 * @returns Configuration object or null if file doesn't exist
 */
export function readConfig(filePath: string): Config | null {
  // Implementation
}
```

### Templates and Workflows

If adding new templates or workflows:

1. Add template files in `templates/` directory
2. Update configuration in `src/config/`
3. Update related documentation
4. Add test cases

## Testing Requirements

### Test Coverage

- **Coverage Goal**: 80% (lines, functions, branches, statements)
- **New Code**: Must include tests

### Test Types

1. **Unit Tests** (`tests/unit/`): Test single functions or modules
2. **Integration Tests** (`tests/integration/`): Test cross-module interactions
3. **Edge Tests** (`*.edge.test.ts`): Test edge cases and error scenarios

### Running Tests

```bash
# Run all tests
pnpm test

# Continuous run (watch mode)
pnpm test:run

# Generate coverage report
pnpm test:coverage

# Run specific test
pnpm vitest tests/unit/utils/config.test.ts
```

### Test Writing Recommendations

- Use descriptive test names
- Each test verifies one thing
- When using snapshot tests, ensure output is stable (not affected by language)
- Use Vitest temporary directories when mocking file system operations

## Common Questions

### Q: How to sync upstream changes?

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

### Q: How to modify previous commits?

```bash
# Modify last commit
git commit --amend

# Interactive rebase (modify multiple commits)
git rebase -i upstream/main
```

### Q: What if tests fail?

1. Check if local environment is normal
2. Run `pnpm install` to update dependencies
3. Check error messages in test output
4. If problem persists, report in Issue

### Q: What if PR is closed?

- If it's because modifications are needed, please modify and reopen or create new PR
- If it's rejected, please check review comments, re-evaluate before submitting

## Get Help

- **GitHub Issues**: Submit problems or suggestions
- **Discussions**: Participate in project discussions
- **Documentation**: Check project documentation for more information

Thank you for your contributions! 🎉


