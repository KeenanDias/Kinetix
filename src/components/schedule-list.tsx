"use client";

import { useMemo, useState } from "react";
import { CalendarX2, MapPin } from "lucide-react";
import { cn, dayKey, formatDate } from "@/lib/format";
import type { PublicSession } from "@/lib/types";
import { SessionCard } from "./session-card";

type DateFilter = "all" | "week" | "later";

export function ScheduleList({ sessions }: { sessions: PublicSession[] }) {
  const [venue, setVenue] = useState<string>("all");
  const [range, setRange] = useState<DateFilter>("all");

  const venues = useMemo(() => Array.from(new Set(sessions.map((s) => s.venue_name))).sort(), [sessions]);

  const grouped = useMemo(() => {
    const weekEnd = Date.now() + 7 * 24 * 3600 * 1000;
    const filtered = sessions.filter((s) => {
      if (venue !== "all" && s.venue_name !== venue) return false;
      const t = new Date(s.starts_at).getTime();
      if (range === "week" && t > weekEnd) return false;
      if (range === "later" && t <= weekEnd) return false;
      return true;
    });
    const map = new Map<string, PublicSession[]>();
    for (const s of filtered) {
      const k = dayKey(s.starts_at);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return Array.from(map.entries());
  }, [sessions, venue, range]);

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 mb-6 space-y-3 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1" role="tablist" aria-label="Date range">
          {(
            [
              ["all", "All upcoming"],
              ["week", "Next 7 days"],
              ["later", "Later"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={range === value}
              onClick={() => setRange(value)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition",
                range === value ? "bg-white text-brand-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {venues.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="Location">
            {["all", ...venues].map((v) => (
              <button
                key={v}
                onClick={() => setVenue(v)}
                aria-pressed={venue === v}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                  venue === v ? "border-brand-900 bg-brand-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
                )}
              >
                {v !== "all" && <MapPin className="size-3.5" />}
                {v === "all" ? "All locations" : v}
              </button>
            ))}
          </div>
        )}
      </div>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <CalendarX2 className="size-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-800">No sessions here yet</p>
          <p className="mt-1 text-sm text-slate-500">New drop-ins are posted weekly. Check back soon or follow us on Instagram.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-3 font-display text-lg font-semibold uppercase tracking-wide text-slate-500">
                {formatDate(list[0].starts_at, { weekday: "long", month: "long" })}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
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
