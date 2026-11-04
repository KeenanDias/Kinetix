import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display-face" });

export const metadata: Metadata = {
  title: { default: "Kinetix Volleyball Drop-ins", template: "%s · Kinetix" },
  description: "Book your spot at Kinetix volleyball drop-in sessions.",
};

export const viewport: Viewport = { themeColor: "#0b2a6b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
