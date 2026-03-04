# Skill: Coordinate Multi-Agent Workflow

## Purpose
Orchestrate a complete development workflow by delegating to specialist agents in the correct sequence.

## Protocol

### 1. Intake
- Parse the user's request into a clear problem statement
- Classify complexity: Low / Medium / High / Critical
- Identify affected codebase areas

### 2. Plan
- Select the appropriate workflow template
- Customize steps based on the specific task
- Identify dependencies between steps

### 3. Execute
- Generate handoff blocks for each step
- Track completion status
- Aggregate outputs into a final summary

### 4. Verify
- Confirm all steps completed
- Check that Tester and Reviewer were included for critical paths
- Produce final Workflow Summary

## Escalation Rules
- If Reviewer rejects: loop back to Programmer with feedback
- If Tester finds failures: loop back to Programmer with failing tests
- If Oracle has low confidence: gather more context via Explorer
- Max 2 rejection loops before escalating to user
