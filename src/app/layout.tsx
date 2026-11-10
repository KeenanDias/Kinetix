import type { Metadata, Viewport } from "next";
import { DM_Sans, Lato, Outfit } from "next/font/google";
import "./globals.css";

// h1/h2 + numbers: geometric display face. h3: utility caps. Body: warm humanist sans.
const outfit = Outfit({ subsets: ["latin"], weight: ["600", "700", "800", "900"], variable: "--font-outfit" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-dm-sans" });
const lato = Lato({ subsets: ["latin"], weight: ["300", "400", "700", "900"], variable: "--font-lato" });

export const metadata: Metadata = {
  title: { default: "Kinetix Volleyball Drop-ins", template: "%s · Kinetix" },
  description: "Book your spot at Kinetix volleyball drop-in sessions.",
};

export const viewport: Viewport = { themeColor: "#0b2a6b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSans.variable} ${lato.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
