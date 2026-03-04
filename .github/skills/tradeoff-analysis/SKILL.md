---
name: tradeoff-analysis
description: Systematically evaluate tradeoffs between competing technical concerns for a decision.
---

# Skill: Tradeoff Analysis

## Purpose

Systematically evaluate tradeoffs between competing concerns for a technical decision.

## Framework

### 1. Identify Tensions
What pairs of concerns are in tension?
- Performance ↔ Readability
- Flexibility ↔ Simplicity
- Safety ↔ Ergonomics
- Correctness ↔ Speed
- DRY ↔ Explicitness
- Consistency ↔ Pragmatism

### 2. Prioritize for Context
Rank the concerns for THIS specific situation:
- In a hot path → Performance > Readability
- In rarely-changed config → Readability > Performance
- In financial/critical calculations → Correctness > Everything
- In a prototype → Speed > Correctness
- In a public API → Stability > Features

### 3. Quantify Where Possible
- How much slower/faster is option A? (benchmarks, Big-O)
- How many more lines of code is option B?
- How many edge cases does option C miss?
- What's the blast radius of option D failing?

### 4. Apply Project Constraints
Check the project's `copilot-instructions.md` or `CLAUDE.md` for domain-specific constraints that affect the tradeoff (e.g., security requirements, performance budgets, backwards compatibility guarantees).

### 5. Decide and Document
- State which tradeoff you're making
- Explain why (context-dependent prioritization)
- Note the cost you're accepting
- Identify how to mitigate that cost
