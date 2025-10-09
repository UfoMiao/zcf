# Installation Guide

This guide provides detailed installation methods and system requirements for ZCF.

## 📋 System Requirements

### Basic Environment
- **Node.js**: 16.0+ (18.0+ recommended)
- **Package Manager**: npm, pnpm, or yarn
- **Memory**: At least 512MB available memory
- **Network**: Internet connection required for downloading dependencies

### Supported Operating Systems
- **Windows** 10/11 (including WSL)
- **macOS** 10.15+ (Intel/Apple Silicon)
- **Linux** Major distributions
- **Termux** Android terminal environment

### API Access Requirements
- Anthropic API Key or Claude Code Auth Token
- Stable network connection to access Anthropic API

## 🚀 Installation Methods

### Method 1: NPX Direct Use (Recommended)

Use the latest version without installation:

```bash
npx zcf
```

**Advantages**:
- Always uses the latest version
- No local storage space required
- Perfect for occasional use

### Method 2: Global Installation

Install to global environment for easy access:

```bash
# Using npm
npm install -g zcf

# Using pnpm
pnpm add -g zcf

# Using yarn
yarn global add zcf

# Run after installation
zcf
```

**Advantages**:
- Faster startup
- Offline usage (cached version)
- Perfect for frequent use

### Method 3: Local Project Installation

Install in specific project:

```bash
# Using npm
npm install zcf --save-dev

# Using pnpm
pnpm add -D zcf

# Using yarn
yarn add -D zcf

# Run with npx
npx zcf
```

**Advantages**:
- Project-level version control
- Consistent versions for team collaboration
- Suitable for project-specific configuration needs

## 🔧 Special Environment Installation

### Windows Environment

#### PowerShell Execution Policy
If you encounter execution policy restrictions:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Windows Subsystem for Linux (WSL)
Install in WSL:
```bash
# Ensure Node.js is installed
node --version
npm --version

# Install ZCF normally
npx zcf
```

### macOS Environment

#### Homebrew Users
If managing Node.js through Homebrew:
```bash
# Ensure latest Node.js
brew upgrade node

# Install ZCF
npm install -g zcf
```

#### Permission Issues Resolution
If you encounter permission issues:
```bash
# Create npm global directory
mkdir ~/.npm-global

# Configure npm
npm config set prefix '~/.npm-global'

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
export PATH=~/.npm-global/bin:$PATH

# Reload configuration
source ~/.zshrc  # or source ~/.bash_profile
```

### Linux Environment

#### Ubuntu/Debian
```bash
# Update package manager
sudo apt update

# Install Node.js (if not installed)
sudo apt install nodejs npm

# Install ZCF
sudo npm install -g zcf
```

#### CentOS/RHEL/Fedora
```bash
# Using yum/dnf
sudo dnf install nodejs npm  # Fedora
sudo yum install nodejs npm  # CentOS/RHEL

# Install ZCF
sudo npm install -g zcf
```

#### Arch Linux
```bash
# Using pacman
sudo pacman -S nodejs npm

# Install ZCF
sudo npm install -g zcf
```

### Termux (Android)

In Android Termux environment:

```bash
# Update package manager
pkg update && pkg upgrade

# Install Node.js
pkg install nodejs

# Install ZCF
npm install -g zcf

# Run
zcf
```

## 🔍 Installation Verification

### Verify ZCF Installation
```bash
# Check version
zcf --version

# Or
npx zcf --version
```

### Verify Node.js Environment
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check globally installed packages
npm list -g --depth=0
```

## 🛠️ Common Installation Issues

### Issue 1: Network Connection Timeout
```bash
# Use Taobao mirror source
npm config set registry https://registry.npmmirror.com

# Or temporarily use mirror
npx --registry https://registry.npmmirror.com zcf
```

### Issue 2: Permission Denied (Linux/macOS)
```bash
# Solution 1: Use sudo (not recommended)
sudo npm install -g zcf

# Solution 2: Change npm default directory (recommended)
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Issue 3: Node.js Version Too Old
```bash
# Use nvm to manage Node.js versions
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### Issue 4: Windows Path Issues
```bash
# Use PowerShell (Administrator privileges)
npm install -g zcf --force

# Or set npm cache directory
npm config set cache "C:/npm-cache" --global
```

## 🔄 Update and Uninstall

### Update ZCF
```bash
# Global update
npm update -g zcf

# Or reinstall latest version
npm install -g zcf@latest
```

### Uninstall ZCF
```bash
# Global uninstall
npm uninstall -g zcf

# Clean cache
npm cache clean --force
```

---

After installation, continue reading the [First Run](first-run.md) guide to start configuring your Claude Code environment.