# First Run

Congratulations on successfully installing ZCF! This guide will walk you through your first run and basic configuration.

## 🎬 Starting ZCF

### Interactive Menu Mode

Run the following command to start the main menu:

```bash
npx zcf
```

You will see an interface like this:

```
 ________  ______  ________
|        \/      \/        |
| ZCF - Zero-Config Claude-Code Flow |
|__________________________________|

Select operation:
 1. 🚀 Complete Initialization (recommended for new users)
 2. 🔄 Update workflows only
 3. 🌐 Claude Code Router Management
 4. 📊 Usage Analytics
 5. 🔍 Check Tool Updates
 6. ❌ Exit

Enter option number:
```

### Direct Command Mode

If you're already familiar with ZCF, you can also use direct commands:

```bash
# Complete initialization
npx zcf i

# Update workflows
npx zcf u

# CCR management
npx zcf ccr

# Usage analytics
npx zcf ccu

# Check updates
npx zcf check-updates
```

## 🚀 Complete Initialization Process

After selecting `Complete Initialization`, ZCF will guide you through the following configuration:

### Step 1: Language Preference Setting

```
Select your language preference:
 1. 中文 (zh-CN)
 2. English (en)

Enter option number [1]:
```

**Suggestion**: Choose the language you're most familiar with, which will affect:
- Interface display language
- Configuration template language
- Workflow command language

### Step 2: Claude Code Detection & Installation

ZCF will automatically detect whether Claude Code is installed on your system:

#### If Already Installed
```
✅ Detected Claude Code v1.2.3
🔍 Checking configuration files...
```

#### If Not Installed
```
⚠️  Claude Code not detected
Do you want to install automatically? (y/N): y

📦 Installing Claude Code...
  - Detecting package manager: npm
  - Executing install command: npm install -g @anthropic/claude-cli
  - Installation complete ✅
```

### Step 3: API Configuration

Configure your Anthropic API access:

```
Select API configuration method:
 1. 🔐 Auth Token (OAuth authentication) [Recommended]
 2. 🔑 API Key (manual configuration)

Enter option number [1]:
```

#### Choose Auth Token (Recommended)
```
Browser will be opened for OAuth authentication...
🌐 https://claude.ai/oauth/authorize?...

Please complete authentication in browser, then return to terminal
Press Enter to continue after authentication...

✅ Auth Token configured successfully
```

#### Choose API Key
```
Enter your Anthropic API Key:
> sk-ant-api03-xxxxxxxxxxxx

✅ API Key verified successfully
💾 Configuration saved to ~/.claude/config.json
```

### Step 4: MCP Service Configuration

ZCF provides multiple pre-configured MCP services:

```
Select MCP services to install:
 □ Context7 - Get latest library docs and code examples
 □ DeepWiki - GitHub repository documentation queries
 □ Exa - AI search and web content scraping
 □ Playwright - Browser automation testing

Use space to select, Enter to confirm: Select all
```

**Recommended Configuration**:
- **Context7**: Quick library documentation queries during programming
- **DeepWiki**: Useful when researching open source projects
- **Exa**: Use when you need to search for latest information

### Step 5: Workflow Template Installation

```
Select workflow templates to install:
 □ Memory Configuration - AI personality and rules settings
 □ Common Commands - Project initialization, architecture analysis
 □ Git Tools - Commit, branch management, rollback
 □ Planning Tools - Task planning, UI/UX design
 □ Six-Step Workflow - Professional development process

Use space to select, Enter to confirm: Select all
```

**Template Description**:
- **Memory Configuration**: Set Claude's working methods and rules
- **Common Commands**: Contains commonly used project management commands
- **Git Tools**: Intelligent Git operations tools
- **Planning Tools**: Help plan and design features
- **Six-Step Workflow**: Structured development process

### Step 6: Configuration Complete

```
🎉 Configuration complete!

✅ Claude Code installed and configured
✅ API authentication setup complete
✅ MCP service configuration complete (3 services)
✅ Workflow template installation complete (5 templates)

📁 Configuration file locations:
  - Claude config: ~/.claude/config.json
  - MCP config: ~/.claude/mcp.json
  - Workflows: ~/.claude/workflows/

💡 Next you can:
  1. Run 'claude --help' to view available commands
  2. Use '/init-project' command to initialize new project
  3. View complete documentation for more usage tips
```

## 🔍 Configuration Verification

### Verify Claude Code Installation
```bash
claude --version
# Output: claude-cli version 1.2.3
```

### Verify MCP Services
```bash
claude mcp list
# Output: List of configured MCP services
```

### Test Basic Functionality
```bash
claude "Hello, please introduce your capabilities"
```

### View Workflow Commands
```bash
claude help
# View all available workflow commands
```

## ⚙️ Configuration Files Description

ZCF will create the following configuration files on your system:

### Main Config File `~/.claude/config.json`
```json
{
  "apiKey": "your-api-key-or-token",
  "baseUrl": "https://api.anthropic.com",
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 4096
}
```

### MCP Config File `~/.claude/mcp.json`
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["context7"],
      "env": {}
    }
  }
}
```

### Workflows Directory `~/.claude/workflows/`
- `memory/` - AI personality configuration
- `commands/` - Custom commands
- `agents/` - Intelligent agent configuration

## 🛠️ First Run Troubleshooting

### Issue 1: Unable to Connect to API
```bash
# Test API connection
curl -H "Authorization: Bearer $ZCF_API_KEY" \
     https://api.anthropic.com/v1/models

# Check API Key/Token
claude config show
```

### Issue 2: MCP Service Startup Failed
```bash
# Manually test MCP service
npx context7 --version

# Check environment variables
env | grep CONTEXT7
```

### Issue 3: Workflow Commands Not Available
```bash
# Check workflow installation
ls ~/.claude/workflows/

# Reinstall workflows
npx zcf u
```

## 🎯 Next Steps Recommendations

After completing first configuration, we recommend:

1. **Familiarize with Basic Commands** - Try using `/init-project` to initialize a test project
2. **Read Advanced Guide** - Learn about advanced configuration and customization options
3. **Learn Usage Tips** - Master Claude Code best practices
4. **Join Community** - Follow [project GitHub](https://github.com/UfoMiao/zcf) for updates

---

Having issues? Check our [Troubleshooting Guide](../advanced-guide/troubleshooting.md) or [submit an Issue](https://github.com/UfoMiao/zcf/issues) on GitHub.