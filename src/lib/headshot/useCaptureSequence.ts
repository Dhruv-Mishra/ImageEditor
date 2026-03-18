'use client';

import { useRef, useCallback, useState } from 'react';
import type { CapturePhase, CapturedFrame, GuidanceState } from './types';
import {
  POSE_SEQUENCE,
  HOLD_DURATION_MS,
  COOLDOWN_AFTER_CAPTURE_MS,
  BASE_GRACE_MS,
  MAX_GRACE_MS,
  GRACE_BACKOFF_BASE,
} from './types';
import { isPoseOnTarget } from './posemath';
import { drawGuidanceOverlay, drawCaptureFlash } from './canvasDrawing';
import { StabilityDetector, STABILITY_REQUIRED_MS } from './stabilityDetector';
import {
  generateInstruction,
  INITIAL_INSTRUCTION,
  type InstructionState,
} from './instructionEngine';
import type { FaceTrackingResult } from './useMediaPipeFace';

interface CaptureState {
  phase: CapturePhase;
  currentStep: number;
  frames: CapturedFrame[];
  holdProgress: number; // 0–1
  isOnTarget: boolean;
  isStable: boolean;
  instruction: string;
  errorMessage: string | null;
  captureCount: number;
}

const INITIAL_STATE: CaptureState = {
  phase: 'idle',
  currentStep: 0,
  frames: [],
  holdProgress: 0,
  isOnTarget: false,
  isStable: false,
  instruction: '',
  errorMessage: null,
  captureCount: 0,
};

/**
 * State machine hook for the headshot capture sequence.
 *
 * State transitions:
 *   idle → requesting-camera → tracking → stabilizing → holding → [capture]
 *                                  ↑           ↓             ↓
 *                                  ← off-target ←── jitter ──┘
 *
 * Key improvements:
 *   - Stability detection (StabilityDetector) gates hold countdown
 *   - Adaptive instruction engine generates real-time feedback
 *   - Face guide overlay with positioning oval, chevrons, on-target glow
 *   - Exponential backoff grace period prevents frustrating resets
 *   - Canvas coordinates in raw camera space (CSS-mirrored to match video)
 */
export function useCaptureSequence(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const [state, setState] = useState<CaptureState>(INITIAL_STATE);
  const stateRef = useRef<CaptureState>(INITIAL_STATE);
  const holdStartRef = useRef<number | null>(null);
  const capturedInStepRef = useRef(false);
  const flashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownUntilRef = useRef(0);

  // New: Stability detector instance
  const stabilityRef = useRef(new StabilityDetector());

  // New: Instruction engine state
  const instructionRef = useRef<InstructionState>(INITIAL_INSTRUCTION);

  // New: Grace period with exponential backoff
  const graceStartRef = useRef<number | null>(null);
  const consecutiveResetsRef = useRef(0);

  // New: Stabilizing phase timer
  const stableStartRef = useRef<number | null>(null);

  const updateState = useCallback((next: CaptureState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  /**
   * Request webcam access and start the video stream.
   */
  const startCamera = useCallback(async (): Promise<MediaStream> => {
    updateState({
      ...stateRef.current,
      phase: 'requesting-camera',
      errorMessage: null,
    });

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      const isInsecure =
        typeof window !== 'undefined' &&
        window.location.protocol === 'http:';
      const isLAN =
        typeof window !== 'undefined' &&
        !['localhost', '127.0.0.1', '[::1]'].includes(
          window.location.hostname,
        );

      let message = 'Camera access is not available.';
      if (isInsecure && isLAN) {
        message =
          'Camera requires HTTPS. You are accessing over HTTP on a local network. ' +
          'Either: (1) In Chrome, visit chrome://flags, enable "Insecure origins treated as secure" ' +
          `and add "${window.location.origin}", or (2) restart the dev server with npm run dev:https.`;
      } else if (isInsecure) {
        message =
          'Camera requires a secure (HTTPS) connection. Please access this site over HTTPS.';
      }

      throw new Error(message);
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'user',
      },
      audio: false,
    });

    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      await video.play();
    }

    return stream;
  }, [videoRef, updateState]);

  /**
   * Begin the 5-pose capture sequence.
   */
  const startSequence = useCallback(() => {
    capturedInStepRef.current = false;
    holdStartRef.current = null;
    graceStartRef.current = null;
    stableStartRef.current = null;
    consecutiveResetsRef.current = 0;
    cooldownUntilRef.current = 0;
    stabilityRef.current.reset();
    instructionRef.current = INITIAL_INSTRUCTION;

    const next: CaptureState = {
      phase: 'tracking',
      currentStep: 0,
      frames: [],
      holdProgress: 0,
      isOnTarget: false,
      isStable: false,
      instruction: POSE_SEQUENCE[0].instruction,
      errorMessage: null,
      captureCount: 0,
    };
    updateState(next);
  }, [updateState]);

  /**
   * Capture the current video frame as a WebP data URL.
   */
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video) return null;

    const MAX_DIM = 1280;
    const scale = Math.min(
      1,
      MAX_DIM / Math.max(video.videoWidth, video.videoHeight),
    );
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = w;
    captureCanvas.height = h;
    const ctx = captureCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, w, h);
    return captureCanvas.toDataURL('image/webp', 0.75);
  }, [videoRef]);

  /**
   * Process each face tracking frame — called from the rAF loop.
   *
   * Canvas draws in raw camera coordinates. The canvas element has
   * CSS `scale-x-[-1]` matching the video, so no manual X-flipping.
   *
   * Pose values are in display (mirror) space — yaw already negated
   * by useMediaPipeFace.
   */
  const processFrame = useCallback(
    (result: FaceTrackingResult) => {
      const prev = stateRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      // Only process during active phases
      if (
        prev.phase !== 'tracking' &&
        prev.phase !== 'stabilizing' &&
        prev.phase !== 'holding'
      ) {
        return;
      }
      if (prev.currentStep >= POSE_SEQUENCE.length) return;

      const now = performance.now();

      // Cooldown period after capture
      if (now < cooldownUntilRef.current) {
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        updateState({
          ...prev,
          phase: 'tracking',
          holdProgress: 0,
          isOnTarget: false,
          isStable: false,
        });
        return;
      }

      const target = POSE_SEQUENCE[prev.currentStep];

      // --- No face detected ---
      if (!result.hasFace) {
        holdStartRef.current = null;
        stableStartRef.current = null;
        graceStartRef.current = null;
        stabilityRef.current.reset();

        const guidance: GuidanceState = {
          hasFace: false,
          faceCenterX: 0,
          faceCenterY: 0,
          faceScale: 0,
          currentYaw: 0,
          currentPitch: 0,
          currentRoll: 0,
          targetYaw: target.yaw,
          targetPitch: target.pitch,
          isOnTarget: false,
          isStable: false,
          holdProgress: 0,
        };

        if (ctx && canvas) {
          drawGuidanceOverlay(ctx, canvas.width, canvas.height, guidance);
        }

        instructionRef.current = {
          text: 'Position your face in the frame',
          priority: 'position',
          lastChangeTime: now,
        };

        updateState({
          ...prev,
          phase: 'tracking',
          holdProgress: 0,
          isOnTarget: false,
          isStable: false,
          instruction: 'Position your face in the frame',
        });
        return;
      }

      // --- Face detected ---
      const onTarget = isPoseOnTarget(result.pose, target, prev.isOnTarget);

      // Feed stability detector
      stabilityRef.current.push(result.pose);
      const isStable = stabilityRef.current.isStable();

      // Generate adaptive instruction
      const instruction = generateInstruction(
        result.pose,
        target,
        result.faceScale,
        result.faceCenterX,
        result.faceCenterY,
        canvas?.width ?? 640,
        canvas?.height ?? 480,
        onTarget,
        isStable,
        instructionRef.current,
      );
      instructionRef.current = instruction;

      // Determine hold progress
      let holdProgress = 0;
      if (onTarget && isStable && holdStartRef.current !== null) {
        const elapsed = now - holdStartRef.current;
        holdProgress = Math.min(elapsed / HOLD_DURATION_MS, 1);
      }

      // Draw guidance overlay
      const guidance: GuidanceState = {
        hasFace: true,
        faceCenterX: result.faceCenterX,
        faceCenterY: result.faceCenterY,
        faceScale: result.faceScale,
        currentYaw: result.pose.yaw,
        currentPitch: result.pose.pitch,
        currentRoll: result.pose.roll,
        targetYaw: target.yaw,
        targetPitch: target.pitch,
        isOnTarget: onTarget,
        isStable,
        holdProgress,
      };

      if (ctx && canvas) {
        drawGuidanceOverlay(ctx, canvas.width, canvas.height, guidance);
      }

      // --- State machine transitions ---

      if (!onTarget) {
        // Off-target: check grace period
        if (
          prev.phase === 'holding' ||
          prev.phase === 'stabilizing'
        ) {
          if (!graceStartRef.current) {
            graceStartRef.current = now;
          }
          const graceDuration = Math.min(
            BASE_GRACE_MS *
              Math.pow(GRACE_BACKOFF_BASE, consecutiveResetsRef.current),
            MAX_GRACE_MS,
          );
          const offTargetDuration = now - graceStartRef.current;

          if (offTargetDuration < graceDuration) {
            // Still within grace — keep current phase but pause progress
            updateState({
              ...prev,
              holdProgress,
              isOnTarget: true, // visual: keep green to avoid flicker
              isStable,
              instruction: instruction.text,
            });
            return;
          }

          // Grace expired — reset to tracking
          consecutiveResetsRef.current++;
          graceStartRef.current = null;
          holdStartRef.current = null;
          stableStartRef.current = null;
        }

        updateState({
          ...prev,
          phase: 'tracking',
          holdProgress: 0,
          isOnTarget: false,
          isStable,
          instruction: instruction.text,
        });
        return;
      }

      // On-target — reset grace
      graceStartRef.current = null;

      if (!isStable) {
        // On-target but jittery → stabilizing phase
        if (prev.phase === 'holding') {
          // Was holding but lost stability — reset hold state to prevent
          // surprise capture when stability returns
          holdStartRef.current = null;
          stableStartRef.current = null;
          updateState({
            ...prev,
            phase: 'stabilizing',
            holdProgress: 0,
            isOnTarget: true,
            isStable: false,
            instruction: instruction.text,
          });
          return;
        }

        stableStartRef.current = null;
        holdStartRef.current = null;
        updateState({
          ...prev,
          phase: 'stabilizing',
          holdProgress: 0,
          isOnTarget: true,
          isStable: false,
          instruction: instruction.text,
        });
        return;
      }

      // On-target AND stable

      // Track how long we've been stable
      if (!stableStartRef.current) {
        stableStartRef.current = now;
      }

      const stableDuration = now - stableStartRef.current;

      if (stableDuration < STABILITY_REQUIRED_MS) {
        // Need a bit more stability before starting hold
        updateState({
          ...prev,
          phase: 'stabilizing',
          holdProgress: 0,
          isOnTarget: true,
          isStable: true,
          instruction: instruction.text,
        });
        return;
      }

      // Stable long enough — start/continue hold
      if (!holdStartRef.current) {
        holdStartRef.current = now;
      }

      const elapsed = now - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);

      // Hold complete — capture!
      if (progress >= 1 && !capturedInStepRef.current) {
        const dataUrl = captureFrame();
        if (!dataUrl) return; // retry next frame

        capturedInStepRef.current = true;
        cooldownUntilRef.current = performance.now() + COOLDOWN_AFTER_CAPTURE_MS;
        consecutiveResetsRef.current = 0; // reset backoff on success
        const newFrames = [
          ...prev.frames,
          { dataUrl, poseLabel: target.label },
        ];

        // Flash animation
        if (flashIntervalRef.current) clearInterval(flashIntervalRef.current);
        if (ctx && canvas) {
          let flashAlpha = 1;
          flashIntervalRef.current = setInterval(() => {
            flashAlpha -= 0.08;
            if (flashAlpha <= 0) {
              if (flashIntervalRef.current)
                clearInterval(flashIntervalRef.current);
              flashIntervalRef.current = null;
            } else {
              drawCaptureFlash(ctx, canvas.width, canvas.height, flashAlpha);
            }
          }, 30);
        }

        const nextStep = prev.currentStep + 1;

        if (nextStep >= POSE_SEQUENCE.length) {
          updateState({
            ...prev,
            phase: 'complete',
            frames: newFrames,
            currentStep: nextStep,
            holdProgress: 1,
            isOnTarget: true,
            isStable: true,
            instruction: 'All poses captured!',
            captureCount: prev.captureCount + 1,
          });
          return;
        }

        // Advance to next step
        capturedInStepRef.current = false;
        holdStartRef.current = null;
        stableStartRef.current = null;
        stabilityRef.current.reset();
        instructionRef.current = INITIAL_INSTRUCTION;

        updateState({
          ...prev,
          phase: 'tracking',
          frames: newFrames,
          currentStep: nextStep,
          holdProgress: 0,
          isOnTarget: false,
          isStable: false,
          instruction: POSE_SEQUENCE[nextStep].instruction,
          captureCount: prev.captureCount + 1,
        });
        return;
      }

      // Still holding — update progress
      updateState({
        ...prev,
        phase: 'holding',
        holdProgress: progress,
        isOnTarget: true,
        isStable: true,
        instruction: instruction.text,
      });
    },
    [canvasRef, captureFrame, updateState],
  );

  /**
   * Upload captured frames to the backend.
   */
  const uploadFrames = useCallback(
    async (frames: CapturedFrame[]) => {
      updateState({ ...stateRef.current, phase: 'uploading' });

      try {
        const response = await fetch('/api/upload-headshots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: frames.map((f) => ({
              data: f.dataUrl,
              pose: f.poseLabel,
            })),
          }),
        });

        if (!response.ok) {
          const body = await response
            .json()
            .catch(() => ({ error: 'Upload failed' }));
          throw new Error(body.error || `Upload failed (${response.status})`);
        }

        updateState({
          ...stateRef.current,
          phase: 'done',
          instruction: 'Headshots uploaded successfully!',
        });
      } catch (err) {
        updateState({
          ...stateRef.current,
          phase: 'error',
          errorMessage:
            err instanceof Error ? err.message : 'Upload failed',
        });
      }
    },
    [updateState],
  );

  /**
   * Reset everything to idle.
   */
  const reset = useCallback(() => {
    holdStartRef.current = null;
    capturedInStepRef.current = false;
    graceStartRef.current = null;
    stableStartRef.current = null;
    consecutiveResetsRef.current = 0;
    stabilityRef.current.reset();
    instructionRef.current = INITIAL_INSTRUCTION;
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    updateState(INITIAL_STATE);
  }, [updateState]);

  return {
    state,
    startCamera,
    startSequence,
    processFrame,
    uploadFrames,
    reset,
  };
}
