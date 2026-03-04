'use client';

import { useCallback, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { validateImageFile } from '@/lib/imageUtils';

interface UploadZoneProps {
  onImageSelected: (file: File) => void;
}

export function UploadZone({ onImageSelected }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      onImageSelected(file);
    },
    [onImageSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  return (
    <div className="flex w-full justify-center px-4">
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload a portrait photo. Click or drag and drop an image."
        className={`
          group relative flex min-h-[280px] w-full max-w-2xl cursor-pointer flex-col items-center justify-center
          overflow-hidden rounded-3xl border-2 border-dashed p-8
          transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/10
          ${isDragging
            ? 'border-indigo-500 bg-indigo-50/80 backdrop-blur-md scale-[1.02] dark:border-indigo-400 dark:bg-indigo-950/40'
            : 'border-gray-300 bg-white/70 backdrop-blur-md hover:border-indigo-400 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-indigo-500'
          }
        `}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        animate={isDragging ? { scale: 1.02 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {/* Gradient glow on hover */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: 'radial-gradient(circle at center, rgba(99,102,241,0.1) 0%, transparent 60%)',
          }}
        />

        {/* Upload icon */}
        <motion.div
          animate={isDragging ? { y: -4 } : { y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <svg
            className={`mb-4 h-16 w-16 transition-all duration-300 ${isDragging ? 'text-indigo-500 scale-110' : 'text-gray-400 group-hover:text-indigo-400 group-hover:-translate-y-1'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </motion.div>

        <p className="relative mb-1 text-lg font-semibold text-gray-700 dark:text-gray-200">
          {isDragging ? 'Drop your photo here' : 'Drag & drop your portrait photo'}
        </p>
        <p className="relative text-sm text-gray-500 dark:text-gray-400">
          or click to browse — JPEG, PNG, WebP up to 10 MB
        </p>
      </motion.div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInput}
        className="hidden"
        aria-label="Choose an image file"
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400"
          role="alert"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}
