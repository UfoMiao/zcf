# CCR Integration Module

**Last Updated**: Mon Oct 27 19:39:26 CST 2025
[Root](../../../CLAUDE.md) > [src](../../) > [utils](../) > **ccr**

**Last Updated**: Mon Oct 27 09:30:54 CST 2025

## Module Responsibilities

Claude Code Router (CCR) integration module providing proxy management, configuration presets, installation, and command execution for the CCR proxy service. Enables seamless integration between ZCF and CCR for enhanced Claude Code API routing.

## Entry Points and Startup

- **Main Entry Points**:
  - `presets.ts` - CCR configuration presets and templates
  - `commands.ts` - CCR command execution and management
  - `installer.ts` - CCR installation and update logic
  - `config.ts` - CCR configuration file management

## External Interfaces

### CCR Configuration Interface

```typescript
// CCR preset configuration
export interface CcrPreset {
  name: string
  description: string
  config: CcrConfig
}

// CCR configuration structure
export interface CcrConfig {
  port: number
  host: string
  apiKey?: string
  apiUrl?: string
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
}

// CCR preset operations
export function getPresets(): CcrPreset[]
export function getPresetByName(name: string): CcrPreset | undefined
export function applyPreset(preset: CcrPreset): void
```

### CCR Command Interface

```typescript
// CCR command execution
export async function startCcr(config: CcrConfig): Promise<void>
export async function stopCcr(): Promise<void>
export async function restartCcr(config: CcrConfig): Promise<void>
export async function getCcrStatus(): Promise<CcrStatus>

// CCR status interface
export interface CcrStatus {
  running: boolean
  port?: number
  pid?: number
  uptime?: number
}
```

### CCR Installation Interface

```typescript
// CCR installation operations
export async function installCcr(lang: SupportedLang): Promise<void>
export async function updateCcr(lang: SupportedLang): Promise<void>
export async function isCcrInstalled(): Promise<boolean>
export async function getCcrVersion(): Promise<string | null>
```

### CCR Configuration Management Interface

```typescript
// Configuration file operations
export function readCcrConfig(): CcrConfig | null
export function writeCcrConfig(config: CcrConfig): void
export function mergeCcrConfig(existing: CcrConfig, updates: Partial<CcrConfig>): CcrConfig
export function validateCcrConfig(config: CcrConfig): boolean
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
import { readFileSync, writeFileSync } from 'fs-extra'
import { join } from 'pathe'
```

### Configuration Structure

- **CCR Config Directory**: `~/.ccr/`
- **CCR Config File**: `~/.ccr/config.json`
- **CCR Log Directory**: `~/.ccr/logs/`
- **Default Port**: 8787
- **Default Host**: localhost

## Data Models

### CCR Preset System

```typescript
interface CcrPresetSystem {
  presets: {
    default: {
      name: 'Default'
      port: 8787
      host: 'localhost'
      logLevel: 'info'
    }
    development: {
      name: 'Development'
      port: 8788
      host: 'localhost'
      logLevel: 'debug'
    }
    production: {
      name: 'Production'
      port: 8787
      host: '0.0.0.0'
      logLevel: 'warn'
    }
  }
}
```

### CCR Configuration Schema

```typescript
interface CcrConfigSchema {
  version: string
  server: {
    port: number
    host: string
    timeout: number
  }
  api: {
    url: string
    key?: string
    retries: number
  }
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    file?: string
  }
}
```

## Testing and Quality

### Test Coverage

#### ✅ CCR Presets (`presets.test.ts`, `presets.edge.test.ts`)

- Preset retrieval and validation
- Preset application and merging
- Edge cases: invalid presets, missing configurations
- Cross-platform preset compatibility

#### ✅ CCR Commands (`commands.test.ts`)

- CCR start/stop/restart operations
- Status checking and monitoring
- Process management and cleanup
- Error handling and recovery

#### ✅ CCR Installer (`installer.test.ts`, `installer.edge.test.ts`)

- Installation flow validation
- Update mechanism testing
- Version checking and comparison
- Platform-specific installation paths
- Edge cases: network failures, permission issues

#### ✅ CCR Configuration (`config.test.ts`, `config.edge.test.ts`, `config-existing.test.ts`)

- Configuration file read/write operations
- Configuration merging and validation
- Backup and recovery mechanisms
- Edge cases: corrupted configs, missing files

### Quality Metrics

- **Test Coverage**: 95%+ across all CCR modules
- **Edge Case Coverage**: Comprehensive error scenarios
- **Platform Testing**: Windows, macOS, Linux, Termux
- **Integration Testing**: Full CCR workflow validation

## Module Architecture

### Component Interaction

```
CCR Module Architecture
├── presets.ts
│   ├── Preset definitions
│   ├── Preset retrieval
│   └── Preset application
├── commands.ts
│   ├── Process management
│   ├── Status monitoring
│   └── Command execution
├── installer.ts
│   ├── Installation logic
│   ├── Update mechanism
│   └── Version management
└── config.ts
    ├── File operations
    ├── Configuration merging
    └── Validation logic
```

### Data Flow

1. **Configuration Loading**: `config.ts` → Read CCR config → Validate → Return config object
2. **Preset Application**: `presets.ts` → Select preset → Merge with existing config → Write to file
3. **CCR Execution**: `commands.ts` → Load config → Start CCR process → Monitor status
4. **Installation**: `installer.ts` → Check version → Download CCR → Install → Verify

## FAQ

### Q: How to add a new CCR preset?

1. Add preset definition to `presets.ts`
2. Define preset configuration structure
3. Add preset to preset list
4. Update tests to cover new preset

### Q: How to handle CCR installation failures?

The installer implements comprehensive error handling:
- Network failure retry mechanism
- Permission error detection and guidance
- Platform-specific fallback strategies
- Detailed error messages with i18n support

### Q: How to customize CCR configuration?

Use the configuration merging system:
```typescript
const existing = readCcrConfig()
const updates = { port: 9090, logLevel: 'debug' }
const merged = mergeCcrConfig(existing, updates)
writeCcrConfig(merged)
```

### Q: How to check CCR status?

Use the status checking function:
```typescript
const status = await getCcrStatus()
if (status.running) {
  console.log(`CCR running on port ${status.port}`)
}
```

## Related File List

### Core CCR Files

- `presets.ts` - CCR configuration presets
- `commands.ts` - CCR command execution
- `installer.ts` - CCR installation logic
- `config.ts` - CCR configuration management

### Test Files

- `tests/utils/ccr/presets.test.ts` - Preset tests
- `tests/utils/ccr/presets.edge.test.ts` - Preset edge tests
- `tests/utils/ccr/commands.test.ts` - Command tests
- `tests/utils/ccr/installer.test.ts` - Installer tests
- `tests/utils/ccr/installer.edge.test.ts` - Installer edge tests
- `tests/utils/ccr/config.test.ts` - Configuration tests
- `tests/utils/ccr/config.edge.test.ts` - Configuration edge tests
- `tests/utils/ccr/config-existing.test.ts` - Existing config tests

### Integration Points

- `src/commands/ccr.ts` - CCR command entry point
- `src/utils/tools/ccr-menu.ts` - CCR interactive menu
- `src/i18n/locales/*/ccr.json` - CCR translations

## Changelog

### 2025-10-27

- **Module Documentation Created**: Comprehensive documentation of CCR integration module
- **Architecture Analysis**: Detailed component interaction and data flow documentation
- **Test Coverage Documentation**: Complete test suite coverage analysis
- **Interface Documentation**: Comprehensive API and configuration interface documentation
