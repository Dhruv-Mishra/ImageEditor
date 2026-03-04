'use client';

import { motion } from 'framer-motion';

export default function AboutPage() {
    return (
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="rounded-3xl border border-white/20 bg-white/60 p-8 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/60 sm:p-12"
            >
                <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                    About Cropio
                </h1>

                <div className="prose prose-blue dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                    <p className="text-lg leading-relaxed">
                        Welcome to Cropio, a completely private, client-side tool designed to instantly
                        generate professional portrait crops powered by intelligent algorithms.
                    </p>

                    <h2 className="mt-8 mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                        100% Privacy by Design
                    </h2>
                    <p>
                        Unlike other AI services, every single image you upload and crop on this
                        platform is processed purely inside your device&apos;s browser memory. Your images
                        are <strong>never</strong> uploaded to any external server, ensuring complete
                        peace of mind regarding your personal data and likeness.
                    </p>

                    <h2 className="mt-8 mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                        How it works
                    </h2>
                    <p>
                        Cropio leverages a sophisticated computer-vision approach to heuristically
                        discover the optimal aspect ratio framing for subjects. By focusing on smart
                        rule-of-thirds intersections and golden-ratio body alignments, the tool outputs
                        crops that are instantly suitable for LinkedIn, professional portfolios, or Resumes.
                    </p>

                    <div className="mt-10 rounded-2xl bg-blue-50 p-6 dark:bg-blue-900/20">
                        <h3 className="mb-2 text-xl font-semibold text-blue-900 dark:text-blue-100">
                            Tech Stack
                        </h3>
                        <ul className="list-inside list-disc space-y-2 text-blue-800 dark:text-blue-200">
                            <li>Next.js App Router for dynamic rendering</li>
                            <li>Framer Motion for fluid layout animations</li>
                            <li>React-Image-Crop for robust HTML5 canvas manipulation</li>
                            <li>IndexedDB for persistent client-side caching of exports</li>
                            <li>Web-Haptics API for native sensory mobile touch</li>
                        </ul>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
