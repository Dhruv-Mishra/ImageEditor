"""
Portrait crop-suggestion backend (CPU-only, ARM-friendly).

Endpoint:  POST /api/crop-suggest
Accepts:   multipart/form-data with field "image"
Returns:   MultiCropSuggestion JSON matching the frontend types.ts

Designed to run alongside a Next.js frontend on an Oracle ARM instance.
"""

import io
import logging
import numpy as np
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
from ultralytics import YOLO

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("crop-backend")

# ---------------------------------------------------------------------------
# Response models  (mirrors frontend types.ts)
# ---------------------------------------------------------------------------

class CropRegion(BaseModel):
    x: int
    y: int
    width: int
    height: int


class CropVariant(BaseModel):
    type: str           # 'face' | 'portrait' | 'fullbody' | 'slightly_far'
    label: str
    cropRegion: CropRegion
    aspectRatio: str    # '1:1' | '3:4' | '4:5' | 'free'
    confidence: float


class MultiCropSuggestion(BaseModel):
    crops: list[CropVariant]
    defaultType: str


# ---------------------------------------------------------------------------
# COCO-pose keypoint indices
# ---------------------------------------------------------------------------
NOSE = 0
L_EYE, R_EYE = 1, 2
L_EAR, R_EAR = 3, 4
L_SHOULDER, R_SHOULDER = 5, 6
L_ELBOW, R_ELBOW = 7, 8
L_WRIST, R_WRIST = 9, 10
L_HIP, R_HIP = 11, 12
L_KNEE, R_KNEE = 13, 14
L_ANKLE, R_ANKLE = 15, 16

KPT_CONF = 0.3  # minimum keypoint confidence

# Crop-type metadata
CROP_META = {
    "face":         {"label": "Face Closeup",     "aspectRatio": "1:1", "ratio": 1.0},
    "portrait":     {"label": "Shoulder Portrait", "aspectRatio": "3:4", "ratio": 3 / 4},
    "fullbody":     {"label": "Full Body",         "aspectRatio": "3:4", "ratio": 3 / 4},
    "slightly_far": {"label": "Full Body (Wide)",  "aspectRatio": "4:5", "ratio": 4 / 5},
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(val, hi))


def _enforce_aspect_ratio(
    cx: float, cy: float, w: float, h: float,
    target_ratio: float, img_w: int, img_h: int,
) -> tuple[int, int, int, int]:
    """
    Adjust width/height around (cx, cy) to match target_ratio = w/h.
    Expand the smaller dimension so no content is lost, then clamp to image.
    """
    current_ratio = w / h if h > 0 else 1.0

    if current_ratio > target_ratio:
        # Too wide → grow height
        h = w / target_ratio
    else:
        # Too tall → grow width
        w = h * target_ratio

    x = _clamp(cx - w / 2, 0, img_w - 1)
    y = _clamp(cy - h / 2, 0, img_h - 1)
    x2 = _clamp(x + w, 0, img_w)
    y2 = _clamp(y + h, 0, img_h)

    return int(round(x)), int(round(y)), int(round(x2 - x)), int(round(y2 - y))


def _visible(kpts: np.ndarray, indices: list[int]) -> list[int]:
    """Return subset of keypoint indices that have confidence > threshold."""
    return [i for i in indices if kpts[i, 2] > KPT_CONF]


# ---------------------------------------------------------------------------
# Core crop computation
# ---------------------------------------------------------------------------

def compute_crops(
    kpts: np.ndarray,       # (17, 3)  x, y, conf
    bbox: np.ndarray,       # (4,)     x1, y1, x2, y2
    confidence: float,      # detection confidence
    img_w: int,
    img_h: int,
) -> list[CropVariant]:
    """Compute 4 crop variants for one detected person."""

    bx1, by1, bx2, by2 = bbox
    body_w = bx2 - bx1
    body_h = by2 - by1
    body_cx = (bx1 + bx2) / 2

    crops: list[CropVariant] = []

    # ── 1. Face closeup ──────────────────────────────────────────────────
    face_vis = _visible(kpts, [NOSE, L_EYE, R_EYE, L_EAR, R_EAR])
    if len(face_vis) >= 2:
        pts = kpts[face_vis, :2]
        fx1, fy1 = pts.min(axis=0)
        fx2, fy2 = pts.max(axis=0)
        fw, fh = fx2 - fx1, fy2 - fy1
        pad_x = max(fw * 0.75, body_w * 0.10)
        pad_y = max(fh * 1.0, body_h * 0.05)
        raw_x1 = fx1 - pad_x
        raw_y1 = fy1 - pad_y * 1.3
        raw_x2 = fx2 + pad_x
        raw_y2 = fy2 + pad_y * 0.8
    else:
        # fallback: top 25 % of person box
        raw_x1, raw_y1 = bx1, by1
        raw_x2 = bx2
        raw_y2 = by1 + body_h * 0.25

    face_cx = (raw_x1 + raw_x2) / 2
    face_cy = (raw_y1 + raw_y2) / 2
    face_w = raw_x2 - raw_x1
    face_h = raw_y2 - raw_y1
    meta = CROP_META["face"]
    x, y, w, h = _enforce_aspect_ratio(
        face_cx, face_cy, face_w, face_h, meta["ratio"], img_w, img_h
    )
    crops.append(CropVariant(
        type="face", label=meta["label"],
        cropRegion=CropRegion(x=x, y=y, width=w, height=h),
        aspectRatio=meta["aspectRatio"],
        confidence=round(float(confidence), 3),
    ))

    # ── 2. Shoulder portrait ─────────────────────────────────────────────
    sh_vis = _visible(kpts, [L_SHOULDER, R_SHOULDER])
    if sh_vis:
        sh_y = kpts[sh_vis, 1].max()
        raw_top = by1 - body_h * 0.04
        raw_bot = sh_y + body_h * 0.14
        half_w = max(body_w * 0.55, (sh_y - by1) * 0.85)
        raw_x1 = body_cx - half_w
        raw_x2 = body_cx + half_w
    else:
        raw_top = by1
        raw_bot = by1 + body_h * 0.42
        raw_x1, raw_x2 = bx1, bx2

    sh_cx = (raw_x1 + raw_x2) / 2
    sh_cy = (raw_top + raw_bot) / 2
    sh_w = raw_x2 - raw_x1
    sh_h = raw_bot - raw_top
    meta = CROP_META["portrait"]
    x, y, w, h = _enforce_aspect_ratio(
        sh_cx, sh_cy, sh_w, sh_h, meta["ratio"], img_w, img_h
    )
    crops.append(CropVariant(
        type="portrait", label=meta["label"],
        cropRegion=CropRegion(x=x, y=y, width=w, height=h),
        aspectRatio=meta["aspectRatio"],
        confidence=round(float(confidence), 3),
    ))

    # ── 3. Full body ─────────────────────────────────────────────────────
    fb_pad_x = body_w * 0.08
    fb_pad_y = body_h * 0.05
    fb_cx = body_cx
    fb_cy = (by1 + by2) / 2
    fb_w = body_w + fb_pad_x * 2
    fb_h = body_h + fb_pad_y * 2
    meta = CROP_META["fullbody"]
    x, y, w, h = _enforce_aspect_ratio(
        fb_cx, fb_cy, fb_w, fb_h, meta["ratio"], img_w, img_h
    )
    crops.append(CropVariant(
        type="fullbody", label=meta["label"],
        cropRegion=CropRegion(x=x, y=y, width=w, height=h),
        aspectRatio=meta["aspectRatio"],
        confidence=round(float(confidence), 3),
    ))

    # ── 4. Slightly far (full body + generous context) ───────────────────
    ex = body_w * 0.35
    ey = body_h * 0.25
    sf_cx = body_cx
    sf_cy = (by1 + by2) / 2
    sf_w = body_w + ex * 2
    sf_h = body_h + ey * 2
    meta = CROP_META["slightly_far"]
    x, y, w, h = _enforce_aspect_ratio(
        sf_cx, sf_cy, sf_w, sf_h, meta["ratio"], img_w, img_h
    )
    crops.append(CropVariant(
        type="slightly_far", label=meta["label"],
        cropRegion=CropRegion(x=x, y=y, width=w, height=h),
        aspectRatio=meta["aspectRatio"],
        confidence=round(float(confidence), 3),
    ))

    return crops


# ---------------------------------------------------------------------------
# App lifecycle & setup
# ---------------------------------------------------------------------------
model_holder: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading YOLOv11n-pose model (CPU) …")
    model_holder["pose"] = YOLO("yolo11n-pose.pt")
    logger.info("Model loaded.")
    yield
    model_holder.clear()


app = FastAPI(title="Crop Suggestion API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# POST /api/crop-suggest
# ---------------------------------------------------------------------------
@app.post("/api/crop-suggest", response_model=MultiCropSuggestion)
async def crop_suggest(image: UploadFile = File(...)):
    """
    Accept an uploaded image, detect the most prominent person,
    and return four crop suggestions matching the frontend types.
    """

    contents = await image.read()
    try:
        img = Image.open(io.BytesIO(contents))
        img.verify()
        img = Image.open(io.BytesIO(contents))  # re-open after verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")

    img_w, img_h = img.size

    # Run pose estimation (CPU, persons only)
    results = model_holder["pose"](img, classes=[0], verbose=False, device="cpu")

    best_crops: list[CropVariant] | None = None
    best_area = 0.0

    for result in results:
        if result.keypoints is None or result.boxes is None:
            continue

        keypoints = result.keypoints.data.cpu().numpy()    # (N, 17, 3)
        boxes = result.boxes.xyxy.cpu().numpy()             # (N, 4)
        confs = result.boxes.conf.cpu().numpy()             # (N,)

        for kpts, bbox, conf in zip(keypoints, boxes, confs):
            area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
            if area > best_area:
                best_area = area
                best_crops = compute_crops(kpts, bbox, conf, img_w, img_h)

    if best_crops is None:
        raise HTTPException(
            status_code=422,
            detail="No person detected in the image.",
        )

    return MultiCropSuggestion(
        crops=best_crops,
        defaultType="portrait",
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health():
    return {"status": "ok", "model_loaded": "pose" in model_holder}


# ---------------------------------------------------------------------------
# Direct run:  python app.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
