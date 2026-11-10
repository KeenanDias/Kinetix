import Link from "next/link";
import { CheckCircle2, ChevronRight, EyeOff, MapPin } from "lucide-react";
import { CapacityMeter } from "@/components/admin/capacity-meter";
import { SessionCreator } from "@/components/admin/session-creator";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, formatTimeRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { SKILL_LABELS, type Session } from "@/lib/types";

export const metadata = { title: "Host Dashboard" };

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ past?: string; deleted?: string; emailed?: string }>;
}) {
  const { past, deleted, emailed } = await searchParams;
  const emailedCount = Number(emailed ?? 0);
  const showPast = past === "1";
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  let q = supabase.from("sessions").select("*");
  q = showPast ? q.lt("ends_at", nowIso).order("starts_at", { ascending: false }).limit(50) : q.gte("ends_at", nowIso).order("starts_at");

  // Independent queries run in parallel (one round trip instead of three).
  const [{ data: sessions = [] }, { data: pendingRows }, { data: venueRows }] = await Promise.all([
    q.returns<Session[]>(),
    supabase.from("registrations").select("session_id").eq("status", "pending").returns<{ session_id: string }[]>(),
    supabase.from("sessions").select("venue_name, venue_address").order("created_at", { ascending: false }).limit(50),
  ]);

  const shown = new Set((sessions ?? []).map((s) => s.id));
  const pending = new Map<string, number>();
  for (const r of pendingRows ?? []) if (shown.has(r.session_id)) pending.set(r.session_id, (pending.get(r.session_id) ?? 0) + 1);
  const totalPending = Array.from(pending.values()).reduce((a, b) => a + b, 0);
  const recentVenues = Array.from(new Map((venueRows ?? []).map((v) => [v.venue_name, { name: v.venue_name, address: v.venue_address }])).values());

  return (
    <div className="space-y-6">
      {deleted && (
        <p role="status" className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>
            Run {deleted} was deleted.{" "}
            {emailedCount > 0
              ? `${emailedCount} registered player${emailedCount === 1 ? " was" : "s were"} emailed that it's cancelled.`
              : "No cancellation emails were sent."}
          </span>
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-brand-900">Dashboard</h1>
          <p className="text-sm text-slate-600">
            {totalPending > 0 ? <><b className="text-amber-700">{totalPending} registration{totalPending > 1 ? "s" : ""}</b> waiting for review</> : "You're all caught up."}
          </p>
        </div>
        <div className="flex gap-1 rounded-md bg-slate-200 p-1 text-sm font-semibold">
          <Link href="/admin" className={`rounded-md px-3 py-1.5 ${!showPast ? "bg-white" : "text-slate-600"}`}>Upcoming</Link>
          <Link href="/admin?past=1" className={`rounded-md px-3 py-1.5 ${showPast ? "bg-white" : "text-slate-600"}`}>Past</Link>
        </div>
      </div>

      {!showPast && <SessionCreator recentVenues={recentVenues} />}

      {(sessions ?? []).length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No {showPast ? "past" : "upcoming"} sessions.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {(sessions ?? []).map((s) => (
            <li key={s.id}>
              <Link href={`/admin/sessions/${s.id}`} className="group flex gap-4 rounded-md border border-slate-200 bg-white p-4 transition hover:border-brand-300">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-brand-900">{formatDate(s.starts_at)}</p>
                    <span className="text-sm text-slate-500">{formatTimeRange(s.starts_at, s.ends_at)}</span>
                    {(pending.get(s.id) ?? 0) > 0 && <Badge tone="amber">{pending.get(s.id)} pending</Badge>}
                    {!s.is_published && <Badge tone="slate"><EyeOff className="size-3" /> Hidden</Badge>}
                  </div>
                  <p className="mt-1 flex items-center gap-1 truncate text-sm text-slate-600"><MapPin className="size-3.5 shrink-0" />{s.venue_name}{s.court ? ` · ${s.court}` : ""}</p>
                  <p className="mt-1 text-xs text-slate-500">{s.code} · {SKILL_LABELS[s.skill_level]} · {formatMoney(s.price_cents)}</p>
                  <CapacityMeter filled={s.filled_spots} max={s.max_players} className="mt-3" />
                </div>
                <ChevronRight className="size-5 self-center text-slate-300 group-hover:text-brand-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
