'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
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

  // ---- mobile touch: allow page scroll outside crop selection ----
  // On touch devices, react-image-crop captures all pointer events on the
  // container, which prevents the page from scrolling when a user swipes
  // over the image but outside the crop box. We intercept in the capture
  // phase and stop propagation to ReactCrop for touches that start outside
  // the crop selection / drag handles, so the browser can scroll normally.
  //
  // Also block multi-touch (pinch) entirely — react-image-crop doesn't
  // support two-finger gestures and they cause erratic crop movement.

  const activeTouchCountRef = useRef(0);

  const handlePointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch') return;

      activeTouchCountRef.current += 1;

      // Multi-touch (pinch) → block all interaction so the crop doesn't jitter
      if (activeTouchCountRef.current > 1) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }

      const target = e.target as HTMLElement;
      const isCropInteraction =
        target.closest('.ReactCrop__crop-selection') ||
        target.closest('.ReactCrop__drag-handle');
      if (!isCropInteraction) {
        // Outside crop box — let the browser handle scroll.
        e.stopPropagation();
      }
    },
    [],
  );

  const handlePointerUpCapture = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      activeTouchCountRef.current = Math.max(0, activeTouchCountRef.current - 1);
    },
    [],
  );

  const handlePointerCancelCapture = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      activeTouchCountRef.current = Math.max(0, activeTouchCountRef.current - 1);
    },
    [],
  );

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
    <div className="flex justify-center px-2 sm:px-4 py-2 sm:py-3">
      <div
        className="crop-editor-container relative inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/90 shadow-2xl dark:border-gray-700/40 dark:bg-black/95"
        /* Intercept touch pointerdown in capture phase — block ReactCrop from
           stealing touches that start outside the crop box, so the page can scroll.
           Also blocks multi-touch pinch to prevent crop jitter. */
        onPointerDownCapture={handlePointerDownCapture}
        onPointerUpCapture={handlePointerUpCapture}
        onPointerCancelCapture={handlePointerCancelCapture}
      >
        {/* Inner padding creates the visible dark frame around the image.
            overflow-hidden on this div clips the 9999px box-shadow dimming overlay
            so it doesn't darken the rest of the page. ReactCrop inside is
            overflow-visible so crop handles extend into the frame padding. */}
        <div className="crop-editor-frame p-5 sm:p-6">
          <ReactCrop
            crop={toPercentCrop(crop)}
            onChange={handleCropChange}
            onComplete={handleCropComplete}
            aspect={ASPECT_RATIOS[aspectRatio]}
            className="crop-editor-react-crop"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt="Portrait photo with crop overlay"
              draggable={false}
              className="max-h-[50vh] sm:max-h-[70vh] w-auto rounded-sm"
              style={{ maxWidth: '100%', display: 'block', touchAction: 'pan-y' }}
            />
          </ReactCrop>
        </div>
      </div>
    </div>
  );
}
