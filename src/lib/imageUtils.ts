import type { CropRegion, DownscaledImage } from './types';

/**
 * Downscales an image to fit within maxDimension, returning a preview Blob
 * and metadata for full-resolution reconstruction at export time.
 *
 * If the image already fits, the original file is returned as-is (scaleFactor = 1).
 */
export async function downscaleImage(
  file: File,
  maxDimension: number = 1200,
): Promise<DownscaledImage> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      // Already fits — no downscaling needed
      if (naturalWidth <= maxDimension && naturalHeight <= maxDimension) {
        const previewUrl = objectUrl; // reuse the object URL
        resolve({
          blob: file,
          previewUrl,
          scaleFactor: 1,
          previewWidth: naturalWidth,
          previewHeight: naturalHeight,
          naturalWidth,
          naturalHeight,
        });
        return;
      }

      // Calculate scaled dimensions
      const ratio = Math.min(
        maxDimension / naturalWidth,
        maxDimension / naturalHeight,
      );
      const previewWidth = Math.round(naturalWidth * ratio);
      const previewHeight = Math.round(naturalHeight * ratio);
      const scaleFactor = naturalWidth / previewWidth;

      // Draw to smaller canvas
      const canvas = document.createElement('canvas');
      canvas.width = previewWidth;
      canvas.height = previewHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not get canvas 2D context'));
        return;
      }

      ctx.drawImage(img, 0, 0, previewWidth, previewHeight);
      URL.revokeObjectURL(objectUrl);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create downscaled blob'));
            return;
          }
          const previewUrl = URL.createObjectURL(blob);
          resolve({
            blob,
            previewUrl,
            scaleFactor,
            previewWidth,
            previewHeight,
            naturalWidth,
            naturalHeight,
          });
        },
        'image/jpeg',
        0.85,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for downscaling'));
    };

    img.src = objectUrl;
  });
}

/**
 * Scales a crop region from preview coordinates to full-resolution coordinates.
 */
export function scaleToFullRes(
  crop: CropRegion,
  scaleFactor: number,
): CropRegion {
  return {
    x: Math.round(crop.x * scaleFactor),
    y: Math.round(crop.y * scaleFactor),
    width: Math.round(crop.width * scaleFactor),
    height: Math.round(crop.height * scaleFactor),
  };
}

/**
 * Crops an image using the Canvas API and returns a Blob.
 *
 * @param imageSrc  - URL (object URL or data URL) of the source image
 * @param crop      - Crop region in natural image pixels
 * @param outputType - MIME type for the exported image
 * @param quality   - Compression quality 0–1 (JPEG only)
 */
export async function cropImage(
  imageSrc: string,
  crop: CropRegion,
  outputType: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality: number = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = crop.width;
      canvas.height = crop.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas 2D context'));
        return;
      }

      ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height,
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        outputType,
        quality,
      );
    };

    image.onerror = () => reject(new Error('Failed to load image for export'));
    image.src = imageSrc;
  });
}

/** Triggers a browser download for the given Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a small thumbnail data URL from a Blob.
 * Used for the export history strip.
 */
export async function generateThumbnailDataUrl(
  blob: Blob,
  maxSize: number = 200,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(
        maxSize / img.naturalWidth,
        maxSize / img.naturalHeight,
        1,
      );
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas 2D context'));
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to generate thumbnail'));
    };

    img.src = url;
  });
}

/**
 * Validates an image file before upload.
 * Returns an error message string, or `null` if valid.
 */
export function validateImageFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Please upload a JPEG, PNG, or WebP image.';
  }

  const maxSize = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSize) {
    return 'File is too large. Maximum size is 10 MB.';
  }

  return null;
}
