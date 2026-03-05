'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { UploadZone } from '@/components/UploadZone';
import { useTypewriter } from '@/lib/useTypewriter';
import { setPendingUpload } from '@/lib/pendingUpload';
import { useAppHaptics } from '@/lib/haptics';

const PhotoMarquee = dynamic(
  () => import('@/components/PhotoMarquee').then((m) => ({ default: m.PhotoMarquee })),
  { ssr: false },
);

const TYPEWRITER_STRINGS = [
  'powered by AI',
  'cropped magically',
  'for your resume',
  'in mere seconds',
  'ready for LinkedIn',
];

function TypewriterText() {
  const text = useTypewriter(TYPEWRITER_STRINGS, {
    typeSpeed: 50,
    deleteSpeed: 30,
    pauseDuration: 2000,
  });
  return <>{text}<span className="animate-pulse">|</span></>;
}

/**
 * Height-stable typewriter container.
 * Uses CSS Grid with all strings in the same cell so the container height
 * equals the tallest rendered string. Prevents layout shifts during typing.
 */
function StableTypewriter() {
  return (
    <span className="relative grid bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 mt-2 w-full max-w-[90vw] break-words leading-relaxed pb-3 text-center [&>*]:col-start-1 [&>*]:row-start-1">
      {/* Invisible height reserves — each occupies the same grid cell */}
      {TYPEWRITER_STRINGS.map((s) => (
        <span key={s} className="invisible select-none" aria-hidden="true">
          {s}
        </span>
      ))}
      {/* Visible typewriter — same grid cell, on top */}
      <span>
        <TypewriterText />
      </span>
    </span>
  );
}

export default function Home() {
  const router = useRouter();
  const { vibrate } = useAppHaptics();

  const handleImageSelected = useCallback(
    (file: File) => {
      vibrate('selection');
      setPendingUpload(file);
      router.push('/edit');
    },
    [router, vibrate],
  );

  return (
    <>
      <section className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex min-h-[40vh] sm:min-h-[50vh] w-full flex-col items-center justify-center py-4 sm:py-10">
          {/* Hero heading */}
          <div className="mb-6 sm:mb-10 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl sm:leading-tight flex flex-col items-center justify-center pt-4 sm:pt-8 overflow-hidden"
            >
              <span className="pb-1">Perfect headshots,</span>
              <StableTypewriter />
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
              className="mx-auto mt-3 sm:mt-6 max-w-xl text-sm text-gray-600 dark:text-gray-400 sm:text-xl hidden sm:block"
            >
              Upload a portrait photo, get an intelligent crop suggestion,
              fine-tune it to your liking, and export at full resolution.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
              className="mx-auto mt-3 max-w-xs text-sm text-gray-600 dark:text-gray-400 sm:hidden"
            >
              Upload a portrait, get an AI crop suggestion, and export.
            </motion.p>
          </div>

          <UploadZone onImageSelected={handleImageSelected} />
        </div>
      </section>

      <PhotoMarquee />
    </>
  );
}
