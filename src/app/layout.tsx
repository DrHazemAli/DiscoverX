/**
 * ============================================================================
 * DISCOVER: Root Layout
 * Description: Application root layout with all providers and global components
 * ============================================================================
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AppProvider } from "@/contexts/AppContext";
import { CommandPalette } from "@/components/ui/CommandPalette";

// ============================================================================
// Fonts
// ============================================================================

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// ============================================================================
// Metadata
// ============================================================================

export const metadata: Metadata = {
  title: {
    default: "Discover - GitHub Repository Analytics",
    template: "%s | Discover",
  },
  description:
    "Discover and analyze GitHub repositories with health scores, rankings, and comparisons. Find the best open source projects and alternatives.",
  keywords: [
    "GitHub",
    "repository",
    "analytics",
    "open source",
    "health score",
    "rankings",
    "alternatives",
    "compare",
  ],
  authors: [{ name: "Hazem Ali", url: "https://github.com/drhazemali" }],
  creator: "Hazem Ali",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Discover",
    title: "Discover - GitHub Repository Analytics",
    description:
      "Discover and analyze GitHub repositories with health scores, rankings, and comparisons.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover - GitHub Repository Analytics",
    description:
      "Discover and analyze GitHub repositories with health scores, rankings, and comparisons.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

// ============================================================================
// Root Layout Component
// ============================================================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <ThemeProvider>
          <AppProvider>
            <QueryProvider>
              {children}
              {/* Global Components */}
              <CommandPalette />
            </QueryProvider>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

