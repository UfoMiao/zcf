# Advanced Guide

Welcome to the ZCF Advanced Guide! This section will take you deep into ZCF's advanced features and configuration options, enabling you to better customize and optimize your Claude Code environment.

## 🎯 Section Contents

This advanced guide covers the following topics:

### [Advanced Configuration](configuration.md)
- Customize Claude Code configuration parameters
- Advanced MCP service configuration
- API settings and proxy configuration
- Performance optimization options

### [Workflow Configuration](workflows.md)
- Custom workflow templates
- Creating project-specific commands
- Workflow composition and orchestration
- Team collaboration configuration

### [Troubleshooting](troubleshooting.md)
- Common issues and solutions
- Error diagnosis methods
- Performance issue troubleshooting
- Configuration problem fixes

## 🚀 Advanced Use Cases

### Enterprise Deployment
If you're deploying ZCF in an enterprise environment, you may need to:
- Configure enterprise proxy servers
- Use self-hosted API endpoints
- Implement unified team configuration standards
- Integrate with existing development toolchains

### Team Collaboration Optimization
For team usage scenarios:
- Create standardized project templates
- Configure shared workflow libraries
- Implement code standards and best practices
- Establish unified AI assistant configurations

### Performance Tuning
For large projects or complex requirements:
- Optimize API call frequency and size
- Configure caching strategies
- Adjust timeout and retry parameters
- Monitor and analyze usage patterns

## 🛠️ Advanced Features Overview

### Configuration Management
- **Smart Merging**: ZCF intelligently merges user custom configurations with default configurations
- **Version Control**: Support configuration file version management and rollback
- **Environment Isolation**: Support multi-environment configurations for development, testing, production
- **Auto Backup**: Automatically create backups when configurations change

### Template System
- **Dynamic Templates**: Support dynamic template selection based on project type
- **Conditional Rendering**: Render different content based on environment and configuration conditions
- **Template Inheritance**: Support inheritance and extension between templates
- **Custom Variables**: Use custom variables and functions in templates

### Extension Mechanisms
- **Plugin Support**: Extend ZCF functionality through plugins
- **Hook System**: Insert custom logic at key processes
- **Custom Commands**: Create project-specific custom commands
- **API Integration**: Integrate with third-party services and tools

## 📊 Configuration Best Practices

### 1. Layered Configuration Strategy
```
Global Config (~/.claude/)
├── User Config (~/.zcf/)
├── Project Config (project/.claude/)
└── Environment Config (.env.local)
```

### 2. Security Configuration Principles
- Never hardcode sensitive information in configuration files
- Use environment variables to manage API Keys and Tokens
- Regularly rotate access credentials
- Implement least privilege principles

### 3. Performance Optimization Recommendations
- Set reasonable request timeout times
- Use appropriate concurrency limits
- Enable response caching mechanisms
- Monitor API usage quotas

## 🔍 Configuration File Deep Dive

### Main Configuration File Structure
```json
{
  "version": "2.11.0",
  "language": "en",
  "api": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "timeout": 30000,
    "retries": 3
  },
  "mcp": {
    "autoStart": true,
    "services": ["context7", "deepwiki", "exa"]
  },
  "workflows": {
    "autoLoad": true,
    "categories": ["memory", "git", "plan"]
  },
  "advanced": {
    "caching": true,
    "logging": "info",
    "analytics": false
  }
}
```

### Environment Variable Configuration
```bash
# API Configuration
ZCF_API_KEY=your-api-key
ZCF_BASE_URL=https://api.anthropic.com
ZCF_MODEL=claude-3-5-sonnet

# Behavior Configuration
ZCF_LANGUAGE=en
ZCF_LOG_LEVEL=info
ZCF_CACHE_ENABLED=true

# Proxy Configuration
ZCF_HTTP_PROXY=http://proxy.company.com:8080
ZCF_HTTPS_PROXY=https://proxy.company.com:8080
```

## 🎓 Learning Path Recommendations

### Beginner Users (Completed Basic Configuration)
1. Read [Advanced Configuration](configuration.md) to understand parameter meanings
2. Try customizing a simple workflow
3. Learn basic troubleshooting techniques

### Intermediate Users (Familiar with Basic Operations)
1. Deep dive into [Workflow Configuration](workflows.md)
2. Create standardized configurations for teams
3. Optimize performance and user experience

### Advanced Users (Need Deep Customization)
1. Research source code and extension mechanisms
2. Develop custom plugins and commands
3. Contribute code to open source projects

## 💡 Practical Tips

### Quick Configuration Switching
```bash
# Save current configuration as template
zcf config save --name=my-config

# Load configuration template
zcf config load --name=my-config

# List available configurations
zcf config list
```

### Batch Operations
```bash
# Batch install MCP services
zcf mcp install context7,deepwiki,exa

# Batch update workflows
zcf workflow update --all

# Batch export configuration
zcf config export --output=team-config.json
```

### Debugging and Diagnostics
```bash
# Enable verbose logging
ZCF_LOG_LEVEL=debug zcf i

# Configuration validation
zcf config validate

# Health check
zcf doctor
```

---

Ready to dive deeper? Start with [Advanced Configuration](configuration.md) or jump directly to the topic you're interested in!