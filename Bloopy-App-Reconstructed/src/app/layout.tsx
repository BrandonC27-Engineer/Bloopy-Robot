import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bloopy — a tiny friend for big little days",
  description:
    "Bloopy is a cute companion robot that checks in on your mood, listens when you need to talk, nudges you gently through your tasks, and remembers the small things that matter to you.",
};

// Deep-space Bloopy dark — keeps mobile browser chrome on-brand.
export const viewport: Viewport = {
  themeColor: "#00040A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Bloopy's logo is the first thing every page shows — fetch it with the
            HTML so the mascot never paints after its glow on a cold cache.
            (React hoists this resource link into <head>.) */}
        <link
          rel="preload"
          as="image"
          href="/bloopy_logo_512.png"
          fetchPriority="high"
        />
        {children}
      </body>
    </html>
  );
}
