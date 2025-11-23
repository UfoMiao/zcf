---
title: CCR Proxy Management
---

# CCR Proxy Management

`zcf ccr` provides a complete management menu for Claude Code Router (CCR), including installation, configuration, service control, and Web UI access.

## Command Format

```bash
# Open CCR management menu
npx zcf ccr

# Or access through main menu
npx zcf
# Then select R. CCR Management
```

## Menu Options

Running `zcf ccr` will display the following menu:

```
═══════════════════════════════════════════════════
  CCR Management Menu
═══════════════════════════════════════════════════

  1. Initialize CCR - Install and configure CCR
  2. Start UI - Start CCR Web interface
  3. Check Status - View current CCR service status
  4. Restart Service - Restart CCR service
  5. Start Service - Start CCR service
  6. Stop Service - Stop CCR service
  0. Return to Main Menu
```

## Function Details

### 1. Initialize CCR

**Function**: First-time CCR setup or reconfigure CCR

**Process**:
1. Automatically detect if CCR CLI tool is installed
2. If not installed, automatically install `@musistudio/claude-code-router`
3. Guide configuration wizard:
   - Select provider preset (302.AI, GLM, MiniMax, Kimi, etc.)
   - Configure API keys (if needed)
   - Select default model
   - Create configuration file `~/.claude-code-router/config.json`
4. Automatically configure Claude Code to use CCR proxy
5. Backup existing configuration (if exists)

**Use Cases**:
- First-time use of CCR
- Need to change provider or reconfigure
- Configuration lost and needs reset

**Example**:
```bash
npx zcf ccr
# Select 1
# Complete configuration according to prompts
```

### 2. Start UI

**Function**: Start CCR Web management interface

**Access Address**: `http://localhost:3456/ui` (default port)

**Web UI Features**:
- 📊 Real-time usage statistics and cost analysis
- ⚙️ Route rule configuration
- 🔧 Model management (add, edit, delete)
- 📈 Detailed usage statistics
- 🔄 Service control (start, stop, restart)

**Prerequisites**:
- Must complete CCR initialization first (Option 1)
- Configuration file `~/.claude-code-router/config.json` must exist

**API Key**:
- When starting UI, CCR API key will be displayed (default: `sk-zcf-x-ccr`)
- Use this key to log in to Web UI

**Example**:
```bash
npx zcf ccr
# Select 2
# After service starts, access http://localhost:3456/ui
```

### 3. Check Status

**Function**: View CCR service current running status

**Displayed Information**:
- Whether service is running
- Running port
- Number of configured providers
- Route rule summary

**Use Cases**:
- Verify service started normally
- Troubleshoot connection issues
- View current configuration status

**Example**:
```bash
npx zcf ccr
# Select 3
```

### 4. Restart Service

**Function**: Restart CCR service, reload configuration

**Use Cases**:
- Need to reload after modifying configuration file
- Service abnormal and needs restart
- Need to restart after port conflict

**Example**:
```bash
npx zcf ccr
# Select 4
```

### 5. Start Service

**Function**: Start CCR service

**Use Cases**:
- Need to restart after service stopped
- Start service after system restart

**Example**:
```bash
npx zcf ccr
# Select 5
```

### 6. Stop Service

**Function**: Stop currently running CCR service

**Use Cases**:
- Need to pause CCR proxy
- Need to stop service for debugging
- Stop service before changing configuration

**Example**:
```bash
npx zcf ccr
# Select 6
```

## Route Rule Configuration

CCR supports flexible route rule configuration, which can be set through Web UI or configuration file. The configuration file is located at `~/.claude-code-router/config.json` and uses JSON format.

### Complete Configuration Example

```json
{
  "LOG": true,
  "HOST": "127.0.0.1",
  "PORT": 3456,
  "APIKEY": "sk-zcf-x-ccr",
  "API_TIMEOUT_MS": "600000",
  "PROXY_URL": "",
  "Providers": [
    {
      "name": "openrouter",
      "api_base_url": "https://openrouter.ai/api/v1/chat/completions",
      "api_key": "sk-xxx",
      "models": [
        "google/gemini-2.5-pro-preview",
        "anthropic/claude-sonnet-4",
        "anthropic/claude-3.5-sonnet"
      ],
      "transformer": {
        "use": ["openrouter"]
      }
    },
    {
      "name": "deepseek",
      "api_base_url": "https://api.deepseek.com/v1/chat/completions",
      "api_key": "sk-xxx",
      "models": ["deepseek-chat", "deepseek-reasoner"],
      "transformer": {
        "use": ["deepseek"],
        "deepseek-chat": {
          "use": ["tooluse"]
        }
      }
    },
    {
      "name": "ollama",
      "api_base_url": "http://localhost:11434/v1/chat/completions",
      "api_key": "ollama",
      "models": ["qwen2.5-coder:latest"],
      "transformer": {
        "use": ["ollama"]
      }
    },
    {
      "name": "gemini",
      "api_base_url": "https://generativelanguage.googleapis.com/v1beta/models/",
      "api_key": "sk-xxx",
      "models": ["gemini-2.5-flash", "gemini-2.5-pro"],
      "transformer": {
        "use": ["gemini"]
      }
    }
  ],
  "Router": {
    "default": "openrouter,google/gemini-2.5-pro-preview",
    "background": "deepseek,deepseek-chat",
    "think": "deepseek,deepseek-reasoner",
    "longContext": "openrouter,anthropic/claude-sonnet-4",
    "longContextThreshold": 60000,
    "webSearch": "gemini,gemini-2.5-flash"
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

## Common Questions

### Q: What to do if prompted "CCR not configured"?

A: Need to run Option 1 (Initialize CCR) first to complete configuration.

### Q: Web UI cannot be accessed?

A: 
1. Ensure UI is started (Option 2)
2. Check if port 3456 is occupied
3. Use API key `sk-zcf-x-ccr` to log in (or check `APIKEY` in configuration)

### Q: How to modify route rules?

A: You can modify through Web UI or directly edit `~/.claude-code-router/config.json` file, then restart service after modification.

### Q: Service failed to start?

A: 
1. Check if configuration file format is correct
2. Check if port is occupied: `lsof -i :3456` (macOS/Linux) or `netstat -ano | findstr :3456` (Windows)
3. Confirm `@musistudio/claude-code-router` is correctly installed
4. View error logs or use `ccr status` command

### Q: How to configure multiple models?

A: Add multiple provider configurations in the `Providers` array, then specify models for different scenarios in `Router`.

## Related Documentation

- [CCR Feature Overview](../features/ccr.md) - Learn about CCR's core benefits
- [Troubleshooting](../advanced/troubleshooting.md) - Solve common problems
