---
title: API Provider Presets
---

# API Provider Presets

ZCF provides an API provider preset system that can greatly simplify API configuration. Using presets can reduce configuration from 5+ parameters to just 2 (provider + API key).

## Supported Providers

ZCF currently supports the following API provider presets:

| Preset ID | Provider Name | Description | Claude Code Support | Codex Support | Authentication Method |
|---------|-----------|------|----------------|-----------|---------|
| `302ai` | 302.AI | Enterprise-level AI API service | ✅ | ✅ | `api_key` |
| `glm` | GLM (Zhipu AI) | Zhipu AI service | ✅ | ✅ | `auth_token` |
| `minimax` | MiniMax | MiniMax API service | ✅ | ✅ | `auth_token` |
| `kimi` | Kimi (Moonshot) | Moonshot AI service | ✅ | ✅ | `auth_token` |
| `custom` | Custom | Custom API endpoint | ✅ | ✅ | Must specify |

## Provider Details

### 302.AI

**Official Link**: [302.AI](https://share.302.ai/gAT9VG)

**Features**:
- 🎯 Enterprise-level AI resource platform
- 📊 Pay-as-you-go pricing
- 🔄 Provides latest and most comprehensive AI models and APIs
- 🌐 Supports multiple online AI applications

**Configuration Information**:
- **Claude Code Base URL**: `https://api.302.ai/cc`
- **Codex Base URL**: `https://api.302.ai/v1`
- **Authentication Method**: `api_key`
- **Codex Wire API**: `responses`

**Usage Example**:
```bash
# Claude Code
npx zcf init -s -p 302ai -k "sk-xxx"

# Codex
npx zcf init -s -T codex -p 302ai -k "sk-xxx"
```

### GLM (Zhipu AI)

**Provider Name**: Zhipu AI (GLM)

**Features**:
- 🇨🇳 Domestic AI service
- 💰 Cost-effective
- 🚀 Supports multiple models
- 📚 Comprehensive documentation support

**Configuration Information**:
- **Claude Code Base URL**: `https://open.bigmodel.cn/api/anthropic`
- **Codex Base URL**: `https://open.bigmodel.cn/api/coding/paas/v4`
- **Authentication Method**: `auth_token`
- **Codex Wire API**: `chat`
- **Codex Default Model**: `GLM-4.6`

**Usage Example**:
```bash
# Claude Code
npx zcf init -s -p glm -k "your-auth-token"

# Codex
npx zcf init -s -T codex -p glm -k "your-auth-token"
```

### MiniMax

**Provider Name**: MiniMax

**Features**:
- 🎯 Focuses on AI model services
- 💡 Supports multiple application scenarios
- 🔧 Flexible configuration options

**Configuration Information**:
- **Claude Code Base URL**: `https://api.minimaxi.com/anthropic`
- **Codex Base URL**: `https://api.minimaxi.com/v1`
- **Authentication Method**: `auth_token`
- **Codex Wire API**: `chat`
- **Claude Code Default Model**: `MiniMax-M2`
- **Codex Default Model**: `MiniMax-M2`

**Usage Example**:
```bash
# Claude Code
npx zcf init -s -p minimax -k "your-auth-token"

# Codex
npx zcf init -s -T codex -p minimax -k "your-auth-token"
```

### Kimi (Moonshot)

**Provider Name**: Kimi / Moonshot AI

**Features**:
- 🌙 Moonshot AI service
- 📝 Good at long text processing
- 🚀 High-performance models

**Configuration Information**:
- **Claude Code Base URL**: `https://api.moonshot.cn/anthropic`
- **Codex Base URL**: `https://api.moonshot.cn/v1`
- **Authentication Method**: `auth_token`
- **Codex Wire API**: `chat`
- **Claude Code Default Model**: `kimi-k2-0905-preview` (primary), `kimi-k2-turbo-preview` (fast)
- **Codex Default Model**: `kimi-k2-0905-preview`

**Usage Example**:
```bash
# Claude Code
npx zcf init -s -p kimi -k "your-auth-token"

# Codex
npx zcf init -s -T codex -p kimi -k "your-auth-token"
```

### Custom

**Provider Name**: Custom

**Features**:
- 🔧 Fully customizable configuration
- 🌐 Supports arbitrary API endpoints
- 📝 Requires manual configuration of all parameters

**Usage**:
```bash
# Use custom provider (requires URL)
npx zcf init -s -p custom -k "sk-xxx" -u "https://api.example.com/v1"

# Or use traditional method (without preset)
npx zcf init -s -t api_key -k "sk-xxx" -u "https://api.example.com/v1"
```

## Usage Methods

### Basic Usage

Using provider presets is very simple, only need two parameters:

```bash
# Use provider preset
npx zcf init -s -p <provider-id> -k <api-key>

# Example: Use 302.AI
npx zcf init -s -p 302ai -k "sk-xxx"
```

### Automatic Configuration

When using presets, ZCF will automatically configure:

1. ✅ **Base URL**: Automatically fill in correct API endpoint
2. ✅ **Authentication Method**: Automatically set authentication type (`api_key` or `auth_token`)
3. ✅ **Default Model**: If provider supports, automatically set default model
4. ✅ **Codex Configuration**: If using Codex, automatically configure `wireApi` protocol

### Override Default Configuration

Even when using presets, you can still override default configuration:

```bash
# Use preset but override model
npx zcf init -s -p 302ai -k "sk-xxx" \
  -M "claude-sonnet-4-5" \
  -F "claude-haiku-4-5"

# Use preset but override URL (not recommended, unless testing)
npx zcf init -s -p 302ai -k "sk-xxx" \
  -u "https://custom.302.ai/api"
```

## Multi-Configuration Scenarios

### Configure Multiple Providers

Using `--api-configs` or `--api-configs-file` can configure multiple providers simultaneously:

```bash
# Configure multiple providers using JSON string
npx zcf init -s --api-configs '[
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
    "provider": "minimax",
    "key": "sk-minimax-zzz"
  }
]'
```

### Mix Presets with Custom Configuration

```bash
# Configuration file example (api-configs.json)
{
  "configs": [
    {
      "provider": "302ai",
      "key": "sk-302ai-xxx",
      "default": true
    },
    {
      "name": "custom-api",
      "type": "api_key",
      "key": "sk-custom-xxx",
      "url": "https://custom.api.com/v1",
      "primaryModel": "claude-sonnet-4-5",
      "fastModel": "claude-haiku-4-5"
    }
  ]
}

# Use configuration file
npx zcf init -s --api-configs-file ./api-configs.json
```

## Provider Switching

After configuring multiple providers, you can switch anytime:

### Claude Code

```bash
# List all configurations
npx zcf config-switch --list

# Switch to specified provider
npx zcf config-switch 302ai-config
```

### Codex

```bash
# List Codex providers
npx zcf config-switch --code-type codex --list

# Switch to specified provider
npx zcf config-switch glm-provider --code-type codex
```

## Best Practices

### 1. Prefer Presets

Use provider presets whenever possible, which can:
- ✅ Reduce configuration errors
- ✅ Automatically get latest endpoints
- ✅ Simplify configuration process

```bash
# Recommended: Use preset
npx zcf init -s -p 302ai -k "sk-xxx"

# Not recommended: Manually configure all parameters
npx zcf init -s -t api_key -k "sk-xxx" -u "https://api.302.ai/cc" -M "claude-sonnet-4-5"
```

### 2. Test Configuration

Before formal use, it's recommended to test configuration first:

```bash
# 1. Initialize using preset
npx zcf init -s -p 302ai -k "test-key"

# 2. Test API connection
# Test conversation in Claude Code or Codex

# 3. If normal, reconfigure with production key
npx zcf init -s -p 302ai -k "production-key"
```

### 3. Multi-Provider Strategy

Configure different providers for different projects:

```bash
# Project A: Use 302.AI provider
npx zcf config-switch 302ai-provider

# Project B: Use GLM provider
npx zcf config-switch glm-provider

# Project C: Use MiniMax provider
npx zcf config-switch minimax-provider
```

### 4. Key Security

- ⚠️ **Do not commit keys to version control**
- ✅ **Use environment variables to manage keys**
- ✅ **Regularly rotate keys**
- ✅ **Use principle of least privilege**

```bash
# Use environment variables
export ZCF_API_KEY="sk-xxx"
npx zcf init -s -p 302ai -k "$ZCF_API_KEY"

# Or read from file (ensure file permissions are correct)
npx zcf init -s -p 302ai -k "$(cat ~/.zcf/api-key)"
```

## Troubleshooting

### Provider Not Supported

If using unsupported provider ID:

```bash
# Error message will display all valid values
npx zcf init -s -p invalid-provider -k "sk-xxx"
# Error: Invalid provider 'invalid-provider'. Valid providers: 302ai, glm, minimax, kimi, custom
```

### Authentication Failed

If authentication fails:

1. **Check API Key Format**: Confirm key format is correct
2. **Check Authentication Method**: Confirm using correct authentication type
3. **Verify Endpoint URL**: Confirm endpoint URL is correct

```bash
# Verify configuration
cat ~/.claude/settings.json | jq .env.ANTHROPIC_API_KEY
cat ~/.codex/config.toml | grep apiKey
```

### Model Unavailable

If default model is unavailable:

```bash
# Override default model
npx zcf init -s -p 302ai -k "sk-xxx" -M "claude-sonnet-4-5"

# Or manually edit configuration file
vim ~/.claude/settings.json
```

## Related Resources

- [Quick Start](../getting-started/installation.md) - Installation and initialization guide
- [Configuration Management](configuration.md) - Detailed configuration management
- [Config Switch](../cli/config-switch.md) - Multi-configuration switch command

> 💡 **Tip**: Using API provider presets can greatly simplify the configuration process. It's recommended to prefer presets, only use custom configuration when necessary. Regularly check provider documentation to get latest configuration information.


