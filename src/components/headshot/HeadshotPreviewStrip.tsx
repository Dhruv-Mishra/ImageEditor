'use client';

import type { CapturedFrame } from '@/lib/headshot/types';

/**
 * Thumbnail strip showing captured frames. Pure CSS, no animation library.
 */
export function HeadshotPreviewStrip({ frames }: { frames: CapturedFrame[] }) {
  if (frames.length === 0) return null;

  return (
    <div className="flex gap-3 justify-center flex-wrap">
      {frames.map((frame, i) => (
        <div key={i} className="relative animate-[fadeIn_0.3s_ease-out]">
          <img
            src={frame.dataUrl}
            alt={`Captured: ${frame.poseLabel}`}
            className="h-20 w-20 rounded-lg object-cover border-2 border-green-500 shadow-md sm:h-24 sm:w-24"
          />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            {frame.poseLabel}
          </span>
        </div>
      ))}
    </div>
  );
}
