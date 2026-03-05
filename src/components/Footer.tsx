import Link from 'next/link';

const footerLinks = {
  product: [
    { label: 'Upload Photo', href: '/' },
    { label: 'Archive', href: '/archive' },
    { label: 'About', href: '/about' },
  ],
  resources: [
    { label: 'GitHub', href: 'https://github.com/Dhruv-Mishra/ImageEditor' },
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
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 mb-20 sm:mb-8 pointer-events-none">
      <footer className="pointer-events-auto rounded-2xl sm:rounded-3xl border border-white/20 bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:border-gray-700/50 dark:bg-gray-900/90 px-4 py-6 sm:px-10 sm:py-10">
        {/* Mobile: simplified single-column footer */}
        <div className="sm:hidden flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <img src="/favicon-32x32.png" alt="Cropio" width={24} height={24} className="h-6 w-6 rounded-md" />
            <span className="font-bold text-sm text-gray-900 dark:text-white">Cropio</span>
          </div>
          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 max-w-[260px]">
            AI-powered portrait cropping — upload, crop, and export headshots in your browser.
          </p>
          <div className="flex gap-4 text-xs text-gray-400 dark:text-gray-500">
            <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300">Home</Link>
            <Link href="/archive" className="hover:text-gray-700 dark:hover:text-gray-300">Archive</Link>
            <Link href="/about" className="hover:text-gray-700 dark:hover:text-gray-300">About</Link>
            <a href="https://github.com/Dhruv-Mishra/ImageEditor" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 dark:hover:text-gray-300">GitHub</a>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} Cropio
          </p>
        </div>

        {/* Desktop: full footer */}
        <div className="hidden sm:block">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <img
                src="/favicon-32x32.png"
                alt="Cropio"
                width={28}
                height={28}
                className="h-7 w-7 rounded-md"
              />
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
                <span
                  key={tech}
                  className="rounded-full bg-gray-200/80 px-2.5 py-1 text-xs font-medium text-gray-700 transition-transform duration-150 hover:scale-105 dark:bg-gray-800 dark:text-gray-300"
                >
                  {tech}
                </span>
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
        </div>
      </footer>
    </div>
  );
}
