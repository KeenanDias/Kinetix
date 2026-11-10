import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, MapPin, Signal, Users } from "lucide-react";
import { cn, formatDate, formatMoney, formatTimeRange, mapsUrl, spotsLeft } from "@/lib/format";
import { SKILL_LABELS, type PublicSession } from "@/lib/types";
import { Badge } from "./ui/badge";
import { buttonClasses } from "./ui/button";

export function SessionCard({ session }: { session: PublicSession }) {
  const left = spotsLeft(session);
  const soldOut = left === 0;
  const almostFull = !soldOut && left <= 3;
  const pct = Math.min(100, Math.round((session.filled_spots / session.max_players) * 100));

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-md border bg-white transition-shadow",
        soldOut ? "border-slate-200" : "border-slate-200 hover:border-brand-200",
      )}
    >
      <div className={cn("h-1.5", soldOut ? "bg-slate-300" : "bg-gradient-to-r from-brand-700 via-brand-500 to-volt-400")} />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
              <CalendarDays className="size-4" />
              {formatDate(session.starts_at, { weekday: "long" })}
            </p>
            <p className="mt-1 flex items-center gap-1.5 whitespace-nowrap font-display text-xl font-semibold text-slate-900 sm:text-2xl">
              <Clock className="size-4 shrink-0 text-slate-400" />
              {formatTimeRange(session.starts_at, session.ends_at)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold text-brand-900">{formatMoney(session.price_cents)}</p>
            <p className="whitespace-nowrap text-xs text-slate-500">CAD / player</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <p className="flex items-start gap-2 text-slate-700">
            <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <span>
              <span className="font-semibold text-slate-900">{session.venue_name}</span>
              <br />
              <a href={mapsUrl(session.venue_address)} target="_blank" rel="noreferrer" className="text-slate-500 underline-offset-2 hover:underline">
                {session.venue_address}
              </a>
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Signal className="size-4 text-slate-400" />
            <Badge tone="brand">{SKILL_LABELS[session.skill_level]}</Badge>
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Users className="size-4 text-slate-400" />
              {session.filled_spots}/{session.max_players} confirmed
            </span>
            {soldOut ? (
              <Badge tone="red">Sold out</Badge>
            ) : almostFull ? (
              <Badge tone="volt">Only {left} left</Badge>
            ) : (
              <Badge tone="green">{left} spots left</Badge>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-sm bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={cn("h-full rounded-sm", soldOut ? "bg-slate-400" : almostFull ? "bg-volt-400" : "bg-brand-500")} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-auto pt-1">
          {soldOut ? (
            <span className={buttonClasses("outline", "lg", "w-full cursor-not-allowed text-slate-400")} aria-disabled>
              Sold Out
            </span>
          ) : (
            <Link href={`/drop-ins/${session.id}/register`} className={buttonClasses("volt", "lg", "w-full")}>
              Register Now <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
