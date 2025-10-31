# Advanced Configuration

This guide details ZCF's advanced configuration options to help you optimize your Claude Code environment according to specific needs.

## 📁 Configuration File Overview

ZCF uses a layered configuration system, in priority order:

```
1. Command line arguments (highest priority)
2. Environment variables
3. Project configuration file (./.claude/config.json)
4. User configuration file (~/.claude/config.json)
5. Global default configuration (lowest priority)
```

## ⚙️ Main Configuration File Details

### Basic API Configuration

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

**Configuration Description**:
- `provider`: API provider (`anthropic`)
- `baseUrl`: API base URL, supports custom endpoints
- `model`: Claude model version to use
- `timeout`: Request timeout (milliseconds)
- `retries`: Number of retry attempts on failure
- `maxTokens`: Maximum token count
- `temperature`: Creativity parameter (0.0-1.0)

### Proxy and Network Configuration

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

### Caching Configuration

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

### Logging Configuration

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

## 🔧 Advanced MCP Service Configuration

### Service Configuration Template

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

### Conditional Service Loading

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

## 🎯 Advanced Workflow Configuration

### Custom Workflow Paths

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

### Workflow Variable Configuration

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

## 🌍 Multi-language and Localization

### Language Configuration

```json
{
  "i18n": {
    "defaultLanguage": "en",
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

### Region-specific Configuration

```json
{
  "locale": {
    "timezone": "America/New_York",
    "dateFormat": "MM/DD/YYYY",
    "currency": "USD",
    "numberFormat": {
      "decimal": ".",
      "thousands": ","
    }
  }
}
```

## 🔒 Security Configuration

### Access Control

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

### API Security

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

## 📊 Performance Tuning

### Concurrency Control

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

### Response Optimization

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

## 🔧 Environment Variable Configuration

### Basic Environment Variables

```bash
# API Configuration
export ZCF_API_KEY="your-api-key"
export ZCF_BASE_URL="https://api.anthropic.com"
export ZCF_MODEL="claude-3-5-sonnet-20241022"

# Behavior Configuration
export ZCF_LANGUAGE="en"
export ZCF_LOG_LEVEL="info"
export ZCF_CACHE_ENABLED="true"

# Path Configuration
export ZCF_CONFIG_DIR="~/.claude"
export ZCF_WORKFLOWS_DIR="./workflows"
export ZCF_CACHE_DIR="/tmp/zcf-cache"

# Network Configuration
export HTTP_PROXY="http://proxy.company.com:8080"
export HTTPS_PROXY="https://proxy.company.com:8080"
export NO_PROXY="localhost,127.0.0.1,*.internal.com"
```

### Advanced Environment Variables

```bash
# Performance Configuration
export ZCF_MAX_CONCURRENT="5"
export ZCF_TIMEOUT="30000"
export ZCF_RETRIES="3"

# Security Configuration
export ZCF_VALIDATE_CERTS="true"
export ZCF_RATE_LIMIT="100"
export ZCF_MAX_INPUT_LENGTH="10000"

# Debug Configuration
export ZCF_DEBUG="true"
export ZCF_TRACE="false"
export ZCF_PROFILING="false"
```

## 📝 Configuration Template Examples

### Enterprise Development Environment

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

### Personal Development Environment

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

## 🛠️ Configuration Management Commands

### Configuration Operations

```bash
# View current configuration
zcf config show

# Validate configuration file
zcf config validate

# Reset to default configuration
zcf config reset

# Export configuration
zcf config export --output=my-config.json

# Import configuration
zcf config import --input=team-config.json

# Compare configuration differences
zcf config diff --compare=prod-config.json
```

### Configuration Template Management

```bash
# Save current configuration as template
zcf config template save --name=enterprise

# List available templates
zcf config template list

# Apply configuration template
zcf config template apply --name=enterprise

# Delete configuration template
zcf config template remove --name=enterprise
```

## 🔍 Configuration Troubleshooting

### Common Configuration Issues

#### 1. API Connection Issues
```bash
# Test API connection
curl -H "Authorization: Bearer $ZCF_API_KEY" \
     https://api.anthropic.com/v1/models

# Check proxy configuration
echo $HTTP_PROXY $HTTPS_PROXY
```

#### 2. MCP Service Startup Failure
```bash
# Manually test MCP service
npx context7 --version

# Check environment variables
env | grep CONTEXT7
```

#### 3. Workflow Loading Issues
```bash
# Check workflow directory
ls -la ~/.claude/workflows/

# Validate workflow syntax
zcf workflow validate --all
```

### Configuration Debugging Tips

```bash
# Enable verbose logging
ZCF_LOG_LEVEL=debug zcf config show

# Trace configuration loading process
ZCF_TRACE_CONFIG=true zcf i

# Check configuration merge results
zcf config show --merged --verbose
```

---

By properly configuring these advanced options, you can create a Claude Code environment that perfectly fits your needs! Next, learn about [Workflow Configuration](workflows.md) to further enhance your experience.