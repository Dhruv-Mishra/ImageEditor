---
name: feature
description: Full agent workflow — explore, design, implement, test, review with inter-agent collaboration.
agent: Orchestrator
tools: ['agent', 'search', 'read', 'edit', 'terminal', 'fetch', 'codebase', 'problems', 'usages', 'changes']
---

Implement the following feature using the full multi-agent team:

**Feature**: ${input:feature:Describe the feature to implement}

## Agent Team Workflow

### Phase 1 — Discovery (parallel)
Spawn **simultaneously**:
- **Explorer subagent**: Analyze codebase for relevant files, patterns, architecture, and conventions for this feature. Include in report: files to modify, patterns to follow, risks, and recommended approach.
- **Oracle subagent**: If there are multiple viable approaches, evaluate tradeoffs and recommend one. Include implementation guidance for Programmer and testing guidance for Tester.

### Phase 2 — Implementation
Spawn **Programmer subagent** with FULL context from Phase 1:
```
## 📋 TEAM CONTEXT
**Feature**: [the feature]
**Explorer Findings**: [files, patterns, architecture]
**Oracle Decision**: [chosen approach with rationale]
**Your Assignment**: Implement the feature following the chosen approach
```

Programmer implements and should include in output: files changed, key decisions, edge cases handled, and specific areas needing tests/review.

### Phase 3 — Validation (parallel)
Spawn **simultaneously**:
- **Tester subagent**: Write and run tests based on implementation summary. If tests fail, Tester spawns Programmer to fix, then re-runs.
- **Reviewer subagent**: Review changes for correctness, security, and performance. If issues found, Reviewer spawns Programmer with fix instructions.

### Phase 4 — Fix Loop (if needed)
If Tester or Reviewer found issues:
- Programmer fixes → Tester re-validates → Reviewer re-checks
- Continue until clean or max 2 loops

### Completion
```
## ✅ FEATURE COMPLETE
**Feature**: [description]
**Files Changed**: [list]
**Tests**: [pass/fail summary]
**Review**: [verdict]
**Agent Collaboration**: [who spawned who and key handoffs]
```
