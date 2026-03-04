---
name: coordinate-workflow
description: Orchestrate a complete multi-agent development workflow by delegating to specialist agents in the correct sequence.
---

# Skill: Coordinate Multi-Agent Workflow

## Purpose

Orchestrate a complete development workflow by delegating to specialist agents in the correct sequence.

## Protocol

### 1. Intake
- Parse the user's request into a clear problem statement
- Classify complexity: Low / Medium / High / Critical
- Identify which parts of the codebase are affected

### 2. Plan
- Select the appropriate workflow template
- Customize steps based on the specific task
- Identify dependencies between steps (what must be serial vs. parallel)

### 3. Execute
- Spawn subagents for each step
- Run independent subagents **in parallel** where possible
- Track completion status
- Aggregate outputs into a final summary

### 4. Verify
- Confirm all steps completed
- Check that Tester and Reviewer were included for critical paths
- Produce final Workflow Summary

## Workflow Templates

### Full Feature
Explorer → Oracle → Programmer → Tester → Reviewer

### Bug Fix
Explorer → Programmer → Tester → Reviewer

### Architecture Decision
Explorer → Oracle → Reviewer

### Quick Fix
Programmer → Reviewer

## Parallelization Opportunities
- Explorer + Oracle can run **simultaneously** (gather context + research approaches)
- Tester + Reviewer can run **simultaneously** (after implementation)
- Multiple Programmer subagents for **independent modules**

## Escalation Rules
- If Reviewer rejects: loop back to Programmer with feedback
- If Tester finds failures: loop back to Programmer with failing tests
- If Oracle has low confidence: gather more context via Explorer
- Max 2 rejection loops before escalating to user
