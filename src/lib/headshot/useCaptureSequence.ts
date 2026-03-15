'use client';

import { useRef, useCallback, useState } from 'react';
import type { CapturePhase, CapturedFrame } from './types';
import { POSE_SEQUENCE, HOLD_DURATION_MS } from './types';
import { isPoseOnTarget } from './posemath';
import { drawPoseArrow, drawCaptureFlash } from './canvasDrawing';
import type { FaceTrackingResult } from './useMediaPipeFace';

interface CaptureState {
  phase: CapturePhase;
  currentStep: number;
  frames: CapturedFrame[];
  holdProgress: number; // 0–1
  isOnTarget: boolean;
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
  instruction: '',
  errorMessage: null,
  captureCount: 0,
};

/**
 * State machine hook for the headshot capture sequence.
 * Uses a ref mirror of state so processFrame (called at 30-60fps from rAF)
 * can read current state without being inside a setState updater.
 */
export function useCaptureSequence(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const [state, setState] = useState<CaptureState>(INITIAL_STATE);
  const stateRef = useRef<CaptureState>(INITIAL_STATE);
  const holdStartRef = useRef<number | null>(null);
  const capturedInStepRef = useRef(false);
  const offTargetCountRef = useRef(0);
  const flashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownUntilRef = useRef(0);

  /** Update both the ref mirror and React state atomically. */
  const updateState = useCallback((next: CaptureState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  /**
   * Request webcam access and start the video stream.
   */
  const startCamera = useCallback(async (): Promise<MediaStream> => {
    updateState({ ...stateRef.current, phase: 'requesting-camera', errorMessage: null });

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const isInsecure = typeof window !== 'undefined' && window.location.protocol === 'http:';
      const isLAN =
        typeof window !== 'undefined' &&
        !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

      let message = 'Camera access is not available.';
      if (isInsecure && isLAN) {
        message =
          'Camera requires HTTPS. You are accessing over HTTP on a local network. ' +
          'Either: (1) In Chrome, visit chrome://flags, enable "Insecure origins treated as secure" ' +
          `and add "${window.location.origin}", or (2) restart the dev server with npm run dev:https.`;
      } else if (isInsecure) {
        message = 'Camera requires a secure (HTTPS) connection. Please access this site over HTTPS.';
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
    offTargetCountRef.current = 0;
    cooldownUntilRef.current = 0;
    const next: CaptureState = {
      phase: 'tracking',
      currentStep: 0,
      frames: [],
      holdProgress: 0,
      isOnTarget: false,
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

    // Downscale to max 1280px on longest side for smaller payloads
    const MAX_DIM = 1280;
    const scale = Math.min(1, MAX_DIM / Math.max(video.videoWidth, video.videoHeight));
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
   * Handles positioning → tracking → holding → capture flow.
   * Canvas is NOT CSS-mirrored, so we flip X coordinates to match the mirrored video.
   */
  const processFrame = useCallback(
    (result: FaceTrackingResult) => {
      const prev = stateRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      // --- Tracking / Holding phases ---
      if (prev.phase !== 'tracking' && prev.phase !== 'holding') return;
      if (prev.currentStep >= POSE_SEQUENCE.length) return;

      // Cooldown period after capture — suppress tracking so green ring disappears
      const now = performance.now();
      if (now < cooldownUntilRef.current) {
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        updateState({ ...prev, phase: 'tracking', holdProgress: 0, isOnTarget: false });
        return;
      }

      const target = POSE_SEQUENCE[prev.currentStep];

      if (!result.hasFace) {
        holdStartRef.current = null;
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        updateState({ ...prev, phase: 'tracking', holdProgress: 0, isOnTarget: false });
        return;
      }

      const onTarget = isPoseOnTarget(result.pose, target, prev.isOnTarget);

      // Mirror X for display (canvas is not CSS-flipped, but video is)
      const mirroredCenterX = canvas ? canvas.width - result.faceCenterX : result.faceCenterX;

      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPoseArrow(
          ctx, onTarget,
          canvas.width, canvas.height, target.yaw, target.pitch,
          mirroredCenterX, result.faceCenterY, result.faceScale,
        );
      }

      // Not on target — allow grace period before resetting hold
      if (!onTarget) {
        if (holdStartRef.current !== null) {
          offTargetCountRef.current++;
          if (offTargetCountRef.current > 10) {
            holdStartRef.current = null;
            capturedInStepRef.current = false;
            offTargetCountRef.current = 0;
            updateState({ ...prev, phase: 'tracking', holdProgress: 0, isOnTarget: false });
          } else {
            // Grace period — explicitly keep isOnTarget true so UI border stays green
            updateState({ ...prev, isOnTarget: true });
          }
        } else {
          updateState({ ...prev, phase: 'tracking', holdProgress: 0, isOnTarget: false });
        }
        return;
      }

      offTargetCountRef.current = 0;

      // On target — accumulate hold time
      if (!holdStartRef.current) {
        holdStartRef.current = now;
      }

      const elapsed = now - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);

      // Hold complete — capture!
      if (progress >= 1 && !capturedInStepRef.current) {
        const dataUrl = captureFrame();

        if (!dataUrl) {
          // captureFrame failed — retry next frame
          return;
        }

        capturedInStepRef.current = true;
        cooldownUntilRef.current = performance.now() + 500;
        const newFrames = [...prev.frames, { dataUrl, poseLabel: target.label }];

        // Flash animation (ref-tracked for cleanup)
        if (flashIntervalRef.current) clearInterval(flashIntervalRef.current);
        if (ctx && canvas) {
          let flashAlpha = 1;
          flashIntervalRef.current = setInterval(() => {
            flashAlpha -= 0.08;
            if (flashAlpha <= 0) {
              if (flashIntervalRef.current) clearInterval(flashIntervalRef.current);
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
            instruction: 'All poses captured!',
            captureCount: prev.captureCount + 1,
          });
          return;
        }

        // Advance to next step
        capturedInStepRef.current = false;
        holdStartRef.current = null;
        updateState({
          ...prev,
          phase: 'tracking',
          frames: newFrames,
          currentStep: nextStep,
          holdProgress: 0,
          isOnTarget: false,
          instruction: POSE_SEQUENCE[nextStep].instruction,
          captureCount: prev.captureCount + 1,
        });
        return;
      }

      // Still holding — update progress
      updateState({ ...prev, phase: 'holding', holdProgress: progress, isOnTarget: true });
    },
    [canvasRef, captureFrame, updateState],
  );

  /**
   * Upload captured frames to the backend.
   */
  const uploadFrames = useCallback(async (frames: CapturedFrame[]) => {
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
        const body = await response.json().catch(() => ({ error: 'Upload failed' }));
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
        errorMessage: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  }, [updateState]);

  /**
   * Reset everything to idle.
   */
  const reset = useCallback(() => {
    holdStartRef.current = null;
    capturedInStepRef.current = false;
    offTargetCountRef.current = 0;
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
