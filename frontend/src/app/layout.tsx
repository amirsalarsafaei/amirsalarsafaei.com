import '@/styles/global.scss';
import type { Metadata } from 'next';

import '@/styles/global.scss';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 1,
    },
  },
});

export const metadata: Metadata = {
  title: {
    default: 'Amirsalar Safaei | Software Engineer',
    template: '%s | Amirsalar Safaei'
  },
  description: 'Software engineer passionate about high-performance systems and programming languages. Crafting innovative solutions with Rust, Go, TS and Python. Sharing insights through technical blogs and interactive experiences.',
  keywords: [
    'Software Engineer',
    'System Architecture',
    'Rust Development',
    'Golang',
    'gRPC Systems',
    'Technical Blog',
    'Three.js',
    'Performance Engineering',
    'Interactive 3D Web',
    'Software Architecture',
    'Tech Writing',
    'Engineering Blog'
  ],
  creator: 'Amirsalar Safaei',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://amirsalarsafaei.com',
    title: 'Amirsalar Safaei | Full-Stack Engineer',
    description: 'Building high-performance systems and software with Rust, Go, and modern web technologies',
    siteName: 'Amirsalar Safaei Portfolio',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Amirsalar Safaei Portfolio'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amirsalar Safaei | Full-Stack Engineer',
    description: 'Building high-performance systems and software with Rust, Go, and modern web technologies',
    images: ['/og-image.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <main>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </main>
      </body>
    </html>
  );
}
