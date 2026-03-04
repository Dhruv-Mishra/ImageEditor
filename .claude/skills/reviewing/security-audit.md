# Skill: Security Audit

## Audit Areas

### Secrets Management
- Secrets from env vars or secret managers only
- No secrets in config, source, or logs

### Authentication & Authorization
- Auth mechanisms properly implemented
- Authorization on protected endpoints
- Session management secure

### Input Validation
- All user input validated and sanitized
- Parameterized queries (no string concatenation)
- No command or template injection

### API Security
- Rate limiting on endpoints
- No sensitive data in errors
- CORS properly configured

### Dependencies
- No known CVEs
- Dependencies pinned
- Security scanning configured
