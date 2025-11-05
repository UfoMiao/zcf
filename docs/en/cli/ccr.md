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

## Configuration File

CCR configuration file is located at `~/.claude-code-router/config.json`, containing:

- **Server Configuration**: Port (default 3456), host, API key
- **Provider List**: Configurations for multiple AI model providers
- **Route Rules**: Model routing strategies for different scenarios

Configuration file format example:

```json
{
  "LOG": true,
  "HOST": "127.0.0.1",
  "PORT": 3456,
  "APIKEY": "sk-zcf-x-ccr",
  "Providers": [
    {
      "name": "gemini",
      "api_base_url": "https://generativelanguage.googleapis.com/v1beta",
      "api_key": "sk-free",
      "models": ["gemini-pro"]
    }
  ],
  "Router": {
    "default": "gemini,gemini-pro",
    "background": "gemini,gemini-pro"
  }
}
```

## Usage Recommendations

### First-Time Use

1. Run `npx zcf ccr` and select "Initialize CCR"
2. Select appropriate provider preset
3. After configuration is complete, start UI (Option 2) for advanced configuration
4. Configure route rules and add more models in Web UI

### Integration with Initialization Command

You can directly enable CCR during `zcf init`:

```bash
# Select CCR proxy during interactive initialization
npx zcf init
# Select "Configure CCR Proxy" when selecting API authentication method

# Non-interactive initialization
npx zcf init -s -t ccr_proxy
```

### Verify After Configuration

```bash
# Check CCR status
npx zcf ccr
# Select 3. Check Status

# If status is normal, Claude Code should be able to connect normally
```

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
3. View error logs or use `ccr status` command

## Related Documentation

- [CCR Feature Details](../features/ccr.md) - Learn about CCR's complete features
- [Troubleshooting](../advanced/troubleshooting.md) - Solve common problems


