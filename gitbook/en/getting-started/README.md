# Getting Started

Welcome to ZCF! This guide will help you configure and use your Claude Code environment in just a few minutes.

## 🎯 Before You Begin

### System Requirements

- **Node.js**: 16.0 or higher
- **npm/pnpm/yarn**: Any package manager
- **Operating System**: Windows, macOS, Linux (including Termux)
- **Claude Code**: Requires Anthropic API Key or Auth Token

### Get API Access

Before starting, you need:

1. **Anthropic API Key** - Get from [Anthropic Console](https://console.anthropic.com/)
2. **Claude Code Auth Token** (Recommended) - OAuth authentication

## 🚀 Installation & Initialization

### Method 1: Interactive Installation (Recommended)

```bash
npx zcf
```

This will display the main menu - select `Complete Initialization` to automatically complete all configuration.

### Method 2: Direct Initialization

```bash
npx zcf i
```

### Method 3: Global Installation

```bash
npm install -g zcf
zcf
```

## 📋 Initialization Process

ZCF initialization includes the following steps:

### Step 1: Language Selection
- Support Chinese (`zh-CN`) and English (`en`)
- Affects interface display and configuration template language

### Step 2: Claude Code Detection & Installation
- Automatically detect if Claude Code is installed
- Provide automatic installation option when not installed
- Support package manager installation on all platforms

### Step 3: API Configuration
Choose your authentication method:
- **Auth Token** (OAuth) - Recommended, more secure and convenient
- **API Key** - Traditional method, requires manual management

### Step 4: MCP Service Configuration
Automatically configure common MCP services:
- **Context7** - Get library documentation and code examples
- **DeepWiki** - GitHub repository documentation queries
- **Exa** - AI search and web scraping
- **Figma** - Design to code generation
- **Playwright** - Browser automation

### Step 5: Workflow Template Installation
Install corresponding templates based on language preference:
- **Memory Configuration** - AI personality and rules settings
- **Common Commands** - Project initialization, architecture analysis
- **Git Tools** - Commit, branch management, rollback
- **Planning Tools** - Task planning, UI/UX design
- **Six-Step Workflow** - Professional development process

## ✅ Verify Installation

After completing installation, you can verify through:

### Check Claude Code Status
```bash
claude --version
```

### Verify MCP Services
```bash
claude mcp list
```

### Test Basic Functionality
```bash
claude "Hello Claude! Please introduce your capabilities."
```

If the above commands run normally, your environment is configured successfully!

## 🎉 Next Steps

After environment configuration is complete, we recommend you:

1. **Read Advanced Guide** - Learn more advanced configuration options
2. **Learn Usage Tips** - Master Claude Code best practices
3. **Explore Workflows** - Use preset templates to improve development efficiency
4. **Join Community** - Follow project updates on GitHub

---

Having issues? Check our [Troubleshooting Guide](../advanced-guide/troubleshooting.md) or [Submit an Issue](https://github.com/UfoMiao/zcf/issues).