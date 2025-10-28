# Utils Module

**Last Updated**: Mon Oct 27 19:39:26 CST 2025

[Root](../../CLAUDE.md) > [src](../) > **utils**

## Module Responsibilities

Core utility module providing configuration management, platform compatibility, MCP service integration, Claude Code installation, workflow management, and cross-platform tool support for the ZCF project. This module contains 52 TypeScript files organized into specialized subdirectories for CCR, Cometix, Code Tools, and general utilities.

## Entry Points and Startup

- **Main Entry Points**:
  - `config.ts` - Configuration file management and backup operations (14KB)
  - `installer.ts` - Claude Code installation and update logic (5KB)
  - `platform.ts` - Cross-platform support and environment detection (5KB)
  - `workflow-installer.ts` - Workflow template installation and management (7KB)
  - `claude-code-config-manager.ts` - Advanced Claude Code configuration management (25KB)
  - `claude-code-incremental-manager.ts` - Incremental configuration updates (17KB)
  - `features.ts` - Feature management and installation orchestration (28KB)
  - `uninstaller.ts` - Advanced uninstallation with conflict resolution (18KB)
  - `trash.ts` - Cross-platform trash/recycle bin integration (1KB)
  - `zcf-config.ts` - ZCF-specific configuration management (13KB)

- **Subdirectories**:
  - `ccr/` - Claude Code Router proxy management (7 files)
  - `cometix/` - Status line tools and configuration (6 files)
  - `code-tools/` - Codex integration and dual code tool support (7 files)
  - `tools/` - General tool integration utilities (2 files)

## External Interfaces

### Configuration Management Interface

```typescript
// Configuration operations
export function copyConfigFiles(onlyMd?: boolean): void
export function configureApi(config: ApiConfig): ConfiguredApi | null
export function backupExistingConfig(): string | null
export function getExistingApiConfig(): ExistingApiConfig | null
export function ensureClaudeDir(): void
export function applyAiLanguageDirective(aiLang: AiOutputLanguage): void

// Configuration types
export interface ApiConfig {
  type: 'auth_token' | 'api_key' | 'ccr_proxy'
  authToken?: string
  apiKey?: string
  ccrProxy?: { host: string, port: number }
}
```

### MCP Service Management Interface

```typescript
// MCP service operations
export function readMcpConfig(): ClaudeConfiguration | null
export function writeMcpConfig(config: ClaudeConfiguration): void
export function mergeMcpServers(
  existing: ClaudeConfiguration | null,
  newServers: Record<string, McpServerConfig>
): ClaudeConfiguration
export function buildMcpServerConfig(services: string[]): Record<string, McpServerConfig>
export function fixWindowsMcpConfig(config: ClaudeConfiguration): ClaudeConfiguration
export function addCompletedOnboarding(config: ClaudeConfiguration): ClaudeConfiguration

// MCP service types
export interface McpServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
}
```

### Installation and Platform Interface

```typescript
// Platform detection
export function getPlatform(): 'windows' | 'macos' | 'linux'
export function isWindows(): boolean
export function isTermux(): boolean
export function commandExists(command: string): boolean
export function getTermuxPrefix(): string

// Installation management
export async function isClaudeCodeInstalled(): Promise<boolean>
export async function installClaudeCode(lang: SupportedLang): Promise<void>
```

### Workflow Management Interface

```typescript
// Workflow installation
export async function selectAndInstallWorkflows(
  lang: SupportedLang,
  forceReinstall?: boolean,
  preselectedWorkflows?: string[]
): Promise<WorkflowInstallResult[]>

export async function installWorkflow(
  workflow: WorkflowConfig,
  lang: SupportedLang
): Promise<WorkflowInstallResult>

// Workflow types
export interface WorkflowInstallResult {
  workflow: string
  success: boolean
  installedCommands: string[]
  installedAgents: string[]
  errors?: string[]
}
```

### CCR Integration Interface

```typescript
// CCR (Claude Code Router) management
export async function installCcr(lang: SupportedLang): Promise<void>
export async function isCcrInstalled(): Promise<boolean>
export function readCcrConfig(): CcrConfig | null
export function writeCcrConfig(config: CcrConfig): void
export function createDefaultCcrConfig(port?: number): CcrConfig
export async function configureCcrProxy(config: CcrProxyConfig): Promise<boolean>
```

### Cometix Integration Interface

```typescript
// Cometix (Status Line) tool management
export async function installCometixLine(lang: SupportedLang): Promise<void>
export async function isCometixLineInstalled(): Promise<boolean>
export function validateStatuslineConfig(config: any): boolean
export function configureCometixStatus(options: CometixOptions): void
```

## Key Dependencies and Configuration

### Core Dependencies

```typescript
import { dirname, join } from 'pathe'
// Cross-platform support
import { exec } from 'tinyexec'

// Internationalization
import { getTranslation } from '../i18n'
// File system operations
import { copyDir, copyFile, ensureDir, exists, writeFile } from './fs-operations'

import { readJsonConfig, writeJsonConfig } from './json-config'

// Platform utilities
import { getTermuxPrefix, isTermux, isWindows } from './platform'
```

### Configuration Integration

- **File System Operations**: Cross-platform file handling with proper permissions
- **JSON Configuration**: Robust JSON parsing and validation
- **Template System**: Integration with multilingual template directories
- **Platform Specifics**: Windows path handling, Termux environment support
- **Tool Integration**: External tool detection and installation management

## Data Models

### Configuration Architecture

```typescript
interface ConfigurationSystem {
  backup: {
    strategy: 'timestamped'
    location: '~/.claude/backup/'
    retention: 'unlimited'
  }
  merging: {
    strategy: 'deep-merge'
    conflicts: 'preserve-user-changes'
    validation: 'schema-based'
  }
  platform: {
    windows: 'special-path-handling'
    termux: 'prefix-detection'
    macos: 'standard-unix'
    linux: 'standard-unix'
  }
}
```

### MCP Service Architecture

```typescript
interface McpServiceSystem {
  services: {
    'claude-codebase': { priority: 'high', autoInstall: true }
    'claude-mcp-server-exa': { priority: 'medium', autoInstall: false }
    'claude-fs': { priority: 'low', autoInstall: false }
    // ... other services
  }
  configuration: {
    validation: 'command-existence'
    pathHandling: 'platform-aware'
    errorRecovery: 'graceful-fallback'
  }
}
```

## Testing and Quality

### Test Coverage

- **Unit Tests**: Individual utility function testing with comprehensive mocking
- **Integration Tests**: Full workflow testing with real file system operations
- **Platform Tests**: Cross-platform compatibility testing
- **Edge Case Tests**: Error conditions and boundary testing

### Test Files

- `tests/utils/*.test.ts` - Core utility functionality tests
- `tests/utils/*.edge.test.ts` - Edge case and error condition tests
- `tests/unit/utils/` - Isolated unit tests for utility functions
- `tests/utils/ccr/` - CCR integration tests
- `tests/utils/cometix/` - Cometix integration tests

### Common Issues

- **File System Permissions**: Platform-specific permission handling
- **External Tool Dependencies**: Tool availability and version compatibility
- **Configuration Validation**: JSON schema validation and error recovery
- **Path Encoding**: Unicode and special character handling across platforms

## Submodules

### CCR (Claude Code Router)

- `ccr/installer.ts` - CCR installation and management
- `ccr/config.ts` - CCR configuration handling
- `ccr/presets.ts` - Predefined CCR configurations
- `ccr/commands.ts` - CCR command execution

### Cometix (Status Line Tools)

- `cometix/installer.ts` - Cometix installation management
- `cometix/commands.ts` - Status line command integration
- `cometix/menu.ts` - Cometix configuration menu
- `cometix/types.ts` - Cometix type definitions

### Tools Integration

- `tools/index.ts` - Unified tool management interface
- `tools/ccr-menu.ts` - CCR menu integration

## Related Files

- `../commands/` - Command implementations that use utility functions
- `../types/` - TypeScript interfaces for utility function parameters
- `../i18n/` - Internationalization support for utility messages
- `../config/` - Configuration definitions used by utilities
- `../../templates/` - Template files managed by workflow installer

## Change Log (Module-Specific)

### Recent Updates

- Enhanced cross-platform support with improved Termux detection
- Added comprehensive CCR integration with proxy configuration
- Implemented Cometix status line tool support
- Improved MCP service management with Windows-specific fixes
- Added AI personality configuration support
- Enhanced error handling with user-friendly messages
- Expanded workflow installation system with dependency resolution
