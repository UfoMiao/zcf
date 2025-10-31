# 高级配置

本指南详细介绍 ZCF 的高级配置选项，帮助您根据具体需求优化 Claude Code 环境。

## 📁 配置文件概览

ZCF 使用分层配置系统，按优先级顺序：

```
1. 命令行参数 (最高优先级)
2. 环境变量
3. 项目配置文件 (./.claude/config.json)
4. 用户配置文件 (~/.claude/config.json)  
5. 全局默认配置 (最低优先级)
```

## ⚙️ 主配置文件详解

### 基础 API 配置

```json
{
  "api": {
    "provider": "anthropic",
    "baseUrl": "https://api.anthropic.com",
    "model": "claude-3-5-sonnet-20241022",
    "timeout": 30000,
    "retries": 3,
    "maxTokens": 4096,
    "temperature": 0.7
  }
}
```

**配置说明**：
- `provider`: API 提供商 (`anthropic`)
- `baseUrl`: API 基础 URL，支持自定义端点
- `model`: 使用的 Claude 模型版本
- `timeout`: 请求超时时间 (毫秒)
- `retries`: 失败重试次数
- `maxTokens`: 最大 token 数量
- `temperature`: 创造性参数 (0.0-1.0)

### 代理和网络配置

```json
{
  "network": {
    "proxy": {
      "http": "http://proxy.company.com:8080",
      "https": "https://proxy.company.com:8080",
      "noProxy": ["localhost", "127.0.0.1", "*.internal.com"]
    },
    "headers": {
      "User-Agent": "ZCF/2.11.0",
      "X-Custom-Header": "custom-value"
    },
    "keepAlive": true,
    "maxSockets": 10
  }
}
```

### 缓存配置

```json
{
  "cache": {
    "enabled": true,
    "ttl": 3600,
    "maxSize": "100MB",
    "location": "~/.claude/cache",
    "strategy": "lru",
    "compression": true
  }
}
```

### 日志配置

```json
{
  "logging": {
    "level": "info",
    "file": "~/.claude/logs/zcf.log",
    "maxFiles": 10,
    "maxSize": "10MB",
    "console": true,
    "timestamp": true,
    "json": false
  }
}
```

## 🔧 MCP 服务高级配置

### 服务配置模板

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "command": "npx",
        "args": ["context7"],
        "env": {
          "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}",
          "NODE_ENV": "production"
        },
        "timeout": 10000,
        "retries": 2,
        "autoRestart": true
      },
      "custom-service": {
        "command": "node",
        "args": ["/path/to/custom-mcp-server.js"],
        "cwd": "/path/to/service",
        "env": {
          "SERVICE_CONFIG": "/path/to/config.json"
        }
      }
    },
    "global": {
      "timeout": 30000,
      "autoStart": true,
      "healthCheck": {
        "enabled": true,
        "interval": 60000
      }
    }
  }
}
```

### 条件服务加载

```json
{
  "mcp": {
    "conditionalServices": {
      "development": ["context7", "deepwiki"],
      "production": ["context7", "exa"],
      "testing": ["mock-service"]
    },
    "loadCondition": "${NODE_ENV}"
  }
}
```

## 🎯 工作流高级配置

### 自定义工作流路径

```json
{
  "workflows": {
    "paths": [
      "~/.claude/workflows",
      "./project-workflows", 
      "/shared/team-workflows"
    ],
    "autoLoad": true,
    "categories": {
      "enabled": ["memory", "git", "plan"],
      "disabled": ["experimental"]
    },
    "validation": {
      "strict": false,
      "allowUnsafe": false
    }
  }
}
```

### 工作流变量配置

```json
{
  "workflows": {
    "variables": {
      "PROJECT_NAME": "${npm_package_name}",
      "AUTHOR_NAME": "Your Name",
      "COMPANY": "Your Company",
      "LICENSE": "MIT"
    },
    "templates": {
      "interpolation": true,
      "functions": ["date", "uuid", "env"]
    }
  }
}
```

## 🌍 多语言和本地化

### 语言配置

```json
{
  "i18n": {
    "defaultLanguage": "zh-CN",
    "fallbackLanguage": "en",
    "autoDetect": true,
    "supportedLanguages": ["zh-CN", "en"],
    "customTranslations": {
      "zh-CN": "./custom-zh-CN.json",
      "en": "./custom-en.json"
    }
  }
}
```

### 地区特定配置

```json
{
  "locale": {
    "timezone": "Asia/Shanghai",
    "dateFormat": "YYYY-MM-DD",
    "currency": "CNY",
    "numberFormat": {
      "decimal": ".",
      "thousands": ","
    }
  }
}
```

## 🔒 安全配置

### 访问控制

```json
{
  "security": {
    "allowedCommands": [
      "init-project",
      "git-*",
      "workflow"
    ],
    "blockedCommands": [
      "system",
      "exec"
    ],
    "rateLimiting": {
      "enabled": true,
      "requests": 100,
      "window": 3600
    },
    "validation": {
      "sanitizeInput": true,
      "maxInputLength": 10000
    }
  }
}
```

### API 安全

```json
{
  "api": {
    "security": {
      "validateCertificates": true,
      "allowInsecureConnections": false,
      "apiKeyRotation": {
        "enabled": true,
        "interval": "30d"
      }
    }
  }
}
```

## 📊 性能调优

### 并发控制

```json
{
  "performance": {
    "concurrency": {
      "maxConcurrent": 5,
      "queueSize": 20,
      "timeout": 60000
    },
    "memory": {
      "maxHeapSize": "512MB",
      "gcEnabled": true
    },
    "cpu": {
      "maxCpuUsage": 80,
      "throttling": true
    }
  }
}
```

### 响应优化

```json
{
  "optimization": {
    "streaming": {
      "enabled": true,
      "chunkSize": 1024
    },
    "compression": {
      "enabled": true,
      "algorithm": "gzip",
      "level": 6
    },
    "prefetch": {
      "enabled": true,
      "predictive": false
    }
  }
}
```

## 🔧 环境变量配置

### 基础环境变量

```bash
# API 配置
export ZCF_API_KEY="your-api-key"
export ZCF_BASE_URL="https://api.anthropic.com"
export ZCF_MODEL="claude-3-5-sonnet-20241022"

# 行为配置
export ZCF_LANGUAGE="zh-CN"
export ZCF_LOG_LEVEL="info"
export ZCF_CACHE_ENABLED="true"

# 路径配置
export ZCF_CONFIG_DIR="~/.claude"
export ZCF_WORKFLOWS_DIR="./workflows"
export ZCF_CACHE_DIR="/tmp/zcf-cache"

# 网络配置
export HTTP_PROXY="http://proxy.company.com:8080"
export HTTPS_PROXY="https://proxy.company.com:8080"
export NO_PROXY="localhost,127.0.0.1,*.internal.com"
```

### 高级环境变量

```bash
# 性能配置
export ZCF_MAX_CONCURRENT="5"
export ZCF_TIMEOUT="30000"
export ZCF_RETRIES="3"

# 安全配置  
export ZCF_VALIDATE_CERTS="true"
export ZCF_RATE_LIMIT="100"
export ZCF_MAX_INPUT_LENGTH="10000"

# 调试配置
export ZCF_DEBUG="true"
export ZCF_TRACE="false"
export ZCF_PROFILING="false"
```

## 📝 配置模板示例

### 企业开发环境

```json
{
  "api": {
    "baseUrl": "https://internal-ai-gateway.company.com",
    "timeout": 45000,
    "retries": 5
  },
  "network": {
    "proxy": {
      "http": "http://corporate-proxy:8080",
      "https": "https://corporate-proxy:8080"
    }
  },
  "security": {
    "rateLimiting": {
      "enabled": true,
      "requests": 50,
      "window": 3600
    }
  },
  "logging": {
    "level": "warn",
    "file": "/var/log/zcf/zcf.log"
  }
}
```

### 个人开发环境

```json
{
  "api": {
    "model": "claude-3-5-sonnet-20241022",
    "maxTokens": 8192,
    "temperature": 0.3
  },
  "cache": {
    "enabled": true,
    "ttl": 7200
  },
  "workflows": {
    "categories": {
      "enabled": ["all"]
    }
  },
  "logging": {
    "level": "debug",
    "console": true
  }
}
```

## 🛠️ 配置管理命令

### 配置操作

```bash
# 查看当前配置
zcf config show

# 验证配置文件
zcf config validate

# 重置为默认配置
zcf config reset

# 导出配置
zcf config export --output=my-config.json

# 导入配置
zcf config import --input=team-config.json

# 配置差异比较
zcf config diff --compare=prod-config.json
```

### 配置模板管理

```bash
# 保存当前配置为模板
zcf config template save --name=enterprise

# 列出可用模板
zcf config template list

# 应用配置模板
zcf config template apply --name=enterprise

# 删除配置模板
zcf config template remove --name=enterprise
```

## 🔍 配置故障排除

### 常见配置问题

#### 1. API 连接问题
```bash
# 测试 API 连接
curl -H "Authorization: Bearer $ZCF_API_KEY" \
     https://api.anthropic.com/v1/models

# 检查代理配置
echo $HTTP_PROXY $HTTPS_PROXY
```

#### 2. MCP 服务启动失败
```bash
# 手动测试 MCP 服务
npx context7 --version

# 检查环境变量
env | grep CONTEXT7
```

#### 3. 工作流加载问题
```bash
# 检查工作流目录
ls -la ~/.claude/workflows/

# 验证工作流语法
zcf workflow validate --all
```

### 配置调试技巧

```bash
# 启用详细日志
ZCF_LOG_LEVEL=debug zcf config show

# 跟踪配置加载过程
ZCF_TRACE_CONFIG=true zcf i

# 检查配置合并结果
zcf config show --merged --verbose
```

---

通过合理配置这些高级选项，您可以打造出完全符合需求的 Claude Code 环境！接下来学习 [工作流配置](workflows.md) 来进一步提升使用体验。