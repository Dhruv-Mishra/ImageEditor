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

  // Pre-compute crop overlay positions as percentages
  const overlays = useMemo(() => {
    const map = new Map<
      CropType,
      { left: string; top: string; width: string; height: string }
    >();
    for (const crop of crops) {
      const { x, y, width, height } = crop.cropRegion;
      map.set(crop.type, {
        left: `${(x / imageWidth) * 100}%`,
        top: `${(y / imageHeight) * 100}%`,
        width: `${(width / imageWidth) * 100}%`,
        height: `${(height / imageHeight) * 100}%`,
      });
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
        className="flex gap-2 overflow-x-auto px-2 py-2 -mx-1 scrollbar-hide sm:justify-center sm:gap-3"
        role="radiogroup"
        aria-label="Crop preset"
      >
        {crops.map((crop) => {
          const isSelected = selectedType === crop.type;
          const overlay = overlays.get(crop.type);

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

              {/* Thumbnail with crop overlay */}
              <div className="relative z-10 w-full overflow-hidden rounded-lg border border-white/20 dark:border-gray-700/40"
                style={{ aspectRatio: `${imageWidth} / ${imageHeight}`, maxHeight: '60px' }}
              >
                {/* Dimmed full image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover brightness-50"
                />

                {/* Bright crop region rectangle */}
                {overlay && (
                  <div
                    className="pointer-events-none absolute border border-blue-400/80 bg-white/10 transition-all duration-200"
                    style={{
                      left: overlay.left,
                      top: overlay.top,
                      width: overlay.width,
                      height: overlay.height,
                    }}
                  >
                    {/* Reveal the cropped portion at full brightness */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc}
                      alt=""
                      draggable={false}
                      className="absolute h-full w-full object-cover"
                      style={{
                        width: `${(imageWidth / crop.cropRegion.width) * 100}%`,
                        height: `${(imageHeight / crop.cropRegion.height) * 100}%`,
                        left: `${-(crop.cropRegion.x / crop.cropRegion.width) * 100}%`,
                        top: `${-(crop.cropRegion.y / crop.cropRegion.height) * 100}%`,
                        maxWidth: 'none',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Label + confidence */}
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                    isSelected
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {crop.label}
                </span>
                <span
                  className={`text-[8px] tabular-nums transition-colors duration-200 ${
                    isSelected
                      ? 'text-blue-500/80 dark:text-blue-300/70'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {Math.round(crop.confidence * 100)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
