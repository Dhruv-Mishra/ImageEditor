'use client';

import { useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { HeadshotViewfinder } from '@/components/headshot/HeadshotViewfinder';
import { HeadshotHUD } from '@/components/headshot/HeadshotHUD';
import { HeadshotPreviewStrip } from '@/components/headshot/HeadshotPreviewStrip';
import { useMediaPipeFace } from '@/lib/headshot/useMediaPipeFace';
import { useCaptureSequence } from '@/lib/headshot/useCaptureSequence';

export default function HeadshotsPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const {
    state,
    startCamera,
    startSequence,
    processFrame,
    uploadFrames,
    reset,
  } = useCaptureSequence(videoRef, canvasRef);

  const isTracking = state.phase === 'tracking' || state.phase === 'holding';

  const { initFaceMesh, isLoading: modelLoading, isReady: modelReady, error: modelError } =
    useMediaPipeFace(videoRef, isTracking, processFrame);

  /**
   * Start button handler — request camera → load model → begin sequence.
   */
  const handleStart = useCallback(async () => {
    try {
      const stream = await startCamera();
      streamRef.current = stream;
      await initFaceMesh();
      startSequence();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start camera';
      toast.error(msg);
    }
  }, [startCamera, initFaceMesh, startSequence]);

  /**
   * When sequence is complete, auto-trigger upload.
   */
  useEffect(() => {
    if (state.phase === 'complete' && state.frames.length > 0) {
      uploadFrames(state.frames);
    }
  }, [state.phase, state.frames, uploadFrames]);

  /**
   * Cleanup camera stream on unmount.
   */
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleReset = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    reset();
  }, [reset]);

  const isIdle = state.phase === 'idle';
  const isRequestingCamera = state.phase === 'requesting-camera';
  const isUploading = state.phase === 'uploading';
  const isDone = state.phase === 'done';
  const isError = state.phase === 'error';
  const showViewfinder = !isIdle && state.phase !== 'done';

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-12 lg:px-8">
      {/* Page title */}
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
              {isRequestingCamera ? 'Requesting camera access…' : 'Loading face tracking model…'}
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
              phase={state.phase}
            />

            {isTracking && (
              <HeadshotHUD
                currentStep={state.currentStep}
                holdProgress={state.holdProgress}
                isOnTarget={state.isOnTarget}
                hasFace={true}
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

        {/* Done */}
        {isDone && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-900/20 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-green-800 dark:text-green-300">
              Headshots uploaded successfully!
            </h2>
            <HeadshotPreviewStrip frames={state.frames} />
            <button
              onClick={handleReset}
              className="mt-4 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Capture Again
            </button>
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
