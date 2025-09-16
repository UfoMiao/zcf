---
description: Add New Feature
---

$ARGUMENTS

## Core Workflow

### 1. Input Analysis and Type Determination

When receiving user input, first perform type determination and clearly inform the user:

**Determination Criteria:**

- **Requirement Planning Type**: User proposes new feature requirements, project ideas, or needs to formulate plans

- **Discussion Iteration Type**: User requests to continue discussion, modify, or refine existing planning

- **Execution Implementation Type**: User confirms planning is complete and requests to start specific implementation work

### 2. Classification Processing Mechanism

#### A. Requirement Planning Processing

**Trigger Condition**: Identified as functional requirement input

**Execution Actions**:

- Enable Planner Agent

- Generate detailed markdown planning document

- Store document in `./.claude/plan` directory, named in plan/xxx.md format

- Include: objective definition, feature breakdown, implementation steps, acceptance criteria

#### B. Discussion Iteration Processing

**Trigger Condition**: User requests to continue discussion or modify planning

**Execution Actions**:

- Retrieve and analyze previously generated planning files

- Identify user feedback and confirmation content

- Enable Planner Agent

- Generate detailed markdown planning document

- Create a new document, for example, if the last one was plan/xxx.md, then this time it's plan/xxx-1.md, if the last one was plan/xxx-1.md, then this time it's plan/xxx-2.md, and so on

- Reorganize pending implementation task priorities

#### C. Execution Implementation Processing

**Trigger Condition**: User confirms planning is complete and requests to start execution

**Execution Actions**:

- Start task execution in the order of planning documents

- Perform task type identification before each subtask begins

- **Frontend Task Special Processing**:

- Check if available UI design exists

- If no design solution exists, must use UI-UX-Designer Agent

- Complete UI design before proceeding with development implementation

### 3. Key Execution Principles

#### Mandatory Response Requirements

- **Must first state in every interaction**: "I determine this operation type as: [specific type]"

- Type determination must be accurate and clearly communicated to users

#### Task Execution Standards

- Strictly execute according to documented planning

- Must clarify task nature and dependencies before subtask startup

- Frontend tasks must ensure UI design completeness

#### State Management Mechanism

- Maintain task completion status tracking

- Timely update planning document status

- Ensure user visibility of progress

## Quality Assurance Points

1. **Type Determination Accuracy**: Type identification at the beginning of each interaction must be accurate

2. **Document Consistency**: Planning documents and actual execution remain synchronized

3. **Dependency Management**: Pay special attention to UI design dependencies of frontend tasks

4. **Transparent User Communication**: All judgments and actions must be clearly communicated to users
