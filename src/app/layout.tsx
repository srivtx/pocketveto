import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PocketVeto — your veto before the charge posts",
  description:
    "The local-first radar for every date your money moves: free trials, renewals, warranties, gift cards, 0% APR windows, documents and domains. No account. No bank link. Nothing leaves your device.",
  keywords: [
    "PocketVeto",
    "subscription tracker",
    "free trial reminder",
    "warranty tracker",
    "gift card tracker",
    "deferred interest calculator",
    "renewal reminder",
    "local-first",
    "privacy",
  ],
  authors: [{ name: "PocketVeto contributors" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "PocketVeto — your veto before the charge posts",
    description:
      "One radar for every date your money moves. Local-first, free, open source. No account, no bank link.",
    siteName: "PocketVeto",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f0e",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${grotesk.variable} antialiased bg-ink-950 text-mist-100`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
