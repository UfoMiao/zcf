---
title: Spec Workflow Integration
---

# Spec Workflow Integration

Spec Workflow is a comprehensive MCP service that provides structured feature development workflow from requirements to implementation. It helps teams systematically develop features through standardized requirements analysis, design phases, task management, and implementation workflows.

## What is Spec Workflow

Spec Workflow MCP is a service based on Model Context Protocol (MCP), specifically designed for requirements specification and design document generation. It provides:

- 📋 **Requirements Analysis**: Structured requirements collection and documentation
- 🎨 **Design Phase**: Detailed technical design and architecture planning
- 📊 **Task Management**: Automatic task breakdown and progress tracking
- 🔄 **Implementation Workflow**: Systematic approach from requirements to implementation
- 📈 **Interactive Dashboard**: Built-in workflow visualization and management dashboard
- ✅ **Approval System**: Review and approval process for each development phase

## Installation and Configuration

### Install via ZCF

Spec Workflow, as part of MCP services, can be selected for installation during ZCF initialization:

```bash
# Select Spec Workflow during complete initialization
npx zcf init

# Or add MCP service in existing environment
npx zcf → Select 4 (Configure MCP)
```

In MCP service selection interface, select `spec-workflow` to install.

### Manual Installation (Optional)

If you need to manually install or update Spec Workflow MCP:

```bash
# Install latest version
npm install -g @pimzino/spec-workflow-mcp@latest

# Or use npx to run
npx -y @pimzino/spec-workflow-mcp@latest
```

### Configuration File Location

Spec Workflow MCP configuration will be added to Claude Code or Codex MCP service configuration:

**Claude Code:**
```json
// ~/.claude/settings.json
{
  "mcpServers": {
    "spec-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest"]
    }
  }
}
```

**Codex:**
```toml
# ~/.codex/config.toml
[mcp_server."spec-workflow"]
command = "npx"
args = ["-y", "@pimzino/spec-workflow-mcp@latest"]
```

## Core Features

### Requirements Analysis

Spec Workflow provides structured requirements collection and analysis capabilities:

- **Requirements Collection**: Systematically collect functional requirements, non-functional requirements, and constraints
- **Requirements Documentation**: Automatically generate standardized requirements specification documents
- **Requirements Validation**: Check requirements completeness, consistency, and testability

**Usage Example**:
```
Please help me analyze requirements for a user login feature
```

### Design Phase

Provides detailed technical design and architecture planning:

- **Technical Solution Design**: Generate multiple feasible technical solutions
- **Architecture Design**: Design system architecture and module division
- **Interface Design**: Define API interfaces and data models
- **Database Design**: Design database table structure (if needed)

**Usage Example**:
```
Based on the requirements just discussed, please design the technical solution for user login feature
```

### Task Management

Automatic task breakdown and progress tracking:

- **Task Breakdown**: Break down large requirements into executable small tasks
- **Task Priority**: Automatically evaluate and assign task priorities
- **Progress Tracking**: Real-time tracking of task completion
- **Dependency Management**: Identify and manage dependencies between tasks

**Usage Example**:
```
Please break down the login feature into specific development tasks and list task priorities
```

### Implementation Workflow

Systematic implementation method:

- **Code Generation**: Generate initial code based on design documents
- **Test Cases**: Automatically generate test cases
- **Document Sync**: Maintain consistency between code and documents
- **Quality Checks**: Integrate code quality checks

## Dashboard Features

### Start Dashboard

Spec Workflow MCP provides optional workflow visualization dashboard:

```bash
# Start dashboard using command line
npx -y @pimzino/spec-workflow-mcp@latest --dashboard
```

Dashboard will open in default browser, providing:

- 📊 **Workflow Visualization**: Graphical display of workflow status
- 📋 **Task List**: View and manage all tasks
- 📈 **Progress Statistics**: View overall progress and statistics
- 🔍 **Search and Filter**: Quickly find specific tasks or requirements

### VS Code Extension

You can also install VS Code extension for better integration experience:

1. Open VS Code extension marketplace
2. Search for "Spec Workflow MCP"
3. Install [Pimzino.spec-workflow-mcp](https://marketplace.visualstudio.com/items?itemName=Pimzino.spec-workflow-mcp) extension

Extension provides:

- 🎯 **Sidebar Integration**: Directly access workflow in VS Code sidebar
- 🔔 **Notification Alerts**: Automatically alert when task status changes
- 📝 **Quick Actions**: Execute workflow operations directly in editor

## Workflow Stages

Spec Workflow typically includes the following stages:

1. **Requirements Collection** → Collect and analyze functional requirements
2. **Requirements Validation** → Validate requirements completeness and feasibility
3. **Solution Design** → Design technical solutions and architecture
4. **Task Breakdown** → Break down requirements into executable tasks
5. **Implementation Development** → Develop according to tasks
6. **Test Validation** → Write and execute test cases
7. **Document Updates** → Update related documents
8. **Review Acceptance** → Conduct code review and feature acceptance

## Usage Examples

### Complete Workflow Example

Suppose you want to develop a "user comment" feature:

**Step 1: Requirements Analysis**
```
Please use Spec Workflow to analyze requirements for user comment feature
```

**Step 2: Design Phase**
```
Based on the requirements just discussed, please design the technical solution for comment feature, including data model and API interfaces
```

**Step 3: Task Breakdown**
```
Break down the comment feature into specific development tasks and list task dependencies
```

**Step 4: Implementation Development**
```
Please start implementing the first task of comment feature according to the task list
```

### Combine with ZCF Workflows

Spec Workflow can be combined with other ZCF workflows:

```bash
# In Claude Code
/workflow Develop user comment feature, use Spec Workflow for requirements analysis

# Or use feature development workflow
/feat User comment feature
```

In Codex, although Spec Workflow can be used as MCP service, there's no corresponding `/prompts:` command, need to use directly in conversation.

## Best Practices

### Use Early in Project

Use Spec Workflow early in project to lock requirements scope:

- ✅ **Reduce Rework**: Avoid late requirement changes through structured requirements analysis
- ✅ **Clear Goals**: Clear requirements documents help team understand project goals
- ✅ **Risk Identification**: Identify technical risks and implementation difficulties early

### Team Collaboration

In team environments:

- **Unified Templates**: Use unified requirements and design templates
- **Regular Reviews**: Regularly conduct requirements reviews and design reviews
- **Document Sync**: Maintain consistency between code, documents, and requirements

### Custom Templates

Combine with `advanced/templates.md` to customize Spec templates to fit team standards:

```bash
# View template configuration
cat ~/.claude/templates/spec-requirements.md

# Customize template
# Edit template file to comply with team standards
```

### Version Control

It's recommended to include Spec Workflow generated documents in version control:

```bash
# Create workflow document directory
mkdir -p .spec-workflow/{requirements,design,tasks}

# Save generated documents to corresponding directories
# Include in Git version control
git add .spec-workflow/
git commit -m "docs: add spec workflow documents"
```

## Integration with Other Tools

### Context7 Integration

Combine with Context7 MCP service to get library documentation:

```
Please query the latest documentation for React Hook Form for form validation in comment feature
```

### DeepWiki Integration

Use DeepWiki to get project background information:

```
Please query the project architecture documentation to understand modules that comment feature needs to integrate with
```

### Git Workflow Integration

Combine with ZCF Git workflow to automatically generate commit messages:

```bash
# After completing requirements analysis
/git-commit -m "docs: add comment feature requirements spec"
```

## Troubleshooting

### MCP Service Not Started

If Spec Workflow cannot be used:

1. **Check MCP Configuration**: Confirm `settings.json` or `config.toml` contains Spec Workflow configuration
2. **Check Service Status**: Confirm MCP service is running normally
3. **Restart Application**: Restart Claude Code or Codex to load new configuration

### Dashboard Cannot Be Accessed

If dashboard cannot start:

```bash
# Check port occupancy
lsof -i :3000  # or other port

# Manually specify port
npx -y @pimzino/spec-workflow-mcp@latest --dashboard --port 3001
```

### Document Generation Failed

If document generation fails:

1. **Check Permissions**: Ensure write permissions for working directory
2. **Check Disk Space**: Ensure sufficient disk space
3. **View Logs**: Check MCP service logs for detailed error information

## Related Resources

- **GitHub Repository**: [spec-workflow-mcp](https://github.com/Pimzino/spec-workflow-mcp)
- **Official Documentation**: [Spec Workflow Documentation](https://github.com/Pimzino/spec-workflow-mcp/blob/main/README.md#quick-start)
- **VS Code Extension**: [Spec Workflow MCP Extension](https://marketplace.visualstudio.com/items?itemName=Pimzino.spec-workflow-mcp)
- **MCP Services**: See [MCP Service Integration](../features/mcp.md) to learn more about MCP services

## Usage Recommendations

### Suitable Scenarios

Spec Workflow is particularly suitable for:

- ✅ **Large Feature Development**: Features requiring detailed planning and documentation
- ✅ **Team Collaboration**: Team projects requiring clear requirements and design
- ✅ **Long-Term Maintenance**: Projects requiring complete documentation
- ✅ **Compliance Requirements**: Projects requiring standardized documentation

### Not Suitable Scenarios

May not be suitable for:

- ⚠️ **Rapid Prototyping**: Prototype development for quick idea validation
- ⚠️ **Small Fixes**: Simple bug fixes or small feature improvements
- ⚠️ **Personal Projects**: Personal projects may not need such detailed requirements documents

> 💡 **Tip**: Spec Workflow is an important part of ZCF workflow ecosystem. It's recommended to introduce it early in the project to gain maximum benefits. Combined with other ZCF workflows and tools, you can build a complete development process.


