---
name: review
description: Multi-perspective code review — security, correctness, performance, architecture.
agent: Reviewer
tools: ['agent', 'search', 'read']
---

Perform a thorough multi-perspective code review on the recent changes.

Run these review perspectives as **parallel subagents**:

1. **Correctness reviewer**: Logic errors, edge cases, type issues, error handling.
2. **Security reviewer**: Input validation, injection risks, credential exposure, access control.
3. **Performance reviewer**: Unnecessary allocations, blocking calls, N+1 queries, hot path analysis.
4. **Architecture reviewer**: Codebase pattern consistency, abstraction appropriateness, design alignment.

After all perspectives complete, synthesize into a single prioritized review:

```
## 📝 MULTI-PERSPECTIVE REVIEW
**Verdict**: ✅ APPROVED | ⚠️ COMMENTS | ❌ CHANGES REQUESTED
**Critical**: [must fix]
**Warnings**: [should fix]
**Good**: [positive observations]
```
