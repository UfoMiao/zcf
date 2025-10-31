# 安装指南

本指南详细介绍 ZCF 的各种安装方式和系统要求。

## 📋 系统要求

### 基础环境
- **Node.js**: 16.0+ (推荐 18.0+)
- **包管理器**: npm、pnpm 或 yarn
- **内存**: 最少 512MB 可用内存
- **网络**: 需要互联网连接下载依赖

### 支持的操作系统
- **Windows** 10/11 (包括 WSL)
- **macOS** 10.15+ (Intel/Apple Silicon)
- **Linux** 各主流发行版
- **Termux** Android 终端环境

### API 访问要求
- Anthropic API Key 或 Claude Code Auth Token
- 稳定的网络连接访问 Anthropic API

## 🚀 安装方式

### 方式一：NPX 直接使用 (推荐)

无需安装，直接使用最新版本：

```bash
npx zcf
```

**优势**:
- 总是使用最新版本
- 无需占用本地存储空间
- 适合偶尔使用的场景

### 方式二：全局安装

安装到全局环境，随时可用：

```bash
# 使用 npm
npm install -g zcf

# 使用 pnpm
pnpm add -g zcf

# 使用 yarn
yarn global add zcf

# 安装后使用
zcf
```

**优势**:
- 启动速度快
- 离线使用（已缓存版本）
- 适合频繁使用的场景

### 方式三：本地项目安装

在特定项目中安装：

```bash
# 使用 npm
npm install zcf --save-dev

# 使用 pnpm  
pnpm add -D zcf

# 使用 yarn
yarn add -D zcf

# 使用 npx 运行
npx zcf
```

**优势**:
- 项目级别的版本控制
- 团队协作时版本一致
- 适合项目特定配置需求

## 🔧 特殊环境安装

### Windows 环境

#### PowerShell 执行策略
如果遇到执行策略限制：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Windows Subsystem for Linux (WSL)
在 WSL 中安装：
```bash
# 确保 Node.js 已安装
node --version
npm --version

# 正常安装 ZCF
npx zcf
```

### macOS 环境

#### Homebrew 用户
如果通过 Homebrew 管理 Node.js：
```bash
# 确保 Node.js 最新
brew upgrade node

# 安装 ZCF
npm install -g zcf
```

#### 权限问题解决
如果遇到权限问题：
```bash
# 创建 npm 全局目录
mkdir ~/.npm-global

# 配置 npm
npm config set prefix '~/.npm-global'

# 添加到 PATH (添加到 ~/.zshrc 或 ~/.bash_profile)
export PATH=~/.npm-global/bin:$PATH

# 重新加载配置
source ~/.zshrc  # 或 source ~/.bash_profile
```

### Linux 环境

#### Ubuntu/Debian
```bash
# 更新包管理器
sudo apt update

# 安装 Node.js (如果未安装)
sudo apt install nodejs npm

# 安装 ZCF
sudo npm install -g zcf
```

#### CentOS/RHEL/Fedora
```bash
# 使用 yum/dnf
sudo dnf install nodejs npm  # Fedora
sudo yum install nodejs npm  # CentOS/RHEL

# 安装 ZCF
sudo npm install -g zcf
```

#### Arch Linux
```bash
# 使用 pacman
sudo pacman -S nodejs npm

# 安装 ZCF
sudo npm install -g zcf
```

### Termux (Android)

在 Android Termux 环境中：

```bash
# 更新包管理器
pkg update && pkg upgrade

# 安装 Node.js
pkg install nodejs

# 安装 ZCF
npm install -g zcf

# 运行
zcf
```

## 🔍 安装验证

### 验证 ZCF 安装
```bash
# 检查版本
zcf --version

# 或者
npx zcf --version
```

### 验证 Node.js 环境
```bash
# 检查 Node.js 版本
node --version

# 检查 npm 版本  
npm --version

# 检查全局安装的包
npm list -g --depth=0
```

## 🛠️ 常见安装问题

### 问题 1: 网络连接超时
```bash
# 使用淘宝镜像源
npm config set registry https://registry.npmmirror.com

# 或临时使用镜像
npx --registry https://registry.npmmirror.com zcf
```

### 问题 2: 权限拒绝 (Linux/macOS)
```bash
# 方案 1: 使用 sudo (不推荐)
sudo npm install -g zcf

# 方案 2: 更改 npm 默认目录 (推荐)
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### 问题 3: Node.js 版本过低
```bash
# 使用 nvm 管理 Node.js 版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 问题 4: Windows 路径问题
```bash
# 使用 PowerShell (管理员权限)
npm install -g zcf --force

# 或者设置 npm 缓存目录
npm config set cache "C:/npm-cache" --global
```

## 🔄 更新和卸载

### 更新 ZCF
```bash
# 全局更新
npm update -g zcf

# 或重新安装最新版
npm install -g zcf@latest
```

### 卸载 ZCF
```bash
# 全局卸载
npm uninstall -g zcf

# 清理缓存
npm cache clean --force
```

---

安装完成后，继续阅读 [首次运行](first-run.md) 指南开始配置您的 Claude Code 环境。