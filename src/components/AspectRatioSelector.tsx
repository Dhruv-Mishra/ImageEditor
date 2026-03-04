'use client';

import { motion } from 'framer-motion';
import type { AspectRatioOption } from '@/lib/types';

interface AspectRatioSelectorProps {
  value: AspectRatioOption;
  onChange: (ratio: AspectRatioOption) => void;
}

const options: { value: AspectRatioOption; label: string }[] = [
  { value: '1:1', label: '1:1' },
  { value: '3:4', label: '3:4' },
  { value: '4:5', label: '4:5' },
  { value: 'free', label: 'Free' },
];

export function AspectRatioSelector({
  value,
  onChange,
}: AspectRatioSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Aspect Ratio:
      </span>
      <div
        className="relative flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800"
        role="radiogroup"
        aria-label="Aspect ratio"
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            role="radio"
            aria-checked={value === opt.value}
            aria-label={`${opt.label} aspect ratio`}
            className={`
              relative z-10 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200
              ${
                value === opt.value
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }
            `}
          >
            {value === opt.value && (
              <motion.div
                layoutId="aspect-indicator"
                className="absolute inset-0 rounded-md bg-white shadow-sm dark:bg-gray-700"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{ zIndex: -1 }}
              />
            )}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
