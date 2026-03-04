import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Archive',
  description:
    'Browse your crop export history and saved editing sessions. Re-edit or download previously cropped portraits with Cropio.',
  openGraph: {
    title: 'Archive | Cropio',
    description:
      'Browse your crop history and saved sessions. Re-edit or download previous portraits.',
  },
};

export default function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
