'use client';

import { POSE_SEQUENCE } from '@/lib/headshot/types';
import type { CapturePhase } from '@/lib/headshot/types';

/** Small direction arrow mapped to each pose label. */
const DIRECTION_ICON: Record<string, string> = {
  Left: '\u2190',   // ←
  Right: '\u2192',  // →
  Straight: '\u25CE', // ◎
  Up: '\u2191',     // ↑
  Down: '\u2193',   // ↓
};

/**
 * Compact step indicator below the viewfinder.
 * Shows direction arrows, pose dots with labels, and a step counter.
 */
export function HeadshotHUD({
  currentStep,
  isOnTarget,
  isStable,
  phase,
}: {
  currentStep: number;
  isOnTarget: boolean;
  isStable: boolean;
  phase: CapturePhase;
}) {
  const totalSteps = POSE_SEQUENCE.length;

  return (
    <div className="flex items-center justify-center gap-5">
      {/* Step counter */}
      <span className="text-[11px] font-normal tracking-wide text-gray-400 dark:text-gray-500 tabular-nums">
        {Math.min(currentStep + 1, totalSteps)}<span className="text-gray-300 dark:text-gray-600">/</span>{totalSteps}
      </span>

      {/* Step dots with direction arrows and labels */}
      <div className="flex gap-3.5">
        {POSE_SEQUENCE.map((pose, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;

          let dotClass: string;
          if (isCompleted) {
            dotClass = 'bg-green-500';
          } else if (isCurrent) {
            if (phase === 'holding' && isStable) {
              dotClass = 'bg-green-500 scale-125 animate-pulse';
            } else if (isOnTarget) {
              dotClass = 'bg-green-500 scale-125';
            } else if (phase === 'stabilizing') {
              dotClass = 'bg-yellow-400 scale-110';
            } else {
              dotClass = 'bg-blue-500 scale-110';
            }
          } else {
            dotClass = 'bg-gray-300 dark:bg-gray-600';
          }

          let labelClass: string;
          if (isCompleted) {
            labelClass = 'text-green-600 dark:text-green-400';
          } else if (isCurrent) {
            labelClass = isOnTarget
              ? 'text-green-600 dark:text-green-400'
              : 'text-blue-600 dark:text-blue-400';
          } else {
            labelClass = 'text-gray-400 dark:text-gray-500';
          }

          const arrow = DIRECTION_ICON[pose.label] ?? '';

          return (
            <div key={pose.label} className="flex flex-col items-center gap-0.5">
              {/* Direction arrow — visible only for current step */}
              <span
                className={`text-[10px] leading-none transition-opacity duration-200 ${
                  isCurrent ? `opacity-100 ${labelClass}` : 'opacity-0'
                }`}
              >
                {arrow}
              </span>
              <div
                className={`h-2 w-2 rounded-full transition-all duration-200 ${dotClass}`}
              />
              <span
                className={`text-[8px] uppercase tracking-wider font-normal transition-colors ${labelClass}`}
              >
                {pose.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
