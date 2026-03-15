'use client';

import { POSE_SEQUENCE } from '@/lib/headshot/types';

/**
 * Compact step indicator below the viewfinder.
 * The countdown timer is now on the video overlay itself.
 */
export function HeadshotHUD({
  currentStep,
  isOnTarget,
}: {
  currentStep: number;
  holdProgress: number;
  isOnTarget: boolean;
  hasFace: boolean;
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
        {POSE_SEQUENCE.map((pose, i) => (
          <div key={pose.label} className="flex flex-col items-center gap-1">
            <div
              className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                i < currentStep
                  ? 'bg-green-500'
                  : i === currentStep
                    ? isOnTarget
                      ? 'bg-green-500 scale-125'
                      : 'bg-blue-500 scale-110'
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
            <span className={`text-[9px] font-medium transition-colors ${
              i < currentStep
                ? 'text-green-600 dark:text-green-400'
                : i === currentStep
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500'
            }`}>
              {pose.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
