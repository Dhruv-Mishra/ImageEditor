'use client';

import { useState, useRef, useEffect } from 'react';

const portraits = [
    '/images/marquee/p1.webp',
    '/images/marquee/p2.webp',
    '/images/marquee/p3.webp',
    '/images/marquee/p4.webp',
    '/images/marquee/p5.webp',
    '/images/marquee/p6.webp',
    '/images/marquee/p7.webp',
    '/images/marquee/p8.webp',
];

export function PhotoMarquee() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => setIsVisible(entry.isIntersecting),
            { threshold: 0 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            className="w-full relative overflow-hidden bg-white/70 dark:bg-black/60 py-5 sm:py-12 my-4 sm:my-8 shadow-sm dark:shadow-xl border-y border-gray-200/50 dark:border-white/5 opacity-90 transition-all duration-500 mx-auto max-w-6xl rounded-xl sm:rounded-3xl border-x"
        >
            {/* Film Sprockets */}
            <div className="absolute top-2 left-0 right-0 h-3 sm:h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iMTYiIHk9IjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMiIgZmlsbD0iIzAwMDAwMCIgb3BhY2l0eT0iMC4xIiByeD0iMiIvPjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iMTYiIHk9IjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMiIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iMC4yNSIgcng9IjIiLz48L3N2Zz4=')] bg-repeat-x transition-all" />
            <div className="absolute bottom-2 left-0 right-0 h-3 sm:h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iMTYiIHk9IjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMiIgZmlsbD0iIzAwMDAwMCIgb3BhY2l0eT0iMC4xIiByeD0iMiIvPjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iMTYiIHk9IjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMiIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iMC4yNSIgcng9IjIiLz48L3N2Zz4=')] bg-repeat-x transition-all" />

            <div className="mb-6 text-center px-4 relative z-10">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-white/40 transition-colors">
                    Professional Results
                </p>
            </div>

            <div className="relative flex w-full">
                {/* 3 blocks for seamless loop at -33.33% translation */}
                <div
                    className={`flex w-max hover:animation-play-state-paused ${isVisible ? 'animate-marquee' : ''}`}
                    style={{ willChange: isVisible ? 'transform' : 'auto' }}
                >
                    {Array.from({ length: 3 }).map((_, blockIdx) => (
                        <div key={blockIdx} className="flex gap-4 pr-4 sm:gap-16 sm:pr-16 items-center">
                            {portraits.map((src, idx) => (
                                <div
                                    key={`${blockIdx}-${idx}`}
                                    className="group relative aspect-[3/4] h-32 sm:h-52 flex-shrink-0 overflow-visible transition-colors"
                                >
                                    <div className="h-full w-full overflow-hidden rounded-2xl border border-gray-200/50 dark:border-white/10 shadow-sm dark:shadow-lg dark:border-gray-800">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={src}
                                            alt={`Professional portrait sample ${idx + 1}`}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            draggable={false}
                                            loading="lazy"
                                            decoding="async"
                                            width={300}
                                            height={400}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Edge gradient fades */}
                <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-24 sm:w-44 bg-gradient-to-r from-white/90 via-white/40 dark:from-[#0a0a0c] dark:via-[#0a0a0c]/50 to-transparent transition-colors" />
                <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-24 sm:w-44 bg-gradient-to-l from-white/90 via-white/40 dark:from-[#0a0a0c] dark:via-[#0a0a0c]/50 to-transparent transition-colors" />
            </div>
        </div>
    );
}
