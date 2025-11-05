---
title: zcf init
---

# zcf init

`zcf init` (abbreviation `zcf i`) is ZCF's core command for complete initialization of Claude Code or Codex environment. It automatically installs necessary tools, configures API, sets up MCP services, imports workflows and output styles, etc.

## Feature Overview

The `zcf init` command performs the following operations:

1. 📦 **Install Code Tools**: Automatically detect and install Claude Code or Codex CLI
2. 🔑 **Configure API**: Set API keys, authentication methods, models, etc.
3. 🔌 **Configure MCP Services**: Install and configure selected MCP services
4. 📋 **Import Workflows**: Install structured development workflow templates
5. 🎨 **Configure Output Styles**: Set AI output styles and system prompts
6. 🌐 **Language Configuration**: Set template language and AI output language
7. 📊 **Install Status Bar**: Optionally install CCometixLine status bar tool
8. 💾 **Create Backup**: Automatically create backup before modifying configuration

## Basic Usage

### Interactive Mode (Recommended)

```bash
# Open interactive initialization wizard
npx zcf init

# Or use abbreviation
npx zcf i

# Or through main menu
npx zcf
# Then select 1 (Complete Initialization)
```

In interactive mode, ZCF will guide you step by step:

1. Select code tool type (Claude Code or Codex)
2. Select configuration handling method (if configuration exists)
3. Configure API (official login, custom API, CCR proxy, or skip)
4. Select MCP services
5. Select workflows
6. Select output styles
7. Configure language options

### Non-Interactive Mode

Suitable for automation scripts, CI/CD, or batch deployment:

```bash
# Use API provider preset (simplest)
npx zcf i -s -p 302ai -k "sk-xxx"

# Complete parameter example
npx zcf i -s \
  --provider 302ai \
  --api-key "sk-xxx" \
  --code-type claude-code \
  --all-lang zh-CN \
  --mcp-services all \
  --workflows all \
  --output-styles all \
  --default-output-style engineer-professional
```

## Common Parameters

### Language Parameters

| Parameter | Abbreviation | Description | Optional Values | Default |
|------|------|------|--------|--------|
| `--all-lang, -g` | `-g` | Set all language parameters uniformly | `zh-CN`, `en`, custom string | User preference or `en` |
| `--lang, -l` | `-l` | ZCF interface display language | `zh-CN`, `en` | User preference or `en` |
| `--config-lang, -c` | `-c` | Template file language | `zh-CN`, `en` | `en` |
| `--ai-output-lang, -a` | `-a` | AI assistant output language | `zh-CN`, `en`, custom string | `en` |

> 💡 **Tip**: Using `--all-lang` can set all language parameters at once, which is the most convenient way.

**Language Parameter Priority** (from high to low):
1. `--all-lang` 
2. `--lang` / `--config-lang` / `--ai-output-lang`
3. User saved preferences
4. Interactive prompts

### Code Tool Type

| Parameter | Abbreviation | Description | Optional Values |
|------|------|------|--------|
| `--code-type, -T` | `-T` | Target code tool type | `claude-code`, `codex`, `cc`, `cx` |

```bash
# Initialize Claude Code (default)
npx zcf i

# Initialize Codex
npx zcf i -T codex

# Use abbreviation
npx zcf i -T cx
```

### API Configuration Parameters

#### API Provider Presets (Recommended)

ZCF supports API provider presets, which can greatly simplify configuration:

| Parameter | Abbreviation | Description | Supported Providers |
|------|------|------|------------|
| `--provider, -p` | `-p` | API provider preset | `302ai`, `glm`, `minimax`, `kimi`, `custom` |

```bash
# Use 302.AI provider
npx zcf i -s -p 302ai -k "sk-xxx"

# Use GLM provider
npx zcf i -s -p glm -k "sk-xxx"

# Use MiniMax provider
npx zcf i -s -p minimax -k "sk-xxx"

# Use Kimi provider
npx zcf i -s -p kimi -k "sk-xxx"

# Use custom provider (requires URL)
npx zcf i -s -p custom -k "sk-xxx" -u "https://api.example.com"
```

#### Traditional API Configuration Parameters

| Parameter | Abbreviation | Description | Example |
|------|------|------|------|
| `--api-type, -t` | `-t` | API configuration type | `auth_token`, `api_key`, `ccr_proxy`, `skip` |
| `--api-key, -k` | `-k` | API key or authentication token | `sk-ant-xxx` |
| `--api-url, -u` | `-u` | Custom API URL | `https://api.example.com/v1` |
| `--api-model, -M` | `-M` | Primary API model | `claude-sonnet-4-5` |
| `--api-fast-model, -F` | `-F` | Fast API model (Claude Code only) | `claude-haiku-4-5` |

```bash
# Use API Key
npx zcf i -s -t api_key -k "sk-ant-xxx"

# Use Auth Token (official login)
npx zcf i -s -t auth_token -k "your-auth-token"

# Use CCR proxy
npx zcf i -s -t ccr_proxy

# Skip API configuration
npx zcf i -s -t skip

# Configure custom models
npx zcf i -s -t api_key -k "sk-xxx" -M "claude-sonnet-4-5" -F "claude-haiku-4-5"
```

#### Multiple API Configuration

Supports configuring multiple APIs simultaneously for easy switching:

```bash
# Use JSON string
npx zcf i -s --api-configs '[
  {
    "provider": "302ai",
    "key": "sk-xxx",
    "default": true
  },
  {
    "provider": "glm",
    "key": "sk-yyy"
  },
  {
    "name": "custom",
    "type": "api_key",
    "key": "sk-zzz",
    "url": "https://custom.api.com",
    "primaryModel": "claude-sonnet-4-5",
    "fastModel": "claude-haiku-4-5"
  }
]'

# Use JSON file
npx zcf i -s --api-configs-file ./api-configs.json
```

### MCP Service Configuration

| Parameter | Abbreviation | Description | Optional Values |
|------|------|------|--------|
| `--mcp-services, -m` | `-m` | MCP services to install | `context7`, `open-websearch`, `spec-workflow`, `mcp-deepwiki`, `Playwright`, `exa`, `serena`, `all`, `skip` |

```bash
# Install all MCP services
npx zcf i -s -m all

# Install specific services (comma-separated)
npx zcf i -s -m context7,open-websearch,spec-workflow

# Skip MCP service installation
npx zcf i -s -m skip
```

### Workflow Configuration

| Parameter | Abbreviation | Description | Optional Values |
|------|------|------|--------|
| `--workflows, -w` | `-w` | Workflows to install | `commonTools`, `sixStepsWorkflow`, `featPlanUx`, `gitWorkflow`, `bmadWorkflow`, `all`, `skip` |

```bash
# Install all workflows
npx zcf i -s -w all

# Install specific workflows
npx zcf i -s -w sixStepsWorkflow,gitWorkflow

# Skip workflow installation
npx zcf i -s -w skip
```

> ⚠️ **Note**: Codex currently only supports `sixStepsWorkflow` and `gitWorkflow`. Other workflows are not yet available in Codex.

### Output Style Configuration

| Parameter | Abbreviation | Description | Optional Values |
|------|------|------|--------|
| `--output-styles, -o` | `-o` | Output styles to install | `engineer-professional`, `nekomata-engineer`, `laowang-engineer`, `ojousama-engineer`, `all`, `skip` |
| `--default-output-style, -d` | `-d` | Default output style | Same as output style options, also includes built-in styles: `default`, `explanatory`, `learning` |

```bash
# Install all output styles
npx zcf i -s -o all

# Install specific styles
npx zcf i -s -o engineer-professional,nekomata-engineer

# Set default output style
npx zcf i -s -o all -d engineer-professional

# Skip output style installation
npx zcf i -s -o skip
```

### Other Configuration Options

| Parameter | Abbreviation | Description | Optional Values |
|------|------|------|--------|
| `--skip-prompt, -s` | `-s` | Skip all interactive prompts (non-interactive mode) | - |
| `--config-action, -r` | `-r` | Configuration handling method | `new`, `backup`, `merge`, `docs-only`, `skip` |
| `--install-cometix-line, -x` | `-x` | Whether to install CCometixLine | `true`, `false` |

```bash
# Non-interactive mode
npx zcf i -s -p 302ai -k "sk-xxx"

# Configuration handling method
npx zcf i -s --config-action backup  # Backup then overwrite (default)
npx zcf i -s --config-action merge   # Merge configuration
npx zcf i -s --config-action new     # Create new configuration
npx zcf i -s --config-action docs-only  # Only update documents
npx zcf i -s --config-action skip    # Skip configuration

# Control CCometixLine installation
npx zcf i -s -x true   # Install (default)
npx zcf i -s -x false  # Don't install
```

## Complete Examples

### Scenario 1: First-Time Use of Claude Code

```bash
# Interactive initialization (recommended for first-time use)
npx zcf init

# Or use main menu
npx zcf
# Select 1 (Complete Initialization)
```

### Scenario 2: Quick Initialization with 302.AI Provider

```bash
npx zcf i -s -p 302ai -k "sk-xxx" -g zh-CN
```

### Scenario 3: Complete Codex Initialization

```bash
npx zcf i -s \
  -T codex \
  -p 302ai \
  -k "sk-xxx" \
  -g zh-CN \
  -m all \
  -w all
```

### Scenario 4: Configure Multiple API Providers

```bash
# Create api-configs.json file
cat > api-configs.json << EOF
[
  {
    "provider": "302ai",
    "key": "sk-302ai-xxx",
    "default": true
  },
  {
    "provider": "glm",
    "key": "sk-glm-yyy"
  },
  {
    "name": "custom",
    "type": "api_key",
    "key": "sk-custom-zzz",
    "url": "https://custom.api.com",
    "primaryModel": "claude-sonnet-4-5"
  }
]
EOF

# Initialize using configuration file
npx zcf i -s --api-configs-file ./api-configs.json -g zh-CN
```

### Scenario 5: Only Update Documents and Templates

```bash
npx zcf i -s --config-action docs-only -g zh-CN
```

### Scenario 6: Use CCR Proxy

```bash
npx zcf i -s -t ccr_proxy -g zh-CN -m all -w all
```

## Configuration Handling Strategies

When existing configuration is detected, ZCF will ask for handling strategy:

| Strategy | Description | Use Case |
|------|------|---------|
| `backup` | Backup existing configuration then overwrite | Recommended default option, safe and reliable |
| `merge` | Merge new configuration into existing configuration | Need to preserve custom content |
| `new` | Create new configuration, preserve old configuration | Need to preserve multiple configurations simultaneously |
| `docs-only` | Only update documents and prompts | Only need to update templates |
| `skip` | Skip current step | Don't need to modify this configuration |

## Execution Flow

The execution flow of `zcf init` is as follows:

1. **Display Banner**: Display ZCF version information and tool type
2. **Parse Language Preferences**: Set i18n language based on parameters
3. **Validate Parameters**: Check parameter validity and mutual exclusivity
4. **Select Code Tool**: Determine whether it's Claude Code or Codex
5. **Handle Existing Configuration**: Handle existing configuration according to strategy
6. **Configure API**: Set API keys, authentication methods, etc.
7. **Configure MCP**: Install and configure MCP services
8. **Import Workflows**: Install workflow templates
9. **Configure Output Styles**: Set AI output styles
10. **Install Status Bar**: Optionally install CCometixLine
11. **Save Preferences**: Update ZCF global configuration

## Troubleshooting

### Initialization Failure

If initialization fails:

1. **Check Node.js Version**: Ensure Node.js >= 18
2. **Check Permissions**: Ensure write permissions for configuration directories
3. **Check Network**: Ensure access to npm registry and API services

```bash
# Check Node.js version
node --version

# Check permissions
ls -la ~/.claude ~/.codex

# Manually create directories and set permissions (if needed)
mkdir -p ~/.claude ~/.codex
```

### API Configuration Not Effective

If API cannot be used after configuration:

1. **Check Configuration File**: Confirm configuration is correctly written
2. **Verify API Key**: Confirm API key is valid
3. **Restart Application**: Restart Claude Code or Codex to load configuration

```bash
# Check Claude Code configuration
cat ~/.claude/settings.json | grep -A 5 apiKeys

# Check Codex configuration
cat ~/.codex/config.toml | grep -A 5 modelProvider
```

### Workflows Not Imported

If workflows are not imported:

```bash
# Re-import workflows
npx zcf update

# Check workflow directories
ls -la ~/.claude/workflows/
ls -la ~/.codex/prompts/
```

## Related Resources

- [Quick Start](../getting-started/installation.md) - Complete installation guide
- [API Provider Presets](../advanced/api-providers.md) - Provider details
- [Configuration Management](../features/multi-config.md) - Multi-config and backup system
- [MCP Services](../features/mcp.md) - Detailed MCP service information

> 💡 **Tip**: For first-time use, it's recommended to use interactive mode (without `-s` parameter), so you can better understand the meaning of each option. After familiarizing yourself, you can use non-interactive mode to improve efficiency.


