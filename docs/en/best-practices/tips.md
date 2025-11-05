---
title: Usage Tips
---

# Usage Tips

This document compiles practical tips and best practices for daily use of ZCF, helping you use ZCF more efficiently in various scenarios.

## Core Tips

### 1. Make Good Use of Interactive Menu

**Tip**: Get used to starting with `npx zcf`. All functions have numbered prompts, avoiding the need to remember command details.

```bash
# Open interactive menu
npx zcf

# Menu options include:
# 1 - Complete Initialization
# 2 - Import Workflows
# 3 - Configure API or CCR
# 4 - Configure MCP
# 5 - Configure Default Model
# 6 - Configure AI Memory
# 7 - Configure Environment Permissions
# R - CCR Management
# U - ccusage Usage Analysis
# L - CCometixLine Management
# + - Check Updates
# ... etc.
```

**Advantages**:
- ✅ No need to remember complex command parameters
- ✅ Can browse all available functions
- ✅ Suitable for users unfamiliar with commands
- ✅ Reduces input errors

### 2. Regular Updates

**Tip**: Keep workflows and templates up to date, and trigger version checks.

```bash
# Update once per week (recommended)
npx zcf update

# Or use abbreviation
npx zcf u

# Non-interactive update
npx zcf u -s -g zh-CN
```

**Best Practices**:
- 📅 Update once per week to get latest workflow templates
- 🔔 Pay attention to version update prompts, upgrade tools in time
- 💾 Automatic backup before update, can update with confidence

### 3. Multi-Language Switching Strategy

**Tip**: Flexibly use language parameters to adapt to different scenario needs.

```bash
# Set all languages to Chinese uniformly
npx zcf init -g zh-CN

# Templates Chinese, AI output English (suitable for scenarios requiring English code comments)
npx zcf init -c zh-CN -a en

# Only switch language during update
npx zcf update -c en
```

**Usage Scenarios**:
- 🌐 **International Projects**: Use English templates for team collaboration
- 🇨🇳 **Chinese Projects**: Use Chinese templates to improve readability
- 🔀 **Mixed Scenarios**: Templates Chinese, AI output English code comments

### 4. Multi-Device Configuration Sync

**Tip**: Sync configurations across multiple devices to maintain consistent development environment.

#### Method 1: Use Git Worktree

```bash
# Create worktree in project and migrate configuration
/git-worktree migrate

# Or use command line
git worktree add ../project-config
cp -r ~/.claude/* ../project-config/.claude/
```

#### Method 2: Use Cloud Storage Sync

```bash
# Use Dropbox, iCloud, OneDrive, etc.
# Link configuration directory to cloud storage

# macOS/iCloud
ln -s ~/Library/Mobile\ Documents/com~apple~CloudDocs/.zcf-configs ~/.zcf-sync

# Sync configuration
rsync -av ~/.claude/ ~/.zcf-sync/claude/
rsync -av ~/.codex/ ~/.zcf-sync/codex/
```

#### Method 3: Use Version Control

```bash
# Create configuration repository
mkdir ~/zcf-configs && cd ~/zcf-configs
git init

# Add configuration files (note: exclude sensitive information)
echo "*.key" >> .gitignore
echo "auth.json" >> .gitignore
git add .claude/ .codex/
git commit -m "Initial ZCF configs"

# Pull across multiple devices
git pull origin main
```

### 5. Scripted Operations Deployment

**Tip**: Combine `--skip-prompt` parameter with JSON configuration to achieve automated deployment.

#### CI/CD Script Example

```bash
#!/bin/bash
# deploy-zcf.sh - Automated ZCF configuration deployment

# Read configuration from environment variables
API_KEY=${ZCF_API_KEY}
PROVIDER=${ZCF_PROVIDER:-302ai}
LANG=${ZCF_LANG:-zh-CN}

# Non-interactive initialization
npx zcf init -s \
  --provider "$PROVIDER" \
  --api-key "$API_KEY" \
  --all-lang "$LANG" \
  --mcp-services all \
  --workflows all \
  --output-styles all

echo "ZCF configuration deployment completed"
```

#### New Employee Onboarding Script

```bash
#!/bin/bash
# onboard-dev.sh - New developer onboarding configuration script

echo "Configuring development environment..."

# 1. Configure ZCF (using configuration file)
npx zcf init -s --api-configs-file ./team-api-configs.json

# 2. Update workflows
npx zcf update -s -g zh-CN

# 3. Check tool versions
npx zcf check-updates

echo "Development environment configuration completed!"
```

#### Batch Deployment Script

```bash
#!/bin/bash
# batch-deploy.sh - Batch server deployment

SERVERS=("server1" "server2" "server3")

for server in "${SERVERS[@]}"; do
  echo "Deploying to $server..."
  ssh "$server" "npx zcf init -s -p 302ai -k '${API_KEY}' -g zh-CN"
done
```

### 6. Monitor Usage

**Tip**: Use `ccu` command to monitor API usage and prevent excessive calls.

```bash
# View usage statistics
npx zcf ccu

# Output JSON format (for integration into monitoring systems)
npx zcf ccu --json > usage.json

# View detailed statistics
npx zcf ccu --verbose
```

**Integration Example**:

```bash
#!/bin/bash
# monitor-usage.sh - Usage monitoring script

# Get usage
USAGE=$(npx zcf ccu --json)

# Parse JSON (using jq)
TOKENS=$(echo "$USAGE" | jq '.tokens.total')
COST=$(echo "$USAGE" | jq '.cost.total')

# Send alert (if exceeds threshold)
if [ "$TOKENS" -gt 1000000 ]; then
  echo "Warning: Token usage exceeds 1 million!" | mail -s "ZCF Usage Alert" admin@example.com
fi
```

## Advanced Tips

### 7. Use API Provider Presets

**Tip**: Use provider presets to simplify configuration, reducing from 5+ parameters to just 2.

```bash
# Traditional method (requires multiple parameters)
npx zcf init -s \
  -t api_key \
  -k "sk-xxx" \
  -u "https://api.302.ai/v1" \
  -M "claude-sonnet-4-5" \
  -F "claude-haiku-4-5"

# Use preset (only 2 parameters needed)
npx zcf init -s -p 302ai -k "sk-xxx"
```

**Supported Providers**: `302ai`, `glm`, `minimax`, `kimi`, `custom`

### 8. Multi-Configuration Management

**Tip**: Use configuration switching to quickly switch between different environments.

```bash
# List all configurations
npx zcf config-switch --list

# Switch to work configuration
npx zcf config-switch work

# Switch to personal configuration
npx zcf config-switch personal

# Switch in Codex
npx zcf config-switch work --code-type codex
```

**Naming Suggestions**:
- `work` - Work environment configuration
- `personal` - Personal environment configuration
- `test` - Test environment configuration
- `demo` - Demo environment configuration

### 9. Workflow Combination

**Tip**: Combine different workflows to improve development efficiency.

```bash
# 1. Use feature development workflow to plan features
/zcf:feat Add user comment functionality

# 2. Use six-stage workflow to implement details
/zcf:workflow Implement comment CRUD operations

# 3. Use Git workflow to commit code
/git-commit

# 4. Use BMad workflow for iteration
/zcf:bmad-init
```

### 10. Output Style Strategy

**Tip**: Choose appropriate output styles for different scenarios.

```bash
# View available styles
npx zcf init -s -o all

# Switch style in conversation
# Claude Code: /set-output-style engineer-professional
# Codex: Configure through system prompt
```

**Style Selection Recommendations**:
- `engineer-professional` - Professional engineer style, suitable for formal projects
- `nekomata-engineer` - Nekomata engineer style, suitable for relaxed atmosphere
- `laowang-engineer` - Laowang engineer style, suitable for Chinese environment
- `ojousama-engineer` - Ojousama engineer style, suitable for specific scenarios

### 11. MCP Service Optimization

**Tip**: Select MCP services based on project needs, avoid installing unnecessary services.

```bash
# Only install necessary services
npx zcf init -s -m context7,open-websearch

# View all available services
npx zcf
# Select 4 (Configure MCP), view list
```

**Service Selection Recommendations**:
- **Document Query**: `context7` - Query library documentation
- **Web Search**: `open-websearch` - Multi-engine search
- **Requirements Analysis**: `spec-workflow` - Structured requirements
- **Code Search**: `serena` - Semantic code search
- **Browser Operations**: `Playwright` - Automated testing

### 12. Backup Strategy

**Tip**: Properly use backup functionality to ensure configuration security.

```bash
# Automatic backup (automatically executed during init and update)
npx zcf init  # Automatic backup

# Manual backup of specific configuration
cp -r ~/.claude ~/.claude.backup.$(date +%Y%m%d)

# Regularly clean old backups (keep last 7 days)
find ~/.claude/backup -name "*.bak" -mtime +7 -delete
```

### 13. Quick Recovery from Failures

**Tip**: Quickly recover configuration when encountering problems.

```bash
# 1. Find recent backup
ls -lt ~/.claude/backup/ | head -5

# 2. Restore backup
cp -r ~/.claude/backup/backup_2025-01-15_10-30-45/* ~/.claude/

# 3. Or reinitialize (will create new backup)
npx zcf init --config-action backup
```

### 14. Version Control Integration

**Tip**: Include configuration in version control, but exclude sensitive information.

```bash
# Create .gitignore
cat > ~/.zcf-configs/.gitignore << EOF
# Exclude sensitive information
*.key
auth.json
settings.json
config.toml

# Include templates and workflows
!templates/
!workflows/
!prompts/
EOF

# Commit configuration
git add .gitignore templates/ workflows/
git commit -m "Add ZCF templates and workflows"
```

### 15. Performance Optimization

**Tip**: Optimize configuration to improve response speed.

```bash
# 1. Only install needed MCP services
npx zcf init -s -m context7,open-websearch  # Only install necessary services

# 2. Use local cache (if supported)
# Some MCP services support local cache, can speed up response

# 3. Regularly clean backups
npx zcf uninstall --mode custom --items backups
```

## Team Collaboration Tips

### 16. Unified Team Configuration

**Tip**: Unify configuration standards within team.

```bash
# Create team configuration template
cat > team-config.json << EOF
{
  "provider": "302ai",
  "lang": "zh-CN",
  "mcpServices": ["context7", "open-websearch", "spec-workflow"],
  "workflows": ["sixStepsWorkflow", "gitWorkflow", "featPlanUx"],
  "outputStyle": "engineer-professional"
}
EOF

# Team members use same configuration
npx zcf init -s --api-configs-file team-config.json -k "Personal API Key"
```

### 17. Document Sharing

**Tip**: Share workflow templates and configuration templates.

```bash
# Export workflow templates
tar -czf team-workflows.tar.gz ~/.claude/workflows/

# Team members import
tar -xzf team-workflows.tar.gz -C ~/.claude/
```

### 18. Code Review Integration

**Tip**: Integrate ZCF workflows into code review process.

```bash
# Use workflow-generated content in PR description
/zcf:feat New feature name

# Generated documents can be directly used for PR description
```

## Troubleshooting Tips

### 19. Quick Diagnosis

**Tip**: Use built-in commands to quickly diagnose problems.

```bash
# Check configuration
cat ~/.claude/settings.json | jq .

# Check MCP services
cat ~/.claude/settings.json | jq .mcpServers

# Check workflows
ls -la ~/.claude/workflows/

# Check version
npx zcf check-updates
```

### 20. Log Analysis

**Tip**: View ZCF execution logs to locate problems.

```bash
# Enable verbose output
npx zcf init --verbose 2>&1 | tee zcf.log

# View logs
cat zcf.log | grep -i error
```

## Related Resources

- [CLI Commands](../cli/) - Detailed descriptions of all commands
- [Configuration Management](../features/multi-config.md) - Multi-configuration and backup system
- [Troubleshooting](../advanced/troubleshooting.md) - Common problem solutions
- [Worktree Parallel Development](worktree.md) - Git Worktree usage tips

> 💡 **Tip**: These tips can be flexibly combined according to actual needs. It's recommended to start with basic tips and gradually master advanced tips.


