---
name: fix
description: Bug fix workflow — explore root cause, fix, regression test, review.
agent: Orchestrator
tools: ['agent', 'search', 'read', 'edit', 'terminal', 'fetch', 'codebase', 'problems', 'usages']
---

Fix the following bug using the multi-agent team:

**Bug**: ${input:bug:Describe the bug to fix}

## Agent Team Workflow

### Phase 1 — Root Cause Analysis
Spawn **Explorer subagent**: Trace the bug through the codebase. Find the root cause, affected code paths, and related files. Explorer should include in report: root cause, files involved, fix strategy, and potential side effects.

### Phase 2 — Fix
Spawn **Programmer subagent** with Explorer's full findings. Programmer implements the fix and should spawn **Tester** when done.

### Phase 3 — Validation (parallel)
Spawn **simultaneously**:
- **Tester subagent**: Write a regression test that reproduces the bug FIRST (confirm it fails without fix), then verify the fix passes. If tests fail, Tester spawns Programmer to fix.
- **Reviewer subagent**: Review the fix for correctness, side effects, and whether the root cause is fully addressed. If issues found, Reviewer spawns Programmer.

### Completion
```
## 🔧 BUG FIX COMPLETE
**Bug**: [description]
**Root Cause**: [what caused it]
**Fix**: [what was changed]
**Files Changed**: [list]
**Regression Test**: [test file and what it covers]
**Review**: [verdict]
```
