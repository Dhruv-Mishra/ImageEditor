# Skill: Code Review Checklist

## Universal Checks
- [ ] Matches requirements
- [ ] Edge cases handled
- [ ] Errors not silently swallowed
- [ ] No hardcoded credentials
- [ ] Structured logging present
- [ ] Non-obvious logic documented
- [ ] No dead code or debug statements
- [ ] Consistent with codebase patterns

## Security
- [ ] Input validation present
- [ ] No injection vulnerabilities
- [ ] No path traversal risks
- [ ] Sensitive data not exposed in errors or logs

## Performance
- [ ] No unnecessary allocations in hot paths
- [ ] No blocking I/O in async contexts
- [ ] No unnecessary O(n²) operations
- [ ] No N+1 query patterns

## Severity
- 🔴 Critical: Must fix
- 🟡 Warning: Should fix
- 🔵 Suggestion: Nice to have
