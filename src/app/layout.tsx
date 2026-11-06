import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

// Sports / athletic pairing from the UI/UX Pro Max typography set.
const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const heading = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: { default: "Kinetix Volleyball Drop-ins", template: "%s · Kinetix" },
  description: "Book your spot at Kinetix volleyball drop-in sessions.",
};

export const viewport: Viewport = { themeColor: "#061740" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable}`}>
      <body className="min-h-dvh font-sans text-[16px] leading-normal">{children}</body>
    </html>
  );
}
