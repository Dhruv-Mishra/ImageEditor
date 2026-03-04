---
name: architecture-decision
description: Analyze a design problem with multiple solutions — produce an Architecture Decision Record with recommendation.
---

# Skill: Architecture Decision Record

## Purpose

Analyze a design problem with multiple solutions and produce a well-reasoned recommendation.

## ADR Template

### 1. Context
- What is the problem or decision?
- What constraints exist (technical, time, resource)?
- What has already been decided that affects this?
- What are the success criteria?

### 2. Options

For each option:
- **Description**: How it works
- **Pros**: Advantages
- **Cons**: Disadvantages
- **Risk**: What could go wrong
- **Effort**: Implementation complexity (Low/Medium/High)
- **Ecosystem Fit**: How well it matches existing code

### 3. Analysis Matrix

Score each option 1-5 across dimensions:
- Correctness
- Performance
- Simplicity
- Maintainability
- Extensibility
- Risk (lower = better)

### 4. Recommendation

- State the chosen option
- Explain the deciding factor
- Note confidence level (High/Medium/Low)
- Document what would change the decision

### 5. Consequences

- What becomes easier?
- What becomes harder?
- What new constraints does this create?

## Anti-Patterns
- ❌ Only considering one option
- ❌ Over-engineering for hypothetical futures
- ❌ Choosing novelty over reliability
- ❌ Ignoring existing codebase patterns
- ❌ Unsubstantiated performance claims
