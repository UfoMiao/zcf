---
title: Main Menu
---

# Main Menu

Running `npx zcf` enters the interactive menu system. The menu is ZCF's core interactive interface, providing visual operation options without needing to remember complex command parameters.

## Menu Features

- 🎯 **Dynamic Display**: Dynamically adjust menu items based on current code tool (Claude Code or Codex)
- ⌨️ **Shortcut Operations**: Execute operations by entering a single character, no need to remember commands
- 🔄 **Smart Switching**: Seamlessly switch between Claude Code and Codex
- 📋 **Feature Aggregation**: All common features are centralized in the menu for quick access

## Claude Code Mode Menu

| Option | Function | Corresponding Command | Description |
|------|------|---------|------|
| `1` | Complete Initialization | `zcf init` | Complete Claude Code environment initialization |
| `2` | Import/Update Workflows | `zcf update` | Update workflow templates and prompts |
| `3` | Configure API or CCR | - | Configure API keys, providers, or CCR proxy |
| `4` | Configure MCP Services | - | Install and configure MCP services |
| `5` | Configure Default Model | - | Set default Claude model to use |
| `6` | Configure AI Memory & Output Style | - | Set AI output language and global output style |
| `7` | Import Recommended Environment Variables & Permissions | - | Configure environment variables and file system permissions |
| `R` | CCR Management Menu | `zcf ccr` | Claude Code Router management |
| `U` | Claude Code Usage Analysis | `zcf ccu` | View API usage statistics |
| `L` | CCometixLine Management | - | Status bar tool management |
| `0` | Switch Script Language | - | Switch CLI interface language (zh-CN/en) |
| `S` | Switch Code Tool | - | Switch between Claude Code ↔ Codex |
| `-` | Uninstall Current Tool Configuration | `zcf uninstall` | Uninstall Claude Code configuration |
| `+` | Check Updates | `zcf check-updates` | Check tool versions and update |
| `Q` | Exit | - | Exit menu |

## Codex Mode Menu

The menu in Codex mode adjusts to Codex corresponding operations:

- `1` - Codex Complete Initialization
- `2` - Update Codex Workflows and Templates
- `3` - Configure Codex API Provider or MCP
- `4` - Configure Codex MCP Services
- `S` - Switch back to Claude Code
- Other options remain the same

> 💡 **Tip**: In Codex mode, menu functions automatically adapt to Codex configuration methods, but you can still switch back to Claude Code anytime via `S`.

## Usage Tips

### 1. Quick Operations

The menu supports quick input without confirmation key:

```bash
npx zcf
# Enter 1 then Enter, directly enter complete initialization
# Enter R then Enter, directly enter CCR management
```

### 2. Error Handling

If invalid characters are entered, CLI will prompt to re-enter:

```bash
npx zcf
# Enter X (invalid option)
# CLI prompts: Invalid option, please re-enter
```

### 3. Menu Navigation

You can quickly navigate in the menu:

- Enter option character to execute directly
- Enter `Q` anytime to exit menu
- Use `S` to switch between tools

### 4. Language Switching

Enter `0` in the main menu to switch CLI language:

```bash
npx zcf
# Enter 0
# Select language: zh-CN or en
# Menu will redisplay after language switch
```

### 5. Tool Switching

Use `S` to switch between Claude Code and Codex:

```bash
npx zcf
# Current mode: Claude Code
# Enter S
# Switch to: Codex mode
# Menu items automatically adjust to Codex corresponding operations
```

## Menu Function Details

### Complete Initialization (Option 1)

Equivalent to running `npx zcf init`, will guide you through:

- Select code tool type
- Configure API (official login/API Key/CCR proxy)
- Select MCP services
- Select workflows
- Select output styles
- Configure language options

### Import/Update Workflows (Option 2)

Equivalent to running `npx zcf update`, will:

- Update workflow templates
- Update prompt content
- Check tool versions
- Select template language

### Configure API or CCR (Option 3)

Provides the following configuration options:

- Configure API Key (custom endpoint)
- Use API provider presets (302.AI, GLM, etc.)
- Configure CCR proxy
- Switch back to official login

### Configure MCP Services (Option 4)

Manage MCP services:

- Install new MCP services
- Remove unneeded services
- Update service configuration
- Check service status

### Configure Default Model (Option 5)

Set default Claude model to use:

- Auto Select (Claude Code automatically selects best model)
- Opus (high token consumption, use with caution)
- Sonnet 1M (large context window)
- Custom (specify primary and fast models)

### Configure AI Memory & Output Style (Option 6)

Manage AI behavior:

- Set AI output language
- Switch global output style
- Edit output style content
- Manage project memory

### Import Recommended Environment Variables & Permissions (Option 7)

Configure development environment:

- Import environment variable templates
- Configure file system permissions
- Set recommended working directory permissions

### CCR Management Menu (Option R)

Enter CCR dedicated management interface:

- Initialize/Install CCR
- Start/Stop/Restart CCR service
- Open CCR Web UI
- View CCR status
- Configure routing rules

### Claude Code Usage Analysis (Option U)

View API usage statistics:

- Token usage
- Cost statistics
- Usage trends
- Export JSON data

### CCometixLine Management (Option L)

Manage status bar tool:

- Install/Upgrade CCometixLine
- Uninstall CCometixLine
- Configure status bar format
- View version information

### Check Updates (Option +)

Check and update tools:

- Check Claude Code version
- Check CCR version
- Check CCometixLine version
- Automatically update available versions

### Uninstall Current Tool Configuration (Option -)

Safely uninstall configuration:

- Complete uninstall of all configurations
- Custom uninstall of specific components
- Backup preservation options

## Menu Implementation

The menu system is implemented in `src/commands/menu.ts`. All menu option corresponding functions can be viewed in that file.

### Menu Flow

1. **Display Menu**: Display corresponding menu based on current tool type
2. **Wait for Input**: Wait for user to enter option character
3. **Execute Operation**: Call corresponding handler function
4. **Return to Menu**: Return to main menu after operation completes (unless exiting)

### Custom Menu

If you need to customize the menu, you can:

1. View `src/commands/menu.ts` to understand menu structure
2. Add new menu options
3. Implement corresponding handler functions
4. Rebuild the project

## Best Practices

### 1. First-Time Use

When using ZCF for the first time, it's recommended to start from the menu:

```bash
npx zcf
# Select 1 (Complete Initialization)
# Complete configuration according to prompts
```

### 2. Daily Operations

In daily use, you can directly use commands or through menu:

```bash
# Quick update workflows
npx zcf update

# Or through menu
npx zcf
# Select 2
```

### 3. Explore Features

When unfamiliar with commands, use menu to explore features:

```bash
npx zcf
# Browse all available options
# Try different features
```

### 4. Team Training

In team training, the menu can help new members get started quickly:

- All features are visible in the menu
- No need to remember complex commands
- Interactive guidance is more friendly

## Troubleshooting

### Menu Cannot Display

If the menu cannot display normally:

```bash
# 1. Check Node.js version
node --version  # Requires >= 18

# 2. Check terminal support
# Ensure terminal supports ANSI color codes

# 3. Use commands directly
npx zcf init
```

### Menu Option No Response

If menu option has no response after selection:

```bash
# 1. Check configuration permissions
ls -la ~/.ufomiao/zcf/

# 2. View detailed errors
npx zcf --verbose

# 3. Reinitialize configuration
npx zcf init --config-action new
```

### Tool Switch Failed

If `S` option fails to switch tools:

```bash
# 1. Check configuration file
cat ~/.ufomiao/zcf/config.toml | grep codeToolType

# 2. Manually switch
npx zcf init -T codex  # Switch to Codex
npx zcf init -T claude-code  # Switch to Claude Code
```

## Related Resources

- [zcf init](init.md) - Detailed complete initialization command
- [zcf update](update.md) - Detailed update command
- [Quick Start](../getting-started/installation.md) - Installation and usage guide

> 💡 **Tip**: The menu is ZCF's most user-friendly way to use, especially suitable for users unfamiliar with command line. It's recommended to complete configuration through the menu on first use, and after familiarizing yourself, you can combine direct commands to improve efficiency.


