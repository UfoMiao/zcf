# ZCF Test Documentation

This directory contains all test files for the ZCF project. We adopt a layered testing architecture to ensure code quality and maintainability.

## Directory Structure

```
test/
├── unit/              # Unit tests
│   ├── commands/      # Command module tests
│   │   ├── init.test.ts
│   │   ├── init.edge.test.ts
│   │   ├── menu.test.ts
│   │   └── update.test.ts
│   ├── utils/         # Utility function tests
│   │   ├── *.test.ts        # Core functionality tests
│   │   └── *.edge.test.ts   # Edge case tests (optional)
│   ├── cli.test.ts
│   ├── cli-main.test.ts
│   └── cli-setup.test.ts
└── README.md          # This file
```

## Test Layering Strategy

### 1. Core Tests (\*.test.ts)

Every source file must have a corresponding core test file containing:

- **Basic functionality tests**: Verify normal input/output of functions
- **Main business flows**: Cover common usage scenarios
- **Basic error handling**: Handle expected error conditions

Example:

```typescript
describe('configUtils', () => {
  describe('readConfig', () => {
    it('should read valid config file', () => {
      // Test implementation
    })

    it('should return default when file not exists', () => {
      // Test implementation
    })
  })
})
```

### 2. Edge Tests (\*.edge.test.ts)

For complex modules, optionally create edge test files containing:

- **Boundary conditions**: Limit values, null values, special characters, etc.
- **Exception scenarios**: Network errors, permission issues, concurrency problems
- **Error recovery**: State recovery tests after errors

Example:

```typescript
describe('configUtils - Edge Cases', () => {
  describe('Error Handling', () => {
    it('should handle corrupted JSON gracefully', () => {
      // Test implementation
    })

    it('should handle file permission errors', () => {
      // Test implementation
    })
  })
})
```

### 3. Integration Tests (\*.integration.test.ts)

When testing interactions between multiple modules, create integration tests:

- **Inter-module interactions**: Test multiple modules working together
- **End-to-end flows**: Complete business process tests
- **External dependency integration**: Integration with file system, network, etc.

## Test Writing Standards

### 1. File Naming

- Core tests: `<module-name>.test.ts`
- Edge tests: `<module-name>.edge.test.ts`
- Integration tests: `<module-name>.integration.test.ts`

### 2. Test Structure

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('../../../src/utils/fs-operations')

describe('ModuleName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('FunctionName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test'

      // Act
      const result = functionUnderTest(input)

      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

### 3. Mock Usage Principles

- **Isolate external dependencies**: File system, network requests, subprocesses, etc.
- **Keep tests independent**: Each test should run independently
- **Clean Mock state**: Use `beforeEach` to clean up

### 4. Async Tests

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})

it('should handle async errors', async () => {
  await expect(asyncFunction()).rejects.toThrow('Error message')
})
```

## Running Tests

```bash
# Run all tests
pnpm test

# Watch mode (for development)
pnpm vitest

# Run specific file
pnpm vitest utils/config.test.ts

# Run tests matching pattern
pnpm vitest --grep "should handle"

# Generate coverage report
pnpm vitest run --coverage
```

## Coverage Requirements

- **Statement coverage**: Target 90%+
- **Branch coverage**: Target 85%+
- **Function coverage**: Target 90%+
- **Line coverage**: Target 90%+

Current coverage status (needs improvement):

- Lines: ~79%
- Functions: ~86%
- Statements: ~79%
- Branches: ~83%

## Best Practices

1. **Test first**: Write tests before implementing features
2. **Keep it simple**: Each test should verify only one behavior
3. **Clear descriptions**: Test names should clearly explain what is being tested
4. **Avoid duplication**: Use `beforeEach` to extract common setup
5. **Test isolation**: Tests should not depend on each other

## FAQ

### Q: When should I create edge test files?

A: When a module has:

- Complex error handling logic
- Multiple boundary conditions to test
- Core test file is already large (>500 lines)

### Q: How to handle dependencies that are hard to mock?

A: Consider:

- Using dependency injection pattern
- Creating test-specific mock implementations
- Using Vitest's `vi.importActual` for partial mocks

### Q: What if tests run slowly?

A: Optimization tips:

- Check for unnecessary `setTimeout`
- Run independent tests in parallel
- Use `--reporter=dot` to reduce output
- Only run relevant test files

## Contributing Guidelines

1. New features must include corresponding tests
2. Bug fixes should first add a failing test case
3. Ensure tests still pass when refactoring code
4. Run complete test suite before submitting PR

---

For more information, please refer to [CLAUDE.md](../CLAUDE.md#测试规范) in the project root
