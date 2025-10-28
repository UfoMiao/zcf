# Commands Module

**Last Updated**: Mon Oct 27 19:39:26 CST 2025

[Root](../../CLAUDE.md) > [src](../) > **commands**

## Module Responsibilities

CLI command implementation module containing all major command functions for ZCF, providing both interactive and non-interactive operation interfaces for Claude Code environment setup and management.

## Entry Points and Startup

- **Main Entry Points**:
  - `init.ts` - Complete initialization flow with full setup options (45KB, 1,200+ lines)
  - `menu.ts` - Interactive menu system with feature selection (13KB, 350+ lines)
  - `update.ts` - Workflow template updates without full reinstall (4KB, 100+ lines)
  - `ccr.ts` - Claude Code Router proxy configuration (1KB, 30+ lines)
  - `ccu.ts` - CCusage tool integration and execution (1KB, 40+ lines)
  - `check-updates.ts` - Tool version checking and update management (1.3KB, 50+ lines)
  - `config-switch.ts` - Configuration switching for multi-provider support (14KB, 400+ lines)
  - `uninstall.ts` - ZCF uninstallation with selective removal (10KB, 300+ lines)

## External Interfaces

### Command Interfaces

```typescript
// Initialize command options (v3.3.0+)
export interface InitOptions {
  configLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  force?: boolean
  skipBanner?: boolean
  skipPrompt?: boolean
  codeType?: CodeToolType | string // Support 'cc', 'cx' abbreviations
  // Non-interactive mode parameters
  configAction?: 'new' | 'backup' | 'merge' | 'docs-only' | 'skip'
  apiType?: 'auth_token' | 'api_key' | 'ccr_proxy' | 'skip'
  apiKey?: string // Used for both API key and auth token
  apiUrl?: string
  apiModel?: string // Primary API model
  apiFastModel?: string // Fast API model
  provider?: string // API provider preset (302ai, glm, minimax, kimi, custom)
  mcpServices?: string[] | string | boolean
  workflows?: string[] | string | boolean
  outputStyles?: string[] | string | boolean
  defaultOutputStyle?: string
  allLang?: string // Unified language parameter
  installCometixLine?: string | boolean // CCometixLine installation control
  // Multi-configuration parameters
  apiConfigs?: string // JSON string for multiple API configurations
  apiConfigsFile?: string // Path to JSON file with API configurations
}

// Update command options
export interface UpdateOptions {
  lang?: SupportedLang
  force?: boolean
  selectedWorkflows?: string[]
}

// CCR command options
export interface CcrOptions {
  lang?: SupportedLang
}

// Check updates options
export interface CheckUpdatesOptions {
  lang?: SupportedLang
  codeType?: CodeToolType | string
}

// Config switch options
export interface ConfigSwitchOptions {
  codeType?: CodeToolType | string
  list?: boolean
}

// Uninstall options
export interface UninstallOptions {
  mode?: 'complete' | 'custom' | 'interactive'
  items?: string
  lang?: SupportedLang
}
```

### API Endpoints

- `init(options: InitOptions)` - Execute complete initialization workflow with dual code tool support
- `update(options: UpdateOptions)` - Update workflow templates and configurations
- `showMainMenu()` - Display interactive main menu with all features
- `ccr(options: CcrOptions)` - Configure Claude Code Router proxy settings
- `executeCcusage(args: string[])` - Execute CCusage tool with specified arguments
- `checkUpdates(options: CheckUpdatesOptions)` - Check for tool updates and perform upgrades
- `configSwitch(target: string, options: ConfigSwitchOptions)` - Switch between API configurations
- `uninstall(options: UninstallOptions)` - Uninstall ZCF with selective removal options

### Menu System Interface

```typescript
// Menu feature functions
export interface MenuFeatures {
  fullInit: () => Promise<void>
  importWorkflow: () => Promise<void>
  configureApiOrCcr: () => Promise<void>
  configureMcp: () => Promise<void>
  configureAiMemory: () => Promise<void>
  // Tool integrations
  runCcr: () => Promise<void>
  runCcu: () => Promise<void>
  runCometix: () => Promise<void>
  // System features
  checkUpdates: () => Promise<void>
  changeLanguage: () => Promise<void>
  clearCache: () => Promise<void>
}
```

## Key Dependencies and Configuration

### Core Dependencies

```typescript
// Configuration and utilities
import { getTranslation } from '../i18n'
import { displayBannerWithInfo } from '../utils/banner'
import { backupExistingConfig, configureApi } from '../utils/config'
import { handleExitPromptError } from '../utils/error-handler'
import { installClaudeCode } from '../utils/installer'

// Platform and validation
import { isTermux, isWindows } from '../utils/platform'
import { selectAndInstallWorkflows } from '../utils/workflow-installer'
import { readZcfConfig, updateZcfConfig } from '../utils/zcf-config'
```

### Configuration Integration

- **I18n System**: Full internationalization support for all user interactions
- **Platform Detection**: Windows/macOS/Linux/Termux compatibility handling
- **Configuration Management**: Smart merging and backup of existing configurations
- **Workflow System**: Integration with template installation and management
- **Tool Integration**: CCR, CCusage, and Cometix tool management

## Data Models

### Command Flow Architecture

```typescript
interface CommandFlow {
  init: {
    phases: ['banner', 'config', 'api', 'mcp', 'workflows', 'tools', 'completion']
    skipOptions: ['prompt', 'banner', 'config', 'api', 'mcp', 'workflows']
    rollbackCapability: true
  }
  menu: {
    structure: 'hierarchical'
    categories: ['claude-code', 'tools', 'system']
    persistence: 'language-aware'
  }
  update: {
    scope: ['workflows', 'templates', 'agents']
    conflictResolution: 'preserve-user-changes'
  }
}
```

### Error Handling Strategy

```typescript
interface ErrorHandling {
  gracefulDegradation: true
  userFriendlyMessages: true
  i18nSupport: true
  platformSpecificGuidance: true
  recoverySuggestions: true
}
```

## Testing and Quality

### Test Coverage

- **Unit Tests**: Individual command function testing
- **Integration Tests**: Full workflow execution testing
- **Edge Case Tests**: Platform-specific and error condition testing
- **Mock Testing**: External tool integration testing with comprehensive mocking

### Test Files

- `tests/commands/*.test.ts` - Core command functionality tests
- `tests/commands/*.edge.test.ts` - Edge case and error condition tests
- `tests/unit/commands/` - Isolated unit tests for command logic

### Common Issues

- **Platform Dependencies**: Windows path handling and Termux environment detection
- **User Input Validation**: Handling of invalid selections and exit conditions
- **External Tool Integration**: CCR, CCusage availability and version compatibility
- **Configuration Conflicts**: Existing configuration preservation and merging

## Related Files

- `../utils/` - Core utility functions for configuration, installation, and platform support
- `../i18n/` - Internationalization support for command interfaces
- `../types/` - TypeScript interfaces for command options and configurations
- `../config/workflows.ts` - Workflow configuration definitions
- `../../templates/` - Template files used by commands

## Change Log (Module-Specific)

### Recent Updates (v3.3.0)

- Added API provider preset system for simplified configuration (302.AI, GLM, MiniMax, Kimi)
- Enhanced dual code tool support (Claude Code + Codex)
- Improved config-switch command with multi-provider management
- Added comprehensive uninstall command with selective removal
- Enhanced non-interactive mode with --all-lang unified language parameter
- Added CCometixLine installation control via --install-cometix-line parameter
- Improved multi-configuration support with apiConfigs and apiConfigsFile parameters
- Enhanced error handling with platform-specific guidance
- Expanded menu system with tool integration features
- Added intelligent IDE detection and auto-open functionality
