---
name: security-audit
description: Focused security review covering authentication, authorization, data handling, and dependency safety.
---

# Skill: Security Audit

## Purpose

Focused security review for application components.

## Audit Areas

### 1. Authentication & Authorization
- [ ] Authentication mechanisms are properly implemented
- [ ] Authorization checks on all protected endpoints/functions
- [ ] Session management is secure (expiry, rotation, invalidation)
- [ ] Password/credential storage uses proper hashing (bcrypt, argon2)

### 2. Secrets Management
- [ ] Secrets loaded from environment variables or secret managers only
- [ ] No secrets in config files, source code, or logs
- [ ] Secret material not logged (even at debug level)
- [ ] `.gitignore` excludes sensitive files (.env, keys, certificates)

### 3. Input Validation & Injection
- [ ] All user input validated and sanitized
- [ ] Parameterized queries for database access (no string concatenation)
- [ ] No command injection vectors
- [ ] No template injection vulnerabilities
- [ ] File upload validation (type, size, content)

### 4. API Security
- [ ] Rate limiting on endpoints
- [ ] No sensitive data in error messages or stack traces
- [ ] CORS properly configured
- [ ] Authentication on WebSocket connections if applicable
- [ ] API versioning strategy in place

### 5. Data Protection
- [ ] Sensitive data encrypted at rest and in transit
- [ ] PII handling follows relevant regulations (GDPR, etc.)
- [ ] Audit logging for sensitive operations
- [ ] No sensitive data in URLs or query parameters

### 6. Dependency Security
- [ ] No known CVEs in dependencies
- [ ] Dependencies pinned to specific versions
- [ ] Minimal dependency footprint
- [ ] Security scanning tools configured (dependabot, snyk, etc.)

### 7. Configuration Security
- [ ] Sensitive values use environment variables
- [ ] Default configuration is safe (no debug mode, no open admin ports)
- [ ] Production configs reviewed separately from development
