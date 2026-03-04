---
name: explore
description: Deep codebase exploration — map architecture, dependencies, and patterns.
agent: Explorer
tools: ['agent', 'search', 'read', 'fetch']
---

Explore the codebase to answer the following question or map the following area:

**Topic**: ${input:topic:What area of the codebase to explore?}

Perform a thorough exploration:

1. Search for relevant files and symbols
2. Read key files, trace imports and data flows
3. Map the architecture layers and module boundaries
4. Identify patterns, conventions, and existing abstractions

If the area is large, spawn subagent(s) to explore different modules in parallel.

Return a structured exploration report with relevant files, key findings, patterns to follow, and impact analysis.
