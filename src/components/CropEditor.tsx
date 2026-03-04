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
  /** When set externally (e.g. crop-preset change), the editor adopts this crop without remounting. */
  externalCrop?: CropRegion | null;
  onCropChange: (crop: CropRegion) => void;
}

export function CropEditor({
  imageSrc,
  naturalWidth,
  naturalHeight,
  initialCrop,
  aspectRatio,
  externalCrop,
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

  // ---- react to aspect-ratio OR external crop-preset changes ----

  const isFirstRender = useRef(true);
  const prevAspectRef = useRef(aspectRatio);
  const prevExternalCropRef = useRef<CropRegion | null | undefined>(externalCrop);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevAspectRef.current = aspectRatio;
      prevExternalCropRef.current = externalCrop;
      return;
    }

    const externalChanged = externalCrop !== prevExternalCropRef.current;
    const aspectChanged = aspectRatio !== prevAspectRef.current;

    prevExternalCropRef.current = externalCrop;
    prevAspectRef.current = aspectRatio;

    // External crop preset takes priority — its coordinates already match its aspect ratio
    if (externalChanged && externalCrop) {
      setCrop(externalCrop);
      cropRef.current = externalCrop;
      return;
    }

    // Aspect-only change (user toggled aspect ratio selector) → adjust current crop
    if (aspectChanged) {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalCrop, aspectRatio]);

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
      className="relative inline-flex items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/80 shadow-2xl dark:border-gray-700/50 dark:bg-gray-900/80"
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <ReactCrop
        crop={toPercentCrop(crop)}
        onChange={handleCropChange}
        onComplete={handleCropComplete}
        aspect={ASPECT_RATIOS[aspectRatio]}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt="Portrait photo with crop overlay"
          draggable={false}
          className="max-h-[75vh] w-auto"
          style={{ maxWidth: '100%', display: 'block' }}
        />
      </ReactCrop>
    </motion.div>
  );
}
