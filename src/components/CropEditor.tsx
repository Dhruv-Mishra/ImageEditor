'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { motion } from 'framer-motion';
import 'react-image-crop/dist/ReactCrop.css';
import type { CropRegion, AspectRatioOption } from '@/lib/types';
import { ASPECT_RATIOS } from '@/lib/types';
import { adjustCropToAspect } from '@/lib/cropHeuristic';

interface CropEditorProps {
  imageSrc: string;
  naturalWidth: number;
  naturalHeight: number;
  initialCrop: CropRegion;
  aspectRatio: AspectRatioOption;
  onCropChange: (crop: CropRegion) => void;
}

export function CropEditor({
  imageSrc,
  naturalWidth,
  naturalHeight,
  initialCrop,
  aspectRatio,
  onCropChange,
}: CropEditorProps) {
  const [crop, setCrop] = useState<CropRegion>(initialCrop);
  const cropRef = useRef(crop);
  cropRef.current = crop;

  // ---- coordinate conversion (natural px ↔ percent) ----

  const toPercentCrop = useCallback(
    (region: CropRegion): Crop => ({
      unit: '%',
      x: (region.x / naturalWidth) * 100,
      y: (region.y / naturalHeight) * 100,
      width: (region.width / naturalWidth) * 100,
      height: (region.height / naturalHeight) * 100,
    }),
    [naturalWidth, naturalHeight],
  );

  const fromPercentCrop = useCallback(
    (c: Crop): CropRegion => ({
      x: Math.round((c.x / 100) * naturalWidth),
      y: Math.round((c.y / 100) * naturalHeight),
      width: Math.round((c.width / 100) * naturalWidth),
      height: Math.round((c.height / 100) * naturalHeight),
    }),
    [naturalWidth, naturalHeight],
  );

  // ---- react to aspect-ratio changes ----

  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip adjustment on mount — the initialCrop is already correct
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const numAspect = ASPECT_RATIOS[aspectRatio];
    if (numAspect !== undefined) {
      const adjusted = adjustCropToAspect(
        cropRef.current,
        numAspect,
        naturalWidth,
        naturalHeight,
      );
      setCrop(adjusted);
      onCropChange(adjusted);
    }
    // Only fire when the selected aspect ratio changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspectRatio]);

  // ---- handlers ----

  const handleCropChange = useCallback(
    (_px: PixelCrop, pct: Crop) => {
      const natural = fromPercentCrop(pct);
      setCrop(natural);
      cropRef.current = natural;
    },
    [fromPercentCrop],
  );

  const handleCropComplete = useCallback(
    (_px: PixelCrop, pct: Crop) => {
      const natural = fromPercentCrop(pct);
      setCrop(natural);
      cropRef.current = natural;
      onCropChange(natural);
    },
    [fromPercentCrop, onCropChange],
  );

  // ---- render ----

  return (
    <motion.div
      className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/30 p-2 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/40 sm:p-4"
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Premium subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_20px_rgba(255,255,255,0.2)] dark:shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]" />

      <ReactCrop
        crop={toPercentCrop(crop)}
        onChange={handleCropChange}
        onComplete={handleCropComplete}
        aspect={ASPECT_RATIOS[aspectRatio]}
        ruleOfThirds
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt="Portrait photo with crop overlay"
          draggable={false}
          className="max-h-[70vh] w-auto rounded-lg shadow-inner"
          style={{ maxWidth: '100%', display: 'block' }}
        />
      </ReactCrop>
    </motion.div>
  );
}
