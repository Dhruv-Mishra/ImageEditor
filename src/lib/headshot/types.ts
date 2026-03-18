/** Head pose angles in degrees (display space — mirrored to match selfie view). */
export interface HeadPose {
  pitch: number; // positive = looking down, negative = looking up
  yaw: number; // positive = face appears turned right in mirror, negative = left
  roll: number; // positive = head tilts to subject's left
}

/** A target orientation for the capture sequence (in display / mirror space). */
export interface PoseTarget {
  label: string;
  instruction: string;
  pitch: number;
  yaw: number;
  pitchThreshold: number;
  yawThreshold: number;
}

/** State of the capture sequence state machine. */
export type CapturePhase =
  | 'idle'
  | 'requesting-camera'
  | 'tracking' // face detected, pose not matching target
  | 'stabilizing' // pose matches, waiting for jitter to settle
  | 'holding' // stable + on-target, countdown running
  | 'complete'
  | 'uploading'
  | 'done'
  | 'error';

/** A single captured headshot frame. */
export interface CapturedFrame {
  dataUrl: string; // webp data URL
  poseLabel: string;
}

/** Full guidance state passed to the drawing layer. */
export interface GuidanceState {
  hasFace: boolean;
  faceCenterX: number; // raw camera coords (canvas is CSS-mirrored)
  faceCenterY: number;
  faceScale: number;
  currentYaw: number; // display space
  currentPitch: number;
  currentRoll: number;
  targetYaw: number;
  targetPitch: number;
  isOnTarget: boolean;
  isStable: boolean;
  holdProgress: number; // 0–1
}

/**
 * The 5-pose capture sequence.
 * Yaw values are in display (mirror) space:
 *   yaw < 0 → face appears turned LEFT in the selfie view
 *   yaw > 0 → face appears turned RIGHT in the selfie view
 */
export const POSE_SEQUENCE: PoseTarget[] = [
  {
    label: 'Left',
    instruction: 'Turn your head to the left',
    pitch: 0,
    yaw: -25,
    pitchThreshold: 15,
    yawThreshold: 15,
  },
  {
    label: 'Right',
    instruction: 'Turn your head to the right',
    pitch: 0,
    yaw: 25,
    pitchThreshold: 15,
    yawThreshold: 15,
  },
  {
    label: 'Straight',
    instruction: 'Look straight at the camera',
    pitch: 0,
    yaw: 0,
    pitchThreshold: 12,
    yawThreshold: 12,
  },
  {
    label: 'Up',
    instruction: 'Tilt your head slightly up',
    pitch: -12,
    yaw: 0,
    pitchThreshold: 10,
    yawThreshold: 15,
  },
  {
    label: 'Down',
    instruction: 'Tilt your head slightly down',
    pitch: 12,
    yaw: 0,
    pitchThreshold: 10,
    yawThreshold: 15,
  },
];

/** Duration (ms) user must hold the target pose before capture. */
export const HOLD_DURATION_MS = 1500;

/** Cooldown after each capture to prevent re-trigger. */
export const COOLDOWN_AFTER_CAPTURE_MS = 600;

/** Grace period constants for exponential backoff. */
export const BASE_GRACE_MS = 300;
export const MAX_GRACE_MS = 1200;
export const GRACE_BACKOFF_BASE = 1.5;
