'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { HistoryEntry } from '@/lib/types';
import { downloadBlob } from '@/lib/imageUtils';

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface CropHistoryProps {
  entries: HistoryEntry[];
  onClear: () => void;
}

export function CropHistory({ entries, onClear }: CropHistoryProps) {
  if (entries.length === 0) return null;

  const handleRedownload = (entry: HistoryEntry) => {
    downloadBlob(entry.blob, `cropped-${entry.id.slice(0, 8)}.jpg`);
  };

  return (
    <section className="border-t border-gray-200/60 py-10 dark:border-gray-800/60">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Exports
            </h2>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {entries.length}
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClear}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            Clear All
          </motion.button>
        </div>

        {/* Scrollable gallery */}
        <div className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
          <AnimatePresence>
            {entries.map((entry, index) => (
              <motion.button
                key={entry.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                onClick={() => handleRedownload(entry)}
                title="Click to download again"
                className="group relative shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
              >
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.thumbnailDataUrl}
                  alt={`Export: ${entry.dimensions.width}×${entry.dimensions.height}px`}
                  className="h-28 w-auto min-w-[80px] object-cover transition-transform duration-200 group-hover:scale-105 sm:h-32"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/0 transition-all duration-200 group-hover:bg-black/50">
                  <svg
                    className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100"
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
                </div>

                {/* Info bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
                  <p className="text-[10px] font-medium text-white/90">
                    {entry.dimensions.width}&times;{entry.dimensions.height}
                  </p>
                  <p className="text-[10px] text-white/60">
                    {formatTimeAgo(entry.timestamp)}
                  </p>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
