'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { CropType, CropVariant } from '@/lib/types';
import { useAppHaptics } from '@/lib/haptics';

interface CropTypeSelectorProps {
  crops: CropVariant[];
  selectedType: CropType;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  onSelectCrop: (crop: CropVariant) => void;
}

export function CropTypeSelector({
  crops,
  selectedType,
  imageSrc,
  imageWidth,
  imageHeight,
  onSelectCrop,
}: CropTypeSelectorProps) {
  const { vibrate } = useAppHaptics();

  // Pre-compute clip-path inset values for each crop variant (GPU-accelerated)
  const clipPaths = useMemo(() => {
    const map = new Map<CropType, string>();
    for (const crop of crops) {
      const { x, y, width, height } = crop.cropRegion;
      const top = (y / imageHeight) * 100;
      const right = ((imageWidth - x - width) / imageWidth) * 100;
      const bottom = ((imageHeight - y - height) / imageHeight) * 100;
      const left = (x / imageWidth) * 100;
      map.set(crop.type, `inset(${top}% ${right}% ${bottom}% ${left}%)`);
    }
    return map;
  }, [crops, imageWidth, imageHeight]);

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
    >
      {/* Label */}
      <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
        Crop Preset
      </p>

      {/* Scrollable row */}
      <div
        className="flex gap-2 overflow-x-auto px-3 pt-2.5 pb-2 -mx-2 scrollbar-hide sm:justify-center sm:gap-3"
        role="radiogroup"
        aria-label="Crop preset"
      >
        {crops.map((crop) => {
          const isSelected = selectedType === crop.type;

          return (
            <button
              key={crop.type}
              onClick={() => {
                vibrate('selection');
                onSelectCrop(crop);
              }}
              role="radio"
              aria-checked={isSelected}
              aria-label={crop.label}
              className={`
                group relative flex flex-shrink-0 flex-col items-center gap-1.5 rounded-xl p-1.5 transition-all duration-200
                w-[76px] sm:w-[84px]
                ${isSelected ? 'z-10' : 'hover:bg-white/30 dark:hover:bg-gray-800/40'}
              `}
            >
              {/* Animated pill background (layoutId) */}
              {isSelected && (
                <motion.div
                  layoutId="crop-type-active"
                  className="absolute inset-0 rounded-xl bg-white/60 shadow-sm ring-2 ring-blue-500/60 backdrop-blur-md dark:bg-gray-800/60 dark:ring-blue-400/50"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{ zIndex: 0 }}
                />
              )}

              {/* Full image with crop region highlighted */}
              <div
                className="relative z-10 w-full overflow-hidden rounded-lg border border-white/20 dark:border-gray-700/40"
                style={{ aspectRatio: `${imageWidth} / ${imageHeight}`, maxHeight: '60px' }}
              >
                {/* Dimmed full image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover brightness-[0.35]"
                />
                {/* Bright crop region via clip-path (GPU-accelerated) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ clipPath: clipPaths.get(crop.type) }}
                />
              </div>

              {/* Label */}
              <div className="relative z-10 flex flex-col items-center">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                    isSelected
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {crop.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
