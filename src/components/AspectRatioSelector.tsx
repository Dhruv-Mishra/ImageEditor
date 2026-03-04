'use client';

import { motion } from 'framer-motion';
import type { AspectRatioOption } from '@/lib/types';
import { useAppHaptics } from '@/lib/haptics';

interface AspectRatioSelectorProps {
  value: AspectRatioOption;
  onChange: (ratio: AspectRatioOption) => void;
}

const options: { value: AspectRatioOption; label: string; width: string; height: string; borderClass?: string }[] = [
  { value: '1:1', label: '1:1 Square', width: 'w-6', height: 'h-6' },
  { value: '3:4', label: '3:4 Portrait', width: 'w-5', height: 'h-6' },
  { value: '4:5', label: '4:5 Social', width: 'w-[22px]', height: 'h-6' },
  { value: 'free', label: 'Freeform', width: 'w-6', height: 'h-6', borderClass: 'border-dashed' },
];

export function AspectRatioSelector({
  value,
  onChange,
}: AspectRatioSelectorProps) {
  const { vibrate } = useAppHaptics();

  return (
    <div className="flex flex-col gap-2 mx-auto sm:mx-0 w-full sm:w-auto">
      <div
        className="flex gap-2 p-1 overflow-x-auto scrollbar-hide w-full sm:w-auto"
        role="radiogroup"
        aria-label="Aspect ratio"
      >
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => {
                vibrate('light');
                onChange(opt.value);
              }}
              role="radio"
              aria-checked={isSelected}
              title={opt.label}
              className={`
                group relative flex flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition-all duration-200 flex-1 sm:flex-none min-w-[64px]
                ${isSelected
                  ? 'shadow-sm z-10'
                  : 'hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                }
              `}
            >
              {isSelected && (
                <motion.div
                  layoutId="aspect-active-bg"
                  className="absolute inset-0 rounded-xl bg-white shadow-sm dark:bg-gray-800 ring-1 ring-blue-500/50"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{ zIndex: 0 }}
                />
              )}

              <div className="relative z-10 flex h-8 items-center justify-center">
                <div
                  className={`
                    border-2 rounded-sm transition-colors duration-200
                    ${opt.borderClass || 'border-solid'}
                    ${opt.width} ${opt.height}
                    ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-gray-400 group-hover:border-gray-600 dark:border-gray-500 dark:group-hover:border-gray-300'}
                  `}
                />
              </div>
              <span className={`relative z-10 text-[10px] font-bold tracking-wider transition-colors duration-200 uppercase ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
