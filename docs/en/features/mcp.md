---
title: MCP Service Integration
---

# MCP Service Integration

ZCF has built-in common MCP (Model Context Protocol) service configurations, supporting one-click installation and management of multiple MCP services to extend AI assistant capabilities.

## What is MCP

MCP (Model Context Protocol) is an open protocol that allows AI assistants to access external tools and services. Through MCP, Claude Code and Codex can:

- 🔍 Query the latest library documentation and code examples
- 🌐 Perform web searches
- 📚 Access GitHub repository documentation
- 🎭 Control browsers for automated operations
- 🔎 Perform semantic code search and editing

## Default Service List

ZCF has built-in the following MCP service configurations:

| Service ID | Type | Description | Requires API Key | Official Documentation |
|---------|------|------|-----------------|---------|
| `context7` | stdio | Context retrieval and library documentation query | ❌ | [Context7](https://context7.com) |
| `open-websearch` | stdio | DuckDuckGo/Bing/Brave search engines | ❌ | [open-webSearch](https://github.com/Aas-ee/open-webSearch) |
| `spec-workflow` | stdio | Spec workflow MCP service | ❌ | [spec-workflow-mcp](https://github.com/Pimzino/spec-workflow-mcp) |
| `mcp-deepwiki` | stdio | DeepWiki documentation retrieval | ❌ | [mcp-deepwiki](https://github.com/context-labs/deepwiki) |
| `Playwright` | stdio | Playwright browser automation operations | ❌ | [mcp-playwright](https://github.com/modelcontextprotocol/server-playwright) |
| `exa` | stdio | Exa AI web search | ✅ Requires `EXA_API_KEY` | [mcp-exa](https://github.com/modelcontextprotocol/server-exa) |
| `serena` | uvx | Serena IDE assistant, semantic code search | ❌ | [Serena](https://github.com/modelcontextprotocol/server-serena) |

## Service Details

### Context7 - Document Query

Context7 provides the latest library documentation and code example query capabilities:

**Features**:
- 📚 Query the latest documentation for libraries
- 💡 Get code examples and usage methods
- 🔄 Automatically keep documentation up to date

**Usage Example**:
```
Please query the latest documentation and examples for React useState hook
```

### Open Web Search - Web Search

Open Web Search provides multi-engine web search capabilities:

**Features**:
- 🔍 Supports DuckDuckGo, Bing, and Brave search engines
- 🔒 Default uses privacy-focused search engines
- ⚙️ Customizable search engine preferences
- 🚫 No API key required, ready to use
- 📊 Supports merging search results from multiple engines

**Usage Example**:
```
Search for the latest TypeScript 5.0 new features
```

### Spec Workflow - Workflow Management

Spec Workflow provides a structured feature development workflow from requirements to implementation:

**Features**:
- 📋 Requirements Analysis: Structured requirements collection and documentation
- 🎨 Design Phase: Detailed technical design and architecture planning
- ✅ Task Management: Automatic task breakdown and progress tracking
- 🔄 Implementation Workflow: Systematic approach from requirements to implementation
- 📊 Interactive Dashboard: Built-in workflow visualization and management dashboard
- ✍️ Approval System: Review and approval process for each development phase

**Usage**:

Manually start the dashboard:
```bash
npx -y @pimzino/spec-workflow-mcp@latest --dashboard
```

Or install the [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=Pimzino.spec-workflow-mcp) for integrated workflow management functionality.

> 📖 **Detailed Documentation**: Please refer to the [Spec Workflow Official Documentation](https://github.com/Pimzino/spec-workflow-mcp/blob/main/README.md#quick-start).

### DeepWiki - GitHub Documentation

DeepWiki provides GitHub repository documentation query capabilities:

**Features**:
- 📚 Query GitHub repository documentation
- 🔍 Search code examples and usage
- 🌐 Access documentation from public repositories

**Usage Example**:
```
Query the Composition API documentation for vuejs/core repository
```

### Playwright - Browser Control

Playwright provides browser automation operation capabilities:

**Features**:
- 🌐 Control browsers for automated operations
- 📸 Screenshots and page content extraction
- 🔄 Simulate user interactions
- 📊 Form filling and submission

> ⚠️ **Note**: First run may require downloading browsers, please be patient.

### Exa - AI Web Search

Exa provides AI-based web search capabilities:

**Features**:
- 🤖 Use AI for intelligent web search
- 🎯 More accurate search results
- 📊 Result summaries and analysis

**Configuration Requirements**:
Need to set `EXA_API_KEY` environment variable:
```bash
export EXA_API_KEY="your-api-key"
```

Get API Key: Visit [Exa Dashboard](https://dashboard.exa.ai/api-keys)

### Serena - Semantic Code Search

Serena provides IDE-like semantic code search and editing capabilities:

**Features**:
- 🔍 Semantic code search
- ✏️ Smart code editing suggestions
- 📊 Code context understanding

## Installation and Configuration

### Interactive Installation

Select MCP services to install through ZCF menu:

```bash
npx zcf
# Select 4. Configure MCP
```

In the interactive interface, you can:
- ✅ Check services to install
- 🔑 Enter keys for services requiring API Key
- 📋 View detailed descriptions for each service

### Command Line Installation

```bash
# Install all MCP services (recommended)
npx zcf i -s --mcp-services all

# Selective installation
npx zcf i -s --mcp-services context7,open-websearch,spec-workflow

# Skip MCP service installation
npx zcf i -s --mcp-services skip
```

### Environment Variable Configuration

For services requiring API Key (like Exa), you need to set environment variables:

```bash
# Set Exa API Key
export EXA_API_KEY="your-exa-api-key"

# Persist configuration (add to ~/.bashrc or ~/.zshrc)
echo 'export EXA_API_KEY="your-exa-api-key"' >> ~/.bashrc
```

> 💡 **Tip**: Environment variables can be imported through ZCF menu option `7` to import recommended environment variable configurations.

## Configuration File Locations

MCP service configurations are saved in different configuration files:

### Claude Code

Configuration file: `~/.claude/settings.json`

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context-labs/context7"]
    },
    "open-websearch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-open-websearch"]
    }
  }
}
```

### Codex

Configuration file: `~/.codex/config.toml`

```toml
[mcp_server.context7]
command = "npx"
args = ["-y", "@context-labs/context7"]

[mcp_server.open-websearch]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-open-websearch"]
```

## Cross-Platform Support

### Windows Special Handling

ZCF automatically corrects Windows path formats to ensure MCP services run normally on Windows:

- Automatic Windows environment detection
- Correct path separators and escape characters
- Use `cmd /c npx` format to ensure command execution

> 💡 **Tip**: If you encounter MCP connection issues on Windows, running `npx zcf` will automatically fix the configuration format.

### WSL and Termux

ZCF fully supports WSL and Termux environments, and MCP services can work normally in these environments as well.

## Service Management

### Reconfigure MCP Services

If you need to reconfigure MCP services:

```bash
npx zcf
# Select 4. Configure MCP
```

### Add New Services

If you manually added new MCP services, ZCF will intelligently merge configurations:

```bash
# Execute incremental update
npx zcf i
# Select "Merge Configuration" strategy
```

### Remove Services

Manually remove services from configuration files, or reconfigure through ZCF menu:

```bash
npx zcf
# Select 4. Configure MCP
# Uncheck services you don't need
```

## Verify Service Connection

### Check Service Status

In Claude Code/Codex MCP panel:

1. Open Settings → MCP Services
2. View service list
3. Confirm services show as "Connected" status

### Test Service Functionality

Try using MCP service functionality:

```
# Context7 Test
Please query the latest documentation for React hooks

# Open Web Search Test
Search for the latest Vue 3.5 update content

# DeepWiki Test
Query the documentation for TypeScript official repository
```

> ✅ **Success Indicator**: If AI can normally use services and return results, the service connection is successful.

## Troubleshooting

### Service Not Connected

**Issue**: MCP service shows as not connected

**Solution**:
1. Check if service is correctly installed: `npm list -g | grep <service-name>`
2. Reconfigure service: `npx zcf` → `4`
3. Check if configuration file format is correct

### API Key Error

**Issue**: Services like Exa prompt API Key error

**Solution**:
1. Confirm environment variable is set: `echo $EXA_API_KEY`
2. Reload environment variables or restart terminal
3. Check if API Key is valid

### Windows Path Issues

**Issue**: MCP services cannot start on Windows

**Solution**:
```bash
npx zcf
# Select 4. Configure MCP
# ZCF will automatically fix Windows path format
```

## Best Practices

1. **Install on Demand**: Only install MCP services you actually need to reduce resource consumption
2. **Regular Updates**: Update MCP service configurations through `npx zcf update`
3. **Environment Variable Management**: Use `.env` files or system environment variables to manage API Keys
4. **Test Verification**: Test each service's functionality after installation to ensure normal operation

## Next Steps

Learn more about MCP related content:

- 📚 [Workflow Details](../workflows/) - Learn how to use MCP services in workflows
- 🔧 [Configuration Management](../advanced/configuration.md) - Deep dive into MCP configuration management
- 🎯 [Claude Code Configuration](claude-code.md) - Learn about MCP integration in Claude Code
- 🚀 [Codex Support](codex.md) - Learn about MCP integration in Codex


