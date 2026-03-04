'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  SessionData,
} from '@/lib/types';
import {
  cropImage,
  downloadBlob,
  downscaleImage,
  scaleToFullRes,
  generateThumbnailDataUrl,
} from '@/lib/imageUtils';
import {
  saveHistoryEntry,
  loadHistory,
  clearHistoryData,
  deleteHistoryEntry,
  saveSession,
  loadSession,
  clearSession,
  loadAllSessions,
} from '@/lib/db';
import { consumePendingUpload } from '@/lib/pendingUpload';
import { useAppHaptics } from '@/lib/haptics';

const ACTIVE_SESSION_KEY = 'cropai_active_session_id';

/** Secure-context-safe UUID v4 generator (works on HTTP mobile too). */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (e.g. mobile over HTTP)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

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

  // Refs to track object URLs for cleanup on unmount / re-upload
  const fullResUrlRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // History & sharing state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastExportBlob, setLastExportBlob] = useState<Blob | null>(null);
  const [canShare, setCanShare] = useState(false);

  // Refs for session persistence (keep blob references without re-renders)
  const fullResBlobRef = useRef<Blob | null>(null);
  const previewBlobRef = useRef<Blob | null>(null);
  const sessionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRestoredRef = useRef(false);
  const persistenceInitRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const sessionCreatedAtRef = useRef<number>(0);
  const sessionThumbnailRef = useRef<string | null>(null);

  // Check Web Share API support
  const checkShareSupport = useCallback(() => {
    try {
      setCanShare(typeof navigator.share === 'function');
    } catch {
      setCanShare(false);
    }
  }, []);

  // ---- Session persistence helpers ----

  /** Build a SessionData object from current state + blob refs. */
  const buildSessionData = useCallback((): SessionData | null => {
    if (
      !sessionIdRef.current ||
      !fullResBlobRef.current ||
      !previewBlobRef.current ||
      !naturalDimensions ||
      !previewDimensions ||
      !multiSuggestion ||
      !currentCrop
    )
      return null;

    return {
      id: sessionIdRef.current,
      imageBlob: fullResBlobRef.current,
      previewBlob: previewBlobRef.current,
      scaleFactor,
      naturalWidth: naturalDimensions.width,
      naturalHeight: naturalDimensions.height,
      previewWidth: previewDimensions.width,
      previewHeight: previewDimensions.height,
      multiSuggestion,
      selectedCropType,
      currentCrop,
      aspectRatio,
      thumbnailDataUrl: sessionThumbnailRef.current ?? undefined,
      createdAt: sessionCreatedAtRef.current || Date.now(),
    };
  }, [
    scaleFactor,
    naturalDimensions,
    previewDimensions,
    multiSuggestion,
    selectedCropType,
    currentCrop,
    aspectRatio,
  ]);

  /** Debounced session save — 300ms after last change. */
  const debouncedSaveSession = useCallback(() => {
    if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
    sessionSaveTimerRef.current = setTimeout(() => {
      const data = buildSessionData();
      if (data) saveSession(data);
    }, 300);
  }, [buildSessionData]);

  /**
   * Flush-save the session with a fresh thumbnail generated from the current
   * crop region. Called on every "exit" — Home, page switch, tab close, etc.
   */
  const flushSessionWithThumbnail = useCallback(async () => {
    if (!sessionIdRef.current || !previewBlobRef.current || !currentCrop) return;
    // Cancel any pending debounced save
    if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
    try {
      // Crop the preview image to the current crop region, then generate a thumbnail
      const previewUrl = URL.createObjectURL(previewBlobRef.current);
      try {
        const croppedBlob = await cropImage(previewUrl, currentCrop, 'image/jpeg', 0.9);
        const thumb = await generateThumbnailDataUrl(croppedBlob, 480);
        sessionThumbnailRef.current = thumb;
      } finally {
        URL.revokeObjectURL(previewUrl);
      }
    } catch { /* keep existing thumbnail on failure */ }
    const data = buildSessionData();
    if (data) await saveSession(data);
  }, [buildSessionData, currentCrop]);

  // Persist session when editing state changes
  // IMPORTANT: Skip the first run (mount) so we don't remove a localStorage key
  // that the restore-on-mount effect needs to read.
  useEffect(() => {
    if (!persistenceInitRef.current) {
      persistenceInitRef.current = true;
      return;
    }
    if (appState === 'editing' && sessionIdRef.current) {
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionIdRef.current);
      debouncedSaveSession();
    } else if (appState === 'idle') {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
    // Notify other components (e.g. MobileNav) that session state changed
    try {
      window.dispatchEvent(new CustomEvent('cropai:session-changed'));
    } catch { /* SSR guard */ }
  }, [
    appState,
    currentCrop,
    selectedCropType,
    aspectRatio,
    debouncedSaveSession,
  ]);

  // ---- Restore session helper (reusable for mount + event-driven restore) ----
  const restoreSessionById = useCallback(async (sessionId: string) => {
    let session: SessionData | null = null;
    try {
      session = await loadSession(sessionId);
    } catch {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      toast.error('Could not access session storage. Please try uploading again.');
      return;
    }
    if (!session) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      toast.error('Session not found — it may have been deleted.');
      return;
    }
    try {
      // Revoke any existing object URLs
      if (fullResUrlRef.current) URL.revokeObjectURL(fullResUrlRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);

      sessionIdRef.current = session.id;
      sessionCreatedAtRef.current = session.createdAt;
      sessionThumbnailRef.current = session.thumbnailDataUrl ?? null;
      const fullUrl = URL.createObjectURL(session.imageBlob);
      const prevUrl = URL.createObjectURL(session.previewBlob);
      fullResUrlRef.current = fullUrl;
      previewUrlRef.current = prevUrl;
      fullResBlobRef.current = session.imageBlob;
      previewBlobRef.current = session.previewBlob;
      setFullResUrl(fullUrl);
      setPreviewUrl(prevUrl);
      setScaleFactor(session.scaleFactor);
      setNaturalDimensions({
        width: session.naturalWidth,
        height: session.naturalHeight,
      });
      setPreviewDimensions({
        width: session.previewWidth,
        height: session.previewHeight,
      });
      setMultiSuggestion(session.multiSuggestion);
      setSelectedCropType(session.selectedCropType);
      setCurrentCrop(session.currentCrop);
      setAspectRatio(session.aspectRatio);
      setError(null);
      setLastExportBlob(null);
      setAppState('editing');
    } catch {
      clearSession(sessionId);
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      toast.error('Failed to restore session. Please upload your image again.');
    }
  }, []);

  // ---- Restore session on mount ----
  useEffect(() => {
    if (sessionRestoredRef.current) return;
    sessionRestoredRef.current = true;

    // If there's a ?load= param, skip session restore (history load takes priority)
    const params = new URLSearchParams(window.location.search);
    if (params.get('load')) return;

    const activeSessionId = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!activeSessionId) return;

    restoreSessionById(activeSessionId);
  }, [restoreSessionById]);

  // ---- Listen for external session-restore requests (e.g. from Archive "Continue") ----
  const restoreSessionRef = useRef(restoreSessionById);
  useEffect(() => { restoreSessionRef.current = restoreSessionById; }, [restoreSessionById]);

  useEffect(() => {
    const handler = (e: Event) => {
      const sessionId = (e as CustomEvent<string>).detail;
      if (sessionId) restoreSessionRef.current(sessionId);
    };
    window.addEventListener('cropai:restore-session', handler);
    return () => window.removeEventListener('cropai:restore-session', handler);
  }, []);

  // Load history from IndexedDB on mount + handle pending upload from /edit page
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

    // Check for a file handed off from the /edit page
    const pendingFile = consumePendingUpload();
    if (pendingFile) {
      handleImageSelected(pendingFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the cropped thumbnail continuously fresh (1s debounce on crop changes)
  useEffect(() => {
    if (appState !== 'editing' || !previewBlobRef.current || !currentCrop) return;
    if (thumbUpdateTimerRef.current) clearTimeout(thumbUpdateTimerRef.current);
    thumbUpdateTimerRef.current = setTimeout(async () => {
      try {
        const url = URL.createObjectURL(previewBlobRef.current!);
        try {
          const cropped = await cropImage(url, currentCrop, 'image/jpeg', 0.9);
          const thumb = await generateThumbnailDataUrl(cropped, 480);
          sessionThumbnailRef.current = thumb;
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch { /* ignore */ }
    }, 1000);
    return () => {
      if (thumbUpdateTimerRef.current) clearTimeout(thumbUpdateTimerRef.current);
    };
  }, [appState, currentCrop]);

  // Cleanup object URLs on unmount + synchronous session flush
  const buildSessionDataRef = useRef(buildSessionData);
  useEffect(() => { buildSessionDataRef.current = buildSessionData; }, [buildSessionData]);

  useEffect(() => {
    return () => {
      // Flush session synchronously on unmount (any navigation away)
      if (sessionIdRef.current) {
        if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
        if (thumbUpdateTimerRef.current) clearTimeout(thumbUpdateTimerRef.current);
        const data = buildSessionDataRef.current();
        if (data) saveSession(data);
      }
      if (fullResUrlRef.current) URL.revokeObjectURL(fullResUrlRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  // Persist session on page-switch (visibilitychange) and tab/window close (beforeunload)
  const flushRef = useRef(flushSessionWithThumbnail);
  useEffect(() => { flushRef.current = flushSessionWithThumbnail; }, [flushSessionWithThumbnail]);

  useEffect(() => {
    const onBeforeUnload = () => {
      // Synchronous best-effort: save with current thumbnail (can't await in beforeunload)
      if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
      const data = buildSessionData();
      if (data) saveSession(data);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && sessionIdRef.current) {
        flushRef.current();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [buildSessionData]);

  // ---- Upload & API call ----

  const handleImageSelected = useCallback(
    async (file: File) => {
      vibrate('selection');
      setError(null);
      setAppState('uploading');
      setLastExportBlob(null);
      checkShareSupport();

      try {
        // Revoke old object URLs to prevent memory leaks on re-upload
        if (fullResUrlRef.current) URL.revokeObjectURL(fullResUrlRef.current);
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);

        const fullUrl = URL.createObjectURL(file);
        fullResUrlRef.current = fullUrl;
        setFullResUrl(fullUrl);
        fullResBlobRef.current = file;

        const downscaled = await downscaleImage(file);
        previewUrlRef.current = downscaled.previewUrl;
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
        previewBlobRef.current = downscaled.blob;

        // Send the downscaled preview (max 1200px) for faster upload & inference.
        // The backend returns coordinates in the dimensions it receives, which
        // already match the preview space — no extra scaling needed.
        const formData = new FormData();
        formData.append('image', downscaled.blob, file.name || 'image.jpg');

        let response: Response;
        try {
          response = await fetch('/api/crop-suggest', {
            method: 'POST',
            body: formData,
          });
        } catch {
          throw new Error(
            'The crop detection service is temporarily unavailable. Please try again in a moment.',
          );
        }

        if (!response.ok) {
          let detail: string | undefined;
          try {
            const data = await response.json();
            detail =
              typeof data.detail === 'string'
                ? data.detail
                : typeof data.error === 'string'
                  ? data.error
                  : undefined;
          } catch {
            /* response wasn't JSON */
          }

          if (response.status === 422 && detail?.toLowerCase().includes('no person')) {
            throw new Error(
              "We couldn't detect a person in this image. Please try a photo with a clearly visible person.",
            );
          }
          if (response.status === 400) {
            throw new Error(
              "The file you uploaded doesn't appear to be a valid image.",
            );
          }
          if (response.status === 500) {
            throw new Error(
              'Something went wrong while analyzing your image. Please try again.',
            );
          }
          throw new Error(
            detail || 'Failed to get crop suggestion. Please try again.',
          );
        }

        const multiResponse: MultiCropSuggestion = await response.json();

        // Backend received the downscaled preview, so its coordinates are
        // already in preview-pixel space — use them directly.
        setMultiSuggestion(multiResponse);

        // Find the default crop variant
        const defaultCrop = multiResponse.crops.find(c => c.type === multiResponse.defaultType) ?? multiResponse.crops[0];
        setSelectedCropType(defaultCrop.type);
        setCurrentCrop(defaultCrop.cropRegion);
        setAspectRatio(defaultCrop.aspectRatio as AspectRatioOption);
        setResetKey(0);
        // Save the current active session with fresh thumbnail before starting a new one
        if (sessionIdRef.current) {
          try { await flushSessionWithThumbnail(); } catch { /* ignore */ }
        }
        sessionIdRef.current = generateUUID();
        sessionCreatedAtRef.current = Date.now();

        // Generate thumbnail and immediately save session to IndexedDB
        // Use 480px for session cards (higher res for archive grid + retina displays)
        const sessionThumbnail = await generateThumbnailDataUrl(file, 480);
        sessionThumbnailRef.current = sessionThumbnail;
        const initialSessionData: SessionData = {
          id: sessionIdRef.current,
          imageBlob: file,
          previewBlob: downscaled.blob,
          scaleFactor: downscaled.scaleFactor,
          naturalWidth: downscaled.naturalWidth,
          naturalHeight: downscaled.naturalHeight,
          previewWidth: downscaled.previewWidth,
          previewHeight: downscaled.previewHeight,
          multiSuggestion: multiResponse,
          selectedCropType: defaultCrop.type,
          currentCrop: defaultCrop.cropRegion,
          aspectRatio: defaultCrop.aspectRatio as AspectRatioOption,
          thumbnailDataUrl: sessionThumbnail,
          createdAt: sessionCreatedAtRef.current,
        };
        saveSession(initialSessionData);
        localStorage.setItem(ACTIVE_SESSION_KEY, sessionIdRef.current);

        setAppState('editing');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Something went wrong.',
        );
        setAppState('idle');
      }
    },
    [checkShareSupport, vibrate, flushSessionWithThumbnail],
  );

  // ---- Crop interactions ----

  const handleCropChange = useCallback((crop: CropRegion) => {
    setCurrentCrop(crop);
  }, []);

  const handleResetToAi = useCallback(() => {
    vibrate('light');
    if (multiSuggestion) {
      const defaultCrop = multiSuggestion.crops.find(c => c.type === multiSuggestion.defaultType) ?? multiSuggestion.crops[0];
      setSelectedCropType(defaultCrop.type);
      setCurrentCrop(defaultCrop.cropRegion);
      setAspectRatio(defaultCrop.aspectRatio as AspectRatioOption);
    }
  }, [multiSuggestion, vibrate]);

  const handleSelectCropType = useCallback((crop: CropVariant) => {
    setSelectedCropType(crop.type);
    setCurrentCrop(crop.cropRegion);
    setAspectRatio(crop.aspectRatio as AspectRatioOption);
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
        id: generateUUID(),
        thumbnailDataUrl,
        dimensions: { width: fullResCrop.width, height: fullResCrop.height },
        timestamp: Date.now(),
        blob,
      };

      setHistory(prev => [entry, ...prev].slice(0, 20));
      saveHistoryEntry(entry); // Save to IndexedDB

      toast.success('Image exported successfully!');
    } catch {
      toast.error('Failed to export image. Please try again.');
    } finally {
      setAppState('editing');
    }
  }, [currentCrop, fullResUrl, scaleFactor, vibrate]);

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

    // Revoke object URLs safely — never let a thrown error block state reset
    try {
      if (fullResUrl) URL.revokeObjectURL(fullResUrl);
    } catch { /* ignore */ }
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    } catch { /* ignore */ }
    fullResUrlRef.current = null;
    previewUrlRef.current = null;

    // Clear session persistence
    if (sessionIdRef.current) clearSession(sessionIdRef.current);
    sessionIdRef.current = null;
    sessionCreatedAtRef.current = 0;
    sessionThumbnailRef.current = null;
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    fullResBlobRef.current = null;
    previewBlobRef.current = null;

    // Reset all state back to idle
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

    // Scroll to top so the user sees the homepage hero
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Notify nav components that the session is gone
    try {
      window.dispatchEvent(new CustomEvent('cropai:session-changed'));
    } catch { /* SSR guard */ }
  }, [fullResUrl, previewUrl, vibrate]);

  /** Navigate to idle view — session remains in IndexedDB for resume via Edit. */
  const handleGoHome = useCallback(async () => {
    // Flush-save the session with a fresh thumbnail
    await flushSessionWithThumbnail();

    // Clear the active-session flag so nav highlights Home correctly
    localStorage.removeItem(ACTIVE_SESSION_KEY);

    // Transition to idle view
    setAppState('idle');
    setLastExportBlob(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Notify nav components
    try {
      window.dispatchEvent(new CustomEvent('cropai:session-changed'));
    } catch { /* SSR guard */ }
  }, [flushSessionWithThumbnail]);

  // Keep a stable ref to the latest handleGoHome so the event listener never has gaps
  const handleGoHomeRef = useRef(handleGoHome);
  useEffect(() => { handleGoHomeRef.current = handleGoHome; }, [handleGoHome]);

  // Stable go-home event listener — never re-subscribes, no gaps
  useEffect(() => {
    const handler = () => handleGoHomeRef.current();
    window.addEventListener('cropai:go-home', handler);
    return () => window.removeEventListener('cropai:go-home', handler);
  }, []);

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
                  className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl sm:leading-tight min-h-[180px] sm:min-h-[180px] flex flex-col items-center justify-center pt-8 overflow-hidden"
                >
                  <span className="pb-1">Perfect headshots,</span>
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 mt-2 block min-h-[1.4em] w-full max-w-[90vw] break-words leading-relaxed pb-3 text-center">
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
          {(appState === 'editing' || appState === 'exporting') && (
              <motion.div
                key="editor"
                variants={fadeVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {previewUrl && previewDimensions && currentCrop && multiSuggestion && (
                <>
                <CropEditor
                  key={resetKey}
                  imageSrc={previewUrl}
                  naturalWidth={previewDimensions.width}
                  naturalHeight={previewDimensions.height}
                  initialCrop={currentCrop}
                  aspectRatio={aspectRatio}
                  externalCrop={currentCrop}
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

                  <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
                    <motion.button
                      onClick={handleResetToAi}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="rounded-full border border-blue-300/50 bg-blue-50/50 px-5 py-2.5 text-sm font-medium text-blue-600 shadow-sm backdrop-blur-sm transition-all hover:bg-blue-100/50 hover:shadow-md dark:border-blue-700/50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-800/50"
                    >
                      Reset
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
                      className="rounded-full border border-red-300/50 bg-red-50 p-2.5 text-red-600 shadow-sm backdrop-blur-sm transition-all hover:bg-red-100/80 hover:shadow-md dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60"
                      aria-label="Clear image"
                      title="Clear image"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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
                </>
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
