import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

/**
 * Geist Sans + Geist Mono are loaded as CSS variables and consumed by the
 * Tailwind v4 `@theme` block in globals.css. Mono is the carrier for every
 * numeric (SKUs, prices, counts, dates) per the Numeric-Mono Rule.
 *
 * Playfair Display joins them as the brand serif — used only by the
 * Curtice Crates wordmark / Logo component, never for body or UI.
 */
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

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Curtis Crates Inventory",
  description: "Internal inventory and intake system of record for Curtis Crates.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable}`}
    >
      <body className="bg-bone text-soot antialiased">{children}</body>
    </html>
  );
}
