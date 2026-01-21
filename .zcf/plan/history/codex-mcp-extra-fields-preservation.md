# Codex MCP Extra Fields Preservation Plan

**Created**: 2025-11-25
**Status**: In Progress
**Priority**: High

## 📋 Task Overview

Fix the issue where Codex configuration updates unexpectedly clear extra MCP configuration fields (e.g., `startup_timeout_sec = 30`).

### Problem Description

Users reported that when updating Codex configurations, additional MCP configuration fields beyond the standard ones managed by ZCF are being cleared. This includes fields like:
- `startup_timeout_sec`
- `retries`
- `max_connections`
- Any custom configuration fields

### Root Cause

The `parseCodexConfig` and `renderCodexConfig` functions only handle known fields:
- `command`
- `args`
- `env`
- `startup_timeout_ms`

Any additional fields are ignored during parsing and not written back during rendering.

## 🎯 Solution Approach

Implement **Type-Safe Extra Fields Support** by:
1. Adding an `extraFields` property to `CodexMcpService` interface
2. Collecting unknown fields during parsing
3. Outputting extra fields during rendering
4. Maintaining backward compatibility

## 📝 Implementation Steps

### Step 1: Enhance Type Definition
**File**: `src/utils/code-tools/codex.ts:42-48`

```typescript
export interface CodexMcpService {
  id: string
  command: string
  args: string[]
  env?: Record<string, string>
  startup_timeout_ms?: number
  // NEW: Preserve all extra configuration fields
  extraFields?: Record<string, any>
}
```

### Step 2: Modify parseCodexConfig Function
**File**: `src/utils/code-tools/codex.ts:268-280`

- Define known fields set
- Collect extra fields during MCP parsing
- Store extra fields in service object

### Step 3: Create TOML Field Formatter
**File**: `src/utils/code-tools/codex.ts` (new helper function)

- Handle string, number, boolean types
- Handle arrays and objects
- Proper TOML escaping and formatting

### Step 4: Modify renderCodexConfig Function
**File**: `src/utils/code-tools/codex.ts:515-547`

- Output known fields first
- Output extra fields using formatter
- Maintain field order and formatting

### Step 5: Write Unit Tests
**File**: `tests/utils/code-tools/codex-extra-fields.test.ts`

Test cases:
- Basic extra field preservation
- Round-trip consistency (parse → render → parse)
- Complex field types (arrays, objects)
- Multiple MCP services with different extra fields

### Step 6: Write Edge Case Tests
**File**: `tests/utils/code-tools/codex-extra-fields.edge.test.ts`

Test cases:
- Empty extra fields (should not add field)
- Special characters handling
- Config update scenarios
- Null/undefined values

### Step 7: Update Documentation
**Files**: `CLAUDE.md`, `README.md`

- Document extra fields support
- Provide usage examples
- Update version history

## ✅ Success Criteria

### Functional
- [ ] All extra fields collected during parsing
- [ ] Extra fields correctly formatted in output
- [ ] Round-trip consistency maintained
- [ ] All TOML types supported

### Testing
- [ ] Unit test coverage ≥ 80%
- [ ] All edge cases covered
- [ ] All tests passing
- [ ] Real config file tested

### Quality
- [ ] TypeScript type checks pass
- [ ] ESLint checks pass
- [ ] Follows KISS/YAGNI/DRY principles
- [ ] Documentation complete

## 🔄 Implementation Progress

- [x] Planning complete
- [ ] Step 1: Type definition
- [ ] Step 2: Parse logic
- [ ] Step 3: Helper function
- [ ] Step 4: Render logic
- [ ] Step 5: Unit tests
- [ ] Step 6: Edge tests
- [ ] Step 7: Documentation

## 📊 Impact Analysis

| Module | Impact | Change Type | Risk |
|--------|--------|-------------|------|
| Type definition | Medium | Add optional field | Low |
| parseCodexConfig | High | Logic enhancement | Medium |
| renderCodexConfig | High | Logic enhancement | Medium |
| Helper function | Low | New function | Low |
| Tests | High | New tests | None |
| Documentation | Low | Content update | None |

## ⚠️ Risk Mitigation

1. **TOML Compatibility**: Use unified formatter with thorough testing
2. **Backward Compatibility**: Optional field, no breaking changes
3. **Performance**: Minimal impact, extra fields typically few

## 🎯 Acceptance Checklist

- [ ] All known fields work as before
- [ ] Extra fields preserved across updates
- [ ] All test cases pass
- [ ] Documentation updated
- [ ] Code review completed
- [ ] User feedback validated
