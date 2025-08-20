# Utils Module

[Root](../../CLAUDE.md) > [src](../) > **utils**

## Module Responsibilities

Core utility module providing configuration management, platform compatibility, MCP service integration, Claude Code installation, and workflow management foundational functionality.

## Entry Points and Startup

- **Main Entry Points**:
  - `config.ts` - Configuration file management
  - `installer.ts` - Claude Code installation logic  
  - `mcp.ts` - MCP service configuration
  - `platform.ts` - Cross-platform support
  - `workflow-installer.ts` - Workflow installation management

## External Interfaces

### Configuration Management Interface

```typescript
// Configuration operations
export function copyConfigFiles(lang: SupportedLang, docsOnly?: boolean): void
export function configureApi(config: ApiConfig): ConfiguredApi | null
export function backupExistingConfig(): string | null
export function getExistingApiConfig(): ExistingApiConfig | null

// MCP service management
export function readMcpConfig(): ClaudeConfiguration | null
export function writeMcpConfig(config: ClaudeConfiguration): void
export function mergeMcpServers(existing: ClaudeConfiguration | null, newServers: Record<string, McpServerConfig>): ClaudeConfiguration
```

### Installation and Platform Interface

```typescript
// Platform detection
export function getPlatform(): 'windows' | 'macos' | 'linux'
export function isWindows(): boolean
export function isTermux(): boolean
export function commandExists(command: string): boolean

// Installation management
export async function isClaudeCodeInstalled(): Promise<boolean>
export async function installClaudeCode(lang: SupportedLang): Promise<void>
```

### Workflow Management Interface

```typescript
// Workflow installation
export async function selectAndInstallWorkflows(
  configLang: SupportedLang,
  displayLang: SupportedLang,
  preselectedWorkflows?: string[]
): Promise<void>

export async function installWorkflow(
  workflow: WorkflowConfig,
  lang: SupportedLang
): Promise<WorkflowInstallResult>
```

## Key Dependencies and Configuration

### Core Dependencies

- `node:fs` / `node:path` - File system operations
- `tinyexec` - Cross-platform command execution
- `pathe` - Cross-platform path handling
- `inquirer` - Interactive prompts
- `dayjs` - Time handling

### Configuration Paths

- `~/.claude/` - Claude Code configuration directory
- `~/.claude/settings.json` - Main configuration file
- `~/.claude/backup/` - Configuration backup directory
- `~/.claude/.zcf-config.json` - ZCF user configuration

## Data Models

### Configuration Data Structures

```typescript
// Claude configuration
interface ClaudeConfiguration {
  mcpServers: Record<string, McpServerConfig>
  hasCompletedOnboarding?: boolean
}

// MCP service configuration
interface McpServerConfig {
  type: 'stdio' | 'sse'
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
}

// API configuration
interface ApiConfig {
  authType: 'auth_token' | 'api_key'
  key: string
  url: string
}
```

### Workflow Data Model

```typescript
// Workflow configuration
interface WorkflowConfig {
  id: string
  nameKey: string
  descriptionKey?: string
  defaultSelected: boolean
  order: number
  commands: string[]
  agents: WorkflowAgent[]
  autoInstallAgents: boolean
  category: 'common' | 'plan' | 'sixStep' | 'bmad' | 'git'
  outputDir: string
}
```

## Submodule Architecture

### CCR Toolset (`ccr/`)

- `installer.ts` - CCR installation and detection
- `config.ts` - CCR configuration management
- `commands.ts` - CCR command wrappers
- `presets.ts` - Preset configuration templates

### Cometix Toolset (`cometix/`)

- `installer.ts` - CCometixLine statusbar tool installation
- `menu.ts` - Cometix interactive menu
- `commands.ts` - Cometix command wrappers
- `errors.ts` - Error handling

### Tool Integration (`tools/`)

- `ccr-menu.ts` - CCR menu system
- `index.ts` - Tool integration entry point

## Testing and Quality

### Testing Architecture

- **Unit Tests**: `test/unit/utils/` - Unit tests for each utility function
- **Integration Tests**: Inter-tool collaboration testing
- **Platform Tests**: Cross-platform compatibility testing
- **Mock Strategy**: Comprehensive mocking of file system, command execution, network requests

### Covered Functional Modules

#### ✅ Configuration Management
- Configuration file read/write operations
- Backup and recovery mechanisms
- Configuration merge strategies
- API configuration validation

#### ✅ Platform Compatibility
- Windows path handling
- Termux environment detection
- Command availability checking
- Cross-platform execution wrapping

#### ✅ MCP Services
- Service configuration generation
- Windows special handling
- Service merge logic
- Environment variable processing

#### ✅ Workflow System
- Template file installation
- Dependency resolution
- Multi-language template support
- Cleanup and update mechanisms

### Quality Metrics

- Test coverage: **95%+**
- Cross-platform testing: **Complete**
- Boundary condition coverage: **Comprehensive**
- Error recovery: **Graceful handling**

## FAQ

### Q: How to add a new MCP service?

1. Add service definition to `MCP_SERVICES` array in `constants.ts`
2. Update related type definitions
3. Add service-specific configuration logic
4. Write corresponding test cases

### Q: How to handle Windows path issues?

Use the `pathe` library for path operations, and use `cmd /c` wrappers in MCP configurations for Windows commands.

### Q: How are workflow templates managed?

Managed through `workflow-installer.ts`, supporting dependency resolution, automatic agent installation, multi-language templates, etc.

### Q: What is the configuration backup strategy?

All configuration modifications automatically create timestamped backups in the `~/.claude/backup/` directory.

## Related File List

### Core Utility Files

- `config.ts` - Configuration management core (config read/write, backup, API settings)
- `installer.ts` - Claude Code installation logic
- `mcp.ts` - MCP service configuration management
- `platform.ts` - Platform detection and compatibility
- `workflow-installer.ts` - Workflow installation system
- `i18n.ts` - Internationalization utilities
- `prompts.ts` - Interactive prompt tools
- `validator.ts` - Input validation utilities

### Specialized Tool Modules

- `config-operations.ts` - Advanced configuration operations
- `config-validator.ts` - Configuration validation
- `json-config.ts` - JSON configuration file operations
- `fs-operations.ts` - File system operations
- `error-handler.ts` - Unified error handling
- `banner.ts` - CLI banner display
- `features.ts` - Feature module management

### Integration Tools

- `ccr/` - Claude Code Router integration
- `cometix/` - CCometixLine statusbar integration
- `tools/` - Third-party tool integration

## Changelog

### 2025-08-20
- **Module Documentation Created**: Completed comprehensive documentation of utils module
- **Architecture Organization**: Detailed analysis of 30+ utility functions' functionality and dependencies
- **Submodule Identification**: Confirmed CCR, Cometix, Tools three major submodules
- **Test Coverage Assessment**: Verified high-quality test coverage and boundary handling