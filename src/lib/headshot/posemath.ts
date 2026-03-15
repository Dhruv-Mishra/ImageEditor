import type { HeadPose, PoseTarget } from './types';

/** Minimal landmark shape — compatible with both old and new MediaPipe APIs */
type Landmark = { x: number; y: number; z: number };

/**
 * Estimate head pose (pitch, yaw, roll) from MediaPipe Face Mesh landmarks.
 *
 * Uses a simplified approach based on key facial landmarks:
 *  - Nose tip (1), chin (152), forehead (10)
 *  - Left eye outer (33), right eye outer (263)
 *  - Left mouth corner (61), right mouth corner (291)
 *
 * All angles returned in degrees.
 */
export function estimateHeadPose(landmarks: Landmark[]): HeadPose {
  const noseTip = landmarks[1];
  const chin = landmarks[152];
  const forehead = landmarks[10];
  const leftEyeOuter = landmarks[33];
  const rightEyeOuter = landmarks[263];

  // --- Yaw (left/right rotation) ---
  // Compare horizontal distances from nose tip to each eye outer corner.
  // When the head turns right, the left eye–nose distance increases and right decreases.
  const dxLeft = noseTip.x - leftEyeOuter.x;
  const dxRight = rightEyeOuter.x - noseTip.x;
  // Ratio approach: symmetrical when facing forward
  const yawRatio = (dxRight - dxLeft) / (dxRight + dxLeft + 1e-6);
  // Map to approximate degrees (empirical scaling factor)
  const yaw = yawRatio * 70;

  // --- Pitch (up/down rotation) ---
  // Use the vertical relationship between forehead, nose tip, and chin.
  // When looking down, nose tip moves down relative to the midpoint of forehead–chin.
  const faceHeight = chin.y - forehead.y;
  const noseFraction = (noseTip.y - forehead.y) / (faceHeight + 1e-6);
  // Neutral is ~0.45 for typical faces; looking down pushes it higher, looking up lower
  const pitchOffset = noseFraction - 0.45;
  const pitch = pitchOffset * 120; // empirical degrees

  // --- Roll (head tilt) ---
  const dx = rightEyeOuter.x - leftEyeOuter.x;
  const dy = rightEyeOuter.y - leftEyeOuter.y;
  const roll = Math.atan2(dy, dx) * (180 / Math.PI);

  return { pitch, yaw, roll };
}

/**
 * Check whether the current head pose matches a target pose within threshold.
 */
export function isPoseOnTarget(pose: HeadPose, target: PoseTarget): boolean {
  const pitchDiff = Math.abs(pose.pitch - target.pitch);
  const yawDiff = Math.abs(pose.yaw - target.yaw);
  return pitchDiff <= target.pitchThreshold && yawDiff <= target.yawThreshold;
}

/**
 * Get the forehead landmark (index 151) position in pixel space.
 */
export function getForeheadPosition(
  landmarks: Landmark[],
  videoWidth: number,
  videoHeight: number,
): { x: number; y: number } {
  const lm = landmarks[151];
  return {
    x: lm.x * videoWidth,
    y: lm.y * videoHeight,
  };
}

/**
 * Compute face center and relative scale from landmarks.
 */
export function getFaceMetrics(
  landmarks: Landmark[],
  videoWidth: number,
  videoHeight: number,
): { centerX: number; centerY: number; scale: number } {
  const forehead = landmarks[10];
  const chin = landmarks[152];
  const centerX = ((forehead.x + chin.x) / 2) * videoWidth;
  const centerY = ((forehead.y + chin.y) / 2) * videoHeight;
  const faceHeight = Math.abs(chin.y - forehead.y) * videoHeight;
  return { centerX, centerY, scale: faceHeight / videoHeight };
}

/**
 * Check if the face is approximately centered in the frame.
 * Distance-from-center is symmetric so mirroring doesn't affect the result.
 */
export function isFacePositioned(
  faceCenterX: number,
  faceCenterY: number,
  faceScale: number,
  canvasWidth: number,
  canvasHeight: number,
): boolean {
  const guideCenterX = canvasWidth / 2;
  const guideCenterY = canvasHeight * 0.42;
  const xOk = Math.abs(faceCenterX - guideCenterX) < canvasWidth * 0.13;
  const yOk = Math.abs(faceCenterY - guideCenterY) < canvasHeight * 0.15;
  const scaleOk = faceScale > 0.2 && faceScale < 0.65;
  return xOk && yOk && scaleOk;
}
