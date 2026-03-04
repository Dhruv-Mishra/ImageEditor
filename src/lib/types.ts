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

/** The four AI-generated crop types */
export type CropType = 'face' | 'portrait' | 'fullbody' | 'slightly_far';

/** A single crop variant with its type label */
export interface CropVariant {
  type: CropType;
  label: string;
  cropRegion: CropRegion;
  aspectRatio: string;
  confidence: number;
}

/** Response shape with multiple crop suggestions */
export interface MultiCropSuggestion {
  crops: CropVariant[];
  /** The recommended/default crop type */
  defaultType: CropType;
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

/** Persisted editing session for page-refresh recovery. */
export interface SessionData {
  /** Unique session identifier (crypto.randomUUID()). */
  id: string;
  /** Original full-resolution image. */
  imageBlob: Blob;
  /** Downscaled preview image. */
  previewBlob: Blob;
  scaleFactor: number;
  naturalWidth: number;
  naturalHeight: number;
  previewWidth: number;
  previewHeight: number;
  multiSuggestion: MultiCropSuggestion;
  selectedCropType: CropType;
  currentCrop: CropRegion;
  aspectRatio: AspectRatioOption;
  /** Base64 data-URL thumbnail for display in archive. */
  thumbnailDataUrl?: string;
  /** AI-generated description of the image (stored once generated). */
  aiDescription?: string;
  /** Timestamp for sorting/display. */
  createdAt: number;
}

/** Map from label → numeric width/height ratio (undefined = free). */
export const ASPECT_RATIOS: Record<AspectRatioOption, number | undefined> = {
  '1:1': 1,
  '3:4': 3 / 4,
  '4:5': 4 / 5,
  free: undefined,
};
