import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin, Signal, Users } from "lucide-react";
import { LiveRefresh } from "@/components/live-refresh";
import { RegistrationForm } from "@/components/registration-form";
import { RulesCallout } from "@/components/rules-callout";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { formatDate, formatMoney, formatTimeRange, spotsLeft } from "@/lib/format";
import { getPublicSession } from "@/lib/sessions";
import { SKILL_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Register" };

export default async function RegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getPublicSession(id);
  if (!session) notFound();

  const left = spotsLeft(session);
  const closed = left === 0 || new Date(session.starts_at) < new Date();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pt-6">
        <Link href="/drop-ins" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-800">
          <ArrowLeft className="size-4" /> All sessions
        </Link>

        <section className="mt-4 overflow-hidden rounded-md bg-brand-900 text-white">
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-volt-300">Session {session.code}</p>
                <h1 className="mt-1">{session.venue_name}</h1>
              </div>
              <p className="font-display text-3xl font-bold text-volt-400">{formatMoney(session.price_cents)}</p>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-white/85 sm:grid-cols-2">
              <div className="flex items-center gap-2"><CalendarDays className="size-4 text-volt-400" />{formatDate(session.starts_at, { weekday: "long", month: "long" })}</div>
              <div className="flex items-center gap-2"><Clock className="size-4 text-volt-400" />{formatTimeRange(session.starts_at, session.ends_at)}</div>
              <div className="flex items-start gap-2 sm:col-span-2"><MapPin className="mt-0.5 size-4 shrink-0 text-volt-400" />{session.venue_address}</div>
              <div className="flex items-center gap-2"><Signal className="size-4 text-volt-400" />{SKILL_LABELS[session.skill_level]} required</div>
              <div className="flex items-center gap-2"><Users className="size-4 text-volt-400" />{left} of {session.max_players} spots left</div>
            </dl>
          </div>
        </section>

        <div className="mt-6">
          <RulesCallout skill={session.skill_level} />
        </div>

        {closed ? (
          <div className="mt-6 rounded-md border border-slate-200 bg-white p-6 text-center">
            <Badge tone="red">{left === 0 ? "Sold out" : "Registration closed"}</Badge>
            <p className="mt-3 text-slate-600">This session is no longer taking registrations.</p>
            <Link href="/drop-ins" className={buttonClasses("primary", "md", "mt-4")}>Find another session</Link>
          </div>
        ) : (
          <RegistrationForm session={session} />
        )}
      </main>
      <SiteFooter />
      {/* Keeps "spots left" / sold-out current while someone fills in the form. Typed values are kept. */}
      <LiveRefresh everyMs={30_000} />
    </>
  );
}
