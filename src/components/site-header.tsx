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
          <Link href="/drop-ins" className="hidden min-h-11 items-center rounded-md px-3 text-sm font-semibold text-white/90 hover:bg-brand-800 sm:flex">
            Drop-ins
          </Link>
          {siteConfig.instagramUrl && (
            <a href={siteConfig.instagramUrl} target="_blank" rel="noreferrer" aria-label="Kinetix on Instagram" className="grid size-11 place-items-center rounded-md text-white/90 hover:bg-brand-800">
              <InstagramIcon />
            </a>
          )}
          {siteConfig.contactEmail && (
            <a href={`mailto:${siteConfig.contactEmail}`} aria-label="Email Kinetix" className="grid size-11 place-items-center rounded-md text-white/90 hover:bg-brand-800">
              <Mail className="size-5" />
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { contactEmail, instagramUrl } = siteConfig;
  const instagramHandle = instagramUrl.match(/instagram\.com\/([^/?#]+)/i)?.[1];
  const linkClass = "inline-flex min-h-11 items-center gap-2 text-white/80 underline-offset-4 hover:text-white hover:underline";

  return (
    <footer className="mt-16 border-t-4 border-volt-400 bg-brand-950 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Image src="/kinetix-logo.png" alt="" width={40} height={40} className="size-10 rounded-full ring-2 ring-volt-400" />
            <span className="font-display text-xl font-bold uppercase tracking-wide">
              Kinetix <span className="text-volt-400">Volleyball</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-white/70">Competitive, well-run indoor volleyball drop-ins. Play hard, play fair.</p>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-volt-400">Contact</p>
          <ul className="mt-2 text-sm">
            {contactEmail && (
              <li>
                <a href={`mailto:${contactEmail}`} className={linkClass}>
                  <Mail className="size-4 shrink-0" aria-hidden /> <span className="break-all">{contactEmail}</span>
                </a>
              </li>
            )}
            {instagramUrl && (
              <li>
                <a href={instagramUrl} target="_blank" rel="noreferrer" className={linkClass}>
                  <InstagramIcon small /> {instagramHandle ? `@${instagramHandle}` : "Instagram"}
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-volt-400">Links</p>
          <ul className="mt-2 text-sm">
            <li><Link href="/drop-ins" className={linkClass}>Drop-in schedule</Link></li>
            <li><Link href="/privacy" className={linkClass}>Privacy policy</Link></li>
            <li><Link href="/admin" className={linkClass}>Host login</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-brand-800">
        <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-white/60">
          © {new Date().getFullYear()} Kinetix Volleyball · Payments by Interac e-Transfer · Spots confirmed by email
        </p>
      </div>
    </footer>
  );
}

function InstagramIcon({ small = false }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={small ? "size-4 shrink-0" : "size-5"} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
