'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { HeadPose } from './types';
import {
  estimateHeadPose,
  extractPoseFromMatrix,
  getForeheadPosition,
  getFaceMetrics,
} from './posemath';
import { OneEuroFilter, FILTER_PARAMS } from './oneEuroFilter';

export interface FaceTrackingResult {
  /** Pose in DISPLAY (mirror) space — yaw negated from raw camera. */
  pose: HeadPose;
  foreheadX: number; // raw camera pixel coords
  foreheadY: number;
  faceCenterX: number; // raw camera pixel coords
  faceCenterY: number;
  faceScale: number; // face height / video height
  hasFace: boolean;
  confidence: number; // 0–1
}

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/**
 * Hook that initializes MediaPipe FaceLandmarker and processes video frames.
 *
 * Key improvements over the original:
 *   - One Euro Filter for adaptive smoothing (less lag when moving, smooth when still)
 *   - Yaw negated for display space (matches selfie/mirror view)
 *   - Confidence output for downstream quality gating
 *   - All coordinates in raw camera space (canvas CSS-mirrors to match video)
 */
export function useMediaPipeFace(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isActive: boolean,
  onFrame: (result: FaceTrackingResult) => void,
) {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animFrameRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onFrameRef = useRef(onFrame);

  // One Euro Filters — one per smoothed signal
  const filtersRef = useRef<{
    yaw: OneEuroFilter;
    pitch: OneEuroFilter;
    roll: OneEuroFilter;
    posX: OneEuroFilter;
    posY: OneEuroFilter;
    faceCX: OneEuroFilter;
    faceCY: OneEuroFilter;
    faceScale: OneEuroFilter;
  } | null>(null);

  function getFilters() {
    if (!filtersRef.current) {
      filtersRef.current = {
        yaw: new OneEuroFilter(30, FILTER_PARAMS.yaw.minCutoff, FILTER_PARAMS.yaw.beta),
        pitch: new OneEuroFilter(30, FILTER_PARAMS.pitch.minCutoff, FILTER_PARAMS.pitch.beta),
        roll: new OneEuroFilter(30, FILTER_PARAMS.roll.minCutoff, FILTER_PARAMS.roll.beta),
        posX: new OneEuroFilter(30, FILTER_PARAMS.posX.minCutoff, FILTER_PARAMS.posX.beta),
        posY: new OneEuroFilter(30, FILTER_PARAMS.posY.minCutoff, FILTER_PARAMS.posY.beta),
        faceCX: new OneEuroFilter(30, FILTER_PARAMS.posX.minCutoff, FILTER_PARAMS.posX.beta),
        faceCY: new OneEuroFilter(30, FILTER_PARAMS.posY.minCutoff, FILTER_PARAMS.posY.beta),
        faceScale: new OneEuroFilter(30, FILTER_PARAMS.scale.minCutoff, FILTER_PARAMS.scale.beta),
      };
    }
    return filtersRef.current;
  }

  function resetFilters() {
    if (filtersRef.current) {
      Object.values(filtersRef.current).forEach((f) => f.reset());
    }
  }

  // Keep callback ref fresh without re-triggering effects
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  const initFaceMesh = useCallback(async () => {
    if (landmarkerRef.current) return;

    setIsLoading(true);
    setError(null);

    const createOptions = (delegate: 'GPU' | 'CPU') => ({
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate,
      },
      runningMode: 'VIDEO' as const,
      numFaces: 1,
      outputFacialTransformationMatrixes: true,
      outputFaceBlendshapes: false,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

      try {
        landmarkerRef.current = await FaceLandmarker.createFromOptions(
          vision,
          createOptions('GPU'),
        );
      } catch {
        // GPU failed — fall back to CPU
        landmarkerRef.current = await FaceLandmarker.createFromOptions(
          vision,
          createOptions('CPU'),
        );
      }

      setIsReady(true);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to load face tracking model';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start/stop processing loop
  useEffect(() => {
    if (!isActive || !isReady) return;

    const video = videoRef.current;
    const fl = landmarkerRef.current;
    if (!video || !fl) return;

    let running = true;
    let lastTimestamp = -1;

    // Offscreen canvas for downscaled MediaPipe processing
    const processCanvas = document.createElement('canvas');
    const processCtx = processCanvas.getContext('2d')!;
    const PROCESS_WIDTH = 640;
    let processCanvasSized = false;

    const processFrame = () => {
      if (!running || !video || video.readyState < 2) {
        if (running) animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const now = performance.now();
      if (now <= lastTimestamp) {
        if (running) animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }
      lastTimestamp = now;

      // Size canvas once
      const scale = PROCESS_WIDTH / video.videoWidth;
      const processHeight = Math.round(video.videoHeight * scale);
      if (!processCanvasSized) {
        processCanvas.width = PROCESS_WIDTH;
        processCanvas.height = processHeight;
        processCanvasSized = true;
      }
      processCtx.drawImage(video, 0, 0, PROCESS_WIDTH, processHeight);

      try {
        const results = fl.detectForVideo(processCanvas, now);

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          const timestamp = now / 1000; // seconds for One Euro Filter

          // Extract raw pose (camera space)
          const rawPose =
            results.facialTransformationMatrixes?.length
              ? extractPoseFromMatrix(results.facialTransformationMatrixes[0])
              : estimateHeadPose(landmarks);

          const rawForehead = getForeheadPosition(
            landmarks,
            video.videoWidth,
            video.videoHeight,
          );
          const rawFace = getFaceMetrics(
            landmarks,
            video.videoWidth,
            video.videoHeight,
          );

          const filters = getFilters();

          // Apply One Euro Filters
          // CRITICAL: Negate yaw for display space (selfie/mirror view)
          const filteredPose: HeadPose = {
            yaw: filters.yaw.filter(-rawPose.yaw, timestamp),
            pitch: filters.pitch.filter(rawPose.pitch, timestamp),
            roll: filters.roll.filter(rawPose.roll, timestamp),
          };

          const filteredForehead = {
            x: filters.posX.filter(rawForehead.x, timestamp),
            y: filters.posY.filter(rawForehead.y, timestamp),
          };

          const filteredFace = {
            centerX: filters.faceCX.filter(rawFace.centerX, timestamp),
            centerY: filters.faceCY.filter(rawFace.centerY, timestamp),
            scale: filters.faceScale.filter(rawFace.scale, timestamp),
          };

          // Estimate confidence from detection quality
          const hasMatrix = !!(
            results.facialTransformationMatrixes?.length
          );
          const confidence = hasMatrix ? 0.9 : 0.6;

          onFrameRef.current({
            pose: filteredPose,
            foreheadX: filteredForehead.x,
            foreheadY: filteredForehead.y,
            faceCenterX: filteredFace.centerX,
            faceCenterY: filteredFace.centerY,
            faceScale: filteredFace.scale,
            hasFace: true,
            confidence,
          });
        } else {
          resetFilters();
          onFrameRef.current({
            pose: { pitch: 0, yaw: 0, roll: 0 },
            foreheadX: 0,
            foreheadY: 0,
            faceCenterX: 0,
            faceCenterY: 0,
            faceScale: 0,
            hasFace: false,
            confidence: 0,
          });
        }
      } catch {
        // Detection can fail during teardown; ignore
      }

      if (running) {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, isReady, videoRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      resetFilters();
    };
  }, []);

  return { initFaceMesh, isLoading, isReady, error };
}
