---
title: BMad Agile Process
---

# BMad Agile Process

> **Official Resource**: [BMad Method - GitHub](https://github.com/bmad-code-org/BMAD-METHOD)

BMad (Build-Measure-Analyze-Decision) workflow is suitable for structured iteration of large projects. BMad Method is an enterprise-level AI-driven agile development framework, providing complete team collaboration workflows and document templates.

## What is BMad

BMad Method is a universal AI agent framework designed for enterprise-level agile development. It breaks down complex development tasks into manageable iteration cycles through structured Build-Measure-Analyze-Decision loops.

### Core Features

- 🏢 **Enterprise-Level Framework**: Complete agile development process and team collaboration mechanisms
- 🤖 **Professional AI Agent Team**: Includes Product Owner (PO), Project Manager (PM), Architect, Developer, QA Tester, and other roles
- 📋 **Complete Document Templates**: Automatically generate professional documents like PRD, architecture documents, user stories
- 🔄 **Iteration Management**: Supports continuous iteration, acceptance, and retrospectives
- 🌱 **Project Type Support**: Supports greenfield (new projects) and brownfield (existing projects)

## Usage

### Claude Code

Use the following command in Claude Code to initialize BMad workflow:

```
/zcf:bmad-init
```

### Codex

> ⚠️ **Note**: BMad workflow is currently only available in Claude Code. Codex does not support this workflow yet.

If you need similar enterprise-level agile development processes, you can use `/prompts:workflow` six-stage workflow in Codex to implement similar functionality.

## Core Features

### 1. One-Time Import of Complete Workflow

After executing `/zcf:bmad-init`, ZCF will:

- ✅ Import all BMad command sets and document templates
- ✅ Create complete project structure
- ✅ Generate initial configuration files
- ✅ Set up AI agent team

### 2. Iteration Lifecycle Management

BMad workflow covers complete iteration cycle:

- **Iteration Planning**: Create iteration plans based on PRD and architecture documents
- **Execute Development**: Execute development tasks according to plan
- **Acceptance Testing**: QA team performs acceptance testing
- **Retrospective Summary**: Team retrospectives on iteration results and improvements

### 3. Professional AI Agent Team

BMad provides complete professional AI agent team, including:

- **PO (Product Owner)**: Product owner, responsible for product planning and requirements management
- **PM (Project Manager)**: Project manager, responsible for project progress and resource coordination
- **Architect**: System architect, responsible for architecture design and technical solutions
- **Developer**: Developer, responsible for feature implementation
- **QA (Quality Assurance)**: Test engineer, responsible for quality assurance and testing

### 4. Project Type Support

#### Greenfield (New Projects)

Suitable for new projects starting from scratch:

```bash
# Execute in project root directory
/zcf:bmad-init

# BMad will guide you:
# 1. Create PRD (Product Requirements Document)
# 2. Design system architecture
# 3. Generate user stories
# 4. Create project structure
```

#### Brownfield (Existing Projects)

Suitable for modernizing existing codebases and feature enhancement:

```bash
# Execute in existing project root directory
/zcf:bmad-init

# BMad will:
# 1. Analyze existing code structure
# 2. Generate architecture documents
# 3. Create feature enhancement plan
# 4. Maintain compatibility with existing code
```

### 5. Document Template System

After BMad initialization, complete document templates will be generated:

- **PRD (Product Requirements Document)**: Product requirements document
- **Architecture Document**: System architecture design document
- **User Stories**: User stories and acceptance criteria
- **Technical Specifications**: Technical implementation specifications
- **Test Plan**: Test plan and test cases

## Workflow Stages

BMad workflow follows these stages:

### Build (Build)

- Develop according to PRD and architecture documents
- Follow coding standards and best practices
- Implement feature modules

### Measure (Measure)

- Collect development data and metrics
- Monitor code quality and performance
- Track progress and risks

### Analyze (Analyze)

- Analyze iteration results
- Identify issues and improvement points
- Assess technical debt

### Decision (Decision)

- Review iteration results
- Decide next actions
- Adjust development plan

## Best Practices

### 1. Team Unified Use

In team environments, it's recommended to uniformly use BMad workflow:

```bash
# Team members uniformly execute
/zcf:bmad-init

# This ensures:
# - Workflow standards are consistent
# - Document formats are unified
# - Collaboration efficiency improves
```

### 2. Combine with MCP Services

Combining with MCP services can improve analysis quality:

```bash
# Configure MCP services
npx zcf
# Select 4 (Configure MCP)

# Recommended services:
# - Context7: Query technical documentation
# - DeepWiki: Get project background information
# - Spec Workflow: Structured requirements analysis
```

### 3. Iteration Plan Management

- **Set Clear Goals**: Each iteration should have clear goals and scope
- **Keep Iteration Length Moderate**: Recommended 1-2 week iteration cycles
- **Timely Retrospectives**: Conduct retrospectives after each iteration, continuous improvement

### 4. Document Maintenance

- **Keep Documents Updated**: Update documents timely as project develops
- **Version Control**: Include documents in Git version control
- **Team Sharing**: Ensure team members can access latest documents

### 5. Combine with Other ZCF Workflows

BMad can be combined with other ZCF workflows:

```bash
# 1. Use BMad for project planning
/zcf:bmad-init

# 2. Use six-stage workflow to implement specific features
/zcf:workflow Implement user login functionality

# 3. Use feature development workflow to handle new requirements
/zcf:feat Add comment functionality

# 4. Use Git workflow to manage code
/git-commit
```

## Project Structure

After BMad initialization, the following structure will be created in project root directory:

```
Project Root/
├── .bmad-core/              # BMad core files
│   ├── workflows/          # Workflow definitions
│   ├── templates/          # Document templates
│   └── agents/             # AI agent definitions
├── PRD.md                   # Product Requirements Document
├── ARCHITECTURE.md          # Architecture document
├── USER_STORIES.md          # User stories
└── .claude/                 # Claude Code configuration
    └── plan/                # Iteration plans
```

## Troubleshooting

### Initialization Failure

If `/zcf:bmad-init` execution fails:

```bash
# 1. Check if in project root directory
pwd

# 2. Check if BMad workflow is installed
ls -la ~/.claude/workflows/bmad/

# 3. Reinstall workflow
npx zcf update -w bmadWorkflow

# 4. Check Claude Code version
npx zcf check-updates
```

### Document Generation Issues

If documents are not correctly generated:

```bash
# 1. Check project permissions
ls -la .

# 2. Manually view generated documents
cat PRD.md
cat ARCHITECTURE.md

# 3. Reinitialize (will merge updates, won't overwrite existing content)
/zcf:bmad-init
```

### Agent Team Configuration Issues

If AI agent team cannot work normally:

```bash
# 1. Check workflow files
cat ~/.claude/workflows/bmad/bmad-init.md

# 2. Check Claude Code configuration
cat ~/.claude/settings.json | jq .mcpServers

# 3. Reconfigure MCP services (if needed)
npx zcf
# Select 4 (Configure MCP)
```

## Related Resources

- **Official Documentation**: [BMad Method - GitHub](https://github.com/bmad-code-org/BMAD-METHOD)
- **ZCF Workflows**: [Workflow System](../features/workflows.md)
- **Project Initialization**: [init-project command](../workflows/git-commands.md#init-project)
- **MCP Services**: [MCP Service Integration](../features/mcp.md)

## Usage Recommendations

### Suitable Scenarios

BMad workflow is particularly suitable for:

- ✅ **Large Projects**: Enterprise-level projects requiring complete planning and documentation
- ✅ **Team Collaboration**: Team projects requiring multi-role collaboration
- ✅ **Long-Term Maintenance**: Projects requiring continuous iteration and evolution
- ✅ **Standardized Development**: Projects requiring standardized development processes

### Not Suitable Scenarios

May not be suitable for:

- ⚠️ **Rapid Prototyping**: Prototype development for quick idea validation
- ⚠️ **Small Projects**: Simple personal projects or small tools
- ⚠️ **One-Time Scripts**: Scripts that don't require continuous maintenance

> 💡 **Tip**: BMad workflow is an important part of ZCF workflow ecosystem, particularly suitable for standardized development of enterprise-level projects. It's recommended to introduce BMad workflow early in the project to gain maximum benefits. Combined with other ZCF workflows and tools, you can build a complete AI-driven development process.


