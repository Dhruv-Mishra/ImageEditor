---
name: test
description: Write and run tests for a specific area or recent changes.
agent: Tester
tools: ['agent', 'search', 'read', 'edit', 'terminal']
---

Write and run tests for the following:

**Target**: ${input:target:What code to test? (file, function, feature, or "recent changes")}

1. Spawn an **Explorer subagent** to understand the code under test — its inputs, outputs, edge cases, and dependencies.
2. Write comprehensive tests covering happy paths, edge cases, error conditions, and boundary values.
3. Run the test suite and report results.
4. Identify any remaining coverage gaps.

Return a test report with results, edge cases covered, and edge cases still missing.
