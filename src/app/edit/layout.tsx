import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit Photo',
  description:
    'Upload a portrait photo or continue editing a previous session. Get AI-powered crop suggestions and export at full resolution with Cropio.',
  openGraph: {
    title: 'Edit Photo | Cropio',
    description:
      'Upload a portrait photo or resume a previous session. AI crop suggestions, full-resolution export.',
  },
};

export default function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
