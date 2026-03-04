# Portrait Photo Cropper

Upload a portrait photo, receive an AI-suggested headshot crop, interactively adjust it, and export the result.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | React 18, Tailwind CSS 3 |
| Language | TypeScript (strict) |
| Crop Editor | react-image-crop |
| Image Processing | sharp (server), Canvas API (client export) |
| Notifications | sonner |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Drag-and-drop upload** — JPEG, PNG, WebP, max 10 MB
- **AI crop suggestion** — deterministic heuristic placing a 3:4 headshot crop in the upper-center region
- **Interactive crop editor** — drag, resize from corners/edges, semi-transparent overlay
- **Aspect ratio presets** — 1:1, 3:4, 4:5, Free
- **Reset to AI Suggestion** — one-click restore the original crop
- **Client-side export** — Canvas API crops at full resolution, triggers JPEG download
- **Responsive** — works on desktop, tablet, and mobile

## API

### `POST /api/crop-suggest`

Accepts a multipart form upload with an `image` field.

**Response:**

```json
{
  "cropRegion": {
    "x": 75,
    "y": 120,
    "width": 600,
    "height": 800
  },
  "aspectRatio": "3:4",
  "confidence": 0.85
}
```

Currently uses a deterministic heuristic. Swap in any face-detection or AI model by keeping the same response shape.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (write) |
| `npm run format:check` | Prettier (check) |

## License

MIT
