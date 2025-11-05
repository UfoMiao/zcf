---
title: Testing Guide
---

# Testing Guide

ZCF adopts **Test-Driven Development (TDD)** methodology, requiring all new features to write tests first, ensuring code quality and maintainability. This document details testing strategies, writing standards, and best practices.

## 📋 Table of Contents

- [Test Framework](#test-framework)
- [Test Commands](#test-commands)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Mock and Fixtures](#mock-and-fixtures)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)

## Test Framework

### Technology Stack

- **Test Framework**: Vitest (Vite's test framework)
- **Assertion Library**: Vitest built-in (based on Chai)
- **Mock Library**: Vitest built-in (based on Sinon)
- **Coverage**: Vitest built-in (based on v8)

### Configuration

Test configuration is located in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Coverage goal: 80%
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    // Test file matching
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
})
```

## Test Commands

### Basic Commands

| Command | Description |
|------|------|
| `pnpm test` | Run all tests (one-time) |
| `pnpm test:run` | Run tests (watch mode, continuous monitoring) |
| `pnpm test:watch` | Same as above, watch mode |
| `pnpm test:ui` | Run tests using Vitest UI interface |
| `pnpm test:coverage` | Generate coverage report |

### Advanced Usage

```bash
# Run specific test file
pnpm vitest tests/unit/utils/config.test.ts

# Run tests matching pattern
pnpm vitest --grep "should handle"

# Run tests in specific directory
pnpm vitest tests/commands

# Only run failed tests
pnpm vitest --re-run-failed-tests

# Update snapshots
pnpm vitest --update-snapshots
```

### Parallel Execution Control

```bash
# Single-threaded run (useful for debugging)
pnpm vitest --no-threads

# Specify concurrency
pnpm vitest --maxConcurrency 5
```

## Test Structure

### Directory Organization

```
tests/
├── unit/              # Unit tests (single function/module)
│   ├── commands/      # Command tests
│   ├── utils/         # Utility function tests
│   ├── config/        # Configuration tests
│   └── i18n/          # Internationalization tests
│
├── integration/       # Integration tests (cross-module interactions)
│   └── ...
│
├── commands/          # Command integration tests
│   ├── init.test.ts
│   ├── menu.test.ts
│   └── ...
│
├── utils/            # Utility integration tests
│   ├── config.test.ts
│   └── ...
│
├── i18n/             # Internationalization integrity tests
│   └── i18n-integrity.test.ts
│
└── templates/        # Template tests
    └── chinese-templates.test.ts
```

### Test File Naming

- **Core Tests**: `*.test.ts` - Basic functionality and main flows
- **Edge Tests**: `*.edge.test.ts` - Edge conditions and error scenarios

Examples:
- `config.test.ts` - Configuration management core tests
- `config.edge.test.ts` - Configuration edge case tests

## Writing Tests

### TDD Workflow

Follow **Red-Green-Refactor** cycle:

1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make test pass
3. **Refactor**: Refactor code while keeping tests passing

### Test Structure

Use `describe` and `it` to organize tests:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('ConfigManager', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks()
  })

  describe('readConfig', () => {
    it('should read config from file', async () => {
      // Arrange: Prepare test data
      const mockConfig = { apiKey: 'test-key' }
      
      // Act: Execute functionality under test
      const result = await readConfig('config.json')
      
      // Assert: Verify result
      expect(result).toEqual(mockConfig)
    })

    it('should return null if file does not exist', async () => {
      // ...
    })
  })
})
```

### Test Type Examples

#### 1. Unit Tests

Test single functions or modules:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { readConfig } from '../utils/config'

describe('readConfig', () => {
  it('should read valid JSON config', async () => {
    // Mock file system
    vi.mock('fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue('{"key": "value"}'),
    }))

    const config = await readConfig('config.json')
    expect(config).toEqual({ key: 'value' })
  })
})
```

#### 2. Integration Tests

Test cross-module interactions:

```typescript
import { describe, it, expect } from 'vitest'
import { init } from '../commands/init'
import { readConfig } from '../utils/config'

describe('Init Integration', () => {
  it('should create config after initialization', async () => {
    await init({ skipPrompt: true })
    
    const config = await readConfig()
    expect(config).toBeDefined()
    expect(config.apiKey).toBeTruthy()
  })
})
```

#### 3. Edge Tests

Test error scenarios and edge conditions:

```typescript
describe('ConfigManager Edge Cases', () => {
  it('should handle invalid JSON gracefully', async () => {
    // Test invalid JSON
    vi.spyOn(fs, 'readFile').mockResolvedValue('invalid json')
    
    await expect(readConfig('bad.json')).rejects.toThrow()
  })

  it('should handle missing required fields', async () => {
    // Test missing required fields
    const incompleteConfig = { /* missing apiKey */ }
    await expect(validateConfig(incompleteConfig)).rejects.toThrow()
  })
})
```

### Async Tests

```typescript
it('should handle async operations', async () => {
  const result = await asyncOperation()
  expect(result).toBeDefined()
})

it('should handle async errors', async () => {
  await expect(failingAsyncOperation()).rejects.toThrow()
})
```

### Snapshot Tests

Used to verify output format (note: avoid language dependencies):

```typescript
it('should generate correct config format', () => {
  const config = generateConfig()
  // Snapshot test saves result from first run
  expect(config).toMatchSnapshot()
})
```

**Note**: Snapshot content should be stable, not affected by language settings.

## Mock and Fixtures

### File System Mock

Use Vitest temporary directories or mocks:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

describe('File Operations', () => {
  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks()
  })

  it('should read file', async () => {
    // Mock readFile
    vi.spyOn(await import('fs/promises'), 'readFile')
      .mockResolvedValue('file content')

    const content = await readFile('test.txt')
    expect(content).toBe('file content')
  })
})
```

### Command Execution Mock

```typescript
import { x } from 'tinyexec'

vi.mock('tinyexec', () => ({
  x: vi.fn().mockResolvedValue({ stdout: 'success' }),
}))

it('should execute command', async () => {
  await executeCommand('echo test')
  expect(x).toHaveBeenCalledWith('echo', ['test'])
})
```

### Interactive Prompt Mock

```typescript
import inquirer from 'inquirer'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ choice: 'option1' }),
  },
}))

it('should handle user input', async () => {
  const result = await promptUser()
  expect(result).toBe('option1')
})
```

### Test Fixtures

Create reusable test data:

```typescript
// tests/fixtures/config.ts
export const mockConfig = {
  apiKey: 'test-key',
  apiUrl: 'https://api.example.com',
}

export const mockInvalidConfig = {
  // Missing required fields
  apiUrl: 'https://api.example.com',
}
```

Usage:

```typescript
import { mockConfig } from '../fixtures/config'

it('should validate config', () => {
  expect(validateConfig(mockConfig)).toBe(true)
})
```

## Coverage Requirements

### Coverage Goals

- **Line Coverage**: >= 80%
- **Function Coverage**: >= 80%
- **Branch Coverage**: >= 80%
- **Statement Coverage**: >= 80%

### View Coverage

```bash
# Generate coverage report
pnpm test:coverage

# Report location
# coverage/lcov-report/index.html
```

### Coverage Report Interpretation

- **Green**: Covered
- **Red**: Not covered
- **Yellow**: Partially covered (branches)

Focus on:
- Core business logic
- Error handling paths
- Edge conditions

## Best Practices

### 1. Test Naming

Use descriptive test names:

```typescript
// ✅ Good naming
it('should create backup before config changes', async () => {})
it('should handle invalid API key gracefully', async () => {})

// ❌ Bad naming
it('test1', async () => {})
it('should work', async () => {})
```

### 2. Test Organization

Group by functionality, use nested `describe`:

```typescript
describe('ConfigManager', () => {
  describe('readConfig', () => {
    it('should read valid config', () => {})
    it('should return null if file missing', () => {})
  })

  describe('writeConfig', () => {
    it('should write config to file', () => {})
    it('should create backup before write', () => {})
  })
})
```

### 3. Test Isolation

Each test should be independent:

```typescript
beforeEach(() => {
  // Clear state
  vi.clearAllMocks()
  // Reset global state
})

afterEach(() => {
  // Cleanup resources
})
```

### 4. Avoid Test Language Dependencies

Tests should be independent of language settings:

```typescript
// ❌ Avoid
expect(output).toBe('Success')

// ✅ Recommended: Use translation keys or stable identifiers
expect(output).toContain('success')
// Or
expect(output).toMatch(/success|成功/i)
```

### 5. Mock External Dependencies

Mock all external dependencies (file system, network, commands, etc.):

```typescript
// Mock file system
vi.mock('fs/promises')
vi.mock('fs')

// Mock network requests
vi.mock('node-fetch')

// Mock command execution
vi.mock('tinyexec')
```

### 6. Test Edge Conditions

- Empty values/undefined/null
- Invalid input
- Network errors
- File doesn't exist
- Permission errors

### 7. Test Performance (if needed)

For performance-critical code:

```typescript
it('should complete within time limit', async () => {
  const start = Date.now()
  await performOperation()
  const duration = Date.now() - start
  expect(duration).toBeLessThan(1000) // Complete within 1 second
})
```

## Common Questions

### Q: Tests run slowly?

A: 
1. Use `--run` mode instead of watch mode
2. Parallel execution (enabled by default)
3. Only run relevant tests: `pnpm vitest path/to/test.ts`

### Q: Mock not working?

A: 
1. Ensure `vi.mock()` is called at top of test file
2. Check if mock path is correct
3. Use `vi.spyOn` instead of `vi.mock` (if applicable)

### Q: Snapshot test fails?

A: 
1. Check if change is intentional
2. Update snapshot: `pnpm vitest --update-snapshots`
3. Ensure snapshot content is stable (not affected by language)

### Q: Coverage not meeting requirements?

A: 
1. View coverage report to find uncovered code
2. Add edge tests to cover error paths
3. Ensure tests cover all branches

## Related Documentation

- [Contribution Guide](contributing.md) - Includes TDD workflow description
- [Architecture Documentation](architecture.md) - Understand module structure
- [Vitest Documentation](https://vitest.dev/) - Official documentation


