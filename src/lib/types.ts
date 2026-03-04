/** Pixel coordinates for a crop region on the natural image. */
export interface CropRegion {
  /** Pixels from the left edge */
  x: number;
  /** Pixels from the top edge */
  y: number;
  /** Crop width in pixels */
  width: number;
  /** Crop height in pixels */
  height: number;
}

/** Response shape from the crop-suggestion API. */
export interface CropSuggestion {
  cropRegion: CropRegion;
  /** Human-readable aspect ratio label, e.g. "3:4" */
  aspectRatio: string;
  /** Confidence score 0–1 (mock always returns ~0.85) */
  confidence: number;
}

export type AspectRatioOption = '1:1' | '3:4' | '4:5' | 'free';

/** Downscaled preview image with metadata for full-res reconstruction. */
export interface DownscaledImage {
  blob: Blob;
  previewUrl: string;
  /** fullRes / preview, always >= 1 */
  scaleFactor: number;
  previewWidth: number;
  previewHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}

/** A single entry in the crop export history (session-only). */
export interface HistoryEntry {
  id: string;
  thumbnailDataUrl: string;
  dimensions: { width: number; height: number };
  timestamp: number;
  blob: Blob;
}

/** Map from label → numeric width/height ratio (undefined = free). */
export const ASPECT_RATIOS: Record<AspectRatioOption, number | undefined> = {
  '1:1': 1,
  '3:4': 3 / 4,
  '4:5': 4 / 5,
  free: undefined,
};
