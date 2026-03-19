'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { HeadshotViewfinder } from '@/components/headshot/HeadshotViewfinder';
import { HeadshotHUD } from '@/components/headshot/HeadshotHUD';
import { HeadshotPreviewStrip } from '@/components/headshot/HeadshotPreviewStrip';
import { useMediaPipeFace } from '@/lib/headshot/useMediaPipeFace';
import { useCaptureSequence } from '@/lib/headshot/useCaptureSequence';
import { HEADSHOT_STYLES } from '@/lib/headshot/templates';
import { saveHeadshotSession, loadHeadshotSession, clearSession } from '@/lib/db';
import type { HeadshotSessionData, GeneratedHeadshot } from '@/lib/types';

const ACTIVE_SESSION_KEY = 'cropai_active_headshot_session_id';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function HeadshotsPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const uploadStartedRef = useRef(false);
  const [restoredSession, setRestoredSession] = useState<HeadshotSessionData | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const {
    state,
    startCamera,
    startSequence,
    processFrame,
    uploadFrames,
    reset,
  } = useCaptureSequence(videoRef, canvasRef);

  const isTracking = state.phase === 'tracking' || state.phase === 'stabilizing' || state.phase === 'holding';

  const { initFaceMesh, isLoading: modelLoading, error: modelError } =
    useMediaPipeFace(videoRef, isTracking, processFrame);

  // --- AI Headshot Generation State ---
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Array<{ id: string; objectUrl: string }>>([]);
  const generatedImagesRef = useRef<Array<{ id: string; objectUrl: string }>>([]);
  generatedImagesRef.current = generatedImages;
  // Keep actual blobs for persistence (object URLs can't be serialized)
  const generatedBlobsRef = useRef<Map<string, Blob>>(new Map());

  // --- Session persistence ---
  const saveCurrentSession = useCallback(async (
    frames: Array<{ dataUrl: string; poseLabel: string }>,
    blobs: Map<string, Blob>,
  ) => {
    if (!sessionIdRef.current || frames.length === 0) return;

    const generatedArr: GeneratedHeadshot[] = [];
    blobs.forEach((blob, styleId) => {
      generatedArr.push({ styleId, blob });
    });

    const sessionData: HeadshotSessionData = {
      id: sessionIdRef.current,
      type: 'headshot',
      frames,
      generatedImages: generatedArr,
      thumbnailDataUrl: frames[0]?.dataUrl,
      createdAt: Date.now(),
    };

    await saveHeadshotSession(sessionData);
  }, []);

  // Restore session on mount
  useEffect(() => {
    async function restore() {
      try {
        const activeId = localStorage.getItem(ACTIVE_SESSION_KEY);
        if (!activeId) { setIsRestoring(false); return; }

        const session = await loadHeadshotSession(activeId);
        if (!session?.frames?.length) {
          localStorage.removeItem(ACTIVE_SESSION_KEY);
          setIsRestoring(false);
          return;
        }

        sessionIdRef.current = session.id;
        setRestoredSession(session);

        // Restore generated images as object URLs
        const restored: Array<{ id: string; objectUrl: string }> = [];
        for (const gen of session.generatedImages) {
          const objectUrl = URL.createObjectURL(gen.blob);
          // Extract base styleId (strip composite '::timestamp' suffix if present)
          const baseId = gen.styleId.includes('::') ? gen.styleId.split('::')[0] : gen.styleId;
          restored.push({ id: baseId, objectUrl });
          generatedBlobsRef.current.set(gen.styleId, gen.blob);
        }
        setGeneratedImages(restored);
      } catch (err) {
        console.error('[headshots] Failed to restore session:', err);
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      } finally {
        setIsRestoring(false);
      }
    }
    restore();
  }, []);

  // Auto-save when phase transitions to post-capture states
  useEffect(() => {
    if (state.phase === 'complete' || state.phase === 'uploading' || state.phase === 'done') {
      if (state.frames.length > 0) {
        if (!sessionIdRef.current) {
          sessionIdRef.current = generateId();
          try { localStorage.setItem(ACTIVE_SESSION_KEY, sessionIdRef.current); } catch {}
        }
        void saveCurrentSession(state.frames, generatedBlobsRef.current).catch(() => {});
      }
    }
  }, [state.phase, state.frames.length, saveCurrentSession]);

  // Save on beforeunload
  useEffect(() => {
    const flush = () => {
      if (state.frames.length > 0 && sessionIdRef.current) {
        void saveCurrentSession(state.frames, generatedBlobsRef.current).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [state.frames.length, saveCurrentSession]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      generatedImagesRef.current.forEach((img) => URL.revokeObjectURL(img.objectUrl));
    };
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleStart = useCallback(async () => {
    try {
      const stream = await startCamera();
      streamRef.current = stream;
      await initFaceMesh();
      startSequence();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start camera';
      toast.error(msg);
      reset();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [startCamera, initFaceMesh, startSequence, reset]);

  // When sequence is complete, auto-trigger upload (guarded to prevent cascade)
  useEffect(() => {
    if (state.phase === 'complete' && state.frames.length > 0 && !uploadStartedRef.current) {
      uploadStartedRef.current = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void uploadFrames(state.frames).catch(() => {
        uploadStartedRef.current = false;
      });
    }
  }, [state.phase, state.frames.length, uploadFrames]);

  const handleReset = useCallback(async () => {
    uploadStartedRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    generatedImagesRef.current.forEach((img) => URL.revokeObjectURL(img.objectUrl));
    setGeneratedImages([]);
    generatedBlobsRef.current.clear();
    setGeneratingId(null);
    setRestoredSession(null);
    // Clear the persisted session
    if (sessionIdRef.current) {
      try {
        await clearSession(sessionIdRef.current);
      } catch {}
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      sessionIdRef.current = null;
    }
    reset();
  }, [reset]);

  const handleGenerate = useCallback(async (styleId: string) => {
    // Use restored frames if available, otherwise use capture state frames
    const frames = restoredSession?.frames ?? state.frames;
    const straightFrame = frames.find((f) => f.poseLabel === 'Straight');
    if (!straightFrame) {
      toast.error('No straight-ahead photo found');
      return;
    }

    setGeneratingId(styleId);
    try {
      const res = await fetch('/api/generate-headshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceImage: straightFrame.dataUrl, styleId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Generation failed' }));
        if (res.status === 429) {
          toast.error('GPU quota exceeded — please try again later', { duration: 8000 });
          return;
        }
        throw new Error(body.error || `Failed (${res.status})`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const genKey = `${styleId}::${Date.now()}`;
      generatedBlobsRef.current.set(genKey, blob);
      setGeneratedImages((prev) => [...prev, { id: styleId, objectUrl }]);
      toast.success('Headshot generated!');

      // Persist the new generated image
      const allFrames = restoredSession?.frames ?? state.frames;
      void saveCurrentSession(allFrames, generatedBlobsRef.current).catch(() => {});
    } catch (err) {
      console.error('[headshots] Generation failed:', err);
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGeneratingId(null);
    }
  }, [state.frames, restoredSession, saveCurrentSession]);

  const handleDownloadGenerated = useCallback((objectUrl: string, label: string) => {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `headshot-${label.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.click();
  }, []);

  const isIdle = state.phase === 'idle' && !restoredSession;
  const isRequestingCamera = state.phase === 'requesting-camera';
  const isUploading = state.phase === 'uploading';
  const isDone = state.phase === 'done' || restoredSession !== null;
  const isError = state.phase === 'error';
  const showViewfinder = !isIdle && state.phase !== 'done' && !restoredSession;
  const displayFrames = restoredSession?.frames ?? state.frames;

  if (isRestoring) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading session…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Headshot Capture
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          AI-guided face tracking to capture 5 professional headshot angles
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        {/* Idle state — start button */}
        {isIdle && (
          <div className="flex flex-col items-center gap-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-900/80 sm:p-12">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                <svg className="h-10 w-10 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Ready to capture your headshots?
              </h2>
              <p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-400">
                We&apos;ll guide you through 5 head positions using real-time face tracking.
                Everything runs locally in your browser.
              </p>
              <button
                onClick={handleStart}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 active:scale-95"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Start Headshot Capture
              </button>
            </div>
          </div>
        )}

        {/* Loading model or requesting camera */}
        {(isRequestingCamera || modelLoading) && (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {modelLoading ? 'Loading face tracking model…' : 'Requesting camera access…'}
            </p>
          </div>
        )}

        {/* Model load error */}
        {modelError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">{modelError}</p>
            <button
              onClick={handleReset}
              className="mt-3 text-sm font-medium text-red-600 underline hover:text-red-700 dark:text-red-400"
            >
              Try again
            </button>
          </div>
        )}

        {/* Viewfinder + HUD */}
        {showViewfinder && (
          <div className="w-full space-y-4 animate-[fadeIn_0.3s_ease-out]">
            <HeadshotViewfinder
              videoRef={videoRef}
              canvasRef={canvasRef}
              instruction={state.instruction}
              showInstruction={isTracking}
              holdProgress={state.holdProgress}
              isOnTarget={state.isOnTarget}
              isStable={state.isStable}
              phase={state.phase}
              captureCount={state.captureCount}
            />

            {isTracking && (
              <HeadshotHUD
                currentStep={state.currentStep}
                isOnTarget={state.isOnTarget}
                isStable={state.isStable}
                phase={state.phase}
              />
            )}

            {/* Preview strip */}
            <HeadshotPreviewStrip frames={state.frames} />
          </div>
        )}

        {/* Uploading */}
        {isUploading && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Processing…
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Uploading your headshots
            </p>
          </div>
        )}

        {/* Done — show generation options */}
        {isDone && (
          <div className="w-full space-y-6 animate-[fadeIn_0.3s_ease-out]">
            {/* Captured photos */}
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-center justify-center gap-2 mb-3">
                <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <h2 className="text-lg font-bold text-green-800 dark:text-green-300">
                  Photos captured successfully
                </h2>
              </div>
              <HeadshotPreviewStrip frames={displayFrames} />
            </div>

            {/* Style selection */}
            <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 dark:border-gray-700 dark:bg-gray-900/80">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                Generate Professional Headshots
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Choose a style — AI will generate a professional headshot preserving your face
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {HEADSHOT_STYLES.map((style) => {
                  const alreadyGenerated = generatedImages.some((g) => g.id === style.id);
                  const isGenerating = generatingId === style.id;

                  return (
                    <button
                      key={style.id}
                      onClick={() => handleGenerate(style.id)}
                      disabled={isGenerating || generatingId !== null}
                      className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                        alreadyGenerated
                          ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                          : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-blue-500 dark:hover:bg-blue-900/20'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isGenerating && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 dark:bg-gray-900/80">
                          <div className="h-6 w-6 animate-spin rounded-full border-3 border-blue-500 border-t-transparent" />
                        </div>
                      )}
                      <span className="text-2xl">{style.emoji}</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {style.label}
                      </span>
                      {alreadyGenerated && (
                        <span className="absolute top-1.5 right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-green-500 text-white text-[8px]">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Generation loading state */}
              {generatingId !== null && (
                <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    Generating your headshot…
                  </p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                    This may take 30–90 seconds. The AI is creating your professional portrait.
                  </p>
                </div>
              )}

              {/* Generate More prompt */}
              {generatedImages.length > 0 && generatingId === null && (
                <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
                  Tap any style above to generate more headshots from your captured photos
                </p>
              )}
            </div>

            {/* Generated results */}
            {generatedImages.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 dark:border-gray-700 dark:bg-gray-900/80">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Your Professional Headshots
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {generatedImages.map((img) => {
                    const style = HEADSHOT_STYLES.find((s) => s.id === img.id);
                    return (
                      <div key={`${img.id}-${generatedImages.indexOf(img)}`} className="group relative">
                        <img
                          src={img.objectUrl}
                          alt={`Generated: ${style?.label}`}
                          className="w-full rounded-xl border border-gray-200 shadow-md dark:border-gray-700"
                        />
                        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => handleDownloadGenerated(img.objectUrl, style?.label || img.id)}
                            className="rounded-full bg-black/60 p-2 text-white"
                            title="Download"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        </div>
                        <p className="mt-1 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          {style?.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center">
              <button
                onClick={handleReset}
                className="rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {state.errorMessage || 'Something went wrong'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => uploadFrames(state.frames)}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Retry Upload
              </button>
              <button
                onClick={handleReset}
                className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
