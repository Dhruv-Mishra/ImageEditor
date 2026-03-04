---
name: swarm
description: Full agent swarm — maximum parallelism, agents collaborate through mesh relay chains.
agent: Orchestrator
tools: ['agent', 'search', 'read', 'edit', 'terminal', 'fetch', 'codebase', 'problems', 'usages', 'changes']
---

Attack the following complex task with a **full agent swarm**:

**Task**: ${input:task:Describe the complex task}

## Swarm Execution Strategy

Deploy ALL agents with maximum parallelism. Agents should **spawn each other** as needed — this is a mesh, not a pipeline.

### Wave 1 — Reconnaissance (parallel)
Spawn **simultaneously**:
- **Explorer subagent A** → scan all files and modules relevant to the task, map architecture
- **Explorer subagent B** → trace dependencies and data flows for affected areas
- **Oracle subagent** → research best approaches, fetch external references if needed

Each Explorer should include in their report: files found, patterns to follow, risks identified, and which agent should act next.

### Wave 2 — Implementation (parallel where possible)
Based on Wave 1 findings:
- If the task spans **independent modules**, spawn **multiple Programmer subagents in parallel** — one per module
- If the task is a **single cohesive change**, spawn **one Programmer subagent** with ALL findings from Wave 1
- Each Programmer should spawn **Tester** when done with their part (agents self-coordinate)

Pass FULL context from Wave 1 to every Programmer:
```
## 📋 TEAM CONTEXT
**Original Task**: [the task]
**Explorer A Findings**: [summary]
**Explorer B Findings**: [summary]
**Oracle Decision**: [chosen approach and rationale]
**Your Module**: [specific area to implement]
```

### Wave 3 — Validation (parallel)
Spawn **simultaneously**:
- **Tester subagent(s)** → write and run tests (one per module if parallel implementation)
- **Reviewer subagent** → review all changes for correctness, security, performance

Both Tester and Reviewer should receive the full implementation context.

### Wave 4 — Fix Loop (if needed)
If Tester or Reviewer find issues:
- Tester spawns Programmer with failure details → Programmer fixes → Tester re-runs
- Reviewer spawns Programmer with fix instructions → Programmer fixes → Reviewer re-checks
- Max 2 fix loops per issue, then escalate to user

### Completion
Produce a unified summary:
```
## ✅ SWARM COMPLETE
**Task**: [original task]
**Agents Deployed**: [count and roles]
**Agent Chain**: [who spawned who — the actual collaboration graph]
**Files Changed**: [categorized list]
**Tests**: [pass/fail summary]
**Review**: [verdict]
**Parallel Efficiency**: [what ran in parallel vs serial]
```

**Rules**: Maximize parallelism. Only serialize steps with true data dependencies. Every agent spawn MUST include full context from prior agents.
