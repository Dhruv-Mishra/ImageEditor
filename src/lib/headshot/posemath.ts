import type { HeadPose, PoseTarget } from './types';

/** Minimal landmark shape — compatible with MediaPipe tasks-vision API. */
type Landmark = { x: number; y: number; z: number };

/** MediaPipe facialTransformationMatrixes result shape. */
interface TransformationMatrix {
  data: number[];
  rows: number;
  columns: number;
}

const RAD2DEG = 180 / Math.PI;

/**
 * Extract head pose from MediaPipe's facialTransformationMatrixes.
 *
 * The matrix is a 4×4 homogeneous transform in COLUMN-MAJOR order.
 * We extract the 3×3 rotation submatrix, remove uniform scale,
 * convert to quaternion (Shepperd's method for numerical stability),
 * then decompose to YXZ intrinsic Euler angles.
 *
 * Output is in RAW CAMERA space:
 *   pitch+ = looking down, pitch- = looking up
 *   yaw+ = subject turns to their right (camera's left), yaw- = subject turns left
 *   roll+ = head tilts to subject's left
 *
 * The caller (useMediaPipeFace) converts to display/mirror space by negating yaw.
 */
export function extractPoseFromMatrix(matrix: TransformationMatrix): HeadPose {
  const d = matrix.data;

  // Column-major: M[row][col] = d[col * 4 + row]
  const scale = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
  if (scale < 1e-6) return { pitch: 0, yaw: 0, roll: 0 };

  const invS = 1 / scale;

  // Build 3×3 rotation matrix (row-major for readability)
  const r: number[][] = [
    [d[0] * invS, d[4] * invS, d[8] * invS],
    [d[1] * invS, d[5] * invS, d[9] * invS],
    [d[2] * invS, d[6] * invS, d[10] * invS],
  ];

  // Convert rotation matrix → quaternion (Shepperd's method)
  const q = rotationMatrixToQuaternion(r);

  // Quaternion → YXZ Euler
  return quaternionToYXZEuler(q);
}

/**
 * Shepperd's method: rotation matrix → unit quaternion [w, x, y, z].
 * Numerically stable for all orientations by picking the largest diagonal term.
 */
function rotationMatrixToQuaternion(
  r: number[][],
): [number, number, number, number] {
  const trace = r[0][0] + r[1][1] + r[2][2];
  let w: number, x: number, y: number, z: number;

  if (trace > 0) {
    const s = 2 * Math.sqrt(trace + 1);
    w = 0.25 * s;
    x = (r[2][1] - r[1][2]) / s;
    y = (r[0][2] - r[2][0]) / s;
    z = (r[1][0] - r[0][1]) / s;
  } else if (r[0][0] > r[1][1] && r[0][0] > r[2][2]) {
    const s = 2 * Math.sqrt(1 + r[0][0] - r[1][1] - r[2][2]);
    w = (r[2][1] - r[1][2]) / s;
    x = 0.25 * s;
    y = (r[0][1] + r[1][0]) / s;
    z = (r[0][2] + r[2][0]) / s;
  } else if (r[1][1] > r[2][2]) {
    const s = 2 * Math.sqrt(1 + r[1][1] - r[0][0] - r[2][2]);
    w = (r[0][2] - r[2][0]) / s;
    x = (r[0][1] + r[1][0]) / s;
    y = 0.25 * s;
    z = (r[1][2] + r[2][1]) / s;
  } else {
    const s = 2 * Math.sqrt(1 + r[2][2] - r[0][0] - r[1][1]);
    w = (r[1][0] - r[0][1]) / s;
    x = (r[0][2] + r[2][0]) / s;
    y = (r[1][2] + r[2][1]) / s;
    z = 0.25 * s;
  }

  return [w, x, y, z];
}

/**
 * Quaternion [w,x,y,z] → YXZ intrinsic Euler angles (degrees).
 *
 * R = Ry(yaw) · Rx(pitch) · Rz(roll)
 *
 * From the combined rotation matrix:
 *   R[1][0] =  sin(yaw)*sin(pitch)*cos(roll) + cos(yaw)*sin(roll)  → use for roll
 *   R[1][1] =  cos(pitch)*cos(roll) - sin(yaw)*sin(pitch)*sin(roll) → use for roll
 *   R[1][2] = -sin(pitch)                                          → use for pitch
 *   R[0][2] =  sin(yaw)*cos(pitch)                                 → use for yaw
 *   R[2][2] =  cos(yaw)*cos(pitch)                                 → use for yaw
 */
function quaternionToYXZEuler(
  q: [number, number, number, number],
): HeadPose {
  const [w, x, y, z] = q;

  // Pre-compute products
  const wx = w * x, wy = w * y, wz = w * z;
  const xx = x * x, xy = x * y, xz = x * z;
  const yy = y * y, yz = y * z, zz = z * z;

  // Rotation matrix elements needed for YXZ decomposition
  const r12 = 2 * (yz - wx); // R[1][2] = -sin(pitch)
  const sinPitch = Math.max(-1, Math.min(1, -r12));
  const pitch = Math.asin(sinPitch) * RAD2DEG;

  const cosPitch = Math.sqrt(1 - sinPitch * sinPitch);

  let yaw: number;
  let roll: number;

  if (cosPitch > 1e-4) {
    const r02 = 2 * (xz + wy); // R[0][2] = sin(yaw)*cos(pitch)
    const r22 = 1 - 2 * (xx + yy); // R[2][2] = cos(yaw)*cos(pitch)
    yaw = Math.atan2(r02, r22) * RAD2DEG;

    const r10 = 2 * (xy + wz); // R[1][0]
    const r11 = 1 - 2 * (xx + zz); // R[1][1]
    roll = Math.atan2(r10, r11) * RAD2DEG;
  } else {
    // Gimbal lock near ±90° pitch — collapse yaw+roll into yaw
    const r00 = 1 - 2 * (yy + zz);
    const r20 = 2 * (xz - wy);
    yaw = Math.atan2(-r20, r00) * RAD2DEG;
    roll = 0;
  }

  return { pitch, yaw, roll };
}

/**
 * Fallback: estimate head pose from landmarks when transformation matrix
 * is unavailable. Uses nose-to-eye ratio for yaw and nose vertical
 * position for pitch. Less accurate than matrix decomposition.
 *
 * Output is in RAW CAMERA space (same as extractPoseFromMatrix).
 */
export function estimateHeadPose(landmarks: Landmark[]): HeadPose {
  const noseTip = landmarks[1];
  const chin = landmarks[152];
  const forehead = landmarks[10];
  const leftEyeOuter = landmarks[33]; // subject's left = camera right
  const rightEyeOuter = landmarks[263]; // subject's right = camera left

  // Yaw from nose-to-eye distance ratio
  const dxLeft = noseTip.x - leftEyeOuter.x;
  const dxRight = rightEyeOuter.x - noseTip.x;
  const yawRatio = (dxRight - dxLeft) / (dxRight + dxLeft + 1e-6);
  const yaw = yawRatio * 70;

  // Pitch from nose vertical position relative to face height
  const faceHeight = chin.y - forehead.y;
  const noseFraction = (noseTip.y - forehead.y) / (faceHeight + 1e-6);
  const pitch = (noseFraction - 0.42) * 100;

  // Roll from eye-to-eye angle
  const dx = rightEyeOuter.x - leftEyeOuter.x;
  const dy = rightEyeOuter.y - leftEyeOuter.y;
  const roll = Math.atan2(dy, dx) * RAD2DEG;

  return { pitch, yaw, roll };
}

/**
 * Check whether the current head pose matches a target pose within threshold.
 * When `wasOnTarget` is true, uses a wider threshold (hysteresis) to prevent
 * flickering at boundaries.
 */
export function isPoseOnTarget(
  pose: HeadPose,
  target: PoseTarget,
  wasOnTarget = false,
): boolean {
  const pitchTolerance = wasOnTarget
    ? target.pitchThreshold + 4
    : target.pitchThreshold;
  const yawTolerance = wasOnTarget
    ? target.yawThreshold + 5
    : target.yawThreshold;
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


