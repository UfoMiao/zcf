---
title: Feature Development Workflow
---

# Feature Development Workflow

The feature development workflow focuses on new feature design and implementation, with built-in professional Planner and UI/UX Designer agents to help you systematically complete the complete process from requirements analysis to implementation plan.

## Feature Overview

The feature development workflow focuses on the complete development cycle of new features, ensuring quality and completeness of feature development through structured stage processes.

### Core Features

- 🎯 **Requirements-Driven**: Start from requirements analysis to ensure features meet user expectations
- 📐 **Multi-Solution Design**: Generate multiple feasible solutions and evaluate pros and cons
- 🎨 **UI/UX Support**: Provide professional UI/UX design suggestions
- 📋 **Detailed Plan**: Output executable task breakdown and implementation plan
- 🤖 **Professional Agents**: Built-in Planner and UI/UX Designer agents

## Usage

### Claude Code

Use the following command in Claude Code:

```
/zcf:feat <feature description>
```

**Example**:
```
/zcf:feat Implement user comment functionality, supporting likes, replies, and deletion
```

### Codex

> ⚠️ **Note**: Feature development workflow (feat) is currently only available in Claude Code. Codex does not support this workflow yet.

If you need similar functionality, you can use `/prompts:workflow` six-stage workflow in Codex to implement feature development tasks.

## Workflow Stages

The feature development workflow includes four core stages:

### 1. Requirements Confirmation

**Goal**: Deeply understand feature requirements and business scenarios

**AI Behavior**:
- Analyze feature description and user needs
- Identify feature scope and boundaries
- Determine success criteria and acceptance conditions
- Understand business value and user scenarios

**Output**:
- Feature requirements document
- User stories
- Acceptance criteria
- Success metrics

**Example Output**:
- Feature scope: User comments, likes, replies, deletion
- User roles: Regular users, administrators
- Acceptance criteria: Users can post comments, like others' comments, reply to comments, delete their own comments

### 2. Solution Planning

**Goal**: Generate multiple feasible technical solutions and evaluate

**AI Behavior**:
- Propose 2-3 different technical solutions
- Evaluate technical complexity of each solution
- Analyze solution scalability and maintainability
- Consider performance, security, and cost factors
- Recommend most suitable solution

**Output**:
- Multiple technical solutions
- Solution comparison analysis
- Technology selection suggestions
- Architecture design sketches

**Example Output**:
- Solution A: Use existing database table structure, simple and fast
- Solution B: Introduce comment tree structure, support unlimited nested replies
- Solution C: Use graph database, support complex relationship queries
- Recommendation: Solution B (balances complexity and feature completeness)

### 3. UI/UX Support

**Goal**: Provide professional user interface and interaction design suggestions

**AI Behavior**:
- Design user interface layout
- Provide interaction flow suggestions
- Generate wireframe and prototype suggestions
- Write interface copy and prompts
- Consider user experience and usability

**Output**:
- UI design suggestions
- Interaction flow diagrams
- Interface wireframe descriptions
- Copy and prompts
- Responsive design considerations

**Example Output**:
- Comment list layout: Reverse chronological order, avatar + nickname + content
- Interaction flow: Click reply → Show reply box → Enter content → Submit
- Copy: "Post Comment", "Reply", "Like (123)"

### 4. Implementation Plan

**Goal**: Output detailed task breakdown and implementation plan

**AI Behavior**:
- Break down features into specific development tasks
- Determine technical implementation details
- Create development order and dependencies
- Estimate development workload
- Provide testing strategy

**Output**:
- Detailed task list
- Technical implementation details
- Development time estimates
- Test plan
- Deployment considerations

**Example Output**:
1. Create comment data model (2 hours)
2. Implement comment API interface (4 hours)
3. Develop frontend comment component (3 hours)
4. Implement like functionality (2 hours)
5. Implement reply functionality (3 hours)
6. Implement deletion functionality (1 hour)
7. Write test cases (2 hours)
8. Performance optimization (1 hour)

## Usage Scenarios

### Scenario 1: New Feature Development

```
/zcf:feat Add shopping cart functionality, supporting multiple products, quantity modification, and batch checkout
```

Suitable for new features requiring complete planning, complete process from requirements to implementation.

### Scenario 2: Feature Enhancement

```
/zcf:feat Enhance user profile center, add data statistics and activity history display
```

Suitable for enhancements and extensions based on existing features.

### Scenario 3: Complex Business Logic

```
/zcf:feat Implement order system, supporting multiple payment methods, coupons, and logistics tracking
```

Suitable for features containing complex business logic, requiring careful planning and technology selection.

## Best Practices

### 1. Clear Requirements Description

Providing clear, detailed feature descriptions can yield better planning results:

```
# Good description
/zcf:feat Implement user comment functionality, supporting text, images, likes, replies, deletion, administrators can review and delete any comment

# Not clear enough
/zcf:feat Comment functionality
```

### 2. Combine with Project Context

Before executing feature development workflow, it's recommended to initialize project configuration:

```bash
# 1. Initialize project (if not done yet)
/init-project

# 2. Execute feature development workflow
/zcf:feat <feature description>
```

This ensures feature design is consistent with overall project architecture.

### 3. Execute After Planning

Feature development workflow output can be directly used for subsequent development:

```bash
# 1. Use feature development workflow to plan
/zcf:feat Implement user comment functionality

# 2. Based on planning results, use six-stage workflow to implement
/zcf:workflow Implement comment data model and API interface

# 3. Continue implementing other tasks
/zcf:workflow Implement comment frontend component and interaction

# 4. Use Git workflow to commit
/git-commit
```

### 4. Combine with Other Tools

Sync planning results to project management tools:

- 📋 **Issue Tracking**: Sync task breakdown to GitHub Issues or Jira
- 📝 **Document Management**: Save solution design to project documentation
- 👥 **Team Collaboration**: Share planning results with team members
- 🔄 **Iteration Management**: Include feature planning in iteration plans

### 5. Continuous Iteration

Feature development is a continuous process:

```bash
# Round 1: Overall planning
/zcf:feat Implement user comment functionality

# Round 2: Refine a sub-feature
/zcf:feat Implement comment reply functionality, supporting nested replies and @ mentions

# Round 3: Optimization and enhancement
/zcf:feat Optimize comment performance, support pagination loading and real-time updates
```

## Differences from Other Workflows

| Workflow | Use Case | Features |
|--------|---------|------|
| **Feature Development Workflow** (`/zcf:feat`) | New feature planning | Requirements analysis, solution design, UI/UX planning |
| **Six-Stage Workflow** (`/zcf:workflow`) | Specific implementation | Complete development process, from research to review |
| **BMad Workflow** (`/zcf:bmad-init`) | Enterprise-level projects | Complete team collaboration and iteration management |

## Notes

### Codex Not Supported

Feature development workflow is currently only available in Claude Code. If using Codex, you can use:

```bash
# Use six-stage workflow in Codex as alternative
/prompts:workflow Implement user comment functionality
```

### Agent Dependencies

Feature development workflow depends on the following agents:

- **Planner**: Planner agent, responsible for solution design
- **UI/UX Designer**: UI/UX Designer agent, responsible for interface design

These agents will be automatically installed during workflow initialization.

### Using Planning Results

Planning results output by feature development workflow should:

- ✅ **Save Documents**: Save planning documents to project directory
- ✅ **Version Control**: Include in Git version control
- ✅ **Team Sharing**: Share with team members
- ✅ **Continuous Updates**: Update planning based on implementation situation

## Related Resources

- [Six-Stage Workflow](zcf-workflow.md) - Complete development process
- [BMad Agile Process](bmad.md) - Enterprise-level agile development
- [Git Smart Commands](git-commands.md) - Git operation automation
- [Workflow System](../features/workflows.md) - Detailed workflow information

> 💡 **Tip**: Feature development workflow is an ideal tool for planning new features. Through structured requirements analysis, solution design, and implementation planning, you can ensure quality and completeness of feature development. It's recommended to use feature development workflow for complete planning before starting coding.


