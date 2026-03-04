'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadZone } from '@/components/UploadZone';
import { CropEditor } from '@/components/CropEditor';
import { AspectRatioSelector } from '@/components/AspectRatioSelector';
import { CropTypeSelector } from '@/components/CropTypeSelector';
import { PhotoMarquee } from '@/components/PhotoMarquee';
import { CropHistory } from '@/components/CropHistory';
import Typewriter from 'typewriter-effect';
import type {
  CropRegion,
  AspectRatioOption,
  HistoryEntry,
  MultiCropSuggestion,
  CropVariant,
  CropType,
} from '@/lib/types';
import {
  cropImage,
  downloadBlob,
  downscaleImage,
  scaleToFullRes,
  generateThumbnailDataUrl,
} from '@/lib/imageUtils';
import { saveHistoryEntry, loadHistory, clearHistoryData, deleteHistoryEntry } from '@/lib/db';
import { useAppHaptics } from '@/lib/haptics';

type AppState = 'idle' | 'uploading' | 'editing' | 'exporting';

const fadeVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function Home() {
  const { vibrate } = useAppHaptics();
  const [appState, setAppState] = useState<AppState>('idle');
  const [fullResUrl, setFullResUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [naturalDimensions, setNaturalDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [previewDimensions, setPreviewDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [multiSuggestion, setMultiSuggestion] = useState<MultiCropSuggestion | null>(null);
  const [selectedCropType, setSelectedCropType] = useState<CropType>('portrait');
  const [currentCrop, setCurrentCrop] = useState<CropRegion | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('3:4');
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  // History & sharing state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastExportBlob, setLastExportBlob] = useState<Blob | null>(null);
  const [canShare, setCanShare] = useState(false);

  // Check Web Share API support
  const checkShareSupport = useCallback(() => {
    try {
      setCanShare(typeof navigator.share === 'function');
    } catch {
      setCanShare(false);
    }
  }, []);

  // Load history from IndexedDB on mount
  useEffect(() => {
    loadHistory().then((data) => {
      if (data && data.length > 0) {
        setHistory(data);

        // Handle loading entry from URL if returning from Archive page
        const params = new URLSearchParams(window.location.search);
        const loadId = params.get('load');
        if (loadId) {
          const entryToLoad = data.find(e => e.id === loadId);
          if (entryToLoad) {
            handleLoadFromHistory(entryToLoad);
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Upload & API call ----

  const handleImageSelected = useCallback(
    async (file: File) => {
      vibrate('selection');
      setError(null);
      setAppState('uploading');
      setLastExportBlob(null);
      checkShareSupport();

      try {
        const fullUrl = URL.createObjectURL(file);
        setFullResUrl(fullUrl);

        const downscaled = await downscaleImage(file);
        setPreviewUrl(downscaled.previewUrl);
        setScaleFactor(downscaled.scaleFactor);
        setNaturalDimensions({
          width: downscaled.naturalWidth,
          height: downscaled.naturalHeight,
        });
        setPreviewDimensions({
          width: downscaled.previewWidth,
          height: downscaled.previewHeight,
        });

        const formData = new FormData();
        formData.append('image', downscaled.blob, file.name || 'image.jpg');

        const response = await fetch('/api/crop-suggest', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to get crop suggestion');
        }

        const multiResponse: MultiCropSuggestion = await response.json();
        setMultiSuggestion(multiResponse);

        // Find the default crop variant
        const defaultCrop = multiResponse.crops.find(c => c.type === multiResponse.defaultType) ?? multiResponse.crops[0];
        setSelectedCropType(defaultCrop.type);
        setCurrentCrop(defaultCrop.cropRegion);
        setAspectRatio(defaultCrop.aspectRatio as AspectRatioOption);
        setResetKey(0);
        setAppState('editing');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Something went wrong.',
        );
        setAppState('idle');
      }
    },
    [checkShareSupport, vibrate],
  );

  // ---- Crop interactions ----

  const handleCropChange = useCallback((crop: CropRegion) => {
    setCurrentCrop(crop);
  }, []);

  const handleResetToAi = useCallback(() => {
    vibrate('light');
    if (multiSuggestion) {
      const defaultCrop = multiSuggestion.crops.find(c => c.type === selectedCropType) ?? multiSuggestion.crops[0];
      setCurrentCrop(defaultCrop.cropRegion);
      setAspectRatio(defaultCrop.aspectRatio as AspectRatioOption);
      setResetKey((k) => k + 1);
    }
  }, [multiSuggestion, selectedCropType, vibrate]);

  const handleSelectCropType = useCallback((crop: CropVariant) => {
    setSelectedCropType(crop.type);
    setCurrentCrop(crop.cropRegion);
    setAspectRatio(crop.aspectRatio as AspectRatioOption);
    setResetKey((k) => k + 1);
  }, []);

  // ---- Export ----

  const handleExport = useCallback(async () => {
    if (!currentCrop || !fullResUrl) return;

    vibrate('success');
    setAppState('exporting');
    try {
      const fullResCrop = scaleToFullRes(currentCrop, scaleFactor);
      const blob = await cropImage(fullResUrl, fullResCrop);
      downloadBlob(blob, 'cropped-portrait.jpg');
      setLastExportBlob(blob);

      // Generate thumbnail for history
      const thumbnailDataUrl = await generateThumbnailDataUrl(blob);
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        thumbnailDataUrl,
        dimensions: { width: fullResCrop.width, height: fullResCrop.height },
        timestamp: Date.now(),
        blob,
      };

      const newHistory = [entry, ...history].slice(0, 20);
      setHistory(newHistory);
      saveHistoryEntry(entry); // Save to IndexedDB

      toast.success('Image exported successfully!');
    } catch {
      toast.error('Failed to export image. Please try again.');
    } finally {
      setAppState('editing');
    }
  }, [currentCrop, fullResUrl, scaleFactor, history, vibrate]);

  // ---- Sharing ----

  const handleCopyToClipboard = useCallback(async () => {
    if (!lastExportBlob) return;
    vibrate('selection');
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [lastExportBlob.type]: lastExportBlob }),
      ]);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy. Try downloading instead.');
    }
  }, [lastExportBlob, vibrate]);

  const handleShare = useCallback(async () => {
    if (!lastExportBlob) return;
    vibrate(30);
    try {
      const file = new File([lastExportBlob], 'cropped-portrait.jpg', {
        type: 'image/jpeg',
      });
      await navigator.share({
        title: 'Cropped Portrait',
        files: [file],
      });
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        toast.error('Sharing failed.');
      }
    }
  }, [lastExportBlob, vibrate]);

  // ---- History ----

  const handleClearHistory = useCallback(async () => {
    await clearHistoryData();
    setHistory([]);
  }, []);

  const handleDeleteEntry = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteHistoryEntry(id);
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const handleLoadFromHistory = useCallback(
    (entry: HistoryEntry) => {
      // Reconstitute the blob as a File and pass it exactly as if the user dragged it
      const pseudoFile = new File([entry.blob], `export-${entry.id.slice(0, 8)}.jpg`, {
        type: entry.blob.type,
      });
      // Scroll to top so they see the editor UI
      window.scrollTo({ top: 0, behavior: 'smooth' });
      handleImageSelected(pseudoFile);
    },
    [handleImageSelected]
  );

  // ---- Start over ----

  const handleStartOver = useCallback(() => {
    vibrate('heavy');
    if (fullResUrl) URL.revokeObjectURL(fullResUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAppState('idle');
    setFullResUrl(null);
    setPreviewUrl(null);
    setScaleFactor(1);
    setNaturalDimensions(null);
    setPreviewDimensions(null);
    setMultiSuggestion(null);
    setSelectedCropType('portrait');
    setCurrentCrop(null);
    setAspectRatio('3:4');
    setError(null);
    setResetKey(0);
    setLastExportBlob(null);
  }, [fullResUrl, previewUrl, vibrate]);

  // ---- Render ----

  return (
    <>
      {/* ----  Hero / Editor workspace ---- */}
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400"
              role="alert"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* ---- Idle: hero + upload ---- */}
          {appState === 'idle' && (
            <motion.div
              key="upload"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="flex min-h-[50vh] w-full flex-col items-center justify-center py-6 sm:py-10"
            >
              {/* Hero heading */}
              <div className="mb-10 text-center">
                <motion.h1
                  initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl sm:leading-tight min-h-[180px] sm:min-h-[180px] flex flex-col items-center justify-center pt-8"
                >
                  <span className="pb-1">Perfect headshots,</span>
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 mt-2 block min-h-[2.5em] sm:min-h-[1.5em] w-full max-w-[90vw] break-words leading-relaxed pb-3">
                    <Typewriter
                      options={{
                        strings: [
                          'powered by AI',
                          'cropped magically',
                          'for your resume',
                          'in mere seconds',
                          'ready for LinkedIn'
                        ],
                        autoStart: true,
                        loop: true,
                        delay: 50,
                        deleteSpeed: 30,
                      }}
                    />
                  </span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
                  className="mx-auto mt-6 max-w-xl text-lg text-gray-600 dark:text-gray-400 sm:text-xl"
                >
                  Upload a portrait photo, get an intelligent crop suggestion,
                  fine-tune it to your liking, and export at full resolution.
                </motion.p>
              </div>

              <UploadZone onImageSelected={handleImageSelected} />
            </motion.div>
          )}

          {/* ---- Uploading: skeleton ---- */}
          {appState === 'uploading' && (
            <motion.div
              key="loading"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="flex min-h-[50vh] w-full flex-col items-center justify-center space-y-6 py-6 sm:py-10"
            >
              <div className="flex w-full min-h-[280px] max-w-2xl items-center justify-center overflow-hidden rounded-3xl bg-gray-100/50 shadow-sm backdrop-blur-sm dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-gray-800">
                <div className="flex w-full items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                          className="h-5 w-5 text-blue-600 dark:text-blue-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      AI is analyzing your photo&hellip;
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex w-full max-w-2xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                <div className="flex gap-3">
                  <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                  <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                  <div className="h-10 w-40 animate-pulse rounded-lg bg-blue-200 dark:bg-blue-900/40" />
                </div>
              </div>
            </motion.div>
          )}

          {/* ---- Editor ---- */}
          {(appState === 'editing' || appState === 'exporting') &&
            previewUrl &&
            previewDimensions &&
            currentCrop &&
            multiSuggestion && (
              <motion.div
                key="editor"
                variants={fadeVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <CropEditor
                  key={resetKey}
                  imageSrc={previewUrl}
                  naturalWidth={previewDimensions.width}
                  naturalHeight={previewDimensions.height}
                  initialCrop={currentCrop}
                  aspectRatio={aspectRatio}
                  onCropChange={handleCropChange}
                />

                {/* Crop type thumbnails bar */}
                <CropTypeSelector
                  crops={multiSuggestion.crops}
                  selectedType={selectedCropType}
                  imageSrc={previewUrl}
                  imageWidth={previewDimensions.width}
                  imageHeight={previewDimensions.height}
                  onSelectCrop={handleSelectCropType}
                />

                {/* Floating Controls bar */}
                <div className="sticky bottom-6 z-40 mx-auto mt-6 flex w-full flex-col gap-4 rounded-3xl border border-white/20 bg-white/70 p-4 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/70 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <AspectRatioSelector
                    value={aspectRatio}
                    onChange={setAspectRatio}
                  />

                  <div className="flex flex-wrap gap-2">
                    <motion.button
                      onClick={handleResetToAi}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="rounded-full border border-blue-300/50 bg-blue-50/50 px-5 py-2.5 text-sm font-medium text-blue-600 shadow-sm backdrop-blur-sm transition-all hover:bg-blue-100/50 hover:shadow-md dark:border-blue-700/50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-800/50"
                    >
                      Reset to AI
                    </motion.button>
                    <motion.button
                      onClick={handleExport}
                      disabled={appState === 'exporting'}
                      initial={{ scale: 1 }}
                      whileHover={{ scale: 1.05, boxShadow: "0px 10px 20px rgba(79, 70, 229, 0.4)" }}
                      whileTap={{ scale: 0.95 }}
                      className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:from-blue-500 dark:to-indigo-500"
                    >
                      {appState === 'exporting'
                        ? 'Exporting\u2026'
                        : 'Export'}
                    </motion.button>
                    <motion.button
                      onClick={handleStartOver}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="rounded-full border border-red-300/50 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-600 shadow-sm backdrop-blur-sm transition-all hover:bg-red-100/80 hover:shadow-md dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60"
                    >
                      Clear Image
                    </motion.button>
                  </div>
                </div>

                {/* Share bar (visible after first export) */}
                <AnimatePresence>
                  {lastExportBlob && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap items-center gap-2 overflow-hidden rounded-lg border border-green-200 bg-green-50/50 p-3 dark:border-green-900/40 dark:bg-green-950/20"
                    >
                      <span className="mr-1 text-sm font-medium text-green-700 dark:text-green-400">
                        Exported!
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleCopyToClipboard}
                        className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                          />
                        </svg>
                        Copy
                      </motion.button>
                      {canShare && (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={handleShare}
                          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                            />
                          </svg>
                          Share
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          if (lastExportBlob)
                            downloadBlob(lastExportBlob, 'cropped-portrait.jpg');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                          />
                        </svg>
                        Download Again
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Crop metadata */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="mx-auto max-w-4xl rounded-xl bg-white/60 p-4 text-sm text-gray-500 shadow-sm backdrop-blur-md dark:bg-gray-900/60 dark:text-gray-400"
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      Crop: {currentCrop.width} &times; {currentCrop.height}px
                    </span>
                    <span>
                      Position: ({currentCrop.x}, {currentCrop.y})
                    </span>
                    {scaleFactor > 1 && (
                      <span className="font-medium text-green-600 dark:text-green-400">
                        Export:{' '}
                        {Math.round(currentCrop.width * scaleFactor)} &times;{' '}
                        {Math.round(currentCrop.height * scaleFactor)}px
                      </span>
                    )}
                    <span className="text-blue-500">
                      AI confidence:{' '}
                      {Math.round((multiSuggestion.crops.find(c => c.type === selectedCropType)?.confidence ?? 0.85) * 100)}%
                    </span>
                  </div>
                </motion.div>

                {/* Inline Archive for Editor View */}
                {history.length > 0 && (
                  <div className="mt-8">
                    <CropHistory
                      entries={history}
                      onSelect={handleLoadFromHistory}
                      onClear={handleClearHistory}
                      onDelete={handleDeleteEntry}
                    />
                  </div>
                )}
              </motion.div>
            )}
        </AnimatePresence>
      </section>

      {/* ---- Photo Marquee (only idle) ---- */}
      <AnimatePresence>
        {appState === 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <PhotoMarquee />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
