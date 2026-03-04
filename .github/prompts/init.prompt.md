---
name: init
description: Initialize project for multi-agent workflows — comprehensive repo setup with git, preferences, instructions & skills. Works on both existing and greenfield projects.
agent: Orchestrator
tools: ['agent', 'search', 'read', 'edit', 'terminal', 'fetch', 'codebase', 'problems', 'usages', 'changes']
---

Initialize this project for multi-agent AI-assisted development.

You MUST follow the numbered phases below IN ORDER. Do NOT skip any phase. Do this work **yourself directly** — you have all the tools needed. Only spawn subagents when explicitly noted below.

---

## Phase 0: Detect Project State

Determine what kind of project this is. Run a quick scan:

```
# Count source files (excluding agent setup files)
Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch '\\.(github|claude)\\' -and $_.Name -ne 'README.md' -and $_.Name -ne 'CLAUDE.md' -and $_.Name -ne '.gitignore' } | Measure-Object
```

Also check git:
```
git rev-parse --is-inside-work-tree 2>&1
git remote -v 2>&1
git branch --show-current 2>&1
git log --oneline -3 2>&1
```

Classify:
- **GREENFIELD** — Empty or near-empty (only agent setup files). Go to **Phase 1A**.
- **EXISTING** — Has source code, dependencies, configs. Go to **Phase 1B**.

Tell the user: "I detected this is a [greenfield/existing] project."

---

## Phase 1A: Greenfield Project Setup (no existing code)

There's nothing to scan — go directly to interactive setup.

### Step 1A.1 — Git Setup

**If git is NOT initialized:**
- "This project has no git history. Should I initialize git? (Yes / No)"
- If yes: run `git init`
- Ask: "Default branch name?" — Options: `main` / `master` / `Other`

**If no remote configured:**
- "Would you like to add a remote repository?"
- If yes: "Enter the remote URL:"
- Run `git remote add origin <url>`

**If git IS already initialized:**
- Show status and ask if changes are needed.

### Step 1A.2 — Core Preferences (ask ALL at once)

Present these questions in a clear, numbered format. Group related ones together.

#### Group A — Project Identity
1. **Project name**: "What is the project name?"
2. **Project description**: "In 1-2 sentences, what will this project do?"
3. **Project type**: Options: `Web Application` / `Mobile App` / `API/Backend Service` / `CLI Tool` / `Library/Package` / `Desktop Application` / `Data Pipeline` / `ML/AI Project` / `Monorepo` / `Other (describe)`

#### Group B — Tech Stack
4. **Primary language(s)**: "What language(s)? (e.g., TypeScript, Python, Rust, Go, Java, C#)"
5. **Frameworks**: "What frameworks? (e.g., React, Next.js, Django, FastAPI, Actix, Gin, Spring Boot)"
6. **Package manager**: Based on language:
   - JS/TS: `npm` / `yarn` / `pnpm` / `bun`
   - Python: `pip` / `poetry` / `uv` / `pdm` / `conda`
   - Rust: `cargo` (default)
   - Go: `go modules` (default)
   - Java: `Maven` / `Gradle`
   - Other: ask
7. **Runtime/platform**: Options: `Node.js` / `Deno` / `Bun` / `Browser` / `Python 3.x` / `JVM` / `Native` / `WASM` / `Other`

#### Group C — Architecture
8. **Architecture pattern**: Options: `Monolith` / `Microservices` / `Serverless` / `Event-driven` / `Layered (MVC/MVVM)` / `Hexagonal/Clean` / `Not sure yet`
9. **Database**: Options: `PostgreSQL` / `MySQL` / `MongoDB` / `SQLite` / `Redis` / `DynamoDB` / `Supabase` / `Firebase` / `None yet` / `Other`
   - If yes: "ORM or raw queries?" — `ORM` / `Query builder` / `Raw SQL` / `Not sure`
10. **API style** (if applicable): Options: `REST` / `GraphQL` / `gRPC` / `tRPC` / `WebSocket` / `Not applicable`

#### Group D — Code Standards & Philosophy
11. **Coding standards**: "Any style preferences? (e.g., 'functional style', 'no classes', 'strict types')"
12. **Error handling**: Options: `Exceptions/try-catch` / `Result types (Rust-style)` / `Error codes` / `Framework default` / `No preference`
13. **Import organization**: Options: `Grouped (stdlib → external → internal)` / `Alphabetical` / `No preference`
14. **Documentation style** (filtered by language): `JSDoc` / `TSDoc` / `Google docstrings` / `NumPy docstrings` / `Rust doc comments` / `Javadoc` / `XML docs` / `Minimal`
15. **Logging**: Options: `Structured logging (JSON)` / `Console/print` / `Framework logger` / `No preference`

#### Group E — Quality & Safety
16. **Critical constraints**: "Any rules that must NEVER be violated? (e.g., 'all endpoints require auth', 'HIPAA compliance')"
17. **Review priorities**: "Top 3 review focuses? (e.g., 'security', 'performance', 'readability', 'test coverage')"
18. **Security posture**: Options: `Standard` / `High (PII/payments/auth)` / `Critical (healthcare/finance/infrastructure)`

#### Group F — Testing
19. **Test framework**: Based on language, suggest defaults:
    - JS/TS: `Jest` / `Vitest` / `Mocha` / `Playwright (e2e)` / `Other`
    - Python: `pytest` / `unittest` / `Other`
    - Rust: `built-in` / `Other`
    - Go: `built-in` / `testify` / `Other`
    - Other: ask
20. **Test comprehensiveness**: Options: `Essential (happy paths + critical edges)` / `Thorough (unit + integration)` / `Comprehensive (unit + integration + e2e + property-based)` / `TDD workflow`

#### Group G — Tooling & Environment
21. **Linter/formatter**: Based on language, suggest:
    - JS/TS: `ESLint + Prettier` / `Biome` / `Other`
    - Python: `Ruff` / `Black + Flake8` / `Other`
    - Rust: `rustfmt + clippy` (default)
    - Go: `gofmt + go vet` (default)
    - Other: ask
22. **Type strictness** (if applicable):
    - TS: `strict: true` / `relaxed` / `custom`
    - Python: `mypy strict` / `mypy basic` / `pyright` / `none`
23. **Editor config**: "Generate `.editorconfig`?" — If yes: indent style, indent size, line endings
24. **Pre-commit hooks**: Options: `No` / `Husky (npm)` / `pre-commit (Python)` / `Lefthook`
    - If yes: "What should run?" — `Lint` / `Format` / `Type-check` / `Test` / `All`
25. **Containerization**: Options: `No` / `Dockerfile only` / `Dockerfile + docker-compose` / `Devcontainer`

#### Group H — Version Control & Collaboration
26. **Branching strategy**: Options: `main only` / `main + develop` / `GitFlow` / `trunk-based` / `custom`
27. **Commit convention**: Options: `Conventional Commits (feat:, fix:)` / `Angular` / `Gitmoji` / `Free-form` / `Custom`
28. **PR template**: "Generate a PR template?" — `Yes` / `No`
29. **Issue templates**: "Generate issue templates?" — `Yes` / `No`

#### Group I — CI/CD
30. **CI/CD**: Options: `No` / `GitHub Actions` / `GitLab CI` / `Other`
    - If yes: "What should CI run?" — `Lint + Test` / `Lint + Test + Build` / `Lint + Test + Build + Deploy` / `Custom`

#### Group J — Documentation & Licensing
31. **License**: Options: `MIT` / `Apache 2.0` / `GPL 3.0` / `BSD 3-Clause` / `ISC` / `Proprietary/None` / `Other`
32. **README**: "Generate a README?" — `Yes` / `No`
33. **Changelog**: Options: `No` / `Keep a Changelog` / `Conventional Changelog (auto)`
34. **Contributing guide**: "Generate CONTRIBUTING.md?" — `Yes` / `No`

#### Group K — VS Code Workspace
35. **VS Code settings**: "Generate VS Code settings for this stack?" — `Yes` / `No`

**Shortcut**: If the user says "use defaults" or "auto" for any group, make sensible choices for the stated tech stack and announce them.

After collecting answers, proceed to **Phase 2** (skip Phase 1B).

---

## Phase 1B: Existing Project Discovery (has source code)

Do this yourself — you have `search`, `read`, `codebase`, and `terminal` tools. Scan the repo:

1. **Directory structure**: List files and folders (top 3 levels)
2. **Languages & build tools**: Check for package.json, Cargo.toml, pyproject.toml, go.mod, pom.xml, etc.
3. **Configs**: Look for linter, formatter, CI/CD, editor, pre-commit configurations
4. **Tests**: Identify test framework and test file locations
5. **Docs**: Check for README, LICENSE, CONTRIBUTING, CHANGELOG
6. **Architecture**: Read key files to understand module structure, entry points, API surface

**Only spawn an Explorer subagent** if the codebase is very large (many modules, monorepo, 100+ files) and would benefit from parallel scanning of different areas. For small-to-medium repos, scan it yourself.

### Then: Ask User Preferences

Present findings and ask for preferences. Show auto-detected values so the user can confirm or override.

#### Group A — Project Identity
1. **Project description**: "Detected: [summary]. Confirm or provide your own."
2. **Project type**: "Looks like a [type]. Confirm?" — Options: `Application` / `Library/Package` / `API/Service` / `CLI Tool` / `Monorepo` / `Other`

#### Group B — Code Standards
3. **Coding standards**: "Found these configs: [list]. Any additional preferences?"
4. **Import organization**: Options: `Keep current` / `Grouped` / `Alphabetical` / `No preference`
5. **Documentation style**: "Detected: [style]. Confirm?" — show options
6. **Error handling**: "Detected: [pattern]. Any changes?"

#### Group C — Quality & Safety
7. **Critical constraints**: "Any rules that must NEVER be violated?"
8. **Review priorities**: "Top 3 review focuses?"
9. **Security posture**: Options: `Standard` / `High` / `Critical`
10. **Logging**: "Detected: [pattern]. Confirm?"

#### Group D — Testing
11. **Test framework**: "Detected: [framework]. Confirm?"
12. **Test comprehensiveness**: Options: `Essential` / `Thorough` / `Comprehensive` / `Custom`
13. **Test commands**: "Auto-detected: [commands]. Confirm or change."

#### Group E — Version Control
14. **Branching strategy**: Options: `main only` / `main + develop` / `GitFlow` / `trunk-based` / `custom`
15. **Commit convention**: Options: `Conventional Commits` / `Angular` / `Gitmoji` / `Free-form` / `Custom`
16. **PR/issue templates**: "Generate?" — `Yes` / `No` / `Already exists`

#### Group F — Tooling Gaps (only ask about what's MISSING)
17. **Editor config**: Only if missing: "Generate `.editorconfig`?"
18. **Pre-commit hooks**: Only if missing: "Set up pre-commit hooks?"
19. **CI/CD**: Only if missing: "Generate CI/CD configuration?"
20. **Containerization**: Only if missing: "Set up Docker?"
21. **VS Code settings**: Only if missing: "Generate VS Code workspace settings?"

#### Group G — Documentation Gaps (only ask about what's MISSING)
22. **License**: Only if missing: "What license?"
23. **README**: "Update existing?" / Only if missing: "Generate?"
24. **Changelog**: Only if missing: "Set up CHANGELOG?"
25. **Contributing guide**: Only if missing: "Generate CONTRIBUTING.md?"

**Shortcut**: "use defaults" or "auto" → keep auto-detected, fill gaps with best practices.

---

## Phase 2: Generate Files

Generate all files yourself. You have `edit` and `terminal` tools — use them directly.

### 2.1 — copilot-instructions.md
Update `.github/copilot-instructions.md`. Preserve the multi-agent workflow section at the top, then add project-specific sections:

```markdown
# GitHub Copilot — Workspace Instructions

> **Run `/init` in chat** (with the Orchestrator agent selected) to regenerate.

## Multi-Agent Workflow
[KEEP the existing multi-agent workflow section — copy verbatim]

## Project Details

### [Project Name]
[Description]

### Tech Stack
| Layer | Tech |
|---|---|
| [Layer] | [Technologies] |

### Code Standards
[Conventions from preferences and/or auto-detection]

### Error Handling
[Philosophy with examples]

### Critical Constraints
[Domain rules — MUST be respected by all agents]

### Review Priorities
[Ordered by importance]

### Security
[Posture and requirements]

### Test Commands
| Command | Purpose |
|---|---|
| `[command]` | [description] |

### Architecture
[Type, patterns, modules, data flow, integrations]

### Commit Convention
[Convention with examples]

### Logging
[Approach and patterns]
```

### 2.2 — Language-specific skills
For EACH language/framework, create:

**Implementation skills:**
```
.github/skills/implement-[lang]/SKILL.md
```
With frontmatter (`name`, `description`) and body covering conventions, patterns, error handling, imports, idioms.

**Test skills:**
```
.github/skills/write-[lang]-tests/SKILL.md
```
With test framework, patterns, naming, fixtures, mocks.

### 2.3 — CLAUDE.md & .claude config
Create/update `CLAUDE.md` at repo root (same info as copilot-instructions.md, formatted for Claude Code).
Update `.claude/settings.json` with project metadata.

### 2.4 — Project files
Generate whichever of these were requested or are needed:

**Always generate:**
- `.gitignore` — comprehensive for the stack (use `fetch` for templates from github/gitignore if helpful)

**Generate if requested:**
- `.editorconfig`
- `.gitmessage` — commit template (and run `git config commit.template .gitmessage`)
- Pre-commit hook config (Husky/pre-commit/Lefthook)
- CI/CD config (GitHub Actions / GitLab CI)
- `.vscode/settings.json` and `.vscode/extensions.json`
- `LICENSE`
- `README.md`
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/ISSUE_TEMPLATE/bug_report.md` and `feature_request.md`
- `Dockerfile` / `docker-compose.yml` / `.devcontainer/devcontainer.json`

**For greenfield projects only:**
- Basic project structure (src/, tests/, etc.)
- Package manifest (package.json, pyproject.toml, Cargo.toml, go.mod, etc.)
- Entry point file with minimal boilerplate
- Linter/formatter config files
- tsconfig.json / mypy.ini / etc. with chosen strictness

---

## Phase 3: Self-Review

Review all generated files yourself. Check:
- **Accuracy**: Instructions match the project (or stated intentions for greenfield)
- **Completeness**: All languages/frameworks covered in skills
- **Consistency**: copilot-instructions.md and CLAUDE.md agree
- **No hallucination**: Only reference things that exist or were requested
- **Config validity**: Generated configs are syntactically correct
- **Git safety**: .gitignore patterns are correct

Fix any issues you find.

**Only spawn a Reviewer subagent** if the project has security-sensitive constraints (security posture = High or Critical) where a second perspective is valuable.

---

## Phase 4: Final Commit (if git is initialized)

If git is initialized:
- Stage all generated/modified files
- Ask: "Should I commit these? (Yes / No / Let me review first)"
- If yes: commit using chosen convention (e.g., `chore: initialize multi-agent AI development workflow`)
- If "let me review": list staged files and wait

---

## Phase 5: Summary

```
## ✅ PROJECT INITIALIZED

**Project**: [name]
**Type**: [type]
**Mode**: [Greenfield / Existing Project]
**Languages**: [list]
**Frameworks**: [list]

### Repository Setup
- Git: [initialized/already configured] | Branch: [name]
- Remote: [URL or "none"]
- Branch Strategy: [strategy]
- Commit Convention: [convention]

### Files Generated
- `.github/copilot-instructions.md` — workspace instructions
- `CLAUDE.md` — Claude Code compatibility
- `.claude/settings.json` — project metadata
- `.github/skills/implement-[lang]/SKILL.md` — per language
- `.github/skills/write-[lang]-tests/SKILL.md` — per language
- `.gitignore` — stack-specific ignore rules
- [list all other generated files]

### Agent Team Ready
| Agent | Role |
|---|---|
| Orchestrator | Coordinates workflows, spawns agent teams |
| Explorer | Maps code, traces dependencies |
| Oracle | Evaluates approaches, makes design decisions |
| Programmer | Implements features, fixes bugs |
| Tester | Writes tests, validates correctness |
| Reviewer | Reviews quality, security, performance |

### Quick Start
1. Review the generated files and adjust any preferences
2. Select the **Orchestrator** agent for development tasks
3. Try these commands:
   - `/feature` — explore → design → implement → test → review
   - `/fix` — bug fix with regression testing
   - `/swarm` — maximum parallelism for complex tasks
   - `/review` — multi-perspective code review
   - `/test` — write and run tests
   - `/architect` — architecture decision with research
4. Re-run `/init` anytime to regenerate after major changes
```
