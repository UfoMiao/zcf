---
description: 'BMAD-METHOD Agile Development Workflow - Complete software development lifecycle management using 7 specialized AI agents'
---

# BMAD-METHOD Agile Development Workflow

Manage the complete software development lifecycle using BMAD-METHOD's 7 specialized AI agents.

## Usage

```bash
/bmad-workflow <agent-name> [command-args]
```

## Available Agents

1. **analyst** (Mary) - Business Analyst
   - Market research, brainstorming, competitive analysis, project briefing

2. **pm** (John) - Product Manager
   - Creating PRDs, product strategy, feature prioritization, roadmap planning

3. **architect** (Winston) - Architect
   - System design, architecture documents, technology selection, API design

4. **sm** (Bob) - Scrum Master
   - Story creation, epic management, agile process guidance

5. **dev** (James) - Full Stack Developer
   - Code implementation, debugging, refactoring, development best practices

6. **qa** (Quinn) - Senior Developer & QA Architect
   - Code review, refactoring, test planning, quality assurance

7. **po** (Sarah) - Product Owner
   - Backlog management, story refinement, acceptance criteria, sprint planning

## Workflow Examples

### 1. New Project Kickoff
```bash
/bmad-workflow analyst *create-project-brief
/bmad-workflow pm *create-prd
/bmad-workflow architect *create-full-stack-architecture
```

### 2. Story Development Flow
```bash
/bmad-workflow sm *draft
/bmad-workflow dev *develop-story
/bmad-workflow qa *review
```

### 3. Product Planning
```bash
/bmad-workflow analyst *brainstorm "new feature ideas"
/bmad-workflow pm *create-epic
/bmad-workflow po *execute-checklist-po
```

## Activating Agent

Loading BMAD-METHOD $AGENT_NAME agent...

@bmad-agents/en/$AGENT_NAME.md

## Notes

- Each agent has specialized responsibilities and command sets
- Use `*help` command to see available commands for each agent
- Agents can collaborate to complete complex development tasks
- Follow BMAD-METHOD agile development best practices