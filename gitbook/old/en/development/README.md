# Development Documentation

Welcome to ZCF project development! This documentation will help you understand the project architecture, development process, and contribution methods.

## 🎯 Development Overview

ZCF (Zero-Config Claude-Code Flow) is a TypeScript-based CLI tool using modular architecture design, focused on providing developers with zero-configuration Claude Code environments.

### Technology Stack
- **Language**: TypeScript (ESM-only)
- **Build Tool**: unbuild
- **Testing Framework**: Vitest
- **Code Standards**: @antfu/eslint-config
- **Package Manager**: pnpm
- **Version Management**: Changesets

### Core Features
- 🔧 Zero-config Claude Code environment setup
- 🌍 Complete internationalization support (zh-CN/en)
- 🔗 Automatic MCP service configuration and management
- 📝 Intelligent workflow template system
- 🛠️ Cross-platform compatibility (Windows/macOS/Linux/Termux)

## 🏗️ Project Architecture

### Directory Structure
```
src/
├── commands/          # CLI command implementations
│   ├── init.ts       # Complete initialization
│   ├── menu.ts       # Interactive menu
│   ├── update.ts     # Workflow updates
│   ├── ccr.ts        # CCR management
│   └── ccu.ts        # Usage analytics
├── utils/            # Core utility functions
│   ├── config.ts     # Configuration management
│   ├── installer.ts  # Claude Code installation
│   ├── mcp.ts        # MCP service management
│   ├── platform.ts   # Cross-platform support
│   └── workflow-installer.ts # Workflow installation
├── i18n/             # Internationalization support
│   ├── locales/      # Language files
│   └── types.ts      # Type definitions
├── types/            # TypeScript types
├── constants.ts      # Constant definitions
└── cli.ts           # CLI entry point
```

### Module Responsibilities

#### Commands Module
Handles user commands and interactions:
- **init.ts**: Complete environment initialization process
- **menu.ts**: Interactive menu system
- **update.ts**: Workflow and configuration updates
- **ccr.ts**: Claude Code Router management
- **ccu.ts**: Usage analysis and statistics

#### Utils Module
Provides core functionality support:
- **config.ts**: Configuration file read/write and merging
- **installer.ts**: Automatic Claude Code installation
- **mcp.ts**: MCP service configuration and management
- **platform.ts**: Cross-platform compatibility handling
- **workflow-installer.ts**: Workflow template management

#### I18N Module
Implements complete internationalization support:
- Supports zh-CN and en languages
- Dynamic language switching
- Template and configuration file localization

## 🔧 Development Environment Setup

### Environment Requirements
- Node.js 16.0+
- pnpm 8.0+
- Git

### Quick Start
```bash
# Clone project
git clone https://github.com/UfoMiao/zcf.git
cd zcf

# Install dependencies
pnpm install

# Development mode run
pnpm dev

# Build project
pnpm build

# Run tests
pnpm test

# Code check
pnpm lint
```

### Development Workflow
1. **Fork** project to your GitHub account
2. **Clone** your fork locally
3. **Create feature branch**: `git checkout -b feature/your-feature`
4. **Write code** and add tests
5. **Run tests** to ensure they pass: `pnpm test`
6. **Commit changes**: `git commit -m "feat: your feature"`
7. **Push branch**: `git push origin feature/your-feature`
8. **Create Pull Request**

## 📝 Contribution Guidelines

### Code Standards
- Follow TypeScript strict mode
- Use ESM module system
- Follow @antfu/eslint-config code style
- All code must have corresponding tests
- Public APIs must have JSDoc comments

### Commit Standards
Use [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Feature addition
git commit -m "feat: add new MCP service support"

# Bug fix
git commit -m "fix: resolve Windows path handling issue"

# Documentation update
git commit -m "docs: update installation guide"

# Code refactoring
git commit -m "refactor: improve config merging logic"

# Test addition
git commit -m "test: add unit tests for installer module"
```

### Pull Request Guidelines
1. **Clear title** describing the changes
2. **Detailed description** explaining the reason and impact of changes
3. **Link related issues** (if any)
4. **Ensure tests pass** and code style checks
5. **Update related documentation** (if needed)

### Testing Requirements
- **Unit test coverage**: Minimum 80%
- **Integration tests**: Critical processes must have integration tests
- **Edge testing**: Exception conditions and boundary testing
- **Cross-platform testing**: Ensure Windows/macOS/Linux compatibility

## 🧪 Testing Guide

### Test Architecture
```
tests/
├── unit/             # Unit tests
│   ├── commands/     # Command tests
│   └── utils/        # Utility function tests
├── integration/      # Integration tests
└── fixtures/         # Test data and mocks
```

### Test Commands
```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# Run specific test
pnpm vitest utils/config.test.ts
```

### Testing Best Practices
1. **Test-Driven Development**: Write tests first, then implement
2. **Mock External Dependencies**: File system, network requests, etc.
3. **Clear Test Naming**: Describe test scenario and expected result
4. **Independent Test Cases**: Each test should be able to run independently
5. **Cover Edge Cases**: Test various inputs and exception scenarios

## 🔄 Release Process

### Version Management
Use [Changesets](https://github.com/changesets/changesets) to manage versions:

```bash
# Create change record
pnpm changeset

# Version upgrade
pnpm version

# Publish to npm
pnpm release
```

### Version Strategy
- **Patch** (1.0.x): Bug fixes and minor improvements
- **Minor** (1.x.0): New feature additions, backward compatible
- **Major** (x.0.0): Breaking changes

### Release Checklist
- [ ] All tests pass
- [ ] Code coverage meets standards
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version number follows semantic versioning
- [ ] Build artifacts are normal

## 🐛 Issue Troubleshooting

### Common Development Issues

#### Build Failure
```bash
# Clean dependencies and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Clean build cache
rm -rf dist
pnpm build
```

#### Test Failure
```bash
# Update test snapshots
pnpm test -u

# Run specific test file
pnpm vitest specific.test.ts --reporter=verbose
```

#### Code Style Check Failure
```bash
# Auto-fix fixable issues
pnpm lint:fix

# Manually check specific issues
pnpm lint
```

## 📖 API Documentation

### Core APIs

#### Configuration API
```typescript
interface ZCFConfig {
  language: 'zh-CN' | 'en'
  apiKey?: string
  baseUrl?: string
  mcpServices: string[]
  workflows: string[]
}

// Load configuration
function loadConfig(path?: string): ZCFConfig

// Save configuration
function saveConfig(config: ZCFConfig, path?: string): void
```

#### Installer API
```typescript
// Install Claude Code
function installClaudeCode(): Promise<boolean>

// Check installation status
function checkInstallation(): Promise<InstallStatus>

// Configure MCP services
function configureMCP(services: string[]): Promise<void>
```

#### Workflow API
```typescript
// Install workflows
function installWorkflows(categories: string[]): Promise<void>

// List available workflows
function listAvailableWorkflows(): Promise<WorkflowInfo[]>

// Update workflows
function updateWorkflows(): Promise<void>
```

## 🤝 Community Participation

### Getting Help
- **GitHub Issues**: Report bugs and feature requests
- **GitHub Discussions**: Technical discussions and Q&A
- **README**: Basic usage instructions
- **GitBook Documentation**: Complete usage guide

### Contribution Types
- **Code contributions**: Feature implementation and bug fixes
- **Documentation improvements**: Documentation enhancement and translation
- **Test supplements**: Test case and coverage improvements
- **Issue feedback**: Bug reports and usage suggestions
- **Community support**: Help other users solve problems

### Code of Conduct
- Respect all contributors and users
- Provide constructive feedback
- Maintain professional and friendly communication
- Follow open source collaboration best practices

---

Thank you for your attention and contribution to the ZCF project! Let's build better AI-assisted development tools together.