'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { HistoryEntry } from '@/lib/types';

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
  onSelect?: (entry: HistoryEntry) => void;
  onClear: () => void;
}

export function CropHistory({ entries, onSelect, onClear }: CropHistoryProps) {
  if (entries.length === 0) return null;

  return (
    <section id="archive" className="border-t border-gray-200/60 py-10 dark:border-gray-800/60 scroll-mt-24">
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
            <h2 className="text-lg font-bold uppercase tracking-widest text-gray-900 dark:text-white">
              Archive
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
                onClick={() => onSelect?.(entry)}
                title="Click to load into editor"
                className="group relative shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
              >
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.thumbnailDataUrl}
                  alt={`Export: ${entry.dimensions.width}×${entry.dimensions.height}px`}
                  className="h-28 w-auto min-w-[80px] object-cover transition-transform duration-200 group-hover:scale-105 sm:h-32 filter brightness-95"
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
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
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
