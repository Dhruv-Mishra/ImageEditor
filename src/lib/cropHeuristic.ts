import type { CropRegion, CropVariant, MultiCropSuggestion } from './types';

/**
 * Generates all 4 crop variants (face, portrait, fullbody, slightly_far)
 * based on image dimensions.
 */
export function generateMultiCropSuggestions(
  imageWidth: number,
  imageHeight: number,
): MultiCropSuggestion {
  const clamp = (region: { x: number; y: number; width: number; height: number }) => ({
    x: Math.round(Math.max(0, Math.min(region.x, imageWidth - region.width))),
    y: Math.round(Math.max(0, Math.min(region.y, imageHeight - region.height))),
    width: Math.round(Math.min(region.width, imageWidth)),
    height: Math.round(Math.min(region.height, imageHeight)),
  });

  // — face: tight square crop in upper 30%, ~40% width —
  const faceAspect = 1; // 1:1
  const faceSize = Math.min(imageWidth * 0.4, imageHeight * 0.3);
  const faceW = Math.min(faceSize, imageWidth);
  const faceH = faceW / faceAspect;
  const faceCrop: CropVariant = {
    type: 'face',
    label: 'Tight',
    cropRegion: clamp({
      x: (imageWidth - faceW) / 2,
      y: imageHeight * 0.05,
      width: faceW,
      height: faceH,
    }),
    aspectRatio: '1:1',
    confidence: 0.9,
  };

  // — portrait: upper 65%, ~65% width, 3:4 —
  const portraitAspect = 3 / 4;
  let portraitH = imageHeight * 0.65;
  let portraitW = portraitH * portraitAspect;
  if (portraitW > imageWidth * 0.65) {
    portraitW = imageWidth * 0.65;
    portraitH = portraitW / portraitAspect;
  }
  const portraitCrop: CropVariant = {
    type: 'portrait',
    label: 'Medium',
    cropRegion: clamp({
      x: (imageWidth - portraitW) / 2,
      y: imageHeight * 0.06,
      width: portraitW,
      height: portraitH,
    }),
    aspectRatio: '3:4',
    confidence: 0.88,
  };

  // — fullbody: 85% of image, 3:4 (similar to existing generateCropSuggestion) —
  const fullbodyAspect = 3 / 4;
  let fullbodyW: number;
  let fullbodyH: number;
  if (imageWidth / imageHeight < fullbodyAspect) {
    fullbodyW = imageWidth * 0.85;
    fullbodyH = fullbodyW / fullbodyAspect;
  } else {
    fullbodyH = imageHeight * 0.85;
    fullbodyW = fullbodyH * fullbodyAspect;
  }
  const fullbodyCrop: CropVariant = {
    type: 'fullbody',
    label: 'Loose',
    cropRegion: clamp({
      x: (imageWidth - fullbodyW) / 2,
      y: imageHeight * 0.05,
      width: fullbodyW,
      height: fullbodyH,
    }),
    aspectRatio: '3:4',
    confidence: 0.82,
  };

  // — slightly_far: 95% of image, 4:5 —
  const slightlyFarAspect = 4 / 5;
  let slightlyFarH = imageHeight * 0.95;
  let slightlyFarW = slightlyFarH * slightlyFarAspect;
  if (slightlyFarW > imageWidth * 0.95) {
    slightlyFarW = imageWidth * 0.95;
    slightlyFarH = slightlyFarW / slightlyFarAspect;
  }
  const slightlyFarCrop: CropVariant = {
    type: 'slightly_far',
    label: 'Wide',
    cropRegion: clamp({
      x: (imageWidth - slightlyFarW) / 2,
      y: (imageHeight - slightlyFarH) / 2,
      width: slightlyFarW,
      height: slightlyFarH,
    }),
    aspectRatio: '4:5',
    confidence: 0.78,
  };

  return {
    crops: [faceCrop, portraitCrop, fullbodyCrop, slightlyFarCrop],
    defaultType: 'portrait',
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
