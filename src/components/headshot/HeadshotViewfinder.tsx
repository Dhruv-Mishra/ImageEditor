'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import type { CapturePhase } from '@/lib/headshot/types';
import { HOLD_DURATION_MS } from '@/lib/headshot/types';

/**
 * Production-grade webcam viewfinder with:
 * - Video + overlay canvas
 * - Countdown ring + seconds text overlaid on the feed during hold
 * - Green border flash on capture
 * - Bottom instruction/tip bar
 */
export function HeadshotViewfinder({
  videoRef,
  canvasRef,
  instruction,
  showInstruction,
  holdProgress,
  isOnTarget,
  phase,
  captureCount,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  instruction?: string;
  showInstruction?: boolean;
  holdProgress: number;
  isOnTarget: boolean;
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

  const isHolding = phase === 'holding' && isOnTarget;
  const secondsRemaining = (1 - holdProgress) * (HOLD_DURATION_MS / 1000);
  const secondsLeft = Math.max(1, Math.ceil(secondsRemaining - 0.05));
  const circumference = 2 * Math.PI * 44;
  const strokeOffset = circumference * (1 - holdProgress);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-2xl bg-black shadow-xl aspect-[3/4] sm:aspect-video transition-all duration-200 ${
        showCaptureFlash
          ? 'ring-4 ring-green-400 shadow-[0_0_40px_rgba(34,197,94,0.6)]'
          : isOnTarget && (phase === 'tracking' || phase === 'holding')
            ? 'ring-3 ring-green-400 shadow-[0_0_30px_rgba(34,197,94,0.4)]'
            : 'ring-1 ring-white/10'
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
      />

      {/* Hold countdown — large ring + seconds on the video feed */}
      {isHolding && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex items-center justify-center">
            <svg width={100} height={100} className="-rotate-90">
              <circle
                cx={50} cy={50} r={44}
                fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={4}
              />
              <circle
                cx={50} cy={50} r={44}
                fill="none" stroke="#22c55e" strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                className="transition-[stroke-dashoffset] duration-100"
              />
            </svg>
            <span className="absolute text-3xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tabular-nums">
              {secondsLeft}
            </span>
          </div>
        </div>
      )}

      {/* Capture flash overlay */}
      {showCaptureFlash && (
        <div className="absolute inset-0 bg-white/30 pointer-events-none animate-[fadeIn_0.1s_ease-out]" />
      )}

      {/* Instruction bar — at TOP */}
      {showInstruction && instruction && (
        <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/70 to-transparent px-4 pt-4 pb-10">
          <p className="text-center text-sm font-bold tracking-wide text-white drop-shadow-md sm:text-base">
            {instruction}
          </p>
        </div>
      )}
    </div>
  );
}
