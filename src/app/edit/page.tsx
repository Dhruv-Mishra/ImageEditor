'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { UploadZone } from '@/components/UploadZone';
import { AspectRatioSelector } from '@/components/AspectRatioSelector';

const CropEditor = dynamic(
  () => import('@/components/CropEditor').then((m) => ({ default: m.CropEditor })),
  { ssr: false, loading: () => <div className="animate-pulse h-96 rounded-2xl bg-gray-200 dark:bg-gray-800" /> },
);
const CropTypeSelector = dynamic(
  () => import('@/components/CropTypeSelector').then((m) => ({ default: m.CropTypeSelector })),
  { ssr: false },
);
const CropHistory = dynamic(
  () => import('@/components/CropHistory').then((m) => ({ default: m.CropHistory })),
  { ssr: false },
);

import type {
  CropRegion,
  AspectRatioOption,
  HistoryEntry,
  MultiCropSuggestion,
  CropVariant,
  CropType,
  SessionData,
} from '@/lib/types';
import { ASPECT_RATIOS } from '@/lib/types';
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
import {
  saveVectorEntry,
  loadVectorEntry,
  extractTags,
  composeEmbeddingText,
  type VectorEntry,
} from '@/lib/vectorDb';

const ACTIVE_SESSION_KEY = 'cropai_active_session_id';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

type EditPageState = 'loading' | 'no-session' | 'uploading' | 'editing' | 'exporting';

export default function EditPage() {
  const router = useRouter();
  const { vibrate } = useAppHaptics();

  const [pageState, setPageState] = useState<EditPageState>('loading');
  const [fullResUrl, setFullResUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [previewDimensions, setPreviewDimensions] = useState<{ width: number; height: number } | null>(null);
  const [multiSuggestion, setMultiSuggestion] = useState<MultiCropSuggestion | null>(null);
  const [selectedCropType, setSelectedCropType] = useState<CropType>('portrait');
  const [currentCrop, setCurrentCrop] = useState<CropRegion | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('3:4');
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const fullResUrlRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastExportBlob, setLastExportBlob] = useState<Blob | null>(null);
  const [canShare, setCanShare] = useState(false);

  const fullResBlobRef = useRef<Blob | null>(null);
  const previewBlobRef = useRef<Blob | null>(null);
  const sessionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionCreatedAtRef = useRef<number>(0);
  const sessionThumbnailRef = useRef<string | null>(null);

  // AI description state
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [aiDescriptionLoading, setAiDescriptionLoading] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const [skipTypewriter, setSkipTypewriter] = useState(false);
  const typewriterIndexRef = useRef(0);
  const descriptionRequestedRef = useRef(false);
  const fillerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fillerIndexRef = useRef(0);
  const [fillerText, setFillerText] = useState('');
  const fillerTypewriterRef = useRef(0);
  const fillerTargetRef = useRef('');
  const fillerTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(false);
  const persistenceInitRef = useRef(false);

  const checkShareSupport = useCallback(() => {
    try { setCanShare(typeof navigator.share === 'function'); } catch { setCanShare(false); }
  }, []);

  // ---- Filler texts while waiting for AI ----

  const FILLER_TEXTS = useRef([
    'Examining the composition and framing of your portrait...',
    'Studying the lighting, shadows, and tonal balance in the image...',
    'Analyzing facial features, expression, and gaze direction...',
    'Identifying clothing details, textures, and color palette...',
    'Evaluating the background elements and depth of field...',
    'Assessing the overall mood and atmosphere of the portrait...',
    'Detecting pose, posture, and body language cues...',
    'Reviewing skin tones, highlights, and color grading...',
    'Interpreting the visual narrative and setting of the scene...',
    'Preparing a concise description of your portrait...',
  ]).current;

  const TIMEOUT_FALLBACK = 'A portrait photograph showing a person against a neutral background. The subject is positioned centrally with natural lighting.';

  // Start filler typewriter cycling
  const startFillerAnimation = useCallback(() => {
    // Pick a random starting index
    const startIdx = Math.floor(Math.random() * FILLER_TEXTS.length);
    fillerIndexRef.current = startIdx;
    fillerTypewriterRef.current = 0;
    fillerTargetRef.current = FILLER_TEXTS[startIdx];
    setFillerText('');

    // Character-by-character typing
    if (fillerTickRef.current) clearInterval(fillerTickRef.current);
    fillerTickRef.current = setInterval(() => {
      fillerTypewriterRef.current += 1;
      setFillerText(fillerTargetRef.current.slice(0, fillerTypewriterRef.current));
    }, 25);

    // Cycle to next filler every 5.5 seconds
    if (fillerIntervalRef.current) clearInterval(fillerIntervalRef.current);
    fillerIntervalRef.current = setInterval(() => {
      fillerIndexRef.current = (fillerIndexRef.current + 1) % FILLER_TEXTS.length;
      fillerTargetRef.current = FILLER_TEXTS[fillerIndexRef.current];
      fillerTypewriterRef.current = 0;
      setFillerText('');
    }, 5500);
  }, [FILLER_TEXTS]);

  const stopFillerAnimation = useCallback(() => {
    if (fillerIntervalRef.current) { clearInterval(fillerIntervalRef.current); fillerIntervalRef.current = null; }
    if (fillerTickRef.current) { clearInterval(fillerTickRef.current); fillerTickRef.current = null; }
  }, []);

  // ---- AI Description generation ----

  const generateDescription = useCallback(async (imageBlob: Blob): Promise<string | null> => {
    if (descriptionRequestedRef.current) return null;
    descriptionRequestedRef.current = true;
    setAiDescriptionLoading(true);
    setAiDescription(null);
    setTypewriterText('');
    typewriterIndexRef.current = 0;
    startFillerAnimation();

    try {
      // Downscale to ~400px for fast API call
      const canvas = document.createElement('canvas');
      const img = new Image();
      const url = URL.createObjectURL(imageBlob);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load'));
        img.src = url;
      });

      const maxDim = 400;
      const ratio = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
      canvas.width = Math.round(img.naturalWidth * ratio);
      canvas.height = Math.round(img.naturalHeight * ratio);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const lowResBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create low-res blob'))),
          'image/webp',
          0.75,
        );
      });

      const formData = new FormData();
      formData.append('image', lowResBlob, 'preview.webp');

      // Fetch with 60 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);

      let response: Response;
      try {
        response = await fetch('/api/describe', { method: 'POST', body: formData, signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) throw new Error('Description API failed');

      const { description } = await response.json();
      stopFillerAnimation();
      setAiDescription(description);
      return description;
    } catch (err) {
      stopFillerAnimation();
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Timeout — use fallback
        setAiDescription(TIMEOUT_FALLBACK);
        return TIMEOUT_FALLBACK;
      }
      if (process.env.NODE_ENV === 'development') console.error('Description generation failed:', err);
      setAiDescription(TIMEOUT_FALLBACK);
      return TIMEOUT_FALLBACK;
    } finally {
      setAiDescriptionLoading(false);
    }
  }, [startFillerAnimation, stopFillerAnimation]);

  // Typewriter effect: once description arrives, type it character-by-character
  // Unless skipTypewriter is set (active session restore)
  useEffect(() => {
    if (!aiDescription) return;

    if (skipTypewriter) {
      setTypewriterText(aiDescription);
      return;
    }

    typewriterIndexRef.current = 0;
    setTypewriterText('');

    const interval = setInterval(() => {
      typewriterIndexRef.current += 1;
      const nextText = aiDescription.slice(0, typewriterIndexRef.current);
      setTypewriterText(nextText);
      if (typewriterIndexRef.current >= aiDescription.length) {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [aiDescription, skipTypewriter]);

  // Clean up filler timers on unmount
  useEffect(() => {
    return () => {
      stopFillerAnimation();
    };
  }, [stopFillerAnimation]);

  // ---- Embedding generation (runs in background after description) ----

  const generateAndStoreEmbedding = useCallback(async (
    entryId: string,
    description: string,
    metadata: { cropType?: string; aspectRatio?: string; dimensions?: { width: number; height: number }; timestamp?: number },
  ) => {
    try {
      // Check if embedding already exists for this ID
      const existing = await loadVectorEntry(entryId);
      if (existing) return;

      const textToEmbed = composeEmbeddingText(description, metadata);
      const tags = extractTags(description);

      const response = await fetch('/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToEmbed, inputType: 'passage' }),
      });

      if (!response.ok) throw new Error('Embed API failed');

      const { embedding } = await response.json();

      const vectorEntry: VectorEntry = {
        id: entryId,
        text: textToEmbed,
        description,
        tags,
        embedding,
        timestamp: metadata.timestamp ?? Date.now(),
      };

      await saveVectorEntry(vectorEntry);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Embedding generation failed:', err);
    }
  }, []);

  // ---- Session persistence helpers ----

  const buildSessionData = useCallback((): SessionData | null => {
    if (
      !sessionIdRef.current || !fullResBlobRef.current || !previewBlobRef.current ||
      !naturalDimensions || !previewDimensions || !multiSuggestion || !currentCrop
    ) return null;
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
      aiDescription: aiDescription ?? undefined,
      createdAt: sessionCreatedAtRef.current || Date.now(),
    };
  }, [scaleFactor, naturalDimensions, previewDimensions, multiSuggestion, selectedCropType, currentCrop, aspectRatio, aiDescription]);

  const debouncedSaveSession = useCallback(() => {
    if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
    sessionSaveTimerRef.current = setTimeout(() => {
      const data = buildSessionData();
      if (data) saveSession(data);
    }, 300);
  }, [buildSessionData]);

  const flushSessionWithThumbnail = useCallback(async () => {
    if (!sessionIdRef.current || !previewBlobRef.current || !currentCrop) return;
    if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
    try {
      const url = URL.createObjectURL(previewBlobRef.current);
      try {
        const croppedBlob = await cropImage(url, currentCrop, 'image/jpeg', 0.9);
        const thumb = await generateThumbnailDataUrl(croppedBlob, 480);
        sessionThumbnailRef.current = thumb;
      } finally { URL.revokeObjectURL(url); }
    } catch { /* keep existing thumbnail */ }
    const data = buildSessionData();
    if (data) await saveSession(data);
  }, [buildSessionData, currentCrop]);

  // Auto-save when editing state changes
  useEffect(() => {
    if (!persistenceInitRef.current) { persistenceInitRef.current = true; return; }
    if ((pageState === 'editing' || pageState === 'exporting') && sessionIdRef.current) {
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionIdRef.current);
      debouncedSaveSession();
    }
    try { window.dispatchEvent(new CustomEvent('cropai:session-changed')); } catch {}
  }, [pageState, currentCrop, selectedCropType, aspectRatio, debouncedSaveSession]);

  // Keep thumbnail fresh
  useEffect(() => {
    if (pageState !== 'editing' || !previewBlobRef.current || !currentCrop) return;
    if (thumbUpdateTimerRef.current) clearTimeout(thumbUpdateTimerRef.current);
    thumbUpdateTimerRef.current = setTimeout(async () => {
      try {
        const url = URL.createObjectURL(previewBlobRef.current!);
        try {
          const cropped = await cropImage(url, currentCrop, 'image/jpeg', 0.9);
          const thumb = await generateThumbnailDataUrl(cropped, 480);
          sessionThumbnailRef.current = thumb;
        } finally { URL.revokeObjectURL(url); }
      } catch {}
    }, 1000);
    return () => { if (thumbUpdateTimerRef.current) clearTimeout(thumbUpdateTimerRef.current); };
  }, [pageState, currentCrop]);

  // Flush session on unmount
  const buildSessionDataRef = useRef(buildSessionData);
  useEffect(() => { buildSessionDataRef.current = buildSessionData; }, [buildSessionData]);

  useEffect(() => {
    return () => {
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

  // Persist on visibility change / beforeunload
  const flushRef = useRef(flushSessionWithThumbnail);
  useEffect(() => { flushRef.current = flushSessionWithThumbnail; }, [flushSessionWithThumbnail]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
      const data = buildSessionData();
      if (data) saveSession(data);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && sessionIdRef.current) flushRef.current();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [buildSessionData]);

  // ---- Restore session helper ----

  const restoreSessionById = useCallback(async (sessionId: string) => {
    let session: SessionData | null = null;
    try { session = await loadSession(sessionId); } catch {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      toast.error('Could not access session storage.');
      setPageState('no-session');
      return;
    }
    if (!session) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      toast.error('Session not found — it may have been deleted.');
      setPageState('no-session');
      return;
    }
    try {
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
      setNaturalDimensions({ width: session.naturalWidth, height: session.naturalHeight });
      setPreviewDimensions({ width: session.previewWidth, height: session.previewHeight });
      setMultiSuggestion(session.multiSuggestion);
      setSelectedCropType(session.selectedCropType);
      setCurrentCrop(session.currentCrop);
      setAspectRatio(session.aspectRatio);
      setError(null);
      setLastExportBlob(null);
      // Restore AI description if available from the session
      if (session.aiDescription) {
        setSkipTypewriter(true);
        setAiDescription(session.aiDescription);
        descriptionRequestedRef.current = true;
      } else {
        setAiDescription(null);
        descriptionRequestedRef.current = false;
        // Check if embedding already exists before re-generating
        const existingVector = await loadVectorEntry(session.id);
        if (existingVector) {
          // We have the vector entry — just restore the description from it
          setSkipTypewriter(true);
          setAiDescription(existingVector.description);
          descriptionRequestedRef.current = true;
          // Also update the session so it caches the description for next time
          const sd = buildSessionDataRef.current();
          if (sd) {
            sd.aiDescription = existingVector.description;
            saveSession(sd);
          }
        } else {
          // Generate description for restored session that doesn't have one
          generateDescription(session.imageBlob).then((desc) => {
            if (desc && session.id) {
              generateAndStoreEmbedding(session.id, desc, {
                cropType: session.selectedCropType,
                aspectRatio: session.aspectRatio,
                dimensions: { width: session.previewWidth, height: session.previewHeight },
                timestamp: session.createdAt,
              }).then(() => {
                const sd = buildSessionDataRef.current();
                if (sd) saveSession(sd);
              });
            }
          });
        }
      }
      setPageState('editing');
    } catch {
      clearSession(sessionId);
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      toast.error('Failed to restore session.');
      setPageState('no-session');
    }
  }, [generateDescription, generateAndStoreEmbedding]);

  // ---- Mount: check for pending upload or existing session ----

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const init = async () => {
      // 1. Check for a file handed off from the homepage
      const pendingFile = consumePendingUpload();
      if (pendingFile) {
        handleImageSelectedRef.current(pendingFile);
        return;
      }

      // 2. Check for ?load= query param (re-edit a history entry)
      const params = new URLSearchParams(window.location.search);
      const loadId = params.get('load');
      if (loadId) {
        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Load the history entry
        const historyData = await loadHistory();
        if (historyData.length > 0) {
          setHistory(historyData);
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidPattern.test(loadId)) {
            const entry = historyData.find(e => e.id === loadId);
            if (entry) {
              const pseudoFile = new File([entry.blob], `export-${entry.id.slice(0, 8)}.jpg`, { type: entry.blob.type });
              handleImageSelectedRef.current(pseudoFile);
              return;
            }
          }
        }
      }

      // 3. Check localStorage for an active session
      try {
        const activeId = localStorage.getItem(ACTIVE_SESSION_KEY);
        if (activeId) {
          await restoreSessionById(activeId);
          return;
        }
      } catch {}

      // 4. Check IndexedDB for the most recent session
      try {
        const sessions = await loadAllSessions();
        if (sessions.length > 0) {
          await restoreSessionById(sessions[0].id);
          return;
        }
      } catch {}

      // 5. Nothing found — show upload UI
      setPageState('no-session');
    };

    // Load history for the inline archive
    loadHistory().then((data) => {
      if (data && data.length > 0) setHistory(data);
    });

    init();
  }, [restoreSessionById]);

  // Listen for external session-restore requests (from Archive "Continue")
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

  // ---- Upload & API call ----

  const handleImageSelected = useCallback(
    async (file: File) => {
      vibrate('selection');
      setError(null);
      setPageState('uploading');
      setLastExportBlob(null);
      checkShareSupport();

      try {
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
        setNaturalDimensions({ width: downscaled.naturalWidth, height: downscaled.naturalHeight });
        setPreviewDimensions({ width: downscaled.previewWidth, height: downscaled.previewHeight });
        previewBlobRef.current = downscaled.blob;

        const formData = new FormData();
        formData.append('image', downscaled.blob, file.name || 'image.jpg');

        let response: Response;
        try {
          response = await fetch('/api/crop-suggest', { method: 'POST', body: formData });
        } catch {
          throw new Error('The crop detection service is temporarily unavailable. Please try again in a moment.');
        }

        if (!response.ok) {
          let detail: string | undefined;
          try {
            const data = await response.json();
            detail = typeof data.detail === 'string' ? data.detail : typeof data.error === 'string' ? data.error : undefined;
          } catch {}
          if (response.status === 422 && detail?.toLowerCase().includes('no person'))
            throw new Error("We couldn't detect a person in this image. Please try a photo with a clearly visible person.");
          if (response.status === 400) throw new Error("The file you uploaded doesn't appear to be a valid image.");
          if (response.status === 500) throw new Error('Something went wrong while analyzing your image. Please try again.');
          throw new Error(detail || 'Failed to get crop suggestion. Please try again.');
        }

        const multiResponse: MultiCropSuggestion = await response.json();
        setMultiSuggestion(multiResponse);

        const defaultCrop = multiResponse.crops.find(c => c.type === multiResponse.defaultType) ?? multiResponse.crops[0];
        setSelectedCropType(defaultCrop.type);
        setCurrentCrop(defaultCrop.cropRegion);
        setAspectRatio(resolveAspectRatio(defaultCrop));
        setResetKey(0);

        if (sessionIdRef.current) {
          try { await flushSessionWithThumbnail(); } catch {}
        }
        sessionIdRef.current = generateUUID();
        sessionCreatedAtRef.current = Date.now();

        // Start AI description generation + embedding pipeline in background
        descriptionRequestedRef.current = false;
        setAiDescription(null);
        setTypewriterText('');
        setSkipTypewriter(false);
        const currentSessionId = sessionIdRef.current;
        generateDescription(file).then((desc) => {
          if (desc && currentSessionId) {
            generateAndStoreEmbedding(currentSessionId, desc, {
              cropType: defaultCrop.type,
              aspectRatio: resolveAspectRatio(defaultCrop),
              dimensions: { width: downscaled.previewWidth, height: downscaled.previewHeight },
              timestamp: Date.now(),
            }).then(() => {
              // Force a session save now that description + embedding are ready
              const sessionData = buildSessionDataRef.current();
              if (sessionData) saveSession(sessionData);
            });
          }
        });

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
          aspectRatio: resolveAspectRatio(defaultCrop),
          thumbnailDataUrl: sessionThumbnail,
          createdAt: sessionCreatedAtRef.current,
        };
        saveSession(initialSessionData);
        localStorage.setItem(ACTIVE_SESSION_KEY, sessionIdRef.current);
        setPageState('editing');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        setPageState('no-session');
      }
    },
    [checkShareSupport, vibrate, flushSessionWithThumbnail],
  );

  // Stable ref for use in mount effect
  const handleImageSelectedRef = useRef(handleImageSelected);
  useEffect(() => { handleImageSelectedRef.current = handleImageSelected; }, [handleImageSelected]);

  // ---- Crop interactions ----

  const resolveAspectRatio = useCallback((crop: CropVariant): AspectRatioOption => {
    const { width, height } = crop.cropRegion;
    if (width <= 0 || height <= 0) return 'free';
    const actualRatio = width / height;
    const TOLERANCE = 0.05;
    for (const [label, numericRatio] of Object.entries(ASPECT_RATIOS)) {
      if (numericRatio === undefined) continue;
      if (Math.abs(actualRatio - numericRatio) / numericRatio <= TOLERANCE) return label as AspectRatioOption;
    }
    return 'free';
  }, []);

  const handleCropChange = useCallback((crop: CropRegion) => { setCurrentCrop(crop); }, []);

  const handleResetToAi = useCallback(() => {
    vibrate('light');
    if (multiSuggestion) {
      const defaultCrop = multiSuggestion.crops.find(c => c.type === multiSuggestion.defaultType) ?? multiSuggestion.crops[0];
      setSelectedCropType(defaultCrop.type);
      setCurrentCrop(defaultCrop.cropRegion);
      setAspectRatio(resolveAspectRatio(defaultCrop));
    }
  }, [multiSuggestion, vibrate, resolveAspectRatio]);

  const handleSelectCropType = useCallback((crop: CropVariant) => {
    setSelectedCropType(crop.type);
    setCurrentCrop(crop.cropRegion);
    setAspectRatio(resolveAspectRatio(crop));
  }, [resolveAspectRatio]);

  // ---- Export ----

  const handleExport = useCallback(async () => {
    if (!currentCrop || !fullResUrl) return;
    vibrate('success');
    setPageState('exporting');
    try {
      const fullResCrop = scaleToFullRes(currentCrop, scaleFactor);
      const blob = await cropImage(fullResUrl, fullResCrop);
      downloadBlob(blob, 'cropped-portrait.jpg');
      setLastExportBlob(blob);
      const thumbnailDataUrl = await generateThumbnailDataUrl(blob);
      const entry: HistoryEntry = {
        id: generateUUID(),
        thumbnailDataUrl,
        dimensions: { width: fullResCrop.width, height: fullResCrop.height },
        timestamp: Date.now(),
        blob,
      };
      setHistory(prev => [entry, ...prev].slice(0, 20));
      saveHistoryEntry(entry);
      toast.success('Image exported successfully!');

      // Copy the session's vector entry for the export (avoids redundant API call)
      if (aiDescription && sessionIdRef.current) {
        const sessionVector = await loadVectorEntry(sessionIdRef.current);
        if (sessionVector) {
          // Reuse the existing embedding — same image, same description
          const exportVector: VectorEntry = {
            ...sessionVector,
            id: entry.id,
            timestamp: entry.timestamp,
          };
          await saveVectorEntry(exportVector);
        } else {
          // Fallback: generate if session vector somehow missing
          generateAndStoreEmbedding(entry.id, aiDescription, {
            cropType: selectedCropType,
            aspectRatio,
            dimensions: { width: fullResCrop.width, height: fullResCrop.height },
            timestamp: entry.timestamp,
          });
        }
      }
    } catch {
      toast.error('Failed to export image. Please try again.');
    } finally {
      setPageState('editing');
    }
  }, [currentCrop, fullResUrl, scaleFactor, vibrate]);

  // ---- Sharing ----

  const handleCopyToClipboard = useCallback(async () => {
    if (!lastExportBlob) return;
    vibrate('selection');
    try {
      await navigator.clipboard.write([new ClipboardItem({ [lastExportBlob.type]: lastExportBlob })]);
      toast.success('Copied to clipboard!');
    } catch { toast.error('Failed to copy. Try downloading instead.'); }
  }, [lastExportBlob, vibrate]);

  const handleShare = useCallback(async () => {
    if (!lastExportBlob) return;
    vibrate(30);
    try {
      const file = new File([lastExportBlob], 'cropped-portrait.jpg', { type: 'image/jpeg' });
      await navigator.share({ title: 'Cropped Portrait', files: [file] });
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') toast.error('Sharing failed.');
    }
  }, [lastExportBlob, vibrate]);

  // ---- History ----

  const handleClearHistory = useCallback(async () => { await clearHistoryData(); setHistory([]); }, []);

  const handleDeleteEntry = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteHistoryEntry(id);
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const handleLoadFromHistory = useCallback(
    (entry: HistoryEntry) => {
      const pseudoFile = new File([entry.blob], `export-${entry.id.slice(0, 8)}.jpg`, { type: entry.blob.type });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      handleImageSelected(pseudoFile);
    },
    [handleImageSelected],
  );

  // ---- Start over (delete) → navigate home ----

  const handleStartOver = useCallback(() => {
    vibrate('heavy');
    try { if (fullResUrl) URL.revokeObjectURL(fullResUrl); } catch {}
    try { if (previewUrl) URL.revokeObjectURL(previewUrl); } catch {}
    fullResUrlRef.current = null;
    previewUrlRef.current = null;

    if (sessionIdRef.current) clearSession(sessionIdRef.current);
    sessionIdRef.current = null;
    sessionCreatedAtRef.current = 0;
    sessionThumbnailRef.current = null;
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    fullResBlobRef.current = null;
    previewBlobRef.current = null;

    try { window.dispatchEvent(new CustomEvent('cropai:session-changed')); } catch {}

    // Navigate to homepage — completely separate page, no state machine issues
    router.push('/');
  }, [fullResUrl, previewUrl, vibrate, router]);

  // ---- Render ----

  // Loading state — show nothing while checking for session
  if (pageState === 'loading') {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading session…</p>
          </div>
        </div>
      </section>
    );
  }

  // No session — show upload zone
  if (pageState === 'no-session') {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center"
        >
          <div className="mb-10 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20"
            >
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Start a New Project
            </h1>
            <p className="mx-auto mt-3 max-w-md text-gray-600 dark:text-gray-400">
              Upload a portrait photo to get started, or continue from a previous export.
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400"
                role="alert"
              >
                {error}
              </motion.div>
            )}
          </div>

          <UploadZone onImageSelected={handleImageSelected} />

          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="mt-12 w-full"
            >
              <CropHistory entries={history} onSelect={handleLoadFromHistory} onClear={handleClearHistory} onDelete={handleDeleteEntry} />
            </motion.div>
          )}
        </motion.div>
      </section>
    );
  }

  // Uploading state
  if (pageState === 'uploading') {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex min-h-[50vh] w-full flex-col items-center justify-center space-y-6 py-6 sm:py-10">
          <div className="flex w-full min-h-[280px] max-w-2xl items-center justify-center overflow-hidden rounded-3xl bg-gray-100/50 shadow-sm backdrop-blur-sm dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-gray-800">
            <div className="flex w-full items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">AI is analyzing your photo&hellip;</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Editing / Exporting state
  return (
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

      {previewUrl && previewDimensions && currentCrop && multiSuggestion && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
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

          <CropTypeSelector
            crops={multiSuggestion.crops}
            selectedType={selectedCropType}
            imageSrc={previewUrl}
            imageWidth={previewDimensions.width}
            imageHeight={previewDimensions.height}
            onSelectCrop={handleSelectCropType}
          />

          {/* Controls bar */}
          <div className="sticky bottom-6 z-40 mx-auto mt-6 flex w-full flex-col gap-4 rounded-3xl border border-white/20 bg-white/70 p-4 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/70 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />

            <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
              <button onClick={handleResetToAi} className="rounded-full border border-blue-300/50 bg-blue-50/50 px-5 py-2.5 text-sm font-medium text-blue-600 shadow-sm backdrop-blur-sm transition-all duration-150 hover:scale-105 hover:bg-blue-100/50 hover:shadow-md active:scale-95 dark:border-blue-700/50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-800/50">
                Reset
              </button>
              <button
                onClick={handleExport}
                disabled={pageState === 'exporting'}
                className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-150 hover:scale-105 hover:shadow-[0px_10px_20px_rgba(79,70,229,0.4)] hover:from-blue-500 hover:to-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:from-blue-500 dark:to-indigo-500"
              >
                {pageState === 'exporting'
                  ? (<><svg className="inline h-4 w-4 animate-spin mr-1.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Exporting…</>)
                  : 'Export'}
              </button>
              <button
                onClick={handleStartOver}
                className="rounded-full border border-red-300/50 bg-red-50 p-3 text-red-600 shadow-sm backdrop-blur-sm transition-all duration-150 hover:scale-105 hover:bg-red-100/80 hover:shadow-md active:scale-95 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60"
                aria-label="Clear image"
                title="Clear image"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Share bar */}
          <AnimatePresence>
            {lastExportBlob && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-green-200 bg-green-50/50 p-3 dark:border-green-900/40 dark:bg-green-950/20"
              >
                <span className="mr-1 text-sm font-medium text-green-700 dark:text-green-400">Exported!</span>
                <button onClick={handleCopyToClipboard} className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition-all duration-150 hover:scale-[1.03] hover:bg-gray-50 active:scale-[0.97] dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                  Copy
                </button>
                {canShare && (
                  <button onClick={handleShare} className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition-all duration-150 hover:scale-[1.03] hover:bg-gray-50 active:scale-[0.97] dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                    Share
                  </button>
                )}
                <button
                  onClick={() => { if (lastExportBlob) downloadBlob(lastExportBlob, 'cropped-portrait.jpg'); }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition-all duration-150 hover:scale-[1.03] hover:bg-gray-50 active:scale-[0.97] dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  Download Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Description */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mx-auto max-w-4xl rounded-xl bg-white/90 p-4 shadow-sm dark:bg-gray-900/90"
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              AI Analysis
            </p>
            {aiDescriptionLoading ? (
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <p className="text-sm leading-relaxed text-gray-400 dark:text-gray-500 font-mono italic">
                  {fillerText}
                  <span className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom bg-blue-500 animate-pulse" />
                </p>
              </div>
            ) : aiDescription ? (
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <div className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {typewriterText}
                  {typewriterText.length < aiDescription.length && (
                    <span className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom bg-blue-500 animate-pulse" />
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">AI description unavailable</p>
            )}
          </motion.div>

          {/* Inline History */}
          {history.length > 0 && (
            <div className="mt-8">
              <CropHistory entries={history} onSelect={handleLoadFromHistory} onClear={handleClearHistory} onDelete={handleDeleteEntry} />
            </div>
          )}
        </motion.div>
      )}
    </section>
  );
}
