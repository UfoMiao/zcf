---
title: Config Switch
---

# Config Switch

`zcf config-switch` is used to quickly switch between multiple API configurations, suitable for users who need to separate work/personal environments, or use different API providers for different projects.

## Command Format

```bash
# Interactive switch (recommended)
npx zcf config-switch

# List all available configurations
npx zcf config-switch --list

# Directly switch to specified configuration (Claude Code)
npx zcf config-switch provider1

# Specify tool type
npx zcf config-switch --code-type claude-code --list
npx zcf config-switch provider1 --code-type codex
```

## Parameter Descriptions

| Parameter | Description | Optional Values | Default |
|------|------|--------|--------|
| `--code-type` | Specify tool type | `claude-code`, `codex`, `cc`, `cx` | Read from ZCF configuration |
| `--list` | Only list configurations, don't switch | None | No |
| `Target Config` | Directly specify configuration name to switch to | Configuration name or ID | None |

## Features

### Claude Code Configuration Switch

Supports switching the following types of configurations:

1. **Official Login**: Use Claude official OAuth login
2. **CCR Proxy**: Use Claude Code Router proxy
3. **Custom Configuration**: Multiple API configurations created through `zcf init`

**Configuration Source**:
- Configuration file: `~/.claude/settings.json`
- Profile management: Each configuration stored as independent Profile
- Current configuration identifier: `currentProfileId` field

### Codex Configuration Switch

Supports switching Codex model providers:

1. **Official Login**: Use Codex official OAuth login
2. **Custom Providers**: Providers configured through `zcf init` (like 302.AI, GLM, etc.)

**Configuration Source**:
- Configuration file: `~/.codex/config.toml`
- Provider list: Read configured providers from configuration file

## Usage Methods

### Interactive Switch

The most common method, select configuration through interactive menu:

```bash
npx zcf config-switch
```

**Claude Code Interactive Interface**:
```
? Select Claude Code configuration:
  ❯ ● Use Official Login (current)
    CCR Proxy
    Work Environment (glm-provider)
    Personal Environment (anthropic-provider)
    Test Environment (minimax-provider)
```

**Codex Interactive Interface**:
```
? Select Codex provider:
  ❯ ● Use Official Login (current)
    302.AI Provider
    GLM Provider
    MiniMax Provider
```

### List All Configurations

View all currently available configurations:

```bash
# Claude Code configurations
npx zcf config-switch --list --code-type claude-code

# Codex configurations
npx zcf config-switch --list --code-type codex
```

**Output Example**:
```
Available Claude Code configurations:

1. Official Login (current)
2. CCR Proxy
3. Work Environment - glm-provider
4. Personal Environment - anthropic-provider
```

### Direct Switch

If you know the configuration name, you can switch directly:

```bash
# Switch to specified Profile
npx zcf config-switch work-profile

# Codex switch provider
npx zcf config-switch glm-provider --code-type codex
```

**Supported Matching Methods**:
- Configuration ID (like `glm-provider`)
- Configuration name (like `Work Environment`)

## Configuration Management

### Create Multiple Configurations

Create multiple API configurations during initialization:

```bash
# Use multi-configuration parameters
npx zcf init --api-configs '[
  {
    "name": "Work Environment",
    "provider": "glm",
    "type": "api_key",
    "key": "sk-glm-xxx",
    "primaryModel": "glm-4"
  },
  {
    "name": "Personal Environment",
    "provider": "anthropic",
    "type": "api_key",
    "key": "sk-ant-xxx",
    "primaryModel": "claude-sonnet-4-5"
  }
]'
```

### Configuration Naming Recommendations

Use concrete descriptive names for easy identification:

✅ **Recommended**:
- `Work Environment`
- `Personal Development`
- `Test Project`
- `Production Environment`

❌ **Not Recommended**:
- `config1`, `config2`
- `default`, `new`
- Meaningless random strings

### Effects After Switch

After switching configuration:

1. **Update Main Configuration**: Modify API settings in `settings.json` or `config.toml`
2. **Apply Configuration Items**: Including API URL, keys, model selection, etc.
3. **Display Switch Result**: Success or failure prompt

**Note**:
- Switch won't delete original configuration, only changes currently used configuration
- All configurations are saved in the same configuration file
- Can switch back to previous configuration anytime

## Usage Scenarios

### 1. Separate Work and Personal Environments

```bash
# Use work environment on workdays
npx zcf config-switch work-profile

# Use personal environment on weekends
npx zcf config-switch personal-profile
```

### 2. Different Projects Use Different APIs

```bash
# Project A uses GLM
npx zcf config-switch glm-provider

# Project B uses Anthropic
npx zcf config-switch anthropic-provider
```

### 3. Test New Configuration

```bash
# Switch to test configuration
npx zcf config-switch test-profile

# Switch back after testing
npx zcf config-switch main-profile
```

### 4. Switch Codex Provider

```bash
# List Codex providers
npx zcf config-switch --code-type codex --list

# Switch to specified provider
npx zcf config-switch glm-provider --code-type codex
```

## Best Practices

### Configuration Organization

1. **Categorize by Purpose**: Work, Personal, Test
2. **Categorize by Project**: Project A, Project B, Project C
3. **Categorize by Provider**: Anthropic, GLM, MiniMax

### Preparation Before Switch

1. **Save Current Work**: Ensure no unsaved changes
2. **Verify Configuration**: Test if API works normally after switch
3. **Record Switch**: Record configuration switch in team

### Work with Worktree

Use different configurations in different Worktrees:

```bash
# Main branch uses work configuration
npx zcf config-switch work-profile

# Create feature branch Worktree
/git-worktree add feat/new-feature -o

# Switch configuration in feature branch
cd ../.zcf/project-name/feat/new-feature
npx zcf config-switch test-profile
```

## Common Questions

### Q: Configuration not effective after switch?

A: 
1. Restart Claude Code or Codex
2. Check if configuration file is correctly updated
3. Verify if API key is valid

### Q: How to add new configuration?

A: Use `zcf init` to create new configuration, or use `--api-configs` parameter during initialization to add multiple configurations.

### Q: Can I delete configuration?

A: Currently need to manually delete by editing configuration file. Future versions may support CLI delete functionality.

### Q: Will switching configuration lose data?

A: No. Switching only changes currently used API configuration, won't delete any data or configuration.

### Q: Are Codex and Claude Code configurations independent?

A: Yes. They use different configuration files (`~/.codex/config.toml` and `~/.claude/settings.json`), can be managed separately.

## Related Documentation

- [Multi-Config and Backup](../features/multi-config.md) - Detailed multi-configuration system
- [Initialization Guide](init.md) - Methods to create multiple configurations
- [Worktree Parallel Development](../best-practices/worktree.md) - Use with Worktree


