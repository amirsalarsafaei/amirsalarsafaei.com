import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "@/styles/global.scss"; // Global styles first
import "@/styles/_base.scss"; // Global styles first
import QueryProvider from "@/providers/QueryProvider";
import { GrpcProvider } from "@/providers/GrpcProvider";
import Navbar from "@/components/Navbar/Navbar";
import { GoogleAnalytics } from "@next/third-parties/google";
import { getSiteUrl } from "@/utils/seo";

// The repo already ships JetBrains Mono under public/fonts; load it properly
// instead of hoping the visitor has it installed. Exposed as --font-mono /
// --font-jetbrains so Sass and the xterm surface can consume the same face.
const jetbrainsMono = localFont({
  src: [
    {
      path: "../../public/fonts/JetBrainsMono-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/JetBrainsMono-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/JetBrainsMono-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/JetBrainsMono-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-jetbrains",
  display: "swap",
  preload: true,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Amirsalar Safaei | Software Engineer",
    template: "%s | Amirsalar Safaei",
  },
  description:
    "Software engineer passionate about high-performance systems and programming languages. Crafting innovative solutions with Rust, Go, TS and Python. Sharing insights through technical blogs and interactive experiences.",
  keywords: [
    "Software Engineer",
    "System Architecture",
    "Rust Development",
    "Golang",
    "gRPC Systems",
    "Technical Blog",
    "Three.js",
    "Performance Engineering",
    "Interactive 3D Web",
    "Software Architecture",
    "Tech Writing",
    "Engineering Blog",
  ],
  creator: "Amirsalar Safaei Ghaderi",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Amirsalar Safaei | Software Engineer",
    description:
      "Building high-performance systems and software with Rust, Go, and modern web technologies",
    siteName: "Amirsalar Safaei Portfolio",
    images: [
      {
        url: "/blog-1.png",
        width: 1024,
        height: 576,
        alt: "Amirsalar Safaei Portfolio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Amirsalar Safaei | Software Engineer",
    description:
      "Building high-performance systems and software with Rust, Go, and modern web technologies",
    images: ["/blog-1.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080b0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jetbrainsMono.variable} suppressHydrationWarning>
      <body>
        <QueryProvider>
          <GrpcProvider>
            <Navbar />
            <div className="pageContent">{children}</div>
          </GrpcProvider>
        </QueryProvider>
      </body>
      <GoogleAnalytics gaId="G-QZ0BJG7GNY" />
    </html>
  );
}
