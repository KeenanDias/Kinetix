import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";
import { siteConfig } from "@/lib/config";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-brand-800 bg-brand-900">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/kinetix-logo.png" alt="Kinetix" width={40} height={40} className="size-10 rounded-full ring-2 ring-volt-400" priority />
          <span className="font-display text-xl font-bold uppercase tracking-wide text-white">
            Kinetix <span className="text-volt-400">Volleyball</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/drop-ins" className="hidden rounded-md px-3 py-2 text-sm font-semibold text-white/90 hover:bg-brand-800 sm:block">
            Drop-ins
          </Link>
          {siteConfig.instagramUrl && (
            <a href={siteConfig.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className="rounded-md p-2 text-white/90 hover:bg-brand-800">
              <InstagramIcon />
            </a>
          )}
          {siteConfig.contactEmail && (
            <a href={`mailto:${siteConfig.contactEmail}`} aria-label="Email us" className="rounded-md p-2 text-white/90 hover:bg-brand-800">
              <Mail className="size-5" />
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} Kinetix Volleyball. Play hard, play fair.</p>
        <p>
          Payments via Interac e-Transfer ·{" "}
          <Link href="/privacy" className="font-semibold text-slate-700 underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </footer>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
