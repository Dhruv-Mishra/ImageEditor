'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const footerLinks = {
  product: [
    { label: 'Upload Photo', href: '/' },
    { label: 'Archive', href: '/archive' },
    { label: 'About', href: '/about' },
  ],
  resources: [
    { label: 'GitHub', href: 'https://github.com' },
    { label: 'Documentation', href: '#' },
    { label: 'Privacy Policy', href: '#' },
  ],
};

const techStack = [
  'Next.js',
  'React',
  'TypeScript',
  'Tailwind CSS',
  'Framer Motion',
  'Sharp',
];

export function Footer() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 mb-24 sm:mb-8 pointer-events-none">
      <footer className="pointer-events-auto rounded-3xl border border-white/20 bg-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/40 px-6 py-10 sm:px-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-indigo-600">
                <svg
                  className="h-3.5 w-3.5 text-white"
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
              <span className="font-bold text-gray-900 dark:text-white">
                Cropio
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              AI-powered portrait photo cropping. Upload, crop, and export
              headshots with intelligent suggestions — all in your browser.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Product
            </h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Resources
            </h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => {
                const isExternal = link.href.startsWith('http');
                return (
                  <li key={link.label}>
                    {isExternal ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Built with */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Built With
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {techStack.map((tech) => (
                <motion.span
                  key={tech}
                  whileHover={{ scale: 1.05 }}
                  className="rounded-full bg-gray-200/80 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {tech}
                </motion.span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} Cropio. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Images are processed locally. Nothing is stored on our servers.
          </p>
        </div>
      </footer>
    </div>
  );
}
