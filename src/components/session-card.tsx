import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { cn, formatDate, formatMoney, formatTimeRange, mapsUrl, spotsLeft } from "@/lib/format";
import { SKILL_LABELS, type PublicSession } from "@/lib/types";

/** Ticket-style block card: bold date stub on the left, details + CTA on the right. */
export function SessionCard({ session }: { session: PublicSession }) {
  const left = spotsLeft(session);
  const soldOut = left === 0;
  const almostFull = !soldOut && left <= 3;
  const pct = Math.min(100, Math.round((session.filled_spots / session.max_players) * 100));

  return (
    <article
      className={cn(
        "group flex overflow-hidden rounded-2xl border-2 bg-card transition-[border-color,box-shadow] duration-200",
        soldOut ? "border-line" : "border-line hover:border-brand-500 hover:shadow-[6px_6px_0_0_var(--color-brand-500)]",
      )}
    >
      {/* Date stub */}
      <div
        className={cn(
          "court-lines flex w-20 shrink-0 flex-col items-center justify-center gap-0.5 border-r-2 border-dashed py-4 text-center sm:w-24",
          soldOut ? "border-line bg-slate-200 text-slate-500" : "border-brand-700 bg-brand-900 text-white",
        )}
      >
        <span className="font-display text-sm font-bold uppercase tracking-widest text-current opacity-80">
          {formatDate(session.starts_at, { weekday: "short", month: undefined, day: undefined })}
        </span>
        <span className={cn("font-display text-5xl leading-none font-extrabold", !soldOut && "text-volt-400")}>
          {formatDate(session.starts_at, { weekday: undefined, month: undefined, day: "numeric" })}
        </span>
        <span className="font-display text-sm font-bold uppercase tracking-widest opacity-80">
          {formatDate(session.starts_at, { weekday: undefined, day: undefined, month: "short" })}
        </span>
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
        <div>
          <p className="flex items-center gap-1.5 font-display text-xl font-bold leading-tight text-ink sm:text-2xl">
            <Clock className="size-4 shrink-0 text-brand-500" aria-hidden />
            <span className="whitespace-nowrap">{formatTimeRange(session.starts_at, session.ends_at)}</span>
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="inline-flex rounded-md bg-brand-50 px-2 py-0.5 font-display text-sm font-bold uppercase tracking-wide text-brand-800">
              {SKILL_LABELS[session.skill_level]}
            </span>
            <span className="font-display text-3xl font-extrabold leading-none text-ink">
              {formatMoney(session.price_cents).replace(".00", "")}
              <span className="ml-1 text-xs font-semibold tracking-wide text-muted">CAD</span>
            </span>
          </div>
        </div>

        <p className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{session.venue_name}</span>
            <a href={mapsUrl(session.venue_address)} target="_blank" rel="noreferrer" className="text-muted underline decoration-line underline-offset-4 hover:text-brand-700 hover:decoration-brand-500">
              {session.venue_address}
            </a>
          </span>
        </p>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-muted">
              <b className="text-ink">{session.filled_spots}</b>/{session.max_players} in
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide",
                soldOut ? "bg-red-100 text-red-800" : almostFull ? "bg-flame-500 text-ink" : "bg-emerald-100 text-emerald-800",
              )}
            >
              {soldOut ? "Sold out" : almostFull ? `${left} left` : `${left} spots open`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Spots filled" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={cn("h-full rounded-full", soldOut ? "bg-slate-400" : almostFull ? "bg-flame-500" : "bg-brand-500")} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-auto pt-1">
          {soldOut ? (
            <span aria-disabled="true" className="flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-line font-display text-lg font-bold uppercase tracking-wide text-slate-400">
              Sold out
            </span>
          ) : (
            <Link
              href={`/drop-ins/${session.id}/register`}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-volt-400 font-display text-lg font-bold uppercase tracking-wide text-ink transition-colors duration-200 hover:bg-volt-300"
              aria-label={`Register for ${formatDate(session.starts_at, { weekday: "long", month: "long" })} at ${session.venue_name}`}
            >
              Register now <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
