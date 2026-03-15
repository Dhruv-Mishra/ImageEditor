import type { HeadPose, PoseTarget } from './types';

/** Minimal landmark shape — compatible with both old and new MediaPipe APIs */
type Landmark = { x: number; y: number; z: number };

/**
 * Estimate head pose (pitch, yaw, roll) from MediaPipe Face Mesh landmarks.
 *
 * Uses multiple landmark pairs for robust estimation:
 *  - Yaw: nose tip (1) vs eye outer corners (33, 263) + mouth corners (61, 291)
 *  - Pitch: nose-to-face-center Y ratio + nose Z depth relative to cheek plane
 *  - Roll: eye-to-eye angle
 *
 * Landmark indices follow the canonical MediaPipe 468-point Face Mesh topology.
 * All angles returned in degrees.
 */
export function estimateHeadPose(landmarks: Landmark[]): HeadPose {
  const noseTip = landmarks[1];
  const chin = landmarks[152];
  const forehead = landmarks[10];
  const leftEyeOuter = landmarks[33];
  const rightEyeOuter = landmarks[263];
  const leftMouth = landmarks[61];
  const rightMouth = landmarks[291];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];

  // --- Yaw (left/right rotation) ---
  // Blend two ratio signals for robustness: eyes and mouth corners
  const dxLeftEye = noseTip.x - leftEyeOuter.x;
  const dxRightEye = rightEyeOuter.x - noseTip.x;
  const eyeRatio = (dxRightEye - dxLeftEye) / (dxRightEye + dxLeftEye + 1e-6);

  const dxLeftMouth = noseTip.x - leftMouth.x;
  const dxRightMouth = rightMouth.x - noseTip.x;
  const mouthRatio = (dxRightMouth - dxLeftMouth) / (dxRightMouth + dxLeftMouth + 1e-6);

  // Weighted blend: eyes are more stable, mouth provides wider range
  const yawRatio = eyeRatio * 0.6 + mouthRatio * 0.4;
  const yaw = yawRatio * 75; // scaled for ±30° range

  // --- Pitch (up/down rotation) ---
  // Primary: nose vertical position relative to face height
  const faceHeight = chin.y - forehead.y;
  const noseFraction = (noseTip.y - forehead.y) / (faceHeight + 1e-6);
  const yPitch = (noseFraction - 0.45) * 120;

  // Secondary: nose Z-depth relative to cheek plane (MediaPipe provides depth)
  const cheekMidZ = (leftCheek.z + rightCheek.z) / 2;
  const noseDepthDiff = noseTip.z - cheekMidZ;
  const zPitch = noseDepthDiff * -200; // negative Z = closer to camera

  // Blend Y-based and Z-based pitch for robustness
  const pitch = yPitch * 0.6 + zPitch * 0.4;

  // --- Roll (head tilt) ---
  const dx = rightEyeOuter.x - leftEyeOuter.x;
  const dy = rightEyeOuter.y - leftEyeOuter.y;
  const roll = Math.atan2(dy, dx) * (180 / Math.PI);

  return { pitch, yaw, roll };
}

/**
 * Check whether the current head pose matches a target pose within threshold.
 * When `wasOnTarget` is true, uses a wider threshold (hysteresis) to prevent
 * flickering at boundaries.
 */
export function isPoseOnTarget(pose: HeadPose, target: PoseTarget, wasOnTarget = false): boolean {
  const pitchTolerance = wasOnTarget ? target.pitchThreshold + 4 : target.pitchThreshold;
  const yawTolerance = wasOnTarget ? target.yawThreshold + 5 : target.yawThreshold;
  const pitchDiff = Math.abs(pose.pitch - target.pitch);
  const yawDiff = Math.abs(pose.yaw - target.yaw);
  return pitchDiff <= pitchTolerance && yawDiff <= yawTolerance;
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


