# Cometix Tools Module

**Last Updated**: Mon Oct 27 19:39:26 CST 2025
[Root](../../../CLAUDE.md) > [src](../../) > [utils](../) > **cometix**

**Last Updated**: Mon Oct 27 09:30:54 CST 2025

## Module Responsibilities

Cometix status line tools integration module providing status line configuration, installation, command execution, and interactive menu management for the CCometixLine tool. Enables enhanced Claude Code status line customization and monitoring.

## Entry Points and Startup

- **Main Entry Points**:
  - `errors.ts` - Cometix error definitions and handling
  - `common.ts` - Common utilities and shared functions
  - `types.ts` - Cometix type definitions
  - `commands.ts` - Cometix command execution
  - `installer.ts` - Cometix installation and update logic
  - `menu.ts` - Interactive Cometix configuration menu

## External Interfaces

### Cometix Error Interface

```typescript
// Cometix error types
export class CometixError extends Error {
  constructor(message: string, public code: string)
}

export class CometixInstallError extends CometixError {}
export class CometixConfigError extends CometixError {}
export class CometixCommandError extends CometixError {}

// Error handling
export function handleCometixError(error: Error): void
export function isCometixError(error: Error): error is CometixError
```

### Cometix Common Interface

```typescript
// Common utility functions
export function getCometixDir(): string
export function getCometixConfigPath(): string
export function ensureCometixDir(): void
export function validateCometixConfig(config: CometixConfig): boolean
```

### Cometix Types Interface

```typescript
// Cometix configuration types
export interface CometixConfig {
  enabled: boolean
  format: string
  updateInterval: number
  showGitBranch: boolean
  showTimestamp: boolean
  customFormat?: string
}

// Cometix status types
export interface CometixStatus {
  installed: boolean
  version?: string
  running: boolean
  config?: CometixConfig
}
```

### Cometix Commands Interface

```typescript
// Cometix command operations
export async function installCometix(lang: SupportedLang): Promise<void>
export async function updateCometix(lang: SupportedLang): Promise<void>
export async function configureCometix(config: CometixConfig): Promise<void>
export async function getCometixStatus(): Promise<CometixStatus>
export async function enableCometix(): Promise<void>
export async function disableCometix(): Promise<void>
```

### Cometix Installer Interface

```typescript
// Installation operations
export async function isCometixInstalled(): Promise<boolean>
export async function getCometixVersion(): Promise<string | null>
export async function downloadCometix(lang: SupportedLang): Promise<void>
export async function installCometixBinary(): Promise<void>
```

### Cometix Menu Interface

```typescript
// Interactive menu operations
export async function showCometixMenu(lang: SupportedLang): Promise<void>
export async function selectCometixFormat(): Promise<string>
export async function configureCometixInteractive(): Promise<CometixConfig>
```

## Key Dependencies and Configuration

### Core Dependencies

```typescript
// Internal dependencies
import { i18n } from '../../i18n'
import { getPlatform, isWindows } from '../platform'
import { commandExists } from '../installer'

// External dependencies
import { x } from 'tinyexec'
import { readFileSync, writeFileSync, ensureDirSync } from 'fs-extra'
import { join } from 'pathe'
```

### Configuration Structure

- **Cometix Config Directory**: `~/.cometix/`
- **Cometix Config File**: `~/.cometix/config.json`
- **Cometix Binary Path**: Platform-specific
- **Default Update Interval**: 5000ms
- **Default Format**: `{branch} | {time}`

## Data Models

### Cometix Configuration Schema

```typescript
interface CometixConfigSchema {
  version: string
  statusLine: {
    enabled: boolean
    format: string
    updateInterval: number
  }
  display: {
    showGitBranch: boolean
    showTimestamp: boolean
    showFileCount: boolean
    customFormat?: string
  }
  colors: {
    branch: string
    time: string
    separator: string
  }
}
```

### Cometix Format Templates

```typescript
interface CometixFormatTemplates {
  minimal: '{branch}'
  standard: '{branch} | {time}'
  detailed: '{branch} | {files} files | {time}'
  custom: string // User-defined format
}
```

## Testing and Quality

### Test Coverage

#### ✅ Cometix Errors (`errors.test.ts`)

- Error class instantiation
- Error code validation
- Error message formatting
- Error handling flow

#### ✅ Cometix Common (`common.test.ts`)

- Directory path resolution
- Configuration validation
- Utility function testing
- Cross-platform compatibility

#### ✅ Cometix Commands (`commands.test.ts`)

- Installation command execution
- Configuration command testing
- Status checking validation
- Enable/disable operations

#### ✅ Cometix Installer (`installer.test.ts`, `installer-integration.test.ts`)

- Installation flow validation
- Binary download and installation
- Version checking and comparison
- Platform-specific installation
- Integration testing with real scenarios

#### ✅ Cometix Menu (`menu.test.ts`)

- Interactive menu display
- Format selection testing
- Configuration flow validation
- User input handling

### Quality Metrics

- **Test Coverage**: 90%+ across all Cometix modules
- **Edge Case Coverage**: Comprehensive error scenarios
- **Platform Testing**: Windows, macOS, Linux
- **Integration Testing**: Full Cometix workflow validation

## Module Architecture

### Component Interaction

```
Cometix Module Architecture
├── errors.ts
│   ├── Error definitions
│   ├── Error handling
│   └── Error utilities
├── common.ts
│   ├── Shared utilities
│   ├── Path resolution
│   └── Validation functions
├── types.ts
│   ├── Type definitions
│   ├── Interface declarations
│   └── Type guards
├── commands.ts
│   ├── Command execution
│   ├── Status management
│   └── Configuration operations
├── installer.ts
│   ├── Installation logic
│   ├── Binary management
│   └── Version control
└── menu.ts
    ├── Interactive UI
    ├── Format selection
    └── Configuration wizard
```

### Data Flow

1. **Installation Flow**: `installer.ts` → Check version → Download binary → Install → Verify
2. **Configuration Flow**: `menu.ts` → Select format → Configure options → Write config → Apply
3. **Status Check Flow**: `commands.ts` → Read config → Check process → Return status
4. **Error Handling Flow**: `errors.ts` → Catch error → Format message → Display to user

## FAQ

### Q: How to add a new Cometix format template?

1. Add format definition to format templates
2. Update format selection menu
3. Add format validation logic
4. Update tests to cover new format

### Q: How to handle Cometix installation failures?

The installer implements comprehensive error handling:
- Network failure retry mechanism
- Binary verification and checksum validation
- Platform-specific fallback strategies
- Detailed error messages with i18n support

### Q: How to customize Cometix status line format?

Use the interactive menu or direct configuration:
```typescript
const config: CometixConfig = {
  enabled: true,
  format: '{branch} | {files} files | {time}',
  updateInterval: 3000,
  showGitBranch: true,
  showTimestamp: true
}
await configureCometix(config)
```

### Q: How to check Cometix status?

Use the status checking function:
```typescript
const status = await getCometixStatus()
if (status.installed && status.running) {
  console.log(`Cometix v${status.version} is running`)
}
```

## Related File List

### Core Cometix Files

- `errors.ts` - Error definitions and handling
- `common.ts` - Common utilities
- `types.ts` - Type definitions
- `commands.ts` - Command execution
- `installer.ts` - Installation logic
- `menu.ts` - Interactive menu

### Test Files

- `tests/unit/utils/cometix/errors.test.ts` - Error tests
- `tests/unit/utils/cometix/common.test.ts` - Common utility tests
- `tests/utils/cometix/commands.test.ts` - Command tests
- `tests/utils/cometix/installer.test.ts` - Installer tests
- `tests/unit/utils/cometix/installer-integration.test.ts` - Integration tests
- `tests/utils/cometix/menu.test.ts` - Menu tests

### Integration Points

- `src/utils/ccometixline-config.ts` - Cometix configuration management
- `src/utils/statusline-validator.ts` - Status line validation
- `src/i18n/locales/*/cometix.json` - Cometix translations

## Changelog

### 2025-10-27

- **Module Documentation Created**: Comprehensive documentation of Cometix tools module
- **Architecture Analysis**: Detailed component interaction and data flow documentation
- **Test Coverage Documentation**: Complete test suite coverage analysis
- **Interface Documentation**: Comprehensive API and configuration interface documentation
