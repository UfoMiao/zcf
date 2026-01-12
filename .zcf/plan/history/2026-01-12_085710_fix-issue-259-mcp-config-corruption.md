# Fix Issue #259: MCP Configuration Corruption

**Created**: 2026-01-09 19:02:26
**Issue**: https://github.com/UfoMiao/zcf/issues/259
**Branch**: refactor/taplo-toml

## Problem Summary

When configuring Codex API, ZCF inadvertently modifies MCP server configurations by adding `command` and `args` fields to sections that should only contain `url` field (SSE protocol).

**Original Config**:
```toml
[mcp_servers.mcpHub]
url = "http:/xxxx:3010/mcp/codex"
```

**After ZCF Modification** (broken):
```toml
[mcp_servers.mcpHub]
command = "mcpHub"
args = []
url = "http:/xxxx:3010/mcp/codex"
```

## Root Cause

Current code uses `writeCodexConfig` which re-renders the entire TOML file, causing:
1. API modifications to affect MCP configurations
2. MCP configurations to be "polluted" with stdio protocol fields

## Solution

Use `@rainbowatcher/toml-edit-js` for targeted modifications:
- API changes only modify API-related fields
- MCP changes only modify MCP-related fields

## Implementation Steps

### Step 1: Create codex-toml-updater.ts

New utility functions for targeted TOML updates:
- `updateTopLevelApiFields()` - Update model, model_provider
- `upsertProviderSection()` - Add/update provider
- `deleteProviderSection()` - Remove provider
- `upsertMcpSection()` - Add/update MCP service
- `deleteMcpSection()` - Remove MCP service

### Step 2: Modify API Call Sites (8 locations)

| File | Line | Function |
|------|------|----------|
| features.ts | 706 | updateCodexModelProvider |
| codex-provider-manager.ts | 95 | addProviderToExisting |
| codex-provider-manager.ts | 174 | editExistingProvider |
| codex-provider-manager.ts | 271 | deleteProviders |
| codex.ts | 1508 | applyCustomApiConfig |
| codex.ts | 1810 | configureCodexApi |
| codex.ts | 2117 | switchCodexProvider |
| codex.ts | 2171 | switchToOfficialLogin |
| codex.ts | 2240 | switchToProvider |

### Step 3: Modify MCP Call Sites (3 locations)

| File | Line | Function |
|------|------|----------|
| codex-configure.ts | 107 | configureCodexMcp (skipPrompt) |
| codex-configure.ts | 148 | configureCodexMcp (empty) |
| codex-configure.ts | 239 | configureCodexMcp (interactive) |

### Step 4: Verification

- Test API modification doesn't affect MCP config
- Test MCP modification doesn't affect API config
- Test preservation of `url`-type MCP services

## Expected Outcome

After fix, modifying API configuration will NOT touch MCP sections, preserving user's custom MCP configurations including SSE-type services with `url` field.
