'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export default function HeadshotsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Headshots error:', error);
    }
    toast.error('Something went wrong with the headshot capture');
  }, [error]);

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
          <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Headshot capture encountered an error
        </h2>
        <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">
          This may happen if the camera disconnects, the AI service is unavailable, or an unexpected error occurs.
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            Try Again
          </button>
        </div>
      </div>
    </section>
  );
}
