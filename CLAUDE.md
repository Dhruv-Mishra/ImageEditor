# Portrait Photo Cropper

> AI-assisted portrait photo cropping web application.

## Overview

Single-page Next.js app: upload portrait → AI crop suggestion → interactive crop → export.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, Tailwind CSS 3
- **Language**: TypeScript (strict)
- **Crop Editor**: react-image-crop
- **Server Image Processing**: sharp
- **Client Export**: Canvas API
- **Animations**: Framer Motion
- **Theming**: next-themes
- **Notifications**: sonner

## Project Structure

```
src/
├── app/
│   ├── api/crop-suggest/route.ts   — Mock AI crop-suggestion endpoint
│   ├── globals.css                 — Global styles + Tailwind directives
│   ├── layout.tsx                  — Root layout
│   └── page.tsx                    — Main page (state machine)
├── components/
│   ├── AspectRatioSelector.tsx     — Aspect ratio toggle with animated pill indicator
│   ├── CropEditor.tsx             — Interactive crop overlay (react-image-crop)
│   ├── ThemeToggle.tsx            — Dark/light mode toggle (next-themes)
│   └── UploadZone.tsx             — Drag-and-drop upload with Framer Motion
└── lib/
    ├── cropHeuristic.ts           — Deterministic crop suggestion + aspect adjust
    ├── imageUtils.ts              — Canvas crop, download, validation
    └── types.ts                   — Shared TypeScript interfaces
```

## Code Conventions

- Functional React components, no classes
- `'use client'` directive for interactive components
- Named exports: `export function ComponentName()`
- Strict TypeScript throughout
- Import order: React/Next → external → internal → types → CSS
- Conventional Commits: `feat:`, `fix:`, `chore:`, etc.
- Error handling: try-catch in async handlers, user-facing errors via state or toast

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier
```

## API Contract

`POST /api/crop-suggest` — multipart form with `image` field.

Response: `{ cropRegion: { x, y, width, height }, aspectRatio: string, confidence: number }`

## Critical Constraints

- File validation: type (JPEG/PNG/WebP), size (≤10 MB)
- Client-side downscaling (max 1200px) before API upload; preview image for all UI
- Crop coordinates in preview pixel space during editing; scaled to full-res at export
- Crop export at full natural resolution via Canvas API
- Mock API returns deterministic heuristic; real AI swap should keep same response shape

## Review Priorities

1. Functionality correctness
2. Performance (60 fps crop interactions)
3. Code clarity
