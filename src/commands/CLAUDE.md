# Commands Module

[Root](../../CLAUDE.md) > [src](../) > **commands**

## Module Responsibilities

CLI command implementation module containing all major command functions for ZCF, providing both interactive and non-interactive operation interfaces.

## Entry Points and Startup

- **Main Entry Points**: 
  - `init.ts` - Complete initialization flow
  - `menu.ts` - Interactive menu system
  - `update.ts` - Workflow updates
  - `ccr.ts` - Claude Code Router management
  - `ccu.ts` - CCusage integration
  - `check-updates.ts` - Tool update checker

## External Interfaces

### Command Interfaces

```typescript
// Initialize command options
export interface InitOptions {
  lang?: SupportedLang
  configLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  force?: boolean
  skipPrompt?: boolean
  // Non-interactive mode parameters
  configAction?: 'new' | 'backup' | 'merge' | 'docs-only' | 'skip'
  apiType?: 'auth_token' | 'api_key' | 'ccr_proxy' | 'skip'
  // ... other options
}

// Menu system
export async function showMainMenu(): Promise<void>
```

### API Endpoints

- `init(options: InitOptions)` - Execute complete initialization
- `update(options: UpdateOptions)` - Update workflow templates
- `showMainMenu()` - Display interactive main menu
- `ccr(options: CcrOptions)` - CCR proxy configuration
- `executeCcusage(args: string[])` - CCusage tool execution
- `checkUpdates(options: CheckUpdatesOptions)` - Check tool updates

## Key Dependencies and Configuration

### Core Dependencies

- `inquirer` - Interactive command line prompts
- `ansis` - Terminal colors and styling
- `../utils/*` - Utility function collection
- `../constants` - Global constants
- `../i18n` - Internationalization support

### Configuration Files

- No independent config files, uses global ZCF configuration
- Depends on `~/.claude/settings.json` for state management
- Stores user preferences via `~/.claude/.zcf-config.json`

## Data Models

### Command Options Interface

```typescript
// CLI options base interface
export interface CliOptions {
  init?: boolean
  lang?: 'zh-CN' | 'en'
  configLang?: 'zh-CN' | 'en'
  aiOutputLang?: string
  force?: boolean
  skipPrompt?: boolean
  // Non-interactive parameters
  configAction?: string
  apiType?: string
  apiKey?: string
  apiUrl?: string
  mcpServices?: string
  workflows?: string
  aiPersonality?: string
  allLang?: string
  installCometixLine?: string | boolean
}
```

### Command Execution Flow

1. **Parameter Parsing** - Parse CLI arguments and options
2. **Language Selection** - Determine display and configuration language
3. **Environment Detection** - Detect platform and installed tools
4. **Configuration Handling** - Backup, merge, or create new configuration
5. **Function Execution** - Execute specific command logic
6. **Result Feedback** - Display execution results and next step suggestions

## Testing and Quality

### Testing Strategy

- **Unit Tests**: `test/unit/commands/` - Unit tests for each command
- **Edge Tests**: `*.edge.test.ts` - Boundary conditions and error scenarios
- **Integration Tests**: Inter-command integration testing
- **Mock Strategy**: Extensive mocking of file system, external commands, and user input

### Test Coverage

- ✅ **init command**: Complete initialization flow testing
- ✅ **menu command**: Interactive menu logic
- ✅ **update command**: Workflow update mechanism
- ✅ **ccr command**: CCR configuration and management
- ✅ **ccu command**: CCusage integration
- ✅ **Non-interactive mode**: skip-prompt parameter validation

### Quality Metrics

- Test coverage: **90%+**
- Edge test coverage: **Complete**
- Cross-platform compatibility: **Windows/macOS/Linux/Termux**
- Error handling: **Graceful degradation**

## FAQ

### Q: How to add a new CLI command?

1. Create a new command file in `src/commands/`
2. Register the command in `src/cli-setup.ts`
3. Add corresponding type definitions and options interface
4. Write unit tests and edge tests

### Q: How does non-interactive mode work?

Use the `--skip-prompt` parameter, all user interactions are pre-provided via CLI arguments, suitable for CI/CD environments.

### Q: How is internationalization implemented?

Through the `../i18n` module providing multilingual support, each command supports both Chinese and English interfaces.

## Related File List

### Core Files

- `init.ts` - Main initialization command (734 lines)
- `menu.ts` - Interactive menu system (201 lines)
- `update.ts` - Workflow update command
- `ccr.ts` - Claude Code Router management
- `ccu.ts` - CCusage tool integration
- `check-updates.ts` - Automatic update checker

### Test Files

- `test/unit/commands/*.test.ts` - Unit test suites
- `test/unit/commands/*.edge.test.ts` - Edge tests
- `tests/commands/*.test.ts` - Additional test coverage

## Changelog

### 2025-08-20
- **Module Documentation Created**: Completed comprehensive documentation of commands module
- **Architecture Analysis**: Detailed analysis of 6 core commands' functionality and interfaces
- **Test Coverage Assessment**: Confirmed high-coverage testing strategy
- **API Interface Documentation**: Complete recording of all command interfaces and options