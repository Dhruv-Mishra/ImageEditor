---
name: implement-nextjs
description: Implementation patterns for Next.js 14+ with TypeScript, React, and Tailwind CSS.
---

# Next.js + TypeScript Implementation Skill

## File Structure

```
src/
├── app/              ← App Router: pages, layouts, API routes
│   ├── api/          ← Server-side API route handlers
│   ├── layout.tsx    ← Root layout (server component)
│   ├── page.tsx      ← Page components
│   └── globals.css   ← Tailwind directives + global styles
├── components/       ← Reusable React components
└── lib/              ← Utilities, types, business logic
```

## Component Patterns

- **Server components** by default (no directive needed).
- **Client components**: mark with `'use client'` at the top of the file.
- **Named exports**: `export function ComponentName()` — no default exports for components.
- **Functional only**: no class components.
- **Props**: define an interface above the component: `interface ComponentNameProps { ... }`.

## TypeScript

- `strict: true` in tsconfig.json.
- Use `interface` for object shapes, `type` for unions and intersections.
- Explicit return types on exported functions.
- Prefer `unknown` over `any`.
- Use `satisfies` for type-safe object literals.
- Import types with `import type { ... }` when only used for type checking.

## Import Order

1. React / Next.js (`react`, `next/...`)
2. External libraries (`sonner`, `react-image-crop`, etc.)
3. Internal modules (`@/lib/...`, `@/components/...`)
4. Type-only imports (`import type { ... }`)
5. CSS imports

## Styling

- Tailwind CSS utility classes exclusively.
- Responsive: mobile-first with `sm:`, `md:`, `lg:` breakpoints.
- Dark mode: `dark:` variant.
- Avoid inline `style` unless dynamic values require it.

## API Routes (App Router)

- File: `src/app/api/[name]/route.ts`
- Export named HTTP method handlers: `export async function POST(request: NextRequest)`
- Use `NextRequest` / `NextResponse` from `next/server`.
- Validate all input at the boundary.
- Consistent error shape: `{ error: string }` with appropriate HTTP status.

## Error Handling

- API routes: try-catch with typed JSON error responses.
- Client: try-catch in async handlers, surface errors via state or toast.
- Never swallow errors silently.

## State Management

- `useState` / `useReducer` for local component state.
- Props for parent → child communication.
- `useCallback` for stable function references passed as props.
- Avoid `useEffect` for things achievable with event handlers.
- Context only when genuinely needed across many components.

## Performance

- Memoise expensive computations with `useMemo`.
- Stabilise callbacks with `useCallback` (especially in lists or when passed to children).
- Use `key` prop strategically to force remount vs. reconcile.
- Prefer CSS transitions / transforms over JS animation for 60 fps.
