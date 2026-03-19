'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import type { CapturePhase } from '@/lib/headshot/types';
import { HOLD_DURATION_MS } from '@/lib/headshot/types';

/**
 * Production-grade webcam viewfinder with:
 * - Video + overlay canvas (both CSS-mirrored for selfie view)
 * - Countdown ring + seconds text overlaid on the feed during hold
 * - Green border flash on capture
 * - Adaptive instruction bar at top
 * - Stabilizing indicator (yellow pulse)
 */
export function HeadshotViewfinder({
  videoRef,
  canvasRef,
  instruction,
  showInstruction,
  holdProgress,
  isOnTarget,
  isStable,
  phase,
  captureCount,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  instruction?: string;
  showInstruction?: boolean;
  holdProgress: number;
  isOnTarget: boolean;
  isStable: boolean;
  phase: CapturePhase;
  captureCount: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCaptureFlash, setShowCaptureFlash] = useState(false);

  // Flash ONLY when a real capture occurs (captureCount increases)
  const prevCaptureCountRef = useRef(captureCount);
  useEffect(() => {
    if (captureCount > prevCaptureCountRef.current) {
      setShowCaptureFlash(true);
      const t = setTimeout(() => setShowCaptureFlash(false), 150);
      prevCaptureCountRef.current = captureCount;
      return () => clearTimeout(t);
    }
    prevCaptureCountRef.current = captureCount;
  }, [captureCount]);

  const syncCanvasSize = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }, [videoRef, canvasRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleResize = () => syncCanvasSize();
    video.addEventListener('loadedmetadata', handleResize);
    video.addEventListener('resize', handleResize);
    return () => {
      video.removeEventListener('loadedmetadata', handleResize);
      video.removeEventListener('resize', handleResize);
    };
  }, [videoRef, syncCanvasSize]);

  const isHolding = phase === 'holding' && isOnTarget && isStable;
  const isStabilizing = phase === 'stabilizing' && isOnTarget;
  const secondsRemaining = (1 - holdProgress) * (HOLD_DURATION_MS / 1000);
  const secondsLeft = Math.max(1, Math.ceil(secondsRemaining - 0.05));
  const circumference = 2 * Math.PI * 44;
  const strokeOffset = circumference * (1 - holdProgress);

  // Border style based on state
  const borderClass = showCaptureFlash
    ? 'ring-4 ring-green-400 shadow-[0_0_40px_rgba(34,197,94,0.6)]'
    : isHolding
      ? 'ring-3 ring-green-400 shadow-[0_0_30px_rgba(34,197,94,0.4)]'
      : isStabilizing
        ? 'ring-2 ring-yellow-400/60 shadow-[0_0_20px_rgba(250,204,21,0.3)]'
        : isOnTarget && (phase === 'tracking' || phase === 'stabilizing' || phase === 'holding')
          ? 'ring-3 ring-green-400 shadow-[0_0_30px_rgba(34,197,94,0.4)]'
          : 'ring-1 ring-white/10';

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-2xl bg-black shadow-xl aspect-[3/4] sm:aspect-video transition-all duration-200 ${borderClass}`}
    >
      {/* Video — CSS-mirrored for selfie view */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
      />

      {/*
        Canvas overlay — ALSO CSS-mirrored so drawing coordinates match raw camera space.
        This eliminates all manual X-flipping in drawing code.
      */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full object-cover pointer-events-none scale-x-[-1]"
      />

      {/* Hold countdown — large ring + seconds on the video feed */}
      {isHolding && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex items-center justify-center">
            <svg width={100} height={100} className="-rotate-90">
              <circle
                cx={50}
                cy={50}
                r={44}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={4}
              />
              <circle
                cx={50}
                cy={50}
                r={44}
                fill="none"
                stroke="#22c55e"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                className="transition-[stroke-dashoffset] duration-100"
              />
            </svg>
            <span className="absolute text-2xl font-semibold text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)] tabular-nums">
              {secondsLeft}
            </span>
          </div>
        </div>
      )}

      {/* Stabilizing indicator */}
      {isStabilizing && !isStable && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-full border border-white/10 bg-black/50 px-5 py-2 backdrop-blur-md">
            <span className="text-xs font-medium tracking-widest uppercase text-yellow-200/90">
              Hold steady
            </span>
          </div>
        </div>
      )}

      {/* Capture flash overlay */}
      {showCaptureFlash && (
        <div className="absolute inset-0 bg-white/30 pointer-events-none animate-[fadeIn_0.1s_ease-out]" />
      )}

      {/* Instruction bar — at TOP with adaptive text */}
      {showInstruction && instruction && (
        <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent px-5 pt-5 pb-12">
          <p
            className="text-center text-[13px] font-medium tracking-[0.04em] uppercase text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] sm:text-sm transition-opacity duration-300"
            key={instruction}
          >
            {instruction}
          </p>
        </div>
      )}
    </div>
  );
}
