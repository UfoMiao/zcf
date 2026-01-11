# CCometixLine StatusLine Configuration Implementation Plan

## Context
Task: 安装完ccometixline后还需要在~/.claude/setting.json里加配置字段

Required configurations:
- Linux/macOS: `~/.claude/ccline/ccline`
- Windows: `%USERPROFILE%\.claude\ccline\ccline.exe`

## Solution Approach
Method: Extend existing configuration template with TDD development

## TDD Implementation Plan

### Phase 1: Type Definitions
- Extend `src/types/config.ts` with StatusLineConfig interface
- Update ClaudeSettings interface to include statusLine field
- Ensure backward compatibility

### Phase 2: Test-Driven Development Core
#### 2.1 Write Failing Tests (Red)
```typescript
// tests/config/statusline.test.ts
- should merge statusLine config correctly
- should preserve existing statusLine config  
- should handle platform-specific paths
- should validate statusLine configuration
```

#### 2.2 Update Configuration Template (Green)
```json
// templates/settings.json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/ccline/ccline",
    "padding": 0
  }
}
```

#### 2.3 Verify Tests Pass
- Run test suite to ensure all test cases pass
- Validate configuration merging logic

### Phase 3: Configuration Function Enhancement
#### 3.1 Write Configuration Feature Tests (Red)
- should add statusLine config to existing settings
- should not overwrite user's custom statusLine
- should handle missing statusLine gracefully

#### 3.2 Implement Configuration Feature (Green)  
- Extend `src/utils/config.ts` with statusLine handling
- Ensure compatibility with existing mergeSettingsFile

#### 3.3 Refactor & Optimize
- Extract common logic
- Optimize code structure

### Phase 4: Platform Detection & Validation
#### 4.1 Write Platform Detection Tests (Red)
- should detect Windows platform correctly
- should detect Unix-like platforms correctly  
- should return correct statusLine config for platform

#### 4.2 Implement Platform Detection (Green)
- Optional: Add platform-specific configuration suggestions
- Ensure cross-platform compatibility

### Phase 5: Integration Testing & Documentation
#### 5.1 End-to-End Testing
- Complete configuration flow testing
- Simulate real usage scenarios

#### 5.2 Documentation Updates
- Update README with CCometixLine configuration instructions
- Add configuration examples

## Detailed Implementation Steps

### Step 1: Type Definitions (2 min)
File: `src/types/config.ts`
Add StatusLineConfig interface and extend ClaudeSettings

### Step 2: Write Test Cases (5 min)  
File: `tests/config/statusline.test.ts`
Create comprehensive test suite for statusLine functionality

### Step 3: Update Configuration Template (3 min)
File: `templates/settings.json`
Add statusLine configuration with cross-platform comments

### Step 4: Implement Configuration Logic (5 min)
Ensure mergeSettingsFile handles statusLine field correctly
Add configuration validation functions

### Step 5: Integration Testing (3 min)
Run complete test suite and verify functionality

### Step 6: Documentation Updates (2 min)
Add configuration instructions and usage examples

## Expected Results

Upon completion:
1. **Type Safety**: Complete TypeScript interface definitions
2. **Configuration Support**: templates/settings.json includes statusLine config
3. **Smart Merging**: Existing config system automatically handles statusLine field
4. **Platform Compatibility**: Support for Windows and Unix-like path formats
5. **Test Coverage**: Complete unit and integration tests
6. **Documentation**: Clear configuration guidance

## Files to be Modified/Created
- `src/types/config.ts` (extend)
- `templates/settings.json` (extend)  
- `tests/config/statusline.test.ts` (create)
- `tests/utils/platform.test.ts` (extend)
- `src/utils/config.ts` (extend if needed)
- Documentation files (update)

## Quality Gates
- All tests must pass
- Type checking must pass
- Configuration merging must preserve user settings
- Cross-platform compatibility verified
- Documentation updated with examples

Generated at: 2025-01-17