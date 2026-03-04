'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CropHistory } from '@/components/CropHistory';
import { loadHistory, clearHistoryData } from '@/lib/db';
import type { HistoryEntry } from '@/lib/types';
import { useAppHaptics } from '@/lib/haptics';

export default function ArchivePage() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const router = useRouter();
    const { vibrate } = useAppHaptics();

    useEffect(() => {
        loadHistory().then((data) => {
            if (data) setHistory(data);
        });
    }, []);

    const handleClearHistory = useCallback(async () => {
        vibrate('heavy');
        await clearHistoryData();
        setHistory([]);
    }, [vibrate]);

    const handleSelect = useCallback(
        (entry: HistoryEntry) => {
            vibrate(50);
            router.push(`/?load=${entry.id}`);
        },
        [router, vibrate]
    );

    return (
        <div className="min-h-screen pt-28 pb-12">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mb-8 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                    Your Archive
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
                    Revisit and re-edit your previous professional portrait exports.
                </p>
            </div>
            {history.length > 0 ? (
                <CropHistory
                    entries={history}
                    onSelect={handleSelect}
                    onClear={handleClearHistory}
                />
            ) : (
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center py-20">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800/50 mb-6">
                        <svg
                            className="h-10 w-10 text-gray-400 dark:text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nothing to see here</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                        You haven&apos;t exported any portrait crops yet. Your past exports will appear here automatically.
                    </p>
                    <button
                        onClick={() => {
                            vibrate("light");
                            router.push("/");
                        }}
                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105 hover:shadow-xl hover:from-blue-500 hover:to-indigo-500"
                    >
                        Start Creating
                    </button>
                </div>
            )}
        </div>
    );
}
