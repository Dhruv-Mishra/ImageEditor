/**
 * One Euro Filter — adaptive low-pass filter for real-time signal smoothing.
 *
 * Reference: Casiez, Roussel, Vogel — "1€ Filter: A Simple Speed-based
 * Low-pass Filter for Noisy Input in Interactive Systems" (CHI 2012)
 *
 * Advantages over fixed-alpha EMA:
 * - Low lag during fast motion (adaptive cutoff)
 * - High smoothness when still (low cutoff)
 * - Only two intuitive parameters: minCutoff (smoothness) and beta (responsiveness)
 */

class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  filter(value: number, alpha: number): number {
    if (this.s === null) {
      this.y = value;
      this.s = value;
      return value;
    }
    this.y = value;
    this.s = alpha * value + (1 - alpha) * this.s;
    return this.s;
  }

  lastRawValue(): number {
    return this.y ?? 0;
  }

  hasLastValue(): boolean {
    return this.s !== null;
  }

  lastFilteredValue(): number {
    return this.s ?? 0;
  }

  reset(): void {
    this.y = null;
    this.s = null;
  }
}

export class OneEuroFilter {
  private freq: number;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastTime: number | null = null;

  /**
   * @param freq     Expected sampling frequency in Hz (used for first frame only)
   * @param minCutoff Minimum cutoff frequency — lower = smoother when still
   * @param beta     Speed coefficient — higher = less lag during fast motion
   * @param dCutoff  Derivative cutoff frequency (usually 1.0)
   */
  constructor(freq = 30, minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.freq = freq;
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private computeAlpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  /**
   * Filter a new value. Timestamp is in seconds (use performance.now() / 1000).
   */
  filter(value: number, timestamp?: number): number {
    const now = timestamp ?? performance.now() / 1000;
    const dt =
      this.lastTime === null
        ? 1 / this.freq
        : Math.max(now - this.lastTime, 1e-6);
    this.lastTime = now;

    // Estimate derivative
    const prevValue = this.xFilter.hasLastValue()
      ? this.xFilter.lastRawValue()
      : value;
    const dx = (value - prevValue) / dt;
    const edx = this.dxFilter.filter(dx, this.computeAlpha(this.dCutoff, dt));

    // Adaptive cutoff based on speed
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);

    return this.xFilter.filter(value, this.computeAlpha(cutoff, dt));
  }

  /** Get the last filtered output without adding a new sample. */
  lastOutput(): number {
    return this.xFilter.lastFilteredValue();
  }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

/** Filter parameters tuned for headshot face tracking. */
export const FILTER_PARAMS = {
  yaw: { minCutoff: 1.0, beta: 0.007 },
  pitch: { minCutoff: 1.0, beta: 0.005 },
  roll: { minCutoff: 0.8, beta: 0.003 },
  posX: { minCutoff: 0.5, beta: 0.01 },
  posY: { minCutoff: 0.5, beta: 0.01 },
  scale: { minCutoff: 0.3, beta: 0.005 },
} as const;
