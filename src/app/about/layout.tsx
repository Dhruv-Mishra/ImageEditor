import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about Cropio — a free, private, AI-powered portrait photo cropping tool. No uploads to external servers, everything runs in your browser.',
  openGraph: {
    title: 'About Cropio',
    description:
      'Learn about Cropio — a free, private, AI-powered portrait photo cropping tool.',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
