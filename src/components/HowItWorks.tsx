'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    number: '01',
    title: 'Upload Your Photo',
    description:
      'Drag and drop or click to upload any portrait photo. We support JPEG, PNG, and WebP formats up to 10 MB.',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      </svg>
    ),
    gradient: 'from-blue-500 to-cyan-500',
    bgGlow: 'bg-blue-500/10 dark:bg-blue-400/10',
  },
  {
    number: '02',
    title: 'AI Suggests a Crop',
    description:
      'Our AI analyzes your photo and suggests the optimal headshot crop zone, focusing on the upper-center region where faces typically appear.',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
        />
      </svg>
    ),
    gradient: 'from-violet-500 to-purple-500',
    bgGlow: 'bg-violet-500/10 dark:bg-violet-400/10',
  },
  {
    number: '03',
    title: 'Fine-tune & Export',
    description:
      'Adjust the crop freely — resize, reposition, change aspect ratios. When you\'re happy, export the final image at full resolution.',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
    ),
    gradient: 'from-emerald-500 to-teal-500',
    bgGlow: 'bg-emerald-500/10 dark:bg-emerald-400/10',
  },
];

const features = [
  {
    title: 'Full Resolution Export',
    description: 'Your photo is cropped at its original resolution — no quality loss, ever.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3h18M3 3v18m0-18l18 18" />
      </svg>
    ),
  },
  {
    title: 'Multiple Aspect Ratios',
    description: 'Choose from 1:1, 3:4, 4:5, or free-form cropping for any use case.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
      </svg>
    ),
  },
  {
    title: 'Privacy First',
    description: 'All processing happens in your browser. Images never leave your device.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: 'Share & Download',
    description: 'Copy to clipboard, share via Web Share, or download directly. Your choice.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
      </svg>
    ),
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export function HowItWorks() {
  return (
    <>
      {/* How It Works */}
      <section id="how-it-works" className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              How It Works
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Three simple steps to the perfect headshot crop.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-6 sm:grid-cols-3"
          >
            {steps.map((step) => (
              <motion.div
                key={step.number}
                variants={itemVariants}
                className="group relative rounded-2xl border border-gray-200 bg-white p-6 transition-shadow duration-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
              >
                {/* Step number badge */}
                <div
                  className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${step.gradient} text-sm font-bold text-white shadow-sm`}
                >
                  {step.number}
                </div>

                {/* Icon floating top-right */}
                <div
                  className={`absolute right-5 top-5 rounded-lg p-2 ${step.bgGlow} text-gray-500 transition-transform duration-300 group-hover:scale-110 dark:text-gray-400`}
                >
                  {step.icon}
                </div>

                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-gray-200/60 bg-gray-100/50 py-16 dark:border-gray-800/60 dark:bg-gray-900/30 sm:py-20"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Why Cropio?
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Everything you need for perfect portrait crops, nothing you don&apos;t.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-5 sm:grid-cols-2"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="flex gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-shadow duration-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  );
}
