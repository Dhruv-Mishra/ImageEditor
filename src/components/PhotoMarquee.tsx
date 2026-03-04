'use client';

import { motion } from 'framer-motion';

const portraits = [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop',
];

export function PhotoMarquee() {
    return (
        <div className="w-full relative overflow-hidden bg-white/40 dark:bg-black/40 backdrop-blur-sm py-12 sm:py-16 my-8 shadow-sm dark:shadow-xl border-y border-gray-200/50 dark:border-white/5 opacity-80 hover:opacity-100 transition-all duration-500">
            {/* Top Film Sprockets */}
            <div className="absolute top-2 left-0 right-0 h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iMTYiIHk9IjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMiIgZmlsbD0iIzAwMDAwMCIgb3BhY2l0eT0iMC4xIiByeD0iMiIvPjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iMTYiIHk9IjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMiIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iMC4yNSIgcng9IjIiLz48L3N2Zz4=')] bg-repeat-x transition-all" />

            {/* Bottom Film Sprockets */}
            <div className="absolute bottom-2 left-0 right-0 h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iMTYiIHk9IjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMiIgZmlsbD0iIzAwMDAwMCIgb3BhY2l0eT0iMC4xIiByeD0iMiIvPjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iMTYiIHk9IjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMiIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iMC4yNSIgcng9IjIiLz48L3N2Zz4=')] bg-repeat-x transition-all" />

            <div className="mb-6 text-center px-4 relative z-10">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-white/50 transition-colors">
                    Professional Results
                </p>
            </div>

            <div className="relative flex w-full">
                {/* We render 4 identical blocks so the CSS translation of -25% precisely shifts exactly one block seamlessly */}
                <div
                    className="flex w-max animate-marquee hover:animation-play-state-paused"
                >
                    {Array.from({ length: 4 }).map((_, blockIdx) => (
                        <div key={blockIdx} className="flex gap-16 pr-16 items-center">
                            {portraits.map((src, idx) => (
                                <div
                                    key={`${blockIdx}-${idx}`}
                                    className="relative aspect-[3/4] h-56 sm:h-64 flex-shrink-0 overflow-hidden rounded-md border border-gray-200/50 dark:border-white/10 shadow-sm dark:shadow-lg dark:border-gray-800 transition-colors"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={src}
                                        alt={`Professional portrait sample ${idx}`}
                                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                                        draggable={false}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Subtle gradient fades on the edge to make it blend into the film roll */}
                <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-16 sm:w-32 bg-gradient-to-r from-gray-50/80 dark:from-[#0a0a0c] to-transparent transition-colors" />
                <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-16 sm:w-32 bg-gradient-to-l from-gray-50/80 dark:from-[#0a0a0c] to-transparent transition-colors" />
            </div>
        </div>
    );
}
