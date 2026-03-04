---
name: task-decomposition
description: Break complex feature requests into ordered, independently-verifiable subtasks for multi-agent execution.
---

# Skill: Task Decomposition

## Purpose

Break complex feature requests into ordered, independently-verifiable subtasks.

## Decomposition Framework

### Step 1: Identify Components
- Which modules/files does this touch?
- What are the data flow boundaries?
- Are there independent parts that could be parallelized?

### Step 2: Order by Dependencies
- What must be done first? (data structures, types, interfaces)
- What depends on what? (implementation needs types, tests need implementation)
- What can be parallelized? (independent modules, independent test suites)

### Step 3: Size Each Subtask
- Each subtask should be completable in one agent session
- If a subtask touches >5 files, consider splitting further
- Each subtask should have clear acceptance criteria

### Step 4: Assign Agents
- Data gathering → Explorer
- Decision points → Oracle
- Implementation → Programmer
- Validation → Tester
- Quality gate → Reviewer

## Output Template

```markdown
### Subtask [N]: [Name]
**Agent**: [agent]
**Depends on**: [subtask numbers or "none"]
**Parallel with**: [subtask numbers or "none"]
**Files**: [expected files to touch]
**Acceptance**: [clear criteria]
```
