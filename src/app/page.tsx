import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, Clock, CreditCard, MapPin, Smartphone } from "lucide-react";
import { ScheduleList } from "@/components/schedule-list";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { formatDate, formatMoney, formatTimeRange, spotsLeft } from "@/lib/format";
import { getUpcomingSessions } from "@/lib/sessions";
import { SKILL_LABELS } from "@/lib/types";

export const revalidate = 30;

const STEPS = [
  { icon: Smartphone, title: "Pick a game", body: "Choose a night and fill in your details. Takes a minute.", tone: "bg-white text-ink" },
  { icon: CreditCard, title: "e-Transfer", body: "Send the fee and upload your confirmation screenshot.", tone: "bg-volt-400 text-ink" },
  { icon: BadgeCheck, title: "You're in", body: "Get an email with your court, location and receipt.", tone: "bg-brand-500 text-white" },
];

export default async function HomePage() {
  const sessions = await getUpcomingSessions();
  const next = sessions.find((s) => spotsLeft(s) > 0);
  const openSpots = sessions.reduce((n, s) => n + spotsLeft(s), 0);

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="court-lines relative overflow-hidden bg-ink text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 md:grid-cols-[1.15fr_1fr] md:items-center md:pb-24 md:pt-20">
          <div className="animate-rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 font-display text-sm font-bold uppercase tracking-widest text-volt-300">
              <span className="size-2 rounded-full bg-flame-500" aria-hidden /> Indoor volleyball drop-ins
            </p>
            <h1 className="mt-5 font-display text-6xl font-extrabold uppercase italic leading-[0.88] tracking-tight sm:text-7xl lg:text-8xl">
              Find a game.
              <span className="block text-volt-400">Lock your spot.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-white/75">
              Competitive, well-run sessions. Register, send an e-Transfer, and get your court by email.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="#schedule" className="inline-flex min-h-13 items-center gap-2 rounded-xl bg-volt-400 px-7 font-display text-xl font-bold uppercase tracking-wide text-ink transition-colors duration-200 hover:bg-volt-300">
                See the schedule <ArrowRight className="size-5" aria-hidden />
              </Link>
              {sessions.length > 0 && (
                <p className="text-sm text-white/70">
                  <b className="text-white">{sessions.length}</b> upcoming · <b className="text-white">{openSpots}</b> spots open
                </p>
              )}
            </div>
          </div>

          {/* Next game block */}
          {next ? (
            <Link
              href={`/drop-ins/${next.id}/register`}
              className="group block animate-rise rounded-3xl bg-white p-1.5 text-ink shadow-[10px_10px_0_0_var(--color-volt-400)] transition-transform duration-200 [animation-delay:120ms] hover:-translate-y-1"
            >
              <div className="rounded-[1.25rem] border-2 border-line p-5">
                <p className="font-display text-sm font-bold uppercase tracking-widest text-flame-600">Next game</p>
                <p className="mt-1 font-display text-4xl font-extrabold uppercase leading-none">
                  {formatDate(next.starts_at, { weekday: "long", month: "short" })}
                </p>
                <ul className="mt-4 space-y-2 text-[15px]">
                  <li className="flex items-center gap-2"><Clock className="size-4 text-brand-500" aria-hidden />{formatTimeRange(next.starts_at, next.ends_at)}</li>
                  <li className="flex items-center gap-2"><MapPin className="size-4 text-brand-500" aria-hidden />{next.venue_name}</li>
                  <li className="flex items-center gap-2"><CalendarDays className="size-4 text-brand-500" aria-hidden />{SKILL_LABELS[next.skill_level]} · {spotsLeft(next)} spots left</li>
                </ul>
                <div className="mt-5 flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-white">
                  <span className="font-display text-3xl font-extrabold">{formatMoney(next.price_cents).replace(".00", "")}</span>
                  <span className="inline-flex items-center gap-1.5 font-display text-lg font-bold uppercase tracking-wide text-volt-400">
                    Register <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                  </span>
                </div>
              </div>
            </Link>
          ) : (
            <div className="hidden rounded-3xl border-2 border-dashed border-white/20 p-8 text-center text-white/70 md:block">
              New sessions drop weekly — check back soon.
            </div>
          )}
        </div>
      </section>

      {/* Value strip: three colour blocks */}
      <section aria-label="How it works" className="relative z-10 mx-auto -mt-8 max-w-6xl px-4">
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body, tone }, i) => (
            <li key={title} className={`rounded-2xl border-2 border-ink p-5 shadow-[4px_4px_0_0_var(--color-ink)] ${tone}`}>
              <div className="flex items-center gap-3">
                <span className="font-display text-4xl font-extrabold leading-none opacity-30">0{i + 1}</span>
                <Icon className="size-6" aria-hidden />
              </div>
              <p className="mt-3 font-display text-2xl font-bold uppercase">{title}</p>
              <p className="mt-1 text-[15px] opacity-85">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <main id="schedule" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="font-display text-5xl font-extrabold uppercase italic leading-none tracking-tight text-ink">
            Upcoming <span className="text-brand-500">drop-ins</span>
          </h2>
        </div>
        <ScheduleList sessions={sessions} />
      </main>

      {/* Closing CTA */}
      <section className="mx-auto mt-20 max-w-6xl px-4">
        <div className="flex flex-col items-start gap-5 rounded-3xl bg-volt-400 p-8 text-ink sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <p className="font-display text-4xl font-extrabold uppercase italic leading-none">Don&apos;t miss the next run.</p>
            <p className="mt-2 max-w-md">Spots fill fast. Grab yours before the game sells out.</p>
          </div>
          <Link href="#schedule" className="inline-flex min-h-13 shrink-0 items-center gap-2 rounded-xl bg-ink px-7 font-display text-xl font-bold uppercase tracking-wide text-white transition-colors duration-200 hover:bg-brand-900">
            Book a game <ArrowRight className="size-5" aria-hidden />
          </Link>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
