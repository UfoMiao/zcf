---
title: Version Check
---

# Version Check

`zcf check-updates` is used to detect and update various components in the ZCF toolchain, including ZCF itself, Claude Code, CCR, CCometixLine, Codex, and other tools.

> **Alias**: `zcf check` provides the same command with a shorter name (`npx zcf check -T cx`).

## Command Format

```bash
# Check all tool updates (Claude Code mode)
npx zcf check

# Check Codex related tool updates
npx zcf check -T cx

# Non-interactive mode (auto update, skip confirmation)
npx zcf check -s

# Access through main menu
npx zcf
# Then select +. Check Updates
```

## Parameter Descriptions

| Parameter | Abbreviation | Description | Optional Values | Default |
|------|------|------|--------|--------|
| `--code-type, -T` | `-T` | Specify tool type | `claude-code`, `codex`, `cc`, `cx` | Read from ZCF configuration |
| `--skip-prompt, -s` | `-s` | Skip interactive confirmation (non-interactive mode) | None | No (interactive mode) |

## Tools Checked

### Claude Code Mode

When `-T` is `cc` (or `claude-code`) or not specified, checks the following tools:

1. **CCR (Claude Code Router)**
   - Package name: `@musistudio/claude-code-router`
   - Check method: npm registry

2. **Claude Code CLI**
   - Package name: `@anthropic-ai/claude-code`
   - Check method: npm registry

3. **CCometixLine**
   - Package name: `@cometix/ccline`
   - Check method: npm registry

### Codex Mode

When `-T` is `cx` (or `codex`), checks:

1. **Codex CLI**
   - Check method: Codex official API
   - Update method: Automatically download and install latest version

## Workflow

### 1. Version Check

For each tool, perform the following checks:

1. Detect if tool is installed
2. Get currently installed version number
3. Get latest version number from official source
4. Compare versions and determine if update is needed

### 2. Update Prompt

For tools that need updates, display:

```
🔍 Checking tool updates...

CCR
Current version: 1.2.3
Latest version: 1.3.0
Update needed: Yes

Claude Code
Current version: 2.0.5
Latest version: 2.0.5
Update needed: No

CCometixLine
Current version: 1.0.10
Latest version: 1.0.12
Update needed: Yes
```

### 3. Update Confirmation

In interactive mode, will ask whether to update each tool that needs update:

```
? Update CCR? (Y/n) 
```

In `-s` mode, automatically execute all updates.

### 4. Execute Update

After confirmation, will execute update operation:

1. Display update progress
2. Execute install/update command
3. Verify update result
4. Display update summary

## Usage Scenarios

### Regular Updates

It's recommended to regularly check for updates to get latest features and fixes:

```bash
# Check once per week
npx zcf check
```

### Automated Updates

Use non-interactive mode in CI/CD or automation scripts:

```bash
# Automatically update all tools
npx zcf check -s
```

### Targeted Updates

Only check updates for specific tool types:

```bash
# Only check Codex related tools
npx zcf check -T cx
```

## Update Strategy

### Safe Update Recommendations

1. **Backup Configuration**: Backup current configuration before updating
   ```bash
   # Manual backup
   cp ~/.claude/settings.json ~/.claude/settings.json.backup
   ```

2. **View Changelog**: Understand changes in new version
   - Claude Code: [Official Documentation](https://docs.claude.com)
   - CCR: [GitHub Releases](https://github.com/musistudio/claude-code-router/releases)

3. **Test Environment Verification**: If you have test environment, update in test environment first

### Update Failure Handling

If update fails, ZCF will:

1. Display error information
2. Preserve original version
3. Provide troubleshooting suggestions

Common failure reasons:

- **Network Issues**: npm registry access failure
  ```bash
  # Check network connection
  ping registry.npmjs.org
  ```

- **Permission Issues**: Need sudo permissions (macOS/Linux)
  ```bash
  # Execute with sudo
  sudo npx zcf check
  ```

- **Port Occupied**: Service is running and cannot update
  ```bash
  # Stop service first then update
  ccr stop
  npx zcf check
  ```

## Version Compatibility

### ZCF Version Requirements

- **Node.js**: >= 22
- **npm/pnpm**: Latest version

### Tool Version Compatibility

ZCF will check version compatibility between tools to ensure:

- CCR matches Claude Code version
- CCometixLine is compatible with Claude Code
- Codex CLI is latest stable version

## Usage Recommendations

### Update Frequency

- **Daily Use**: Check once per month
- **Active Development**: Check once every two weeks
- **Production Environment**: Verify in test environment before updating

### Update Timing

It's recommended to check for updates at the following times:

1. When known bugs need fixed version
2. When new features are needed
3. Regular maintenance time
4. Before configuration migration (ensure tools are latest version)

### Post-Update Verification

After update completes, verify tools work normally:

```bash
# Verify Claude Code
claude-code --version

# Verify CCR
ccr status

# Verify CCometixLine (if installed)
ccline --version

# Verify Codex
codex --version
```

## Integration with zcf init

`zcf init`'s backup functionality can automatically backup configuration before updating:

```bash
# Initialize before updating (will backup configuration)
npx zcf init
# Or manually use backup functionality
npx zcf i -s -r backup
```

## Common Questions

### Q: Check updates is slow?

A: 
1. Check network connection
2. npm registry access may be slow, can use domestic mirror:
   ```bash
   npm config set registry https://registry.npmmirror.com
   ```

### Q: Tools cannot be used after update?

A: 
1. Check if tools are correctly installed: `which ccr`
2. View error logs
3. Try reinstall: `npx zcf ccr` (for CCR)

### Q: How to rollback to old version?

A: 
1. View version number before update
2. Manually install specified version:
   ```bash
   npm install -g @musistudio/claude-code-router@1.2.3
   ```

### Q: Don't want to update a certain tool?

A: Select "No" in interactive mode, or disable auto-update in configuration file (if supported).

## Related Documentation

- [CCR Management](ccr.md) - CCR installation and configuration
- [Troubleshooting](../advanced/troubleshooting.md) - Update-related problem troubleshooting
- [Initialization Guide](init.md) - Configuration backup methods

