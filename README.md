<div align="center">

# ✂️ Cropio

**AI-Powered Portrait Photo Cropper**

Upload a portrait photo · Get intelligent crop suggestions · Fine-tune interactively · Export at full resolution

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-cropio.whoisdhruv.com-blue?style=for-the-badge)](https://cropio.whoisdhruv.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## ✨ Features

- 📸 **Drag-and-drop upload** — supports JPEG, PNG, and WebP (up to 10 MB)
- 🤖 **AI-powered crop suggestions** — YOLO11 pose estimation detects keypoints and generates multiple crop types (face closeup, shoulder portrait, full body, wide)
- 🖼️ **Interactive crop editor** — drag, resize from corners/edges, clean minimal overlay with solid border
- 📐 **Multiple crop types** — Face Closeup (1:1), Shoulder Portrait (3:4), Full Body (3:4), Wide (4:5)
- 🔄 **Aspect ratio presets** — 1:1, 3:4, 4:5, Free
- ↩️ **Reset to AI suggestion** — one-click restore to the original recommendation
- 💾 **Full-resolution export** — Canvas API crops at natural image resolution, browser JPEG download
- 🧠 **AI image description** — NVIDIA Vision API generates concise descriptions with typewriter animation
- 🔍 **Semantic search** — vector embeddings (NVIDIA nv-embedqa-e5-v5) enable AI-powered search across your archive
- 🗂️ **Crop history & archive** — browse, search, and re-edit previously exported crops and saved sessions
- 🌙 **Dark / Light theme** — toggle with next-themes
- 📱 **Fully responsive** — desktop, tablet, and mobile with dedicated mobile navigation
- ⚡ **Haptic feedback** — subtle vibrations on supported devices

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **UI** | React 19, Tailwind CSS 3 |
| **Language** | TypeScript (strict) |
| **Crop Editor** | react-image-crop |
| **AI / ML** | YOLO11 Pose (Ultralytics) via FastAPI backend |
| **AI Vision** | NVIDIA Mistral-14B (image description via API) |
| **AI Embeddings** | NVIDIA nv-embedqa-e5-v5 (semantic search) |
| **Server Image Processing** | sharp, Pillow |
| **Client Export** | Canvas API |
| **Client Vector DB** | IndexedDB with cosine similarity search |
| **Animations** | Framer Motion |
| **Theming** | next-themes |
| **Notifications** | sonner |
| **Backend** | FastAPI + Uvicorn (Python) |

---

## 📂 Project Structure

```
├── backend/                    # Python FastAPI backend
│   ├── app.py                  # YOLO11 pose-based crop suggestion API
│   ├── requirements.txt        # Python dependencies
│   └── yolo11n-pose.pt         # YOLO pose model weights
├── scripts/
│   └── dev.mjs                 # Unified dev script (starts backend + frontend)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── describe/route.ts  # AI image description (NVIDIA Vision API)
│   │   │   └── embed/route.ts     # Text embedding (NVIDIA nv-embedqa-e5-v5)
│   │   ├── page.tsx            # Landing page with upload zone & photo marquee
│   │   ├── edit/page.tsx       # Crop editor page (state machine)
│   │   ├── archive/page.tsx    # Crop history, sessions & semantic search
│   │   ├── about/page.tsx      # About page
│   │   ├── layout.tsx          # Root layout (theme, header, footer)
│   │   └── error.tsx           # Error boundary
│   ├── components/
│   │   ├── UploadZone.tsx      # Drag-and-drop upload with Framer Motion
│   │   ├── CropEditor.tsx      # Interactive crop overlay (react-image-crop)
│   │   ├── CropTypeSelector.tsx # AI crop type selector (face/portrait/body)
│   │   ├── AspectRatioSelector.tsx # Aspect ratio toggle with animated pill
│   │   ├── CropHistory.tsx     # Export history browser
│   │   ├── PhotoMarquee.tsx    # Landing page marquee animation
│   │   ├── Header.tsx          # Site header with navigation
│   │   ├── Footer.tsx          # Site footer
│   │   ├── MobileNav.tsx       # Mobile bottom navigation
│   │   └── ThemeToggle.tsx     # Dark/light mode toggle
│   └── lib/
│       ├── types.ts            # Shared TypeScript interfaces
│       ├── imageUtils.ts       # Canvas crop, download, validation, downscaling
│       ├── cropHeuristic.ts    # Fallback deterministic crop heuristic
│       ├── db.ts               # IndexedDB storage for history & sessions
│       ├── vectorDb.ts         # Client-side vector DB with cosine similarity
│       ├── pendingUpload.ts    # Upload state management
│       ├── haptics.ts          # Haptic feedback utilities
│       └── useTypewriter.ts    # Typewriter effect hook
├── deploy.sh                   # One-shot Ubuntu deployment script
├── start.sh / start-dev.sh     # Quick start scripts
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **Python** ≥ 3.10
- **npm**

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/your-username/PotraitPhotoWeb.git
cd PotraitPhotoWeb

# Install frontend dependencies
npm install

# Start both frontend and backend in development mode
npm run dev
```

This single command installs Python dependencies, starts the FastAPI backend on port 8000, and the Next.js dev server on port 3000.

Open **[http://localhost:3000](http://localhost:3000)** to start cropping.

### Production Deployment

```bash
# Build the Next.js production bundle
npm run build

# Or use the one-shot deployment script (Ubuntu)
chmod +x deploy.sh && sudo ./deploy.sh
```

The deployment script sets up Node.js, Python, Nginx reverse proxy with SSL (Let's Encrypt), and systemd services automatically.

---

## 🔌 API

### `POST /api/crop-suggest`

Accepts a multipart form upload with an `image` field. Returns multiple AI-generated crop suggestions based on YOLO11 pose estimation.

**Response:**

```json
{
  "crops": [
    {
      "type": "face",
      "label": "Face Closeup",
      "cropRegion": { "x": 150, "y": 80, "width": 400, "height": 400 },
      "aspectRatio": "1:1",
      "confidence": 0.92
    },
    {
      "type": "portrait",
      "label": "Shoulder Portrait",
      "cropRegion": { "x": 100, "y": 50, "width": 500, "height": 667 },
      "aspectRatio": "3:4",
      "confidence": 0.88
    }
  ],
  "defaultType": "portrait"
}
```

The backend uses **YOLO11 Nano Pose** to detect body keypoints and intelligently compute crop regions. Falls back to a deterministic heuristic if no person is detected.

### `POST /api/describe`

Next.js API route. Accepts a multipart form upload with an `image` field. Sends a downscaled WebP (400px) to the NVIDIA Vision API and returns a concise plain-text description.

**Response:**

```json
{
  "description": "A young woman stands outdoors in a park wearing a navy blazer over a white blouse. She has a warm smile and her hair is pulled back in a low bun. The background shows soft green foliage with dappled sunlight."
}
```

### `POST /api/embed`

Next.js API route. Accepts JSON with a `text` field and optional `inputType` (`"passage"` or `"query"`). Returns a 1024-dimensional embedding vector from NVIDIA nv-embedqa-e5-v5.

**Request:**

```json
{
  "text": "A woman in a navy blazer in a park",
  "inputType": "query"
}
```

**Response:**

```json
{
  "embedding": [0.023, -0.041, 0.087, ...]
}
```

Embeddings are stored in the client-side IndexedDB vector database for semantic search across the archive.

---

## 📋 Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start frontend + backend dev servers |
| `npm run dev:frontend` | Start Next.js dev server only |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |

---

## 🔒 Privacy

Crop detection runs on **your own backend** — images are sent to the YOLO11 model on your server and never leave your infrastructure. AI descriptions are generated via the NVIDIA API (images are sent as base64 to NVIDIA's servers for inference only). The client-side Canvas API handles the final crop and export. Embedding vectors and descriptions are cached locally in the browser's IndexedDB.

---

## 📄 License

[MIT](LICENSE)
