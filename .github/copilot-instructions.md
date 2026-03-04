# GitHub Copilot — Workspace Instructions

> **Run `/init` in chat** (with the Orchestrator agent selected) to generate project-specific instructions automatically.

## Multi-Agent Workflow

This workspace uses a **multi-agent mesh architecture**. Agents are defined in `.github/agents/` as `.agent.md` files. Each agent can spawn any other agent, creating multi-hop relay chains and parallel execution patterns.

### Available Agents

| Agent | Visibility | Role |
|---|---|---|
| Orchestrator | User-facing | Coordinates workflows, spawns agent teams in parallel |
| Explorer | Subagent only | Explores codebase, maps files, traces dependencies |
| Programmer | Subagent only | Implements features, fixes bugs, writes production code |
| Oracle | Subagent only | Deep analysis of architecture decisions and tradeoffs |
| Reviewer | Subagent only | Reviews code for correctness, security, and performance |
| Tester | Subagent only | Writes and runs tests, validates correctness |

### How It Works

Select the **Orchestrator** agent and give it a task. It spawns agent teams:

```
User → Orchestrator "Add user authentication"
       ├── spawns Explorer → maps auth code → spawns Oracle with findings
       ├── spawns Oracle   → evaluates JWT vs session → spawns Programmer with decision
       ├── spawns Programmer → implements solution → spawns Tester
       │   └── Tester → tests fail → spawns Programmer → fixes → spawns Tester again
       ├── spawns Tester   → all pass → spawns Reviewer
       └── spawns Reviewer → approved (or spawns Programmer for fixes)
```

Agents run in **isolated context windows** but pass **structured context blocks** so downstream agents have full knowledge of what upstream agents found, decided, and built. Multiple agents run **in parallel** when tasks are independent. Any agent can spawn any other agent — the system is a **mesh**, not a strict hierarchy.

### Slash Commands

| Command | Description |
|---|---|
| `/init` | **Initialize project** — git setup, scan repo, ask preferences, generate instructions & skills |
| `/feature` | Full pipeline: explore → design → implement → test → review |
| `/fix` | Bug fix: explore → fix → regression test → review |
| `/swarm` | Maximum parallelism for complex tasks |
| `/review` | Multi-perspective parallel code review |
| `/explore` | Deep codebase exploration |
| `/test` | Write and run tests |
| `/architect` | Architecture decision with research |

### Inter-Agent Communication

Agents communicate via structured **context blocks** when spawning each other:

```markdown
## 📋 TEAM CONTEXT
**Original Task**: [user's request]
**Completed Steps**: [what other agents already did]
**Key Findings**: [critical information from other agents]
**Files Involved**: [specific file paths]
**Constraints**: [decisions made, approaches chosen]
**Your Assignment**: [specific task for this agent]
```

---

## Project Details

### Portrait Photo Cropper

Single-page Next.js application that lets a user upload a portrait photo, receive an AI-generated suggestion for the optimal headshot crop zone, and interactively adjust the crop before exporting the final image.

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | React 18, Tailwind CSS 3 |
| Language | TypeScript (strict) |
| Crop Editor | react-image-crop |
| Server Image Processing | sharp |
| Client Export | Canvas API |
| Animations | Framer Motion |
| Theming | next-themes |
| Notifications | sonner |
| Package Manager | npm |

### Code Standards

- Functional React components only, no classes
- `'use client'` directive for interactive components
- Named exports for components: `export function ComponentName()`
- Strict TypeScript (`strict: true`)
- Import order: React/Next → external libs → internal modules (`@/...`) → types → CSS
- Tailwind CSS utility classes for styling (mobile-first, dark mode via `dark:`)
- Avoid inline `style` unless dynamic values require it

### Error Handling

- **API routes**: try-catch with typed JSON error responses `{ error: string }`
- **Client**: try-catch in async handlers, surface to user via state or toast
- Never swallow errors silently

### Critical Constraints

- File validation: type (JPEG, PNG, WebP) and size (≤ 10 MB) enforced on both client and server
- Client-side downscaling before API upload (max 1200px longest side) — preview image used for all UI
- All crop coordinates during editing are in preview pixel space
- Export scales coordinates to full-res via `scaleToFullRes()` then crops from original image at full resolution
- Mock API (`/api/crop-suggest`) returns a deterministic heuristic; swap in a real AI model by keeping the same `CropSuggestion` response shape

### Review Priorities

1. Functionality correctness
2. Performance (60 fps crop interactions)
3. Code clarity and component architecture

### Security

Standard posture — no authentication, PII, or payments. Image data is processed server-side for dimension analysis only (mock). Future AI integration should respect same boundaries.

### Build & Dev Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |

### Architecture

**Type**: Monolith — single Next.js app with App Router.

**Data flow**: Upload → client-side downscale (Canvas API, max 1200px) → POST downscaled image to `/api/crop-suggest` → `CropSuggestion` response (preview-space coords) → interactive crop editor (preview image) → export: scale coords to full-res via `scaleToFullRes()` → Canvas API crop on full-res image → browser download.

**Key modules**:
- `src/app/page.tsx` — main page state machine (idle → uploading → editing → exporting), dual-URL management (preview + full-res)
- `src/app/api/crop-suggest/route.ts` — mock AI endpoint (sharp for dimensions, heuristic for crop)
- `src/components/CropEditor.tsx` — react-image-crop integration with Framer Motion entrance
- `src/components/UploadZone.tsx` — drag-and-drop with Framer Motion animations
- `src/components/AspectRatioSelector.tsx` — animated pill selector with layoutId
- `src/components/ThemeToggle.tsx` — dark/light mode toggle (next-themes)
- `src/lib/cropHeuristic.ts` — deterministic crop suggestion + aspect ratio adjustment
- `src/lib/imageUtils.ts` — Canvas crop, download, file validation, `downscaleImage()`, `scaleToFullRes()`
- `src/lib/types.ts` — shared `CropRegion`, `CropSuggestion`, `AspectRatioOption`, `DownscaledImage`

### Commit Convention

Conventional Commits:
- `feat: add aspect ratio selector`
- `fix: correct crop bounds on narrow images`
- `chore: update dependencies`
- `refactor: extract crop conversion utils`

### Logging

Console logging in development only. No structured logging infrastructure needed at this scope.
