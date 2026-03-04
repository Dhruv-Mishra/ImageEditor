import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileNav } from '@/components/MobileNav';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CropAI — AI Portrait Photo Cropper',
  description:
    'Upload a portrait photo, get an AI-suggested headshot crop, fine-tune it interactively, and export at full resolution.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Premium Image Background */}
          <div className="bg-mesh-gradient"></div>

          <div className="relative flex min-h-screen flex-col pb-16 sm:pb-0">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <MobileNav />
          </div>
          <Toaster position="bottom-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
