import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { siteConfig } from "@/lib/config";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-lg" aria-label="Kinetix home">
          <Image src="/kinetix-logo.png" alt="" width={40} height={40} className="size-10 shrink-0 rounded-full ring-2 ring-volt-400" priority />
          <span className="truncate font-display text-2xl font-extrabold uppercase italic tracking-tight text-white">
            Kinetix<span className="text-volt-400">.</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main">
          <Link href="/drop-ins" className="hidden min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white md:flex">
            Schedule
          </Link>
          {siteConfig.instagramUrl && (
            <a href={siteConfig.instagramUrl} target="_blank" rel="noreferrer" aria-label="Kinetix on Instagram" className="grid size-11 place-items-center rounded-lg text-white/85 transition-colors hover:bg-white/10 hover:text-white">
              <InstagramIcon />
            </a>
          )}
          {siteConfig.contactEmail && (
            <a href={`mailto:${siteConfig.contactEmail}`} aria-label="Email Kinetix" className="hidden size-11 place-items-center rounded-lg text-white/85 transition-colors hover:bg-white/10 hover:text-white sm:grid">
              <Mail className="size-5" aria-hidden />
            </a>
          )}
          <Link
            href="/drop-ins"
            className="ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-volt-400 px-4 font-display text-base font-bold uppercase tracking-wide text-ink transition-colors hover:bg-volt-300"
          >
            Book <span className="hidden sm:inline">a game</span>
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </nav>
      </div>
      <div className="h-1 bg-gradient-to-r from-brand-500 via-volt-400 to-flame-500" aria-hidden />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="court-lines mt-20 bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-3xl font-extrabold uppercase italic">
            Kinetix<span className="text-volt-400">.</span>
          </p>
          <p className="mt-2 max-w-xs text-white/70">Competitive, well-run volleyball drop-ins. Play hard, play fair.</p>
        </div>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-widest text-volt-400">How it works</p>
          <ul className="mt-3 space-y-1.5 text-white/75">
            <li>Pick a session</li>
            <li>Send an Interac e-Transfer</li>
            <li>Get your court by email</li>
          </ul>
        </div>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-widest text-volt-400">Contact</p>
          <ul className="mt-3 space-y-1.5 text-white/75">
            {siteConfig.contactEmail && (
              <li><a className="underline-offset-4 hover:text-white hover:underline" href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a></li>
            )}
            {siteConfig.instagramUrl && (
              <li><a className="underline-offset-4 hover:text-white hover:underline" href={siteConfig.instagramUrl} target="_blank" rel="noreferrer">Instagram</a></li>
            )}
            <li><Link className="underline-offset-4 hover:text-white hover:underline" href="/admin">Host login</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-5 text-center text-sm text-white/50">© {new Date().getFullYear()} Kinetix Volleyball</p>
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
