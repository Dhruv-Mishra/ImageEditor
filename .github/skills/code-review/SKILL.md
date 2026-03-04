---
name: code-review
description: Systematic code review covering correctness, security, performance, and style for any language.
---

# Skill: Code Review Checklist

## Purpose

Systematic code review covering correctness, security, performance, and style.

## Universal Checks

### Logic
- [ ] Code does what the requirements say
- [ ] Edge cases handled (empty inputs, boundaries, overflow)
- [ ] Error paths don't silently swallow failures
- [ ] No off-by-one errors
- [ ] Null/None/nil/undefined handled

### Security
- [ ] No hardcoded credentials or keys
- [ ] Input validation present
- [ ] No injection vulnerabilities (SQL, command, template)
- [ ] No path traversal vulnerabilities
- [ ] Cryptographic operations use vetted libraries
- [ ] Sensitive data not logged or exposed in errors

### Performance
- [ ] No unnecessary allocations in hot paths
- [ ] No O(n²) where O(n) is possible
- [ ] No blocking I/O in async contexts
- [ ] Appropriate data structure choices
- [ ] No memory leaks (resource cleanup present)
- [ ] No N+1 query patterns

### Maintainability
- [ ] Clear naming (functions, variables, types)
- [ ] Appropriate abstraction level
- [ ] No dead code or commented-out code
- [ ] Consistent with codebase style
- [ ] Non-obvious logic documented
- [ ] Structured logging present

## Domain-Specific Checks

Refer to the project's `copilot-instructions.md` for additional language-specific and domain-specific review criteria. Common areas include:
- Language-specific idioms and anti-patterns
- Framework-specific best practices
- Business domain invariants and constraints
- Data integrity and consistency requirements

## Severity Levels
- 🔴 **Critical**: Must fix (security, data corruption, crash)
- 🟡 **Warning**: Should fix (bug risk, performance, maintainability)
- 🔵 **Suggestion**: Nice to have (style, readability)
- ✅ **Good**: Positive observation
