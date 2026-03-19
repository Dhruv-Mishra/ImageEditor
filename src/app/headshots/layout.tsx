import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Headshot Capture',
  description:
    'Capture professional headshot photos using AI-powered face tracking. Guided pose sequence with real-time feedback — all processing runs in your browser.',
  openGraph: {
    title: 'Headshot Capture — Cropio',
    description:
      'Capture professional headshots with AI-guided pose feedback, right in your browser.',
  },
};

export default function HeadshotsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
