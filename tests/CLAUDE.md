# Tests Module

**Last Updated**: Mon Oct 27 19:39:26 CST 2025
[Root](../CLAUDE.md) > **tests**

## Module Responsibilities

Test suite module providing comprehensive test coverage for the ZCF project, including unit tests, integration tests, edge tests, and template validation tests.

## Entry Points and Startup

- **Testing Framework**: Vitest
- **Coverage Tool**: @vitest/coverage-v8
- **Test UI**: @vitest/ui
- **Main Test Directories**:
  - `tests/` - New test suites
  - `test/unit/` - Unit tests
  - `test/integration/` - Integration tests

## External Interfaces

### Test Architecture

```
tests/
├── commands/              # Command layer tests
│   ├── *.test.ts         # Core command tests
│   └── *.edge.test.ts    # Command edge tests
├── utils/                # Utility layer tests
│   ├── ccr/              # CCR tool tests
│   ├── cometix/          # Cometix tool tests
│   └── tools/            # Third-party tool integration tests
├── config/               # Configuration system tests
├── i18n/                 # Internationalization tests
└── templates/            # Template validation tests

test/
├── unit/                 # Unit test suites
│   ├── commands/         # Command unit tests
│   ├── utils/            # Utility unit tests
│   └── config/           # Configuration unit tests
├── integration/          # Integration tests
└── helpers/              # Test helper tools
```

### Test Tool Interface

```typescript
// Test helper functions
export function mockFileSystem(): void
export function mockUserInput(responses: string[]): void
export function mockPlatform(platform: 'windows' | 'macos' | 'linux'): void
export function mockCommandExecution(commands: Record<string, string>): void

// Test validation tools
export function validateConfig(config: any): boolean
export function validateWorkflowInstallation(result: WorkflowInstallResult): boolean
```

## Key Dependencies and Configuration

### Testing Framework Configuration

- **Vitest**: Main testing framework supporting TypeScript and ESM
- **Coverage**: V8 coverage reporting with 80%+ target
- **UI**: Visual testing interface
- **Mock System**: Comprehensive mocking system

### Test Configuration Files

- `vitest.config.ts` - Vitest main configuration
- `test/helpers/` - Test helper tools
- Mock strategies distributed across test files

## Test Data Models

### Test Layering Strategy

#### 1. Unit Test Layer (`test/unit/`)

- **Scope**: Individual function or class behavior
- **Isolation**: Completely isolated test environment
- **Mock**: All external dependencies

#### 2. Integration Test Layer (`test/integration/`)

- **Scope**: Multi-module interaction
- **Dependencies**: Allow real module interaction
- **Validation**: End-to-end functionality verification

#### 3. Edge Test Layer (`*.edge.test.ts`)

- **Scope**: Error conditions and boundary cases
- **Coverage**: Exception handling and extreme inputs
- **Validation**: Error recovery and graceful degradation

#### 4. New Test Suite (`tests/`)

- **Scope**: New features and refactoring tests
- **Organization**: Organized by functional modules
- **Standards**: Higher testing standards

## Test Coverage Analysis

### Command Layer Test Coverage

#### ✅ Init Command Tests

- **File**: `test/unit/commands/init.test.ts` (29 line configuration)
- **Edge**: `init.edge.test.ts` - Error scenarios
- **Skip Prompt**: `init-skip-prompt.test.ts` - Non-interactive mode
- **Coverage**: High - Complete initialization flow

#### ✅ Menu Command Tests

- **File**: `test/unit/commands/menu.test.ts` (40 line configuration)
- **Function**: Interactive menu logic validation
- **Mock**: User input and menu navigation

#### ✅ CCR Command Tests

- **File**: `tests/commands/ccr.test.ts`, `ccr.edge.test.ts`
- **Function**: Claude Code Router configuration
- **Edge**: Installation failures and configuration errors

#### ✅ CCU Command Tests

- **File**: `tests/commands/ccu.test.ts`, `ccu.edge.test.ts`
- **Function**: CCusage tool integration
- **Edge**: Command execution failures

#### ✅ Update Command Tests

- **File**: `test/unit/commands/update.test.ts` (24 line configuration)
- **Function**: Workflow update mechanism

### Utility Layer Test Coverage

#### ✅ Configuration Management Tests

- **File**: `test/unit/utils/config.test.ts` (10 line reference)
- **Function**: Configuration read/write, backup, merge
- **Mock**: File system operations

#### ✅ MCP Service Tests

- **File**: `test/unit/utils/mcp.test.ts` (9 line reference)
- **Function**: MCP service configuration and management
- **Platform**: Windows special handling

#### ✅ Platform Compatibility Tests

- **File**: `test/unit/utils/platform.test.ts`
- **Function**: Cross-platform detection and handling
- **Mock**: Operating system environment

#### ✅ Workflow Installation Tests

- **File**: `test/unit/utils/workflow-installer.test.ts` (20 line configuration)
- **Function**: Workflow installation and dependency resolution

#### ✅ CCR Toolset Tests

- **Directory**: `tests/utils/ccr/`
- **Files**: `config.test.ts`, `installer.test.ts`, `presets.test.ts`
- **Edge**: Corresponding `.edge.test.ts` files

#### ✅ Cometix Toolset Tests

- **Directory**: `tests/utils/cometix/`
- **Files**: `installer.test.ts`, `menu.test.ts`, `commands.test.ts`
- **Function**: CCometixLine statusbar tool

### System-Level Test Coverage

#### ✅ Internationalization Tests

- **File**: `tests/i18n/locales/workflow.test.ts`
- **Function**: Translation completeness and consistency verification

#### ✅ Workflow Configuration Tests

- **File**: `tests/config/workflows.test.ts`
- **Edge**: `test/unit/config/workflows.edge.test.ts`
- **Function**: Workflow configuration validation

#### ✅ Template Validation Tests

- **File**: `tests/templates/chinese-templates.test.ts`
- **Function**: Chinese template completeness verification

## Quality Metrics and Strategy

### Coverage Targets

- **Line Coverage**: 80%+ (configured in vitest.config.ts)
- **Function Coverage**: 80%+
- **Branch Coverage**: 80%+
- **Statement Coverage**: 80%+

### Mock Strategy

#### ✅ File System Mock

```typescript
// Mock file operations
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn()
}))
```

#### ✅ Command Execution Mock

```typescript
// Mock external commands
vi.mock('tinyexec', () => ({
  $: vi.fn()
}))
```

#### ✅ User Input Mock

```typescript
// Mock interactive prompts
vi.mock('inquirer', () => ({
  prompt: vi.fn()
}))
```

#### ✅ Platform Detection Mock

```typescript
// Mock platform environment
vi.mock('../utils/platform', () => ({
  getPlatform: vi.fn(),
  isWindows: vi.fn()
}))
```

## Test Execution and Reporting

### Test Commands

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# UI interface
pnpm test:ui

# Coverage report
pnpm test:coverage

# Single run
pnpm test:run
```

### Test Organization

- **Grouped by Function**: Commands, utilities, configuration tested separately
- **Layered Testing**: Unit, integration, edge three-layer coverage
- **Platform Testing**: Cross-platform compatibility verification
- **Regression Testing**: Prevent feature regression

## FAQ

### Q: How to add new tests?

1. Determine test type (unit/integration/edge)
2. Create test file in appropriate directory
3. Use standard Mock strategy
4. Ensure test covers all branches of new functionality

### Q: How to handle async tests?

Use `async/await` and Vitest's async test support, ensuring async operations complete before assertions.

### Q: How to choose Mock strategy?

- File system operations must be mocked
- External command execution must be mocked
- User interaction must be mocked
- Platform detection can be mocked for multi-platform testing

### Q: How to improve test coverage?

1. Identify uncovered code branches
2. Add boundary condition tests
3. Increase error scenario tests
4. Verify exception handling logic

## Related File List

### Core Test Suites

#### Unit Tests (`test/unit/`)

- `commands/` - Command layer unit tests (8 files)
- `utils/` - Utility layer unit tests (25 files)
- `config/` - Configuration system tests (3 files)
- `cli-*.test.ts` - CLI system tests (3 files)

#### New Test Suite (`tests/`)

- `commands/` - Command tests (4 files)
- `utils/ccr/` - CCR tool tests (6 files)
- `utils/cometix/` - Cometix tests (3 files)
- `utils/tools/` - Tool integration tests (1 file)
- `config/` - Configuration tests (1 file)
- `i18n/` - Internationalization tests (1 file)
- `templates/` - Template tests (1 file)

#### Integration Tests (`test/integration/`)

- `statusline-config.test.ts` - Statusbar configuration integration
- `test-helpers.ts` - Integration test helpers

#### Test Helpers (`test/helpers/`)

- `statusline-helpers.ts` - Statusbar test helpers

### Statistics

- **Total Test Files**: 60+ files
- **Test Distribution**:
  - Unit tests: 80%
  - Integration tests: 10%
  - Edge tests: 10%
- **Platform Coverage**: Windows/macOS/Linux/Termux

## Changelog

### 2025-08-20

- **Module Documentation Created**: Completed comprehensive documentation of tests module
- **Test Architecture Analysis**: Detailed analysis of 60+ test files' organizational structure
- **Coverage Assessment**: Confirmed 80%+ high coverage target
- **Mock Strategy Documentation**: Complete recording of test mocking strategies and best practices
