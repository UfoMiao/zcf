---
title: Installation Guide
---

# Installation Guide

This guide will help you quickly get started with ZCF, covering the complete process from environment check to verification. Whether you're using it for the first time or want to quickly deploy on a new device, you can complete the setup by following this guide.

> 💡 **Tip**: ZCF requires no installation, just run `npx zcf` directly. This guide mainly covers environment configuration and usage flow.

## Environment Requirements

Before starting, ensure your system meets the following requirements:

| Requirement | Minimum Version | Recommended Version | Description |
|--------|---------|---------|------|
| **Node.js** | 22.x | 22.x or higher | Requires Node.js 22+ |
| **npm** | Installed with Node.js | Latest | Requires `npx` command support |
| **Operating System** | - | - | macOS, Linux, Windows PowerShell/WSL, Termux |

> 💡 **Tip**: If you use WSL (Windows Subsystem for Linux), ZCF will automatically detect the environment and provide corresponding installation prompts.
>
> 🔐 **Linux Users**: On Linux systems, ZCF automatically detects if you're running as a non-root user and will use `sudo` for global npm installations when needed. You may be prompted for your password during installation of Claude Code, Codex, CCR, or CCometixLine.

### Check Environment

Before starting installation, you can run the following commands to check your environment:

```bash
# Check Node.js version
node --version

# Check if npm is available
npm --version

# Check if npx is available
npx --version
```

> ⚠️ **Note**: If your Node.js version is lower than 22, please upgrade Node.js first. You can use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage multiple Node.js versions.

## Usage Methods

ZCF provides two usage methods: **Interactive Use** (suitable for beginners) and **Command Line Direct Use** (suitable for automation and CI/CD).

> 💡 **Tip**: ZCF requires no installation, just use the `npx zcf` command to run.

### Method 1: Interactive Use (Recommended for Beginners)

ZCF provides a friendly interactive menu that allows you to complete all configurations through a graphical interface.

#### Start ZCF

```bash
npx zcf
```

On first run, ZCF will display a welcome screen and ask you which interface language you want to use:

```
ZCF - Zero-Config Code Flow

? Select ZCF display language / 选择ZCF显示语言:
  ❯ 简体中文
    English
```

#### Main Menu Options

After entering the main menu, you'll see the following options:

```
Please select function:
  -------- Claude Code --------
  1. Complete Initialization - Install Claude Code + Import workflows + Configure API or CCR proxy + Configure MCP services
  2. Import Workflows - Only import/update workflow-related files
  3. Configure API - Configure API URL and authentication (supports CCR proxy)
  4. Configure MCP - Configure MCP services (includes Windows fixes)
  5. Configure Default Model - Set default model (opus/sonnet/sonnet 1m/custom)
  6. Configure Claude Global Memory - Configure AI output language and output style
  7. Import Recommended Environment Variables and Permissions - Import privacy protection environment variables and system permission configurations

  --------- Other Tools ----------
  R. CCR - Claude Code Router Management
  U. ccusage - Claude Code Usage Analysis
  L. CCometixLine - High-performance Rust-based status bar tool with Git info and real-time usage tracking

  ------------ ZCF ------------
  0. Change Display Language / Select display language - Change ZCF interface language
  -. Uninstall - Remove Claude Code configuration and tools from system
  +. Check Updates - Check and update versions of Claude Code, CCR, and CCometixLine
  Q. Exit
```

#### Interactive Initialization Flow

When selecting `1` to perform complete initialization, ZCF will guide you through the following steps:

**Step 1: Select Configuration Language**
```
? Select configuration language:
  ❯ English (en) - English version (lower token consumption)
    简体中文 (zh-CN) - Chinese version (convenient for Chinese users to customize)
    日本語 (ja) - Japanese version
```

> 💡 **Selection Recommendations**:
> - **English**: Suitable for scenarios pursuing low token consumption
> - **简体中文**: Suitable for Chinese teams, convenient for customization and maintenance
> - **日本語**: Suitable for Japanese users

**Step 2: Select AI Output Language**
```
? Select AI output language:
  AI will use this language to reply to your questions
  ❯ 简体中文
    English
    日本語
    Custom
```

> 📝 **Note**: AI output language can be different from configuration language. Selecting `Custom` allows you to enter custom language instructions.

**Step 3: Detect and Install Claude Code**
```
? Claude Code not detected, automatically install? (Y/n)
```

If you choose to install, ZCF will prompt you to select an installation method:

```
? Select installation method for Claude Code:
  ❯ npm [Recommended] - Install via npm (works on all platforms)
    homebrew [Recommended] - Install via Homebrew (macOS/Linux)
    curl - Install via curl script (Linux/macOS/WSL)
    powershell - Install via PowerShell script (Windows)
    cmd - Install via CMD script (Windows)
```

> ✅ **Automatic Processing**: 
> - ZCF automatically detects your platform and recommends the best installation method
> - If Claude Code is already installed, ZCF will detect the version and can automatically upgrade to the latest version
> - The installation method is saved for future reference

**Step 4: Handle Existing Configuration**

If existing configuration files are detected:
```
? Existing configuration files detected, how to handle?
  ❯ Backup and Overwrite - Backup existing configuration to ~/.claude/backup/
    Update Documents Only - Only update workflows and documents, keep existing API configuration
    Merge Configuration - Merge with existing configuration, preserve user customizations
    Skip - Skip configuration update
```

> ⚠️ **Important**:
> - **Backup and Overwrite**: Safe option, creates timestamped backup
> - **Update Documents Only**: Suitable for scenarios where you only want to update workflow templates
> - **Merge Configuration**: Preserves your custom configuration, intelligently merges new content

**Step 5: Configure API**
```
? Select API authentication method
  ❯ Use Official Login
    Use Auth Token (OAuth authentication)
    Use API Key (Key authentication)
    Configure CCR Proxy (Claude Code Router)
    Skip (configure manually later)
```

> 💡 **Recommendations**:
> - **Official Login**: Simplest, no API Key configuration needed
> - **API Key**: Suitable for using third-party API providers (like 302.AI, GLM)
> - **CCR Proxy**: Suitable for scenarios requiring multiple model routing

**Steps 6-9**: Select output style, workflows, MCP services, and CCometixLine (optional) in sequence

After initialization is complete, you'll see:
```
✔ Configuration complete! Claude Code environment is ready
🎉 Configuration complete! Use 'claude' command to start.
```

### Method 2: Command Line Direct Use (Recommended for Automation)

Suitable for CI/CD and automation scenarios, use `--skip-prompt` (or `-s`) with parameters to complete configuration.

> 🚀 **Applicable Scenarios**:
> - Automatic configuration in CI/CD pipelines
> - Batch deployment to multiple machines
> - Script automation initialization
> - Docker container initialization

#### Using API Provider Presets (Simplest)

ZCF supports API provider presets, which can simplify configuration from 5+ parameters to just 2:

```bash
# Use 302.AI provider (recommended)
npx zcf i -s -p 302ai -k "sk-xxx"

# Other providers
npx zcf i -s -p glm -k "sk-xxx"        # GLM
npx zcf i -s -p minimax -k "sk-xxx"    # MiniMax
npx zcf i -s -p kimi -k "sk-xxx"       # Kimi
```

> ✅ **Advantages**: Presets automatically configure baseUrl, authentication method, and default model, greatly simplifying the configuration process.

#### Custom Configuration

If you need to use a custom API endpoint:

```bash
# Manually specify all parameters
npx zcf i -s -g zh-CN -t api_key -k "sk-xxx" -u "https://api.example.com"

# Configure both primary and fast models
npx zcf i -s -p 302ai -k "sk-xxx" \
  --api-model "claude-sonnet-4-5" \
  --api-fast-model "claude-haiku-4-5"

# Specify output styles and workflows
npx zcf i -s -p 302ai -k "sk-xxx" \
  --output-styles engineer-professional,nekomata-engineer \
  --workflows commonTools,sixStepsWorkflow \
  --default-output-style engineer-professional
```

#### Multiple API Configuration

ZCF supports configuring multiple APIs for easy switching in different scenarios:

```bash
# Configure multiple APIs using JSON string
npx zcf i -s --api-configs '[
  {"provider":"302ai","key":"sk-xxx"},
  {"provider":"glm","key":"sk-yyy"},
  {"name":"custom","type":"api_key","key":"sk-zzz","url":"https://custom.api.com","primaryModel":"claude-sonnet-4-5","fastModel":"claude-haiku-4-5","default":true}
]'

# Use JSON file configuration (suitable for complex multi-configuration scenarios)
npx zcf i -s --api-configs-file ./api-configs.json
```

`api-configs.json` file example:

```json
[
  {
    "provider": "302ai",
    "key": "sk-xxx"
  },
  {
    "name": "custom",
    "type": "api_key",
    "key": "sk-yyy",
    "url": "https://custom.api.com",
    "primaryModel": "claude-sonnet-4-5",
    "fastModel": "claude-haiku-4-5",
    "default": true
  }
]
```

#### Common Parameters Quick Reference

| Parameter | Abbreviation | Description | Common Values |
|------|------|------|--------|
| `--skip-prompt` | `-s` | Skip all interactive prompts | - |
| `--provider` | `-p` | API provider preset | `302ai`, `glm`, `minimax`, `kimi` |
| `--api-key` | `-k` | API key | Your API Key |
| `--all-lang` | `-g` | Set all language parameters uniformly | `zh-CN`, `en` |
| `--workflows` | `-w` | Workflows to install | `all`, `skip` or comma-separated list |
| `--mcp-services` | `-m` | MCP services to install | `all`, `skip` or comma-separated list |
| `--code-type` | `-T` | Target code tool type | `claude-code`, `codex`, `cc`, `cx` |

> 📖 **Complete Parameter List**: For detailed parameter descriptions, please refer to the [CLI Commands - zcf init](../cli/init.md) chapter.

## Codex Support

ZCF provides complete Codex support, allowing you to manage both Claude Code and Codex environments in the same tool.

### Switch to Codex Mode

```bash
# Method 1: Command line direct initialization
npx zcf i -s -T codex -p 302ai -k "sk-xxx"

# Method 2: Through interactive menu
npx zcf → Select S (Switch Tool) → Select 1 (Complete Initialization)
```

### Codex Configuration Features

- **Configuration File**: `~/.codex/config.toml` (TOML format)
- **Workflow Location**: `~/.codex/prompts/`
- **System Prompt**: `~/.codex/AGENTS.md`
- **Shared MCP**: Uses the same MCP service configuration as Claude Code

> 💡 **Tip**: Codex and Claude Code share the same workflow templates and MCP services, ensuring a consistent development experience.

## Cross-Platform Support

ZCF fully supports cross-platform operation, including Windows, macOS, Linux, WSL, and Termux.

### Windows Platform

- **Auto Detection**: Automatically uses compatible `cmd /c npx` format on Windows systems
- **Configuration Fix**: Existing incorrect configurations will be automatically fixed during updates
- **Zero Configuration**: Windows users need no additional operations, consistent with macOS/Linux experience

> ⚠️ **Note**: If you encounter MCP connection issues on Windows, running `npx zcf` will automatically fix the configuration format.

### WSL Support (v2.12.12+)

- **Smart Detection**: Multi-level WSL environment detection through environment variables, system files, and mount points
- **Distribution Recognition**: Automatically recognizes WSL distribution (Ubuntu, Debian, etc.) to optimize configuration
- **Seamless Installation**: Provides native Linux-style installation experience in WSL environment

### Termux Support (v2.1+)

- **Auto Adaptation**: Automatically detects Termux environment and uses compatible configuration
- **Enhanced Detection**: Intelligently recognizes available commands to ensure normal operation in restricted environments
- **Full Functionality**: Enjoy the same complete functionality in Termux as on desktop systems

> 📱 **Tip**: In Termux, ZCF will automatically recognize special path structures and correctly install dependencies.

## Verify Installation

After installation is complete, follow these steps to verify that the environment is configured correctly:

### 1. Verify CLI Availability

```bash
# Check if ZCF command is available
npx zcf --help

# Check version information
npx zcf --version
```

### 2. Verify Workflows

According to the tool used, try the following commands in the command palette:

**Claude Code:**
```
/zcf:workflow  # Six-stage development workflow
/zcf:feat      # Feature development workflow
/git-commit    # Git commit command
/init-project  # Project initialization
```

**Codex:**
```
/prompts:workflow  # Six-stage development workflow
/prompts:git-commit    # Git commit command
/prompts:git-rollback  # Git rollback command
/prompts:git-cleanBranches  # Clean merged branches
/prompts:git-worktree  # Git worktree management
```

> ⚠️ **Note**: Codex currently only supports six-stage workflow and Git workflows. Feature development workflow (feat), project initialization (init-project), and BMad workflow are not yet available in Codex.

> ✅ **Success Indicator**: If commands can execute normally and display the workflow interface, the workflow import was successful.
> 
> 💡 **Tip**: Codex uses `/prompts:` prefix, while Claude Code uses `/zcf:` or direct `/` prefix.

### 3. Verify MCP Services

In the Claude Code/Codex MCP panel, confirm whether the following services are enabled:

- ✅ Context7 - Document query service
- ✅ open-websearch - Web search
- ✅ spec-workflow - Spec workflow
- ✅ mcp-deepwiki - GitHub documentation
- ✅ Playwright - Browser control
- ✅ serena - Semantic code search

Test service functionality:
```
Please query the latest documentation for React useState hook
```
If Context7 is working properly, AI will use the latest documentation to answer.

> 🔧 **Troubleshooting**: If services are not connected, run `npx zcf` → `4` to reconfigure MCP services.

### 4. Verify API Connection

```bash
# View usage statistics (if using official API)
npx zcf ccu

# Check CCR status (if using CCR proxy)
npx zcf ccr
```

### 5. Verify Output Style

Test if AI output style is effective:
```
Please explain the SOLID principles
```

Switch output style (in project):
```
/output-style engineer-professional  # Switch to professional engineer
/output-style nekomata-engineer      # Switch to nekomata engineer
```

## Real-World Scenario Examples

### Scenario: Quick Deployment on New Device

Here's a complete deployment script example:

```bash
#!/bin/bash

# 1. Initialize Claude Code
npx zcf i -s -p 302ai -k "$API_KEY" \
  --output-styles engineer-professional \
  --workflows all \
  --mcp-services all

# 2. Verify installation
npx zcf --version

# 3. View configuration location
echo "Claude Code configuration: ~/.claude/"
echo "Backup location: ~/.claude/backup/"
```

### Scenario: Update Workflows

If already initialized, just update workflows and templates:

```bash
npx zcf update -g zh-CN
```

> 📖 **Note**: `zcf update` will preserve your existing API configuration and MCP settings by default, only updating workflow templates and documents.

### Scenario: Configure CCR Proxy

If you need to use CCR (Claude Code Router) proxy:

```bash
npx zcf ccr
```

After entering the CCR management menu, you can choose:
- `1` Initialize CCR - Install and configure CCR
- `2` Start UI - Start CCR Web interface
- `3` Service Control - Start/Stop/Restart CCR service
- `4` Check Status - View current CCR service status

> 💡 **CCR Advantages**:
> - Supports multiple AI model routing
> - Cost optimization (select appropriate model for different tasks)
> - Free model access (Gemini, DeepSeek, etc.)

## Common Questions

### Q: Can't find workflows after initialization?

**A**: Check the following locations:
- Claude Code: `~/.claude/workflows/`
- Codex: `~/.codex/prompts/`

If files don't exist, run `npx zcf update` to re-import.

### Q: MCP service connection failed?

**A**: 
1. Check MCP service configuration: `npx zcf` → `4`
2. Confirm services are installed (most are automatically installed via npm)
3. For Exa, ensure `EXA_API_KEY` environment variable is set

### Q: How to switch API configuration?

**A**: Use the config switch command:
```bash
npx zcf config-switch --list  # List all configurations
npx zcf cs provider-name      # Switch to specified configuration
```

### Q: Where are configuration files saved?

**A**: 
- **ZCF Configuration**: `~/.ufomiao/zcf/config.toml`
- **Claude Code Configuration**: `~/.claude/settings.json` and `~/.claude/CLAUDE.md`
- **Codex Configuration**: `~/.codex/config.toml` and `~/.codex/AGENTS.md`
- **Backup Location**: `~/.claude/backup/` and `~/.codex/backup/`

## Next Steps

After completing the quick start, we recommend:

1. 🎯 Explore [Features](../features/) to understand ZCF's complete capabilities
2. 📚 Deep dive into [Workflow Details](../workflows/) to master various workflows
3. ⚙️ Refer to [Configuration Management](../advanced/configuration.md) for personalized settings
4. 🔧 Check [CLI Commands](../cli/) to master all available commands
