---
title: For Contributors
---

# For Contributors

Welcome contributors to the ZCF project! This chapter provides complete development guides to help you quickly get started with project development, understand architecture design, and follow best practices.

## 📋 Documentation Navigation

| Document | Description | Target Audience |
|------|------|---------|
| [Contribution Guide](contributing.md) | Detailed contribution process, code standards, PR guidelines | All contributors |
| [Architecture Documentation](architecture.md) | Project architecture, module organization, design patterns, extension points | Core developers |
| [Testing Guide](testing.md) | TDD methodology, test writing, Mock usage, coverage requirements | All developers |

## 🚀 Quick Start

### 1. Environment Setup

Ensure your development environment meets the following requirements:

- **Node.js**: >= 22
- **pnpm**: >= 10.17.1
- **Git**: Latest version
- **IDE**: Recommended VS Code (with TypeScript support)

### 2. Clone and Setup

```bash
# Fork and clone repository
git clone https://github.com/YOUR_USERNAME/zcf.git
cd zcf

# Install dependencies
pnpm install

# Verify installation
pnpm test:run
pnpm typecheck
```

### 3. Development Flow

```bash
# Development mode (uses tsx, supports hot reload)
pnpm dev

# Run tests
pnpm test

# Code checking
pnpm lint
pnpm typecheck

# Build
pnpm build
```

## 📚 Documentation Overview

### Contribution Guide

Detailed contribution process documentation, including:

- ✅ **Development Environment Setup**: Complete process from Fork to local development
- ✅ **Code Standards**: TypeScript style, naming conventions, export standards
- ✅ **Commit Standards**: Conventional Commits format and examples
- ✅ **PR Guidelines**: How to create high-quality Pull Requests
- ✅ **Documentation Contributions**: GitBook documentation, code comments, template updates
- ✅ **Testing Requirements**: Coverage goals, test types, writing recommendations

**Suitable For**: All developers who want to contribute code

👉 [Read Contribution Guide](contributing.md)

### Architecture Documentation

Deep understanding of ZCF's architecture design:

- 🏗️ **Technology Stack**: Technologies and dependencies used
- 📁 **Project Structure**: Detailed directory organization
- 🔧 **Core Modules**: CLI entry, command layer, utility layer, integration modules
- 🔄 **Key Processes**: Command registration, initialization, configuration merging, workflow installation
- 🎨 **Design Patterns**: Command pattern, strategy pattern, factory pattern, adapter pattern
- 🔌 **Extension Points**: How to add new commands, workflows, MCP services, API providers

**Suitable For**: Developers who need to deeply understand the project or add new features

👉 [Read Architecture Documentation](architecture.md)

### Testing Guide

Complete test writing and running guide:

- 🧪 **Test Framework**: Vitest configuration and usage
- 📝 **Test Structure**: Directory organization, file naming
- ✍️ **Writing Tests**: TDD workflow, unit tests, integration tests, edge tests
- 🎭 **Mock and Fixtures**: File system, command execution, interactive prompts
- 📊 **Coverage Requirements**: 80% coverage goal, report interpretation
- 💡 **Best Practices**: Test naming, organization, isolation, language independence

**Suitable For**: All developers writing tests (required)

👉 [Read Testing Guide](testing.md)

## 🎯 Development Workflow

### TDD (Test-Driven Development)

ZCF strictly follows TDD methodology:

1. **Red**: Write failing test first
2. **Green**: Write minimal code to make test pass
3. **Refactor**: Refactor code while keeping tests passing

**Requirement**: All new features must write tests first!

### Code Quality Standards

- **Type Safety**: Strict TypeScript type checking
- **Code Style**: @antfu/eslint-config automatic formatting
- **Test Coverage**: 80% minimum coverage requirement
- **Complete Documentation**: Code comments, API documentation, user documentation

### Internationalization (i18n)

- All user-visible strings must use i18n
- Support both Chinese and English
- Use namespaces to organize translations
- Code comments and documentation use English

## 🔍 Project Features

### Modular Design

- Clear module boundaries
- Single responsibility principle
- Dependency injection pattern
- Extensible architecture

### Cross-Platform Support

- Windows/macOS/Linux/Termux
- Path adaptation (pathe)
- Command execution adaptation (tinyexec)
- Platform-specific logic isolation

### Robust Error Handling

- Type-safe error handling
- User-friendly error messages
- Complete error logs
- Graceful degradation

## 💬 Get Help

If you encounter problems during development:

1. **Check Documentation**: First consult relevant documentation sections
2. **Search Issues**: Check if related issues already exist
3. **Ask Questions**: Ask questions in GitHub Issues or Discussions
4. **Community**: Participate in project discussions, communicate with other contributors

## 🌟 Contribution Methods

In addition to code contributions, you can also:

- 📖 **Documentation Improvements**: Improve or translate documentation
- 🐛 **Bug Reports**: Discover and report issues
- 💡 **Feature Suggestions**: Propose improvements
- 🧪 **Test Supplements**: Improve test coverage
- 🌍 **Translation Contributions**: Improve translation quality

## 📖 Related Resources

- [Project README](https://github.com/UfoMiao/zcf/blob/main/README.md) - Project overview and quick start
- [CLAUDE.md](https://github.com/UfoMiao/zcf/blob/main/CLAUDE.md) - Complete project architecture documentation
- [GitHub Issues](https://github.com/UfoMiao/zcf/issues) - Issues and discussions
- [GitHub Discussions](https://github.com/UfoMiao/zcf/discussions) - Community discussions

---

**Thank you again for your attention and contributions to the ZCF project!** 🎉

Before starting to contribute, it's recommended to read the [Contribution Guide](contributing.md) to understand detailed processes and standards.