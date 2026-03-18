'use client';

import { POSE_SEQUENCE } from '@/lib/headshot/types';
import type { CapturePhase } from '@/lib/headshot/types';

/**
 * Compact step indicator below the viewfinder.
 * Shows pose dots with labels and indicates current state visually.
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
    <div className="flex items-center justify-center gap-4">
      {/* Step counter */}
      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tabular-nums">
        {Math.min(currentStep + 1, totalSteps)}/{totalSteps}
      </span>

      {/* Step dots with labels */}
      <div className="flex gap-3">
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

          return (
            <div key={pose.label} className="flex flex-col items-center gap-1">
              <div
                className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${dotClass}`}
              />
              <span
                className={`text-[9px] font-medium transition-colors ${labelClass}`}
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
