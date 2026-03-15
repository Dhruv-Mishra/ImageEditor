/** Head pose angles in degrees */
export interface HeadPose {
  pitch: number; // up/down (negative = looking up)
  yaw: number;   // left/right (negative = looking left)
  roll: number;  // head tilt
}

/** A target orientation for the capture sequence */
export interface PoseTarget {
  label: string;
  instruction: string;
  pitch: number;
  yaw: number;
  pitchThreshold: number;
  yawThreshold: number;
}

/** State of the capture sequence state machine */
export type CapturePhase =
  | 'idle'
  | 'requesting-camera'
  | 'tracking'
  | 'holding'
  | 'complete'
  | 'uploading'
  | 'done'
  | 'error';

/** A single captured headshot frame */
export interface CapturedFrame {
  dataUrl: string; // webp data URL
  poseLabel: string;
}

/** The 5-pose capture sequence */
export const POSE_SEQUENCE: PoseTarget[] = [
  {
    label: 'Left',
    instruction: 'Turn your head to the Left',
    pitch: 0,
    yaw: -30,
    pitchThreshold: 18,
    yawThreshold: 30,
  },
  {
    label: 'Right',
    instruction: 'Turn your head to the Right',
    pitch: 0,
    yaw: 30,
    pitchThreshold: 18,
    yawThreshold: 30,
  },
  {
    label: 'Straight',
    instruction: 'Look straight at the camera',
    pitch: 0,
    yaw: 0,
    pitchThreshold: 14,
    yawThreshold: 16,
  },
  {
    label: 'Up',
    instruction: 'Tilt your head slightly Up',
    pitch: -10,
    yaw: 0,
    pitchThreshold: 8,
    yawThreshold: 20,
  },
  {
    label: 'Down',
    instruction: 'Tilt your head slightly Down',
    pitch: 10,
    yaw: 0,
    pitchThreshold: 7,
    yawThreshold: 20,
  },
];

/** Duration (ms) user must hold the target pose before capture */
export const HOLD_DURATION_MS = 1500;
