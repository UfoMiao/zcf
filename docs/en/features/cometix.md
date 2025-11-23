---
title: CCometixLine Status Bar
---

# CCometixLine Status Bar

CCometixLine is a high-performance Rust-based terminal/IDE status bar plugin. ZCF supports fully automatic installation, configuration, and updates. It can display Git branch information, file change status, Claude Code / Codex usage statistics, and other key information in real-time.

## What is CCometixLine

CCometixLine is a high-performance Rust-based statusline tool that provides real-time status information display for Claude Code. It can:

- 📊 **Git Integration**: Display branch, status, and tracking info
- 🎯 **Model Display**: Display simplified Claude model names
- 📈 **Usage Tracking**: Usage tracking based on transcript analysis
- 📁 **Directory Display**: Display current workspace
- 🎨 **Interactive TUI**: Interactive configuration interface with real-time preview
- 🌈 **Theme System**: Multiple built-in preset themes
- ⚡ **High Performance**: Developed with Rust, low resource usage, fast response
- 🔧 **Claude Code Enhancement**: Provides context warning disabler and verbose mode enabler

## Installation Process

### Automatic Installation

ZCF automatically installs CCometixLine during initialization:

```bash
# Complete initialization (includes CCometixLine installation by default)
npx zcf init

# Or select initialization in interactive menu
npx zcf
```

> 💡 **Tip**: `zcf init` enables `--install-cometix-line true` by default. If you don't need installation, explicitly pass `false`.

### Manual Management

Enter `L` in the main menu to enter CCometixLine management interface:

```bash
npx zcf
# Then enter L
```

Management features include:

- 🔄 **Upgrade**: Check and update to latest version
- 🗑️ **Uninstall**: Completely remove CCometixLine
- ⚙️ **Configure**: Modify status bar display format and options
- 📊 **Status View**: View current installation status and version information

## Feature Highlights

### Git Information Display

CCometixLine can display the following Git-related information in real-time:

- **Branch Name**: Current Git branch
- **Change Statistics**: Count of modified, staged, untracked files
- **Sync Status**: Sync status with remote branch (ahead/behind/synced)
- **Commit Information**: Brief information of the most recent commit (optional)

### Usage Statistics Integration

Consistent with `ccusage` tool data, displays:

- 📊 Current session Token usage
- 💰 Cumulative usage cost (if cost calculation is configured)
- 📈 Usage trends and statistics

### Workflow Status Prompts

Display corresponding status information based on different workflow stages:

- **Six-Stage Workflow**: Display current stage (Research→Ideation→Planning→Execution→Optimization→Review)
- **Git Workflow**: Display current Git operation status
- **Feature Development Workflow**: Display development progress and task status

## Configuration Management

### Configuration File Location

CCometixLine configuration is saved in:

- **Configuration File**: `~/.claude/ccline/config.toml`
- **Theme Files**: `~/.claude/ccline/themes/*.toml`
- **Claude Code Integration**: Configuration is written to the `statusLine` field in Claude Code's `settings.json`

### Configuration Management

```bash
# Initialize configuration file
ccline --init

# Check configuration validity
ccline --check

# Print current configuration
ccline --print

# Enter TUI configuration mode (interactive configuration interface)
ccline --config
```

### Theme Configuration

CCometixLine supports multiple built-in themes:

```bash
# Temporarily use specific theme (overrides config file)
ccline --theme cometix
ccline --theme minimal
ccline --theme gruvbox
ccline --theme nord
ccline --theme powerline-dark

# Or use custom theme files
ccline --theme my-custom-theme
```

### Claude Code Enhancement

CCometixLine provides Claude Code enhancement features:

```bash
# Disable context warnings and enable verbose mode
ccline --patch /path/to/claude-code/cli.js

# Example for common installation
ccline --patch ~/.local/share/fnm/node-versions/v24.4.1/installation/lib/node_modules/@anthropic-ai/claude-code/cli.js
```

### Configurable Segments

All segments are configurable, including:

- **Directory**: Directory display
- **Git**: Git information display
- **Model**: Model display
- **Usage**: Usage statistics
- **Time**: Time display
- **Cost**: Cost display
- **OutputStyle**: Output style display

Each segment supports enable/disable toggle, custom separators and icons, color customization, and format options.

## Platform Support

CCometixLine supports cross-platform installation:

- ✅ **macOS**: Install globally via npm
- ✅ **Linux**: Install globally via npm
- ✅ **Windows**: Install globally via npm (requires Node.js environment)
- ✅ **WSL**: Run in WSL environment

The installation process automatically detects the platform and selects the appropriate build method.

## Version Management

### Check Version

```bash
# Check through ZCF menu
npx zcf → Select L → View version information

# Or run directly
ccline --version
```

### Automatic Updates

ZCF automatically checks CCometixLine version during initialization or updates:

```bash
# Use check-updates command to check and update
npx zcf check-updates

# Or select in menu
npx zcf → Select + Check Updates
```

### Manual Update

```bash
# Update via npm
npm update -g @cometix/ccline

# Or through ZCF menu
npx zcf → Select L → Upgrade
```

## Troubleshooting

### Installation Failure

If you encounter problems during installation:

1. **Check Node.js Version**: Ensure Node.js version >= 18
2. **Check Network Connection**: Ensure npm registry is accessible
3. **Permission Issues**: May need to use `sudo` (macOS/Linux) or run as administrator (Windows)

```bash
# macOS/Linux use sudo
sudo npm install -g @cometix/ccline

# Or use npx (recommended)
npx @cometix/ccline
```

### Status Bar Not Displaying

If the status bar is not displaying normally:

1. **Check Configuration**: Confirm Claude Code `settings.json` contains `statusLine` configuration
2. **Restart Claude Code**: Restart the application to load new configuration
3. **Check Command Path**: Confirm `ccline` command is in system PATH

```bash
# Check if command is available
which ccline

# View configuration
ccline --print
```

### Performance Issues

If the status bar responds slowly:

1. **Adjust Update Interval**: Increase update interval time, reduce refresh frequency
2. **Disable Some Features**: Turn off unneeded features (like timestamp, detailed statistics)
3. **Check System Resources**: Confirm system resources are sufficient

## Best Practices

### Recommended Configuration

For most users, it's recommended to use default configuration:

```json
{
  "statusLine": {
    "command": "ccline",
    "args": ["--format", "default"]
  }
}
```

### Team Collaboration

In team environments:

1. **Unified Configuration**: Unify CCometixLine configuration format within the team
2. **Version Sync**: Regularly update to latest version to maintain consistent functionality
3. **Document Sharing**: Write configuration into project documentation for easy onboarding of new members

### Performance Optimization

- If the project is very large (thousands of files), you can turn off Git file statistics
- For scenarios with frequent branch switching, you can increase update interval
- In CI/CD environments, it's recommended to disable status bar to reduce resource consumption

## Installation

### Quick Install (Recommended)

Install via npm (works on all platforms):

```bash
# Install globally
npm install -g @cometix/ccline

# Or using yarn
yarn global add @cometix/ccline

# Or using pnpm
pnpm add -g @cometix/ccline
```

Use npm mirror for faster download:

```bash
npm install -g @cometix/ccline --registry https://registry.npmmirror.com
```

### Claude Code Configuration

Add to your Claude Code `settings.json`:

**Linux/macOS:**

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/ccline/ccline",
    "padding": 0
  }
}
```

**Windows:**

```json
{
  "statusLine": {
    "type": "command",
    "command": "%USERPROFILE%\\.claude\\ccline\\ccline.exe",
    "padding": 0
  }
}
```

**Fallback (npm installation):**

```json
{
  "statusLine": {
    "type": "command",
    "command": "ccline",
    "padding": 0
  }
}
```

### Update

```bash
npm update -g @cometix/ccline
```

## Default Segments

Displays: `Directory | Git Branch Status | Model | Context Window`

### Git Status Indicators

- Branch name with Nerd Font icon
- Status: `✓` Clean, `●` Dirty, `⚠` Conflicts
- Remote tracking: `↑n` Ahead, `↓n` Behind

### Model Display

Shows simplified Claude model names:

- `claude-3-5-sonnet` → `Sonnet 3.5`
- `claude-4-sonnet` → `Sonnet 4`

### Context Window Display

Token usage percentage based on transcript analysis with context limit tracking.

## Requirements

- **Git**: Version 1.5+ (Git 2.22+ recommended for better branch detection)
- **Terminal**: Must support Nerd Fonts for proper icon display
  - Install a [Nerd Font](https://www.nerdfonts.com/) (e.g., FiraCode Nerd Font, JetBrains Mono Nerd Font)
  - Configure your terminal to use the Nerd Font
- **Claude Code**: For statusline integration

## Related Resources

- **GitHub Repository**: [Haleclipse/CCometixLine](https://github.com/Haleclipse/CCometixLine)
- **Documentation**: View CCometixLine official documentation for more information
- **Issue Reporting**: If you encounter problems, you can report them in GitHub Issues

## Integration with Other Tools

CCometixLine can seamlessly integrate with the following ZCF tools:

- **ccusage**: Share usage statistics data
- **CCR**: Display proxy routing status (if configured)
- **Workflows**: Display corresponding information based on workflow status

> 💡 **Tip**: CCometixLine is an important part of the ZCF ecosystem. It's recommended to install it together during initialization for a complete status monitoring experience.


