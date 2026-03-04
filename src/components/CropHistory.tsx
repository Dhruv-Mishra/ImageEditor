'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function EllipsisVerticalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile dropdown menu                                               */
/* ------------------------------------------------------------------ */

interface MobileMenuProps {
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onClose: () => void;
}

function MobileMenu({ onEdit, onDelete, onClose }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Defer so the tap that opened the menu doesn't immediately close it
    const frame = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown as EventListener);
    });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown as EventListener);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.85, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -4 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="mobile-menu absolute top-9 right-1 z-30 min-w-[120px] overflow-hidden rounded-xl border border-white/20 bg-white/80 shadow-lg backdrop-blur-xl dark:border-gray-700/60 dark:bg-gray-900/80"
      role="menu"
      aria-label="Photo actions"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-violet-50 dark:text-gray-200 dark:hover:bg-violet-950/30"
        role="menuitem"
      >
        <PencilIcon className="h-3.5 w-3.5" />
        Edit
      </button>
      <div className="mx-2 border-t border-gray-200/60 dark:border-gray-700/60" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(e);
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
        role="menuitem"
      >
        <TrashIcon className="h-3.5 w-3.5" />
        Delete
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  History card                                                       */
/* ------------------------------------------------------------------ */

interface HistoryCardProps {
  entry: HistoryEntry;
  onSelect?: (entry: HistoryEntry) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
}

function HistoryCard({
  entry,
  onSelect,
  onDelete,
  openMenuId,
  setOpenMenuId,
}: HistoryCardProps) {
  const isMenuOpen = openMenuId === entry.id;

  const handleEdit = useCallback(() => {
    onSelect?.(entry);
  }, [onSelect, entry]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      onDelete(entry.id, e);
    },
    [onDelete, entry.id],
  );

  const toggleMenu = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpenMenuId(isMenuOpen ? null : entry.id);
    },
    [isMenuOpen, entry.id, setOpenMenuId],
  );

  const closeMenu = useCallback(() => {
    setOpenMenuId(null);
  }, [setOpenMenuId]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
      transition={{ duration: 0.2 }}
      className="group relative shrink-0"
    >
      {/* Card body — clicking the image triggers edit */}
      <button
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.action-btn') || target.closest('.mobile-menu')) return;
          onSelect?.(entry);
        }}
        title="Click to load into editor"
        className="relative h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition-all duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
      >
        {/* Thumbnail */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.thumbnailDataUrl}
          alt={`Export: ${entry.dimensions.width}×${entry.dimensions.height}px`}
          className="h-28 w-auto min-w-[80px] object-cover brightness-95 transition-transform duration-200 group-hover:scale-105 sm:h-32"
          draggable={false}
        />

        {/* ── Desktop hover overlay with edit + delete ── */}
        <div className="pointer-events-none absolute inset-0 hidden items-center justify-center gap-3 bg-black/0 transition-all duration-200 md:flex md:group-hover:bg-black/50">
          {/* Edit button */}
          <motion.span
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit();
            }}
            className="action-btn pointer-events-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/20 text-white opacity-0 shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-white/30 md:group-hover:opacity-100"
            role="button"
            aria-label="Edit photo"
            tabIndex={0}
          >
            <PencilIcon className="h-4 w-4" />
          </motion.span>

          {/* Delete button */}
          <motion.span
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(e as unknown as React.MouseEvent);
            }}
            className="action-btn pointer-events-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/20 text-white opacity-0 shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-red-500/80 md:group-hover:opacity-100"
            role="button"
            aria-label="Delete photo"
            tabIndex={0}
          >
            <TrashIcon className="h-4 w-4" />
          </motion.span>
        </div>

        {/* Bottom gradient info bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
          <p className="text-[10px] font-medium text-white/90">
            {entry.dimensions.width}&times;{entry.dimensions.height}
          </p>
          <p className="text-[10px] text-white/60">{formatTimeAgo(entry.timestamp)}</p>
        </div>
      </button>

      {/* ── Mobile 3-dot menu trigger (visible below md) ── */}
      <button
        onClick={toggleMenu}
        className="action-btn absolute top-1.5 right-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur-md transition-colors hover:bg-black/60 md:hidden"
        aria-label="Open actions menu"
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
      >
        <EllipsisVerticalIcon className="h-4 w-4" />
      </button>

      {/* ── Mobile dropdown ── */}
      <AnimatePresence>
        {isMenuOpen && (
          <MobileMenu onEdit={handleEdit} onDelete={handleDelete} onClose={closeMenu} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  CropHistory (main export)                                          */
/* ------------------------------------------------------------------ */

interface CropHistoryProps {
  entries: HistoryEntry[];
  onSelect?: (entry: HistoryEntry) => void;
  onClear: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export function CropHistory({ entries, onSelect, onClear, onDelete }: CropHistoryProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (entries.length === 0) return null;

  return (
    <section id="archive" className="scroll-mt-24 border-t border-gray-200/60 py-10 dark:border-gray-800/60">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
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
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            Clear All
          </motion.button>
        </div>

        {/* Scrollable card strip */}
        <div className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
          <AnimatePresence>
            {entries.map((entry) => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                onSelect={onSelect}
                onDelete={onDelete}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
