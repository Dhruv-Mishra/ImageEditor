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
  title: {
    default: 'Cropio — AI Portrait Photo Cropper',
    template: '%s | Cropio',
  },
  description:
    'Upload a portrait photo, get an AI-powered crop suggestion, fine-tune it interactively, and export at full resolution. Free, fast, and private.',
  keywords: [
    'portrait cropper',
    'AI photo crop',
    'headshot cropper',
    'LinkedIn photo',
    'resume photo',
    'passport photo crop',
    'portrait photo editor',
    'free headshot tool',
  ],
  authors: [{ name: 'Cropio' }],
  creator: 'Cropio',
  metadataBase: new URL('https://cropio.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Cropio',
    title: 'Cropio — AI Portrait Photo Cropper',
    description:
      'Upload a portrait photo, get an AI-powered crop suggestion, fine-tune it interactively, and export at full resolution.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Cropio — AI Portrait Photo Cropper' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cropio — AI Portrait Photo Cropper',
    description:
      'Upload a portrait, get an AI crop suggestion, fine-tune & export at full resolution.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload critical background image */}
        <link
          rel="preload"
          href="/images/Background.webp"
          as="image"
          type="image/webp"
        />
        {/* Suppress errors from Brave/crypto wallet extensions injecting window.ethereum */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{Object.defineProperty(window,'ethereum',{get:function(){return undefined},set:function(){},configurable:true})}catch(e){}`,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Premium Image Background */}
          <div className="bg-mesh-gradient"></div>

          <div className="relative flex min-h-screen flex-col pb-16 sm:pb-0">
            <Header />
            <main className="flex-1 pt-16 sm:pt-0">{children}</main>
            <Footer />
            <MobileNav />
          </div>
          <Toaster position="bottom-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
