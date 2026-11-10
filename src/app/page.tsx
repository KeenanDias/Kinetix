import Link from "next/link";
import { ArrowDown, BadgeCheck, CreditCard, Smartphone } from "lucide-react";
import { LiveRefresh } from "@/components/live-refresh";
import { ScheduleList } from "@/components/schedule-list";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getUpcomingSessions } from "@/lib/sessions";

// Served from cache and rebuilt at most every 15s, so many visitors cost one DB query.
export const revalidate = 15;

export default async function HomePage() {
  const sessions = await getUpcomingSessions();

  return (
    <>
      <SiteHeader />
      <section className="relative overflow-hidden border-b-4 border-volt-400 bg-brand-900 text-white">
        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-12 sm:pt-16">
          <p className="inline-flex items-center gap-2 rounded-md border border-brand-700 bg-brand-800 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-volt-300">
            Indoor volleyball · Drop-ins
          </p>
          <h1 className="mt-4 max-w-2xl">
            Find a game. <span className="text-volt-400">Lock your spot.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/80">
            Competitive, well-run drop-in sessions. Pick a night, send an e-Transfer, and you&apos;ll get a confirmation with your court.
          </p>
          <Link href="#schedule" className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-volt-400 px-6 font-semibold text-brand-950 hover:bg-volt-300">
            See upcoming sessions <ArrowDown className="size-5" />
          </Link>

          <ol className="mt-12 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Smartphone, title: "1. Register", body: "Pick a session and fill in your details." },
              { icon: CreditCard, title: "2. e-Transfer", body: "Send the fee and upload your screenshot." },
              { icon: BadgeCheck, title: "3. Get confirmed", body: "Email with your court & location once approved." },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3 rounded-md border border-brand-700 bg-brand-800 p-4">
                <Icon className="size-6 shrink-0 text-volt-400" />
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-white/70">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <main id="schedule" className="mx-auto max-w-5xl scroll-mt-16 px-4 pt-8">
        <h2 className="mb-4 text-brand-900">Upcoming drop-ins</h2>
        <ScheduleList sessions={sessions} />
      </main>
      <SiteFooter />
      <LiveRefresh everyMs={20_000} />
    </>
  );
}
