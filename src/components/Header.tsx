'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';

const ACTIVE_SESSION_KEY = 'cropai_active_session_id';

export function Header() {
  const pathname = usePathname();
  const [hasActiveSession, setHasActiveSession] = useState(false);

  // Track active session state via localStorage + custom events
  useEffect(() => {
    const check = () => {
      try {
        setHasActiveSession(!!localStorage.getItem(ACTIVE_SESSION_KEY));
      } catch {
        setHasActiveSession(false);
      }
    };
    check();
    window.addEventListener('storage', check);
    const handler = () => setTimeout(check, 50);
    window.addEventListener('cropai:session-changed', handler);
    return () => {
      window.removeEventListener('storage', check);
      window.removeEventListener('cropai:session-changed', handler);
    };
  }, []);

  const handleHomeClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // If already on "/" and there's an active editing session, archive it instead of navigating
      if (pathname === '/') {
        try {
          if (localStorage.getItem(ACTIVE_SESSION_KEY)) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('cropai:go-home'));
          }
        } catch {
          /* localStorage unavailable — fall through to normal nav */
        }
      }
    },
    [pathname],
  );

  return (
    <div className="sticky top-4 z-50 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pointer-events-none transition-all">
      <motion.header
        initial={{ y: -30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-auto flex items-center justify-between rounded-full border border-white/20 bg-white/40 px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/40 sm:px-6"
      >
        {/* Brand */}
        <Link href="/" onClick={handleHomeClick} className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm shadow-blue-500/20">
            <svg
              className="h-4 w-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </div>
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-blue-400 dark:to-indigo-400">
            Cropio
          </span>
        </Link>

        {/* Nav links right aligned */}
        <nav className="hidden items-center gap-6 sm:flex ml-auto mr-6" aria-label="Main navigation">
          <Link
            href="/"
            onClick={handleHomeClick}
            className={`text-sm font-medium transition-colors ${
              pathname === '/' && !hasActiveSession
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            Home
          </Link>
          <Link
            href="/edit"
            onClick={(e) => {
              if (pathname === '/' && hasActiveSession) {
                e.preventDefault();
              }
            }}
            className={`text-sm font-medium transition-colors ${
              pathname === '/edit' || (pathname === '/' && hasActiveSession)
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            Edit
          </Link>
          <Link
            href="/archive"
            className={`text-sm font-medium transition-colors ${
              pathname === '/archive'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            Archive
          </Link>
          <Link
            href="/about"
            className={`text-sm font-medium transition-colors ${
              pathname === '/about'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            About
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </motion.header>
    </div>
  );
}
