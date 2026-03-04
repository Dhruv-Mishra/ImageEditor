import type { CropRegion, CropSuggestion } from './types';

/**
 * Generates a deterministic crop suggestion based on image dimensions.
 * Places the crop in the upper-center area with a 3:4 portrait aspect ratio —
 * the region where a face is most likely to appear.
 */
export function generateCropSuggestion(
  imageWidth: number,
  imageHeight: number,
): CropSuggestion {
  const targetAspect = 3 / 4; // width / height

  let cropWidth: number;
  let cropHeight: number;

  // Make the crop as large as possible while maintaining aspect ratio
  if (imageWidth / imageHeight < targetAspect) {
    // Image is narrower than target — width is the constraint
    cropWidth = imageWidth * 0.85;
    cropHeight = cropWidth / targetAspect;
  } else {
    // Image is wider or equal — height is the constraint
    cropHeight = imageHeight * 0.85;
    cropWidth = cropHeight * targetAspect;
  }

  // Ensure crop fits within image bounds
  cropWidth = Math.min(cropWidth, imageWidth);
  cropHeight = Math.min(cropHeight, imageHeight);

  // Center horizontally
  const x = (imageWidth - cropWidth) / 2;

  // Place in upper third (where a face is most likely)
  const y = Math.min(imageHeight * 0.08, imageHeight - cropHeight);

  return {
    cropRegion: {
      x: Math.round(x),
      y: Math.round(Math.max(0, y)),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight),
    },
    aspectRatio: '3:4',
    confidence: 0.85,
  };
}

/**
 * Adjusts an existing crop region to a new aspect ratio while preserving
 * the center point and approximate area.
 */
export function adjustCropToAspect(
  current: CropRegion,
  targetAspect: number,
  imageWidth: number,
  imageHeight: number,
): CropRegion {
  const centerX = current.x + current.width / 2;
  const centerY = current.y + current.height / 2;

  // Maintain approximately the same area
  const currentArea = current.width * current.height;
  // newWidth / newHeight = targetAspect  →  newWidth = targetAspect * newHeight
  // targetAspect * newHeight² = currentArea
  let newHeight = Math.sqrt(currentArea / targetAspect);
  let newWidth = targetAspect * newHeight;

  // Clamp to image bounds
  if (newWidth > imageWidth) {
    newWidth = imageWidth;
    newHeight = newWidth / targetAspect;
  }
  if (newHeight > imageHeight) {
    newHeight = imageHeight;
    newWidth = targetAspect * newHeight;
  }

  // Position centered on the original center, clamped within bounds
  const x = Math.max(0, Math.min(centerX - newWidth / 2, imageWidth - newWidth));
  const y = Math.max(0, Math.min(centerY - newHeight / 2, imageHeight - newHeight));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(newWidth),
    height: Math.round(newHeight),
  };
}
