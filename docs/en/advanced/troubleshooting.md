---
title: Troubleshooting
---

# Troubleshooting

This document compiles common problems and solutions encountered when using ZCF, helping you quickly locate and resolve issues.

## Common Problem Categories

- [Initialization Issues](#initialization-issues)
- [API Configuration Issues](#api-configuration-issues)
- [Workflow Issues](#workflow-issues)
- [MCP Service Issues](#mcp-service-issues)
- [Codex Related Issues](#codex-related-issues)
- [CCR Related Issues](#ccr-related-issues)
- [Configuration and Backup Issues](#configuration-and-backup-issues)
- [Platform-Specific Issues](#platform-specific-issues)

## Initialization Issues

### 1. Initialization Failed or Stuck

**Symptoms**: No response or error after running `npx zcf init`

**Possible Causes**:
- Node.js version too low
- Insufficient permissions
- Network connection issues
- MCP installation stuck

**Solutions**:

```bash
# 1. Check Node.js version (requires >= 22)
node --version

# If version too low, upgrade Node.js
# macOS/Linux
nvm install 22
nvm use 22

# 2. Check permissions
ls -la ~/.claude ~/.codex

# If directory doesn't exist or insufficient permissions, manually create
mkdir -p ~/.claude ~/.codex ~/.ufomiao/zcf
chmod 755 ~/.claude ~/.codex ~/.ufomiao/zcf

# 3. Skip MCP installation (if network issues)
npx zcf init -s -m skip

# 4. Check network connection
ping npmjs.com
```

### 2. Initialization Interrupted

**Symptoms**: Unexpected interruption during initialization

**Solutions**:

```bash
# 1. Clean incomplete configuration
rm -rf ~/.claude/backup/latest

# 2. Restore from backup (if available)
ls -la ~/.claude/backup/
cp -r ~/.claude/backup/backup_latest_timestamp/* ~/.claude/

# 3. Reinitialize
npx zcf init --config-action backup
```

### 3. Configuration Directory Creation Failed

**Symptoms**: Cannot create configuration directory

**Solutions**:

```bash
# macOS/Linux
mkdir -p ~/.claude ~/.codex ~/.ufomiao/zcf
chmod 755 ~/.claude ~/.codex ~/.ufomiao/zcf

# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.codex"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.ufomiao\zcf"

# Check disk space
df -h ~  # macOS/Linux
```

## API Configuration Issues

### 1. API Configuration Not Effective

**Symptoms**: API key configured but cannot use

**Solutions**:

```bash
# 1. Check configuration file
cat ~/.claude/settings.json | jq .env
cat ~/.codex/config.toml | grep -A 5 apiKey

# 2. Reconfigure API
npx zcf init
# Select 3 (Configure API or CCR)
# Or use command line
npx zcf init -s -t api_key -k "your-api-key"

# 3. For CCR mode, ensure Router is running
npx zcf ccr status
npx zcf ccr start
```

### 2. API Key Format Error

**Symptoms**: Prompt indicating API key format is incorrect

**Solutions**:

```bash
# Check key format
# Claude Code: sk-ant-xxx or auth-token
# 302.AI: sk-xxx
# GLM: Usually long string

# Verify key (use provider's test tool)
# Or try to verify in provider console

# Re-enter correct key
npx zcf init -s -p 302ai -k "correct-key"
```

### 3. API Endpoint Unreachable

**Symptoms**: Connection to API endpoint failed

**Solutions**:

```bash
# 1. Check network connection
curl https://api.302.ai/cc
ping api.302.ai

# 2. Check proxy settings (if needed)
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890

# 3. Verify endpoint URL
# 302.AI: https://api.302.ai/cc
# GLM: https://open.bigmodel.cn/api/anthropic
# MiniMax: https://api.minimaxi.com/anthropic

# 4. Use provider preset (recommended)
npx zcf init -s -p 302ai -k "sk-xxx"
```

### 4. Multiple API Configuration Conflicts

**Symptoms**: Cannot switch after configuring multiple APIs

**Solutions**:

```bash
# 1. List all configurations
npx zcf config-switch --list

# 2. Switch to correct configuration
npx zcf config-switch provider-name

# 3. Check default configuration in configuration file
cat ~/.claude/settings.json | jq .apiKeys
cat ~/.codex/config.toml | grep modelProvider
```

## Workflow Issues

### 1. Workflows Not Imported

**Symptoms**: Workflow commands cannot be used

**Solutions**:

```bash
# 1. Check workflow directories
ls -la ~/.claude/workflows/
ls -la ~/.codex/prompts/

# 2. Reimport workflows
npx zcf update -w all

# 3. Check Codex configuration (Codex requires managed = true)
cat ~/.codex/config.toml | grep managed
# If managed = false, set to true then reimport

# 4. Manually check workflow files
cat ~/.claude/workflows/zcf-workflow/workflow.md
```

### 2. Workflow Commands Not Recognized

**Symptoms**: No response when entering `/zcf:workflow`

**Solutions**:

```bash
# 1. Check workflow file locations
# Claude Code: ~/.claude/workflows/
# Codex: ~/.codex/prompts/

# 2. Verify workflow file format
head -20 ~/.claude/workflows/zcf-workflow/workflow.md

# 3. Restart Claude Code or Codex application

# 4. Check command prefix
# Claude Code: /zcf:workflow or /workflow
# Codex: /prompts:workflow
```

### 3. Workflow Templates Outdated

**Symptoms**: Workflow functionality inconsistent with documentation

**Solutions**:

```bash
# Update workflow templates
npx zcf update -g zh-CN

# Or force update
npx zcf init --config-action docs-only -w all
```

## MCP Service Issues

### 1. MCP Service Cannot Start

**Symptoms**: MCP service cannot be used after configuration

**Solutions**:

```bash
# 1. Check MCP configuration
cat ~/.claude/settings.json | jq .mcpServers
cat ~/.codex/config.toml | grep -A 10 mcp_server

# 2. Reconfigure MCP
npx zcf
# Select 4 (Configure MCP)

# 3. Check service dependencies
# Context7: Requires npx available
# Playwright: Requires browser environment
# Exa: Requires EXA_API_KEY environment variable

# 4. Test single service
npx @context7/mcp-server
```

### 2. Exa MCP Service Failed

**Symptoms**: Exa service error

**Solutions**:

```bash
# 1. Set environment variable
export EXA_API_KEY="your-exa-api-key"

# 2. Verify environment variable
echo $EXA_API_KEY

# 3. Add environment variable in configuration file
# ~/.claude/settings.json or ~/.codex/config.toml
# Add env.EXA_API_KEY

# 4. Restart application
```

### 3. Playwright Browser Download Failed

**Symptoms**: Playwright stuck on browser download on first run

**Solutions**:

```bash
# 1. Manually install browser
npx playwright install

# 2. Set environment variable (if proxy needed)
export PLAYWRIGHT_DOWNLOAD_HOST=https://npm.taobao.org/mirrors

# 3. Wait for download to complete (may take a few minutes)

# 4. Check browser installation
npx playwright --version
```

### 4. Context7 Query Failed

**Symptoms**: Context7 cannot query documentation

**Solutions**:

```bash
# 1. Check network connection
ping context7.com

# 2. Test Context7 service
npx @context7/mcp-server --help

# 3. Check configuration format
cat ~/.claude/settings.json | jq .mcpServers.context7
```

### 5. MCP Client Connection Timeout

**Symptoms**: Prompt "MCP client for xxx failed to start: request timed out"

**Cause**: Usually connection timeout due to high network latency or timeout setting too short

**Solutions**:

#### Method 1: Increase Timeout (Recommended)

**Claude Code**:

Edit `~/.claude/settings.json`, add timeout configuration in `env` field:

```json
{
  "env": {
    "MCP_TIMEOUT": "60000"
  }
}
```

Complete example:
```json
{
  "env": {
    "ANTHROPIC_API_KEY": "sk-xxx",
    "MCP_TIMEOUT": "60000"
  },
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

**Codex**:

Edit `~/.codex/config.toml`, add `startup_timeout_sec` under corresponding MCP service configuration:

```toml
[mcp_server.context7]
command = "npx"
args = ["-y", "@context7/mcp-server"]
startup_timeout_sec = 60
```

#### Method 2: Change Network Node

If network latency is high, you can try:

```bash
# 1. Check network latency
ping context7.com

# 2. Use network proxy (if needed)
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890

# 3. Or use VPN to switch to lower latency node
```

#### Method 3: Verify Configuration

After configuration, need to restart Claude Code or Codex application:

```bash
# Verify Claude Code configuration
cat ~/.claude/settings.json | jq .env.MCP_TIMEOUT

# Verify Codex configuration
cat ~/.codex/config.toml | grep -A 5 "mcp_server.context7"

# Test MCP service after restarting application
```

**Notes**:

- `MCP_TIMEOUT` unit is milliseconds (60000 = 60 seconds)
- `startup_timeout_sec` unit is seconds (60 = 60 seconds)
- If timeout is set too long, may affect startup speed
- Recommended to adjust timeout based on actual network environment (30-120 seconds)

## Codex Related Issues

### 1. Codex CLI Installation Failed

**Symptoms**: Codex CLI cannot be installed

**Solutions**:

```bash
# 1. Check Node.js version
node --version  # Requires >= 18

# 2. Manually install Codex CLI
npm install -g @openai/codex

# 3. Check permissions (macOS/Linux)
sudo npm install -g @openai/codex

# 4. Use nvm to manage Node.js (recommended)
nvm install 20
nvm use 20
npm install -g @openai/codex

# 5. Verify installation
codex --version
```

### 2. Codex Configuration Not Effective

**Symptoms**: Codex cannot be used after configuration

**Solutions**:

```bash
# 1. Check Codex configuration file
cat ~/.codex/config.toml

# 2. Ensure managed = true (ZCF-managed configuration)
# If managed = false, ZCF will not modify configuration

# 3. Check API configuration
cat ~/.codex/config.toml | grep -A 10 modelProvider

# 4. Check auth.json
cat ~/.codex/auth.json

# 5. Reconfigure
npx zcf init -T codex -s -p 302ai -k "sk-xxx"
```

### 3. Codex Workflow Command Format

**Symptoms**: Workflow commands cannot be used in Codex

**Solutions**:

```bash
# Codex uses different command prefix
# Correct format: /prompts:workflow
# Wrong format: /zcf:workflow

# Check workflow files
ls -la ~/.codex/prompts/

# Reimport workflows
npx zcf update -T codex -g zh-CN
```

## CCR Related Issues

### 1. CCR Cannot Start

**Symptoms**: CCR service failed to start or stuck

**Solutions**:

```bash
# 1. Check CCR installation
npx zcf ccr status

# 2. Check port occupancy
lsof -i :3456  # macOS/Linux
netstat -ano | findstr :3456  # Windows

# 3. Reinstall CCR
npx zcf ccr install

# 4. Check configuration file
cat ~/.claude-code-router/config.json

# 5. Manually start CCR
cd ~/.claude-code-router
ccr start
```

### 1.1. CCR Startup Stuck on "Loaded JSON config"

**Symptoms**: Executing `ccr start` stuck on "Loaded JSON config from xxx" prompt, cannot continue

**Cause**: Usually port 3456 is occupied, preventing new instance from starting

**Solutions**:

#### Windows Platform

```bash
# 1. Find process PID occupying port 3456
netstat -ano | findstr :3456

# Output example:
# TCP    127.0.0.1:3456         0.0.0.0:0              LISTENING       1208
# TCP    127.0.0.1:59047        127.0.0.1:3456         TIME_WAIT       0

# 2. Terminate process occupying port (1208 is example PID, replace with actual PID)
taskkill /PID 1208 /F

# 3. Restart CCR
npx zcf ccr restart

# 4. Check status
npx zcf ccr status
```

#### macOS/Linux Platform

```bash
# 1. Terminate process occupying port 3456
lsof -t -i:3456 | xargs kill

# Or use safer method (won't error if process doesn't exist)
lsof -t -i:3456 | xargs -r kill

# 2. Restart CCR
npx zcf ccr restart

# 3. Check status
npx zcf ccr status
```

**Verification Steps**:

```bash
# Confirm port is released
lsof -i :3456  # macOS/Linux (should have no output)
netstat -ano | findstr :3456  # Windows (should have no output)

# If port is released, restart
npx zcf ccr start

# Verify CCR running normally
npx zcf ccr status

# If status is normal, Claude Code should be able to connect normally
```

### 2. CCR Proxy Connection Failed

**Symptoms**: Connection failed when using CCR proxy

**Solutions**:

```bash
# 1. Check CCR configuration
cat ~/.claude-code-router/config.json | jq .

# 2. Verify CCR running status
curl http://127.0.0.1:3456/health

# 3. Check Claude Code configuration
cat ~/.claude/settings.json | jq .env.ANTHROPIC_BASE_URL

# 4. Reconfigure CCR proxy
npx zcf ccr
# Or
npx zcf init -s -t ccr_proxy
```

### 3. CCR Web UI Cannot Be Accessed

**Symptoms**: Cannot open CCR Web UI

**Solutions**:

```bash
# 1. Confirm CCR is running
npx zcf ccr status

# 2. Check port
lsof -i :3456

# 3. Access Web UI
open http://localhost:3456/ui  # macOS
# Or access http://localhost:3456/ui in browser

# 4. Check firewall settings
```

## Configuration and Backup Issues

### 1. Configuration Lost

**Symptoms**: Configuration files lost or corrupted

**Solutions**:

```bash
# 1. Find backup
ls -lt ~/.claude/backup/ | head -5
ls -lt ~/.codex/backup/ | head -5

# 2. Restore backup
cp -r ~/.claude/backup/backup_latest_timestamp/* ~/.claude/
cp -r ~/.codex/backup/backup_latest_timestamp/* ~/.codex/

# 3. Reinitialize (if backup unavailable)
npx zcf init --config-action backup
```

### 2. Backup Failed

**Symptoms**: Cannot create backup

**Solutions**:

```bash
# 1. Check disk space
df -h ~

# 2. Check backup directory permissions
ls -la ~/.claude/backup/

# 3. Manually create backup directory
mkdir -p ~/.claude/backup ~/.codex/backup
chmod 755 ~/.claude/backup ~/.codex/backup

# 4. Manual backup
cp -r ~/.claude ~/.claude.backup.$(date +%Y%m%d)
```

### 3. Configuration Conflicts

**Symptoms**: Multiple configurations conflict or overwrite

**Solutions**:

```bash
# 1. View all configurations
npx zcf config-switch --list

# 2. Backup current configuration
cp -r ~/.claude ~/.claude.conflict.backup

# 3. Reinitialize using merge strategy
npx zcf init --config-action merge

# 4. Manually merge configuration (if needed)
# Edit configuration file, merge conflicting configuration items
```

## Platform-Specific Issues

### Windows Platform

#### Path Issues

**Symptoms**: Path contains spaces or special characters

**Solutions**:

```bash
# ZCF automatically handles spaces in paths
# If issues occur, check if paths in configuration are properly quoted

# View configuration
cat "$env:USERPROFILE\.claude\settings.json"
```

#### MCP Configuration Format

**Symptoms**: MCP services cannot start on Windows

**Solutions**:

```bash
# ZCF automatically fixes Windows MCP configuration format
# Running update command will automatically fix
npx zcf update

# Or manually check configuration format
cat "$env:USERPROFILE\.claude\settings.json" | jq .mcpServers
```

### macOS Platform

#### Permission Issues

**Symptoms**: Cannot create configuration directory

**Solutions**:

```bash
# Check macOS privacy settings
# System Settings > Privacy & Security > Full Disk Access

# Manually create directory
mkdir -p ~/.claude ~/.codex
chmod 755 ~/.claude ~/.codex
```

### Linux/WSL Platform

#### WSL Environment Detection

**Symptoms**: ZCF did not correctly detect WSL environment

**Solutions**:

```bash
# ZCF automatically detects WSL environment
# If detection fails, manually specify path

# Check WSL environment variable
echo $WSL_DISTRO_NAME
```

#### Termux Environment

**Symptoms**: Failed to run in Termux

**Solutions**:

```bash
# ZCF supports Termux environment
# Ensure using latest Node.js version

# Use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
```

## Getting More Help

### Logs and Debugging

```bash
# Enable verbose output
npx zcf init --verbose 2>&1 | tee zcf-debug.log

# View error messages
cat zcf-debug.log | grep -i error

# Check version information
npx zcf --version
```

### Recovery History

```bash
# View backup history
ls -lt ~/.claude/backup/
ls -lt ~/.codex/backup/

# Restore specific backup
cp -r ~/.claude/backup/backup_YYYY-MM-DD_HH-mm-ss/* ~/.claude/
```

### Documentation Resources

- Read repository `CLAUDE.md` and `AGENTS.md` to understand system prompt requirements
- Check [GitHub Issues](https://github.com/UfoMiao/zcf/issues) to search for similar problems
- When submitting issues on GitHub Issues, include:
  - `npx zcf --version` output
  - Complete terminal logs
  - Operating system and Node.js version
  - Reproduction steps

### Community Support

- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Discuss usage problems
- **Documentation**: View complete documentation for more information

> 💡 **Tip**: When encountering problems, first check common problems in this document. If the problem persists, please collect relevant information and report it in GitHub Issues.


