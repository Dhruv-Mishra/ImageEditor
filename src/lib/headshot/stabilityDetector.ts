import type { HeadPose } from './types';

/**
 * Rolling-window jitter detector.
 * Tracks standard deviation of recent pose samples to determine
 * whether the user's head is stable enough for capture.
 */
export class StabilityDetector {
  private windowSize: number;
  private yawHistory: number[] = [];
  private pitchHistory: number[] = [];
  private rollHistory: number[] = [];
  private yawThreshold: number;
  private pitchThreshold: number;
  private rollThreshold: number;

  constructor(
    windowSize = 15,
    yawThreshold = 2.0,
    pitchThreshold = 1.5,
    rollThreshold = 2.0,
  ) {
    this.windowSize = windowSize;
    this.yawThreshold = yawThreshold;
    this.pitchThreshold = pitchThreshold;
    this.rollThreshold = rollThreshold;
  }

  push(pose: HeadPose): void {
    this.yawHistory.push(pose.yaw);
    this.pitchHistory.push(pose.pitch);
    this.rollHistory.push(pose.roll);
    if (this.yawHistory.length > this.windowSize) {
      this.yawHistory.shift();
      this.pitchHistory.shift();
      this.rollHistory.shift();
    }
  }

  isStable(): boolean {
    if (this.yawHistory.length < Math.ceil(this.windowSize * 0.6)) return false;
    return (
      stddev(this.yawHistory) < this.yawThreshold &&
      stddev(this.pitchHistory) < this.pitchThreshold &&
      stddev(this.rollHistory) < this.rollThreshold
    );
  }

  /** Jitter magnitude — lower is more stable. */
  jitterMagnitude(): number {
    if (this.yawHistory.length < 3) return Infinity;
    return (
      stddev(this.yawHistory) +
      stddev(this.pitchHistory) +
      stddev(this.rollHistory)
    );
  }

  reset(): void {
    this.yawHistory = [];
    this.pitchHistory = [];
    this.rollHistory = [];
  }
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  return Math.sqrt(sqDiffs / values.length);
}

// === Constants ===
export const STABILITY_WINDOW_FRAMES = 15;
export const YAW_JITTER_THRESHOLD = 2.0;
export const PITCH_JITTER_THRESHOLD = 1.5;
export const ROLL_JITTER_THRESHOLD = 2.0;
export const STABILITY_REQUIRED_MS = 200;
