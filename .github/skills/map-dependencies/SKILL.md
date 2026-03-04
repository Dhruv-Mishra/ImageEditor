---
name: map-dependencies
description: Trace all dependencies for a module, function, or type to understand change impact radius.
---

# Skill: Map Dependencies

## Purpose

Trace all dependencies for a given module, function, or type to understand the impact radius of a change.

## Dependency Types

### Direct Dependencies (Imports)
- What does this file/module explicitly import?
- What packages/crates/modules does it depend on?

### Reverse Dependencies (Usages)
- What other files import from this module?
- Where is this type/function/interface used?

### Implicit Dependencies
- Configuration values read at runtime
- Environment variables accessed
- File system paths referenced
- Network endpoints called

### Data Dependencies
- What data structures flow through this code?
- What database tables does it read/write?
- What shared state (locks, channels, caches) does it access?

## Impact Classification

| Level | Meaning |
|---|---|
| None | Dependent code doesn't need changes |
| Interface | Type signatures change, dependents must update |
| Behavioral | Logic changes, dependents may need testing |
| Breaking | Incompatible change, dependents must rewrite |

## Output

- Dependency tree (text or mermaid diagram)
- List of files that would need updating
- Risk assessment for the proposed change
