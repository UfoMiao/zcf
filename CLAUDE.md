# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZCF (Zero-Config Claude-Code Flow) is a CLI tool that automatically configures Claude Code environments. It's built with TypeScript and distributed as an npm package. The tool provides one-click setup for Claude Code including configuration files, API settings, MCP services, and AI workflows.

## Development Guidelines

- **Documentation Language**: Except for README_zh, all code comments and documentation should be written in English
- When writing tests, first verify if relevant test files already exist to avoid unnecessary duplication

## Development Commands

### Build & Run
```bash
# Development (uses tsx for TypeScript execution)
pnpm dev

# Build for production (uses unbuild)
pnpm build

# Type checking
pnpm typecheck
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests in watch mode (for development)
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage

# Run tests once
pnpm test:run

# Run specific test file
pnpm vitest utils/config.test.ts

# Run tests matching pattern
pnpm vitest --grep "should handle"
```

### Release & Publishing
```bash
# Create a changeset for version updates
pnpm changeset

# Update package version based on changesets
pnpm version

# Build and publish to npm
pnpm release
```

## Architecture & Code Organization

### Entry Points
- `bin/zcf.mjs` - CLI executable entry point
- `src/cli.ts` - CLI setup and parsing
- `src/cli-setup.ts` - Command registration and routing
- `src/index.ts` - Library exports

### Core Commands
- `src/commands/init.ts` - Full initialization flow (install Claude Code + configure API + setup MCP)
- `src/commands/update.ts` - Update workflow-related markdown files only
- `src/commands/menu.ts` - Interactive menu system (default command)

### Utilities Architecture
The project follows a modular utility architecture:

- **Configuration Management**
  - `utils/config.ts` - Core configuration operations (backup, copy, API setup)
  - `utils/config-operations.ts` - Advanced config operations (partial updates, merging)
  - `utils/json-config.ts` - JSON file operations with error handling
  - `utils/zcf-config.ts` - ZCF-specific configuration persistence

- **MCP (Model Context Protocol) Services**
  - `utils/mcp.ts` - MCP configuration management
  - `utils/mcp-selector.ts` - Interactive MCP service selection

- **Installation & Platform**
  - `utils/installer.ts` - Claude Code installation logic
  - `utils/platform.ts` - Cross-platform compatibility (Windows/macOS/Linux/Termux)

- **User Interaction**
  - `utils/prompts.ts` - Language selection and user prompts
  - `utils/ai-personality.ts` - AI personality configuration
  - `utils/banner.ts` - CLI banner display

### Key Design Patterns

1. **Modular Command Structure**: Each command is self-contained with its own options interface
2. **I18N Support**: All user-facing strings support zh-CN and en localization
   - Translations are organized in `src/i18n/` with modular structure
   - Each language has separate modules for different features (common, api, menu, etc.)
   - Use `t()` function from `utils/i18n.ts` to get translations
   - Use `format()` function for string interpolation with placeholders
3. **Error Handling**: Graceful error handling with user-friendly messages
4. **Configuration Merging**: Smart config merging to preserve user customizations
5. **Cross-Platform Support**: Special handling for Windows paths and Termux environment

### Testing Strategy

The project uses Vitest with a layered testing approach:

1. **Core Tests** (`*.test.ts`) - Basic functionality and main flows
2. **Edge Tests** (`*.edge.test.ts`) - Boundary conditions and error scenarios
3. **Coverage Goals**: 90% for lines, functions, and statements

Tests extensively use mocking for:
- File system operations
- External command execution
- User prompts
- Platform detection

### Important Implementation Details

1. **Windows Compatibility**: MCP configurations require special handling for Windows paths (using `cmd /c` wrapper)
2. **Configuration Backup**: All modifications create timestamped backups in `~/.claude/backup/`
3. **API Configuration**: Supports both Auth Token (OAuth) and API Key authentication methods
4. **Template System**: Configuration templates are stored in `templates/` with language-specific subdirectories
5. **Error Recovery**: Exit prompt errors are handled separately to ensure clean termination

### Type System

The project uses strict TypeScript with:
- Explicit type definitions in `src/types/` and `src/types.ts`
- Interface-based design for options and configurations
- Proper null/undefined handling throughout

## Common Development Tasks

### Adding a New MCP Service
1. Add service definition to `MCP_SERVICES` in `src/constants.ts`
2. Update types in `src/types.ts` if needed
3. Test the service configuration flow

### Adding a New Command
1. Create command file in `src/commands/`
2. Define options interface
3. Register in `src/cli-setup.ts`
4. Add corresponding tests

### Updating Translations
1. Add or modify translation strings in the appropriate module under `src/i18n/locales/{lang}/`
   - Common strings: `common.ts`
   - API-related: `api.ts`
   - Menu items: `menu.ts`
   - Workflow & BMad: `workflow.ts`, `bmad.ts`
   - Error messages: `errors.ts`
2. Update the corresponding file for both `zh-CN` and `en` languages
3. If adding new keys, update the `TranslationKeys` interface in `src/i18n/types.ts`
4. Test both language flows

### Debugging Tips
- Use `pnpm dev` for rapid testing during development
- Check `~/.claude/` for generated configurations
- Review `~/.claude/backup/` for configuration history
- Test cross-platform behavior with platform detection mocks
```