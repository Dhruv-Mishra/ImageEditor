'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppHaptics } from '@/lib/haptics';

export function MobileNav() {
    const pathname = usePathname();
    const { vibrate } = useAppHaptics();

    const handleHomeClick = useCallback(
        () => {
            vibrate('light');
        },
        [vibrate],
    );

    // Route-based tab highlighting
    const isEditActive = pathname === '/edit';
    const isHomeActive = pathname === '/';
    const activeClass = 'text-blue-600 dark:text-blue-400';
    const inactiveClass = 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100';

    return (
        <div className="sm:hidden fixed bottom-2 left-3 right-3 z-50 pb-safe">
            <div className="flex items-center justify-around h-14 px-2 rounded-full border border-white/20 bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-900/90">
                <Link
                    href="/"
                    onClick={handleHomeClick}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isHomeActive ? activeClass : inactiveClass}`}
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="text-[10px] font-medium tracking-wide">Home</span>
                </Link>

                <Link
                    href="/edit"
                    onClick={() => vibrate('light')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isEditActive ? activeClass : inactiveClass}`}
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                    <span className="text-[10px] font-medium tracking-wide">Edit</span>
                </Link>

                <Link
                    href="/archive"
                    onClick={() => vibrate('light')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${pathname === '/archive' ? activeClass : inactiveClass}`}
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] font-medium tracking-wide">Archive</span>
                </Link>

                <Link
                    href="/about"
                    onClick={() => vibrate('light')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${pathname === '/about' ? activeClass : inactiveClass}`}
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[10px] font-medium tracking-wide">About</span>
                </Link>
            </div>
        </div>
    );
}
