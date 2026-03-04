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
                        Cropio is a free, AI-powered portrait cropping tool that instantly generates
                        professional headshot crops using real-time pose detection.
                    </p>

                    <h2 className="mt-8 mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                        Your Privacy Matters
                    </h2>
                    <p>
                        Your uploaded images are only used momentarily for AI analysis and are{' '}
                        <strong>never stored on our servers</strong>. A lightweight, downscaled
                        preview is processed by our AI to generate crop suggestions, and the final
                        full-resolution crop and export happen entirely in your browser using the
                        Canvas API. Nothing is saved after you leave the page.
                    </p>

                    <h2 className="mt-8 mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                        How It Works
                    </h2>
                    <p>
                        Upload a portrait and our AI runs{' '}
                        <strong>YOLOv11 pose estimation</strong> to detect body keypoints. From those
                        keypoints, it computes optimal crop regions for face close-ups, portrait,
                        and full-body framings. You can then fine-tune the crop interactively and
                        export at the original full resolution — ideal for LinkedIn, resumes,
                        passports, or professional portfolios.
                    </p>

                    <div className="mt-10 rounded-2xl bg-blue-50 p-6 dark:bg-blue-900/20">
                        <h3 className="mb-2 text-xl font-semibold text-blue-900 dark:text-blue-100">
                            Tech Stack
                        </h3>
                        <ul className="list-inside list-disc space-y-2 text-blue-800 dark:text-blue-200">
                            <li>Next.js 14 App Router + React 19</li>
                            <li>FastAPI + Ultralytics YOLOv11 (pose) backend</li>
                            <li>Framer Motion for fluid layout animations</li>
                            <li>React-Image-Crop for interactive canvas manipulation</li>
                            <li>IndexedDB for persistent client-side crop archive</li>
                            <li>Web Vibration API for native haptic feedback on mobile</li>
                            <li>Tailwind CSS + dark mode via next-themes</li>
                        </ul>
                    </div>

                    <div className="mt-8 flex items-center gap-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Built by{' '}
                            <a
                                href="https://github.com/Dhruv-Mishra"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-800 dark:text-blue-400 dark:decoration-blue-700 dark:hover:text-blue-300"
                            >
                                Dhruv Mishra
                            </a>
                            {' · '}
                            <a
                                href="https://github.com/Dhruv-Mishra/ImageEditor"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-800 dark:text-blue-400 dark:decoration-blue-700 dark:hover:text-blue-300"
                            >
                                View on GitHub
                            </a>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
