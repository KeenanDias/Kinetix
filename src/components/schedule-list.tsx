"use client";

import { useMemo, useState } from "react";
import { CalendarX2, MapPin } from "lucide-react";
import { cn, dayKey, formatDate, spotsLeft } from "@/lib/format";
import type { PublicSession } from "@/lib/types";
import { SessionCard } from "./session-card";

/** Day strip + location chips. Both scroll horizontally inside themselves, never the page. */
export function ScheduleList({ sessions }: { sessions: PublicSession[] }) {
  const [day, setDay] = useState<string>("all");
  const [venue, setVenue] = useState<string>("all");

  const days = useMemo(() => {
    const map = new Map<string, { iso: string; open: number }>();
    for (const s of sessions) {
      const k = dayKey(s.starts_at);
      const cur = map.get(k);
      map.set(k, { iso: cur?.iso ?? s.starts_at, open: (cur?.open ?? 0) + spotsLeft(s) });
    }
    return Array.from(map.entries());
  }, [sessions]);

  const venues = useMemo(() => Array.from(new Set(sessions.map((s) => s.venue_name))).sort(), [sessions]);

  const grouped = useMemo(() => {
    const map = new Map<string, PublicSession[]>();
    for (const s of sessions) {
      if (venue !== "all" && s.venue_name !== venue) continue;
      const k = dayKey(s.starts_at);
      if (day !== "all" && k !== day) continue;
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return Array.from(map.entries());
  }, [sessions, venue, day]);

  return (
    <div>
      {sessions.length > 0 && (
      <div className="sticky top-[68px] z-30 -mx-4 mb-6 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Filter by day">
          <DayChip active={day === "all"} onClick={() => setDay("all")} top="All" big="★" bottom="dates" />
          {days.map(([k, { iso, open }]) => (
            <DayChip
              key={k}
              active={day === k}
              onClick={() => setDay(k)}
              top={formatDate(iso, { weekday: "short", month: undefined, day: undefined })}
              big={formatDate(iso, { weekday: undefined, month: undefined, day: "numeric" })}
              bottom={open > 0 ? `${open} open` : "Full"}
              full={open === 0}
            />
          ))}
        </div>
        {venues.length > 1 && (
          <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Filter by location">
            {["all", ...venues].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVenue(v)}
                aria-pressed={venue === v}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-semibold transition-colors duration-200",
                  venue === v ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-brand-500",
                )}
              >
                {v !== "all" && <MapPin className="size-3.5" aria-hidden />}
                {v === "all" ? "All locations" : v}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-line bg-white px-6 py-14 text-center">
          <CalendarX2 className="size-10 text-slate-300" aria-hidden />
          <p className="mt-3 font-display text-2xl font-bold uppercase text-ink">No games here yet</p>
          <p className="mt-1 max-w-sm text-muted">New drop-ins are posted weekly. Check back soon or follow us on Instagram.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(([k, list]) => (
            <section key={k} aria-labelledby={`day-${k}`}>
              <h3 id={`day-${k}`} className="mb-4 flex items-center gap-3 font-display text-xl font-bold uppercase tracking-wide text-ink">
                <span className="h-6 w-1.5 rounded-full bg-volt-400" aria-hidden />
                {formatDate(list[0].starts_at, { weekday: "long", month: "long" })}
              </h3>
              <div className="stagger grid gap-4 md:grid-cols-2">
                {list.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function DayChip({ active, onClick, top, big, bottom, full }: { active: boolean; onClick: () => void; top: string; big: string; bottom: string; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-[4.5rem] shrink-0 snap-start flex-col items-center rounded-xl border-2 py-2 transition-colors duration-200",
        active ? "border-brand-900 bg-brand-900 text-white" : "border-line bg-white text-ink hover:border-brand-500",
      )}
    >
      <span className="font-display text-xs font-bold uppercase tracking-widest opacity-80">{top}</span>
      <span className={cn("font-display text-3xl leading-none font-extrabold", active && "text-volt-400")}>{big}</span>
      <span className={cn("mt-0.5 text-[11px] font-semibold", active ? "text-white/80" : full ? "text-red-700" : "text-emerald-700")}>{bottom}</span>
    </button>
  );
}
