# Contributing to ZCF

Thank you for your interest in contributing to ZCF (Zero-Config Code Flow)! We welcome contributions from the community and are pleased to have you join us.

## 📋 Table of Contents

- [Getting Started](#-getting-started)
- [Development Setup](#-development-setup)
- [Testing Guidelines](#-testing-guidelines)
- [Code Style & Standards](#-code-style--standards)
- [Pull Request Process](#-pull-request-process)
- [Bug Reports](#-bug-reports)
- [Feature Requests](#-feature-requests)
- [Documentation](#-documentation)
- [Internationalization (i18n)](#-internationalization-i18n)
- [Community Guidelines](#-community-guidelines)

## 🚀 Getting Started

ZCF is a CLI tool built with TypeScript that provides zero-configuration setup for Claude Code environments. Before contributing, please:

1. Read our [Code of Conduct](CODE_OF_CONDUCT.md)
2. Check existing [issues](https://github.com/UfoMiao/zcf/issues) and [pull requests](https://github.com/UfoMiao/zcf/pulls)
3. Fork the repository and create your feature branch

## 💻 Development Setup

### Prerequisites

- Node.js 18+
- pnpm 9.15.9+ (specified in `packageManager` field)

### Installation

1. Fork and clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/zcf.git
cd zcf
```

2. Install dependencies:

```bash
pnpm install
```

3. Start development:

```bash
pnpm dev
```

### Development Commands

| Command              | Description                           |
| -------------------- | ------------------------------------- |
| `pnpm dev`           | Run CLI in development mode using tsx |
| `pnpm build`         | Build for production using unbuild    |
| `pnpm typecheck`     | Type checking with TypeScript         |
| `pnpm test`          | Run all tests                         |
| `pnpm test:watch`    | Run tests in watch mode               |
| `pnpm test:ui`       | Run tests with UI                     |
| `pnpm test:coverage` | Generate coverage report              |
| `pnpm test:run`      | Run tests once                        |

### Project Structure

```
src/
├── cli.ts                 # CLI entry point
├── cli-setup.ts          # Command registration
├── commands/             # CLI commands
├── config/               # Configuration management
├── constants.ts          # Project constants
├── i18n/                # Internationalization
├── types/               # TypeScript type definitions
└── utils/               # Utility functions

templates/               # Configuration templates
├── en/                 # English templates
├── zh-CN/              # Chinese templates
└── settings.json       # Default settings

test/                   # Test files
├── unit/              # Unit tests
├── integration/       # Integration tests
└── fixtures/          # Test fixtures
```

## 🧪 Testing Guidelines

We use **Test-Driven Development (TDD)** methodology:

### TDD Workflow

1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code while keeping tests green

### Test Structure

- **Core Tests** (`*.test.ts`): Basic functionality and main flows
- **Edge Tests** (`*.edge.test.ts`): Boundary conditions and error scenarios
- **Coverage Goals**: 80% minimum for lines, functions, branches, and statements

### Running Tests

```bash
# Run specific test file
pnpm vitest src/utils/config.test.ts

# Run tests matching pattern
pnpm vitest --grep "should handle"

# Run with coverage
pnpm test:coverage
```

### Test Writing Guidelines

1. Always write tests **before** implementing functionality
2. Use descriptive test names: `should handle invalid config gracefully`
3. Mock external dependencies (file system, commands, prompts)
4. Test both success and error scenarios
5. Verify test files exist before adding to avoid duplication

Example test structure:

```typescript
describe('ConfigManager', () => {
  it('should create backup before config changes', async () => {
    // Arrange
    const mockConfig = { /* test config */ }

    // Act
    await configManager.updateConfig(mockConfig)

    // Assert
    expect(backupService.createBackup).toHaveBeenCalled()
  })
})
```

## 📝 Code Style & Standards

### TypeScript Guidelines

- Use **strict TypeScript** with explicit type definitions
- Define interfaces for all options and configurations
- Proper null/undefined handling throughout
- Follow existing type patterns in `src/types/`

### Code Organization

- **Single Responsibility Principle**: Each module has one clear purpose
- **DRY Principle**: Avoid code duplication
- **SOLID Principles**: Follow object-oriented design principles
- **KISS Principle**: Keep implementations simple and intuitive

### Naming Conventions

- Use descriptive function and variable names
- Follow existing patterns in the codebase
- Use kebab-case for file names
- Use PascalCase for types/interfaces
- Use camelCase for functions/variables

### Import Standards

```typescript
// Usage: Cross-platform path operations
import { join, resolve } from 'pathe'

// Add usage description before import statements
// Usage: Configuration management utilities
import { createConfig, validateConfig } from './utils/config.ts'
```

## 🔄 Pull Request Process

### Before Submitting

1. **Fork & Branch**: Create a feature branch from `main`
2. **Write Tests**: Follow TDD methodology
3. **Implement**: Write minimal code to pass tests
4. **Test**: Run full test suite and ensure coverage
5. **Type Check**: Run `pnpm typecheck`
6. **Build**: Run `pnpm build` successfully

### PR Requirements

1. **Clear Description**: Explain what changes were made and why
2. **Tests Included**: All new functionality must have tests
3. **Documentation**: Update relevant documentation
4. **No Breaking Changes**: Unless discussed in an issue first
5. **Single Purpose**: One feature/fix per PR

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Coverage maintained

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **ZCF Version**: Run `npx zcf --version`
2. **Environment**: OS, Node.js version, pnpm version
3. **Steps to Reproduce**: Minimal reproduction steps
4. **Expected Behavior**: What should happen
5. **Actual Behavior**: What actually happens
6. **Error Messages**: Any error output or logs

Use our [bug report template](https://github.com/UfoMiao/zcf/issues/new?template=bug_report.md).

## 💡 Feature Requests

For new features:

1. **Check Existing Issues**: Avoid duplicates
2. **Use Case**: Describe the problem this solves
3. **Proposed Solution**: Your suggested approach
4. **Alternatives**: Other solutions considered
5. **Implementation**: Willing to contribute code?

Use our [feature request template](https://github.com/UfoMiao/zcf/issues/new?template=feature_request.md).

## 📚 Documentation

### Documentation Types

- **README.md**: Features, usage, configuration
- **CLAUDE.md**: AI assistant configuration and development guidelines
- **CHANGELOG.md**: Version history and breaking changes
- **API Documentation**: JSDoc comments for public APIs

### Documentation Standards

- Write in clear, concise English
- Include code examples where helpful
- Update documentation alongside code changes
- Maintain consistency with existing style

## 🌍 Internationalization (i18n)

ZCF supports bilingual functionality (English/Chinese):

### Adding Translations

1. **Structure**: Translations organized in `src/i18n/locales/{lang}/`
2. **Modules**: Separate files for different features (common, api, menu, etc.)
3. **Usage**: Use `t()` function from `utils/i18n.ts`
4. **Formatting**: Use `format()` for string interpolation

### Translation Guidelines

- Add new keys to both `zh-CN` and `en` languages
- Use descriptive key names: `errors.config.invalidFormat`
- Test both language flows
- Update `TranslationKeys` interface for new keys

Example:

```typescript
// In src/i18n/locales/en/errors.ts
// Usage
import { format, t } from '../utils/i18n.ts'

export default {
  config: {
    invalidFormat: 'Invalid configuration format: {error}',
  },
}
const message = format(t('errors.config.invalidFormat'), { error: 'missing field' })
```

## 🤝 Community Guidelines

### Communication

- **Be Respectful**: Treat all community members with respect
- **Be Constructive**: Provide helpful feedback and suggestions
- **Be Patient**: Remember that maintainers and contributors volunteer their time
- **Be Collaborative**: Work together to improve the project

### Getting Help

- **Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Documentation**: Check existing docs first

### Recognition

Contributors will be:

- Listed in release notes for significant contributions
- Added to the contributors section (if desired)
- Recognized in project documentation

## 🏗️ Development Insights

### Architecture Patterns

- **Modular Commands**: Self-contained commands with options interfaces
- **Configuration Merging**: Smart merging with backup before modifications
- **Cross-Platform Support**: Special handling for Windows and Termux
- **Error Handling**: Graceful degradation with user-friendly messages

### Key Technologies

- **Build System**: unbuild (ESM-only output)
- **Development**: tsx for TypeScript execution
- **Testing**: Vitest with layered testing approach
- **CLI Framework**: cac for argument parsing
- **Cross-Platform**: pathe for path operations, tinyexec for command execution

### Performance Considerations

- Lazy loading of dependencies
- Efficient file operations
- Parallel execution of independent operations
- Template caching for repeated operations

---

## 🎉 Thank You!

Thank you for contributing to ZCF! Your efforts help make Claude Code more accessible and powerful for developers worldwide.

For questions about contributing, please [open an issue](https://github.com/UfoMiao/zcf/issues/new) or start a [discussion](https://github.com/UfoMiao/zcf/discussions).
