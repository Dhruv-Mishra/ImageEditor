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
        <div className="w-full relative overflow-hidden bg-[#0a0a0c] py-12 sm:py-16 my-8 shadow-2xl border-y border-white/5">
            {/* Top Film Sprockets */}
            <div className="absolute top-2 left-0 right-0 h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjE0IiBoZWlnaHQ9IjEyIiBmaWxsPSIjZmZmZmZmIiBvcGFjaXR5PSIwLjM1IiByeD0iMiIvPjwvc3ZnPg==')] bg-repeat-x" />

            {/* Bottom Film Sprockets */}
            <div className="absolute bottom-2 left-0 right-0 h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjE0IiBoZWlnaHQ9IjEyIiBmaWxsPSIjZmZmZmZmIiBvcGFjaXR5PSIwLjM1IiByeD0iMiIvPjwvc3ZnPg==')] bg-repeat-x" />

            <div className="mb-6 text-center px-4 relative z-10">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/50">
                    Professional Results
                </p>
            </div>

            <div className="relative flex w-full">
                {/* We render 4 identical blocks so the CSS translation of -25% precisely shifts exactly one block seamlessly */}
                <motion.div
                    className="flex w-max animate-marquee hover:animation-play-state-paused"
                >
                    {Array.from({ length: 4 }).map((_, blockIdx) => (
                        <div key={blockIdx} className="flex gap-4 pr-4">
                            {portraits.map((src, idx) => (
                                <div
                                    key={`${blockIdx}-${idx}`}
                                    className="relative aspect-[3/4] h-56 sm:h-64 flex-shrink-0 overflow-hidden rounded-md border border-white/10 shadow-lg dark:border-gray-800"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={src}
                                        alt={`Professional portrait sample ${idx}`}
                                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105 filter grayscale hover:grayscale-0 transition-all"
                                        draggable={false}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </motion.div>

                {/* Subtle gradient fades on the edge to make it blend into the film roll */}
                <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-16 sm:w-32 bg-gradient-to-r from-[#0a0a0c] to-transparent" />
                <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-16 sm:w-32 bg-gradient-to-l from-[#0a0a0c] to-transparent" />
            </div>
        </div>
    );
}
