---
title: Claude Code Router (CCR)
---

# Claude Code Router (CCR)

[CCR](https://github.com/musistudio/claude-code-router/blob/main/README_zh.md) (Claude Code Router) is a powerful proxy router that enables intelligent routing and cost optimization for multiple AI models. ZCF has built-in complete CCR management capabilities to help you quickly set up a highly available Claude Code proxy system.

## What is CCR

CCR is an AI model proxy router with main features including:

- 🆓 **Free Model Access**: Use free AI models (like Gemini, DeepSeek) through Claude Code interface
- 🎯 **Custom Routing**: Route different types of requests to different models based on rules
- 💰 **Cost Optimization**: Significantly reduce API costs by using appropriate models for different tasks
- 🔄 **Auto Switching**: Intelligently select the most suitable model for different tasks
- 📊 **Usage Statistics**: Detailed usage statistics and cost analysis

## Core Advantages

### Cost Optimization

Through intelligent routing, select the most economical model for different tasks:

- **Simple Tasks** → Use free models (Gemini, DeepSeek)
- **Complex Tasks** → Use high-performance models (Claude Opus, GPT-4)
- **Quick Tasks** → Use fast models (Claude Haiku, GPT-3.5)

> 💡 **Cost Savings**: Reasonable use of CCR can reduce API costs by 50-80%

### Model Diversity

CCR supports accessing multiple AI models:

- **Claude Series**: Opus, Sonnet, Haiku
- **OpenAI Series**: GPT-4, GPT-3.5, GPT-4 Turbo
- **Free Models**: Gemini, DeepSeek, Moonshot
- **Custom Models**: Support any compatible API endpoint

### High Availability

- **Automatic Failover**: Automatically switch to backup models when primary model is unavailable
- **Load Balancing**: Distribute requests across multiple models
- **Health Checks**: Automatically detect model availability

## Quick Start

### Method 1: Through ZCF Menu (Recommended)

```bash
npx zcf ccr
```

After entering the CCR management menu, you can choose:

```
CCR Management Menu
1. Initialize CCR - Install and configure CCR
2. Start UI - Start CCR Web interface
3. Service Control - Start/Stop/Restart CCR service
4. Check Status - View current CCR service status
Q. Exit
```

### Method 2: Direct Enable During Initialization

```bash
npx zcf i -s -t ccr_proxy
```

Or select during interactive initialization:
```
? Select API authentication method
  ❯ Configure CCR Proxy (Claude Code Router)
```

### Method 3: Switch from API Key Mode

```bash
npx zcf
# Select 3. Configure API
# Select "Switch to CCR Proxy"
```

## Installation and Configuration

### Automatic Installation

ZCF automatically detects and installs CCR:

```bash
npx zcf ccr
# Select 1. Initialize CCR
```

ZCF will:
1. ✅ Detect if `@musistudio/claude-code-router` is installed
2. ✅ Automatically install or upgrade to latest version
3. ✅ Create default configuration file
4. ✅ Configure Claude Code to use CCR proxy

### Configuration Wizard

When initializing CCR, ZCF will guide you through configuration:

1. **Select Provider Preset**: Supports multiple preset providers to simplify configuration
2. **Configure Port**: Default uses port 3456 (customizable)
3. **Set Key**: Configure CCR access key
4. **Create Backup**: Automatically backup existing configuration

### Configuration File Location

CCR configuration files are saved in:

- **Configuration Directory**: `~/.claude-code-router/`
- **Configuration File**: `~/.claude-code-router/config.json`
- **Backup Directory**: `~/.claude-code-router/` (backup file format: `config.json.YYYY-MM-DDTHH-mm-ss-SSSZ.bak`)

## Using CCR Web UI

CCR provides a Web interface for advanced configuration:

```bash
npx zcf ccr
# Select 2. Start UI
```

Web UI features include:
- 📊 Real-time usage statistics
- ⚙️ Route rule configuration
- 🔧 Model management
- 📈 Cost analysis
- 🔄 Service control

Access address: `http://localhost:3456/ui` (default port)

## Service Management

### Start Service

```bash
npx zcf ccr
# Select 3. Service Control → Start Service
```

Or manually start:
```bash
ccr start
```

### Stop Service

```bash
npx zcf ccr
# Select 3. Service Control → Stop Service
```

Or manually stop:
```bash
ccr stop
```

### Check Status

```bash
npx zcf ccr
# Select 4. Check Status
```

Or manually check:
```bash
ccr status
```

## Route Rule Configuration

CCR supports flexible route rule configuration, which can be set through Web UI or configuration file. The configuration file uses JSON format and mainly includes `Providers` and `Router` sections.

### Complete Configuration Example

```json
{
  "LOG": true,
  "CLAUDE_PATH": "",
  "HOST": "127.0.0.1",
  "PORT": 3456,
  "APIKEY": "sk-zcf-x-ccr",
  "API_TIMEOUT_MS": "600000",
  "PROXY_URL": "",
  "transformers": [],
  "Providers": [
    {
      "name": "gemini",
      "api_base_url": "https://generativelanguage.googleapis.com/v1beta",
      "api_key": "sk-free",
      "models": ["gemini-pro", "gemini-pro-vision"]
    },
    {
      "name": "claude",
      "api_base_url": "https://api.anthropic.com/v1",
      "api_key": "sk-ant-xxx",
      "models": ["claude-sonnet-4-5", "claude-opus-4-1"]
    }
  ],
  "Router": {
    "default": "gemini,gemini-pro",
    "background": "gemini,gemini-pro",
    "think": "claude,claude-sonnet-4-5",
    "longContext": "claude,claude-opus-4-1",
    "longContextThreshold": 60000,
    "webSearch": "gemini,gemini-pro"
  }
}
```

### Configuration Field Descriptions

#### Basic Configuration

| Field | Type | Description | Default |
|------|------|------|--------|
| `LOG` | boolean | Enable logging | `true` |
| `HOST` | string | Service listen address | `127.0.0.1` |
| `PORT` | number | Service port | `3456` |
| `APIKEY` | string | CCR API key | `sk-zcf-x-ccr` |
| `API_TIMEOUT_MS` | string | API timeout (milliseconds) | `600000` |
| `PROXY_URL` | string | Proxy URL (optional) | `""` |

#### Providers Configuration

`Providers` is an array, each Provider contains:

| Field | Type | Description |
|------|------|------|
| `name` | string | Provider name (used for route rules) |
| `api_base_url` | string | API base URL |
| `api_key` | string | API key (free models can use `sk-free`) |
| `models` | string[] | List of models supported by this provider |
| `transformer` | object | Optional request transformer (for API compatibility) |

#### Router Configuration

`Router` defines model routing rules for different scenarios, format: `${providerName},${modelName}`

| Field | Type | Description |
|------|------|------|
| `default` | string | Default route (format: `provider,model`) |
| `background` | string | Background task route (optional) |
| `think` | string | Thinking task route (optional) |
| `longContext` | string | Long context task route (optional) |
| `longContextThreshold` | number | Long context token threshold (optional) |
| `webSearch` | string | Web search task route (optional) |

### Routing Strategy Examples

#### Cost Optimization Configuration

Select the most economical model for different scenarios:

```json
{
  "Router": {
    "default": "gemini,gemini-pro",           // Default use free model
    "think": "gemini,gemini-pro",             // Thinking tasks also use free model
    "longContext": "claude,claude-sonnet-4-5", // Long context uses medium model
    "longContextThreshold": 60000              // Use long context route when exceeding 60k tokens
  }
}
```

#### Performance Priority Configuration

Select the most suitable high-performance model for different tasks:

```json
{
  "Router": {
    "default": "claude,claude-opus-4-1",        // Default use strongest model
    "background": "claude,claude-haiku-4-5",     // Background tasks use fast model
    "think": "claude,claude-sonnet-4-5",        // Thinking tasks use balanced model
    "longContext": "claude,claude-opus-4-1"      // Long context uses strongest model
  }
}
```

#### Hybrid Configuration

Combine free and paid models:

```json
{
  "Providers": [
    {
      "name": "gemini",
      "api_base_url": "https://generativelanguage.googleapis.com/v1beta",
      "api_key": "sk-free",
      "models": ["gemini-pro"]
    },
    {
      "name": "claude",
      "api_base_url": "https://api.anthropic.com/v1",
      "api_key": "sk-ant-xxx",
      "models": ["claude-sonnet-4-5", "claude-opus-4-1"]
    }
  ],
  "Router": {
    "default": "gemini,gemini-pro",           // Simple tasks use free model
    "think": "claude,claude-sonnet-4-5",      // Complex thinking uses Claude
    "longContext": "claude,claude-opus-4-1"     // Long context uses strongest model
  }
}
```

## Provider Presets

ZCF supports multiple CCR provider presets to simplify configuration:

```bash
npx zcf ccr
# Select 1. Initialize CCR
# Select provider preset
```

Supported presets include:
- **302.AI**: Enterprise-grade AI service
- **GLM**: Zhipu AI
- **MiniMax**: MiniMax AI service
- **Custom**: Configure custom provider

## Monitoring and Analysis

### Usage Statistics

Combine with `ccu` command to view API usage:

```bash
npx zcf ccu
```

Displayed information includes:
- 📊 Total requests
- 💰 Total cost
- 📈 Daily usage trends
- 🎯 Usage distribution by model

### CCR Built-in Statistics

Through CCR Web UI you can view:
- Real-time request monitoring
- Usage by model
- Cost analysis reports
- Performance metrics

## Integration with Claude Code

### Automatic Configuration

After CCR setup is complete, ZCF automatically configures Claude Code to use CCR as API proxy:

- ✅ Update `~/.claude/settings.json`
- ✅ Set API type to `ccr_proxy`
- ✅ Configure proxy address and port

### Switch Back to Direct API

If you need to switch back to direct API mode:

```bash
npx zcf
# Select 3. Configure API
# Select "Use API Key" or "Use Official Login"
```

## Common Questions

### Q: CCR service failed to start?

**A**: Check the following:
1. Is the port occupied: `lsof -i :3456` (macOS/Linux) or `netstat -ano | findstr :3456` (Windows)
2. Is the configuration file format correct: Check JSON format of `~/.claude-code-router/config.json`
3. Are dependencies completely installed: Confirm `@musistudio/claude-code-router` is correctly installed
4. Check log files (if LOG is enabled): `~/.claude-code-router/logs/`

### Q: How to configure multiple models?

**A**: Add multiple provider configurations in the `Providers` array, then specify models for different scenarios in `Router`. For example:

```json
{
  "Providers": [
    {
      "name": "gemini",
      "api_base_url": "https://generativelanguage.googleapis.com/v1beta",
      "api_key": "sk-free",
      "models": ["gemini-pro"]
    },
    {
      "name": "claude",
      "api_base_url": "https://api.anthropic.com/v1",
      "api_key": "sk-ant-xxx",
      "models": ["claude-sonnet-4-5"]
    }
  ],
  "Router": {
    "default": "gemini,gemini-pro",
    "think": "claude,claude-sonnet-4-5"
  }
}
```

### Q: Does CCR affect performance?

**A**: CCR itself has extremely low performance overhead (<5ms), main impact comes from network latency. Using locally deployed models can significantly reduce latency.

### Q: How to monitor CCR status?

**A**: 
```bash
npx zcf ccr
# Select 4. Check Status
```

Or access Web UI: `http://localhost:3456/ui`

## Best Practices

1. **Configure Base API First**: It's recommended to complete regular API configuration first, then switch to CCR, ensuring a fallback path
2. **Reasonable Route Configuration**: Configure route rules based on task types to balance cost and performance
   - Simple tasks → Free models (Gemini, DeepSeek)
   - Complex tasks → High-performance models (Claude Opus, GPT-4)
   - Long context → Dedicated long context models
3. **Use Web UI for Management**: For complex configurations, it's recommended to use CCR Web UI (`http://localhost:3456/ui`) for visual configuration
4. **Regular Monitoring**: Use `npx zcf ccu` regularly to view usage and adjust configuration in time
5. **Backup Configuration**: ZCF automatically backs up before each modification, you can also manually backup `~/.claude-code-router/config.json`
6. **Test Routes**: After configuration is complete, test routes in different scenarios to ensure they work as expected

## Version Compatibility

> ⚠️ **Important Notice for v2.9.1 Users**: If you previously initialized CCR using ZCF v2.9.1, please re-execute the CCR initialization process to ensure the correct `@musistudio/claude-code-router` package is installed. There was a package name error in v2.9.1, which has been fixed in subsequent versions.

## Automatic Updates

ZCF supports automatic checking and updating of CCR:

```bash
npx zcf check-updates
```

Or through menu:
```bash
npx zcf
# Select +. Check Updates
```

## Next Steps

Learn more about CCR related content:

- 📊 [Usage Analysis ccu](../cli/ccu.md) - Learn how to view API usage
- 🔧 [Configuration Management](../advanced/configuration.md) - Deep dive into configuration management
- 🎯 [Claude Code Configuration](claude-code.md) - Learn about Claude Code integration with CCR
- 📚 [CCR Official Documentation](https://github.com/musistudio/claude-code-router/blob/main/README_zh.md) - View CCR detailed documentation


