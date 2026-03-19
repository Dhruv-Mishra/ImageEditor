import type { HeadPose, PoseTarget } from './types';

/** Constants for face positioning. */
export const IDEAL_FACE_SCALE = 0.35;
export const FACE_SCALE_TOLERANCE = 0.08;
export const FACE_CENTER_TOLERANCE = 0.12;

/** Minimum interval between instruction text changes to prevent flickering. */
const MIN_CHANGE_INTERVAL_MS = 600;

type InstructionPriority = 'position' | 'rotation' | 'hold' | 'stability';

export interface InstructionState {
  text: string;
  priority: InstructionPriority;
  lastChangeTime: number;
}

export const INITIAL_INSTRUCTION: InstructionState = {
  text: '',
  priority: 'rotation',
  lastChangeTime: 0,
};

/**
 * Generate adaptive, real-time instruction text based on the user's current
 * face position, orientation, and the target pose.
 *
 * Priority order (highest first):
 *   1. Face positioning (off-center or wrong distance)
 *   2. Roll correction (tilted head)
 *   3. On-target hold / stability
 *   4. Primary rotation correction (yaw/pitch toward target)
 */
export function generateInstruction(
  currentPose: HeadPose,
  target: PoseTarget,
  faceScale: number,
  faceCenterX: number,
  faceCenterY: number,
  canvasW: number,
  canvasH: number,
  isOnTarget: boolean,
  isStable: boolean,
  prev: InstructionState,
): InstructionState {
  const now = performance.now();

  // --- On-target states ---
  if (isOnTarget && isStable) {
    return updateIfAllowed(prev, 'Hold still…', 'hold', now);
  }
  if (isOnTarget && !isStable) {
    return updateIfAllowed(prev, 'Hold steady…', 'stability', now);
  }

  // --- Face positioning ---
  const idealCX = canvasW / 2;
  const idealCY = canvasH * 0.42;
  const centerErrorX = Math.abs(faceCenterX - idealCX) / canvasW;
  const centerErrorY = Math.abs(faceCenterY - idealCY) / canvasH;
  const scaleDiff = faceScale - IDEAL_FACE_SCALE;

  if (centerErrorX > 0.18 || centerErrorY > 0.18) {
    return updateIfAllowed(prev, 'Center your face in the frame', 'position', now);
  }
  if (Math.abs(scaleDiff) > FACE_SCALE_TOLERANCE * 1.5) {
    const msg = scaleDiff > 0 ? 'Move back a bit' : 'Move a little closer';
    return updateIfAllowed(prev, msg, 'position', now);
  }

  // --- Roll correction ---
  if (Math.abs(currentPose.roll) > 8) {
    return updateIfAllowed(prev, 'Straighten your head', 'rotation', now);
  }

  // --- Primary rotation correction ---
  const yawDiff = target.yaw - currentPose.yaw;
  const pitchDiff = target.pitch - currentPose.pitch;
  const absYawDiff = Math.abs(yawDiff);
  const absPitchDiff = Math.abs(pitchDiff);

  if (absYawDiff > absPitchDiff && absYawDiff > 5) {
    const direction = yawDiff > 0 ? 'right' : 'left';
    return updateIfAllowed(prev, yawText(absYawDiff, direction), 'rotation', now);
  }
  if (absPitchDiff > 4) {
    const direction = pitchDiff > 0 ? 'down' : 'up';
    return updateIfAllowed(prev, pitchText(absPitchDiff, direction), 'rotation', now);
  }

  // Fallback (shouldn't happen often — would be on-target)
  return updateIfAllowed(prev, target.instruction, 'rotation', now);
}

// --- Graduated instruction text ---

function yawText(diff: number, dir: string): string {
  if (diff > 20) return `Turn your head to the ${dir}`;
  if (diff > 12) return `Turn a bit more to the ${dir}`;
  if (diff > 6) return `Almost there — a little more ${dir}`;
  return `Just a tiny bit more ${dir}`;
}

function pitchText(diff: number, dir: string): string {
  if (diff > 15) return `Tilt your head ${dir}`;
  if (diff > 8) return `Tilt a bit more ${dir}`;
  return `Almost — just a touch more ${dir}`;
}

// --- Anti-flicker gate ---

const PRIORITY_ORDER: Record<InstructionPriority, number> = {
  position: 0,
  rotation: 1,
  stability: 2,
  hold: 3,
};

function updateIfAllowed(
  prev: InstructionState,
  newText: string,
  newPriority: InstructionPriority,
  now: number,
): InstructionState {
  // Always allow immediate transition to hold/stability states
  if (newPriority === 'hold' || newPriority === 'stability') {
    return { text: newText, priority: newPriority, lastChangeTime: now };
  }
  // Don't flicker — enforce minimum interval unless priority escalates
  const elapsed = now - prev.lastChangeTime;
  if (
    elapsed < MIN_CHANGE_INTERVAL_MS &&
    PRIORITY_ORDER[newPriority] >= PRIORITY_ORDER[prev.priority]
  ) {
    return prev;
  }
  if (newText === prev.text) return prev;
  return { text: newText, priority: newPriority, lastChangeTime: now };
}
