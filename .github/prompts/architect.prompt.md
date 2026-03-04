---
name: architect
description: Architecture decision — evaluate tradeoffs and recommend an approach.
agent: Oracle
tools: ['agent', 'search', 'read', 'fetch']
---

Analyze the following design decision:

**Decision**: ${input:decision:What architecture/design question needs answering?}

1. Spawn an **Explorer subagent** to gather codebase context relevant to this decision.
2. Frame the problem and constraints based on exploration findings.
3. Enumerate ≥2 viable options with pros/cons for each.
4. Recommend ONE option with confidence level and rationale.

Return a structured decision document with options, tradeoffs, recommendation, and implementation guidance.
