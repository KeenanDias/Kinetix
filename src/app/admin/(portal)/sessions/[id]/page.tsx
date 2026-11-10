import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, MapPin } from "lucide-react";
import { setSessionPublished } from "@/app/admin/actions";
import { CapacityMeter } from "@/components/admin/capacity-meter";
import { RegistrationsTable, type RegistrationRow } from "@/components/admin/registrations-table";
import { DeleteSessionDialog } from "@/components/admin/delete-session-dialog";
import { SessionEditor } from "@/components/admin/session-editor";
import { formatDate, formatMoney, formatTimeRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { SKILL_LABELS, partySize, type Registration, type Session } from "@/lib/types";

export default async function AdminSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Session and its registrations load in parallel.
  const [{ data: session }, { data: regs }] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", id).maybeSingle<Session>(),
    supabase.from("registrations").select("*").eq("session_id", id).order("created_at", { ascending: true }).returns<Registration[]>(),
  ]);
  if (!session) notFound();

  // Private bucket: create short-lived signed URLs (RLS: admins only).
  const paths = (regs ?? []).filter((r) => !r.receipt_deleted_at).map((r) => r.receipt_path);
  const { data: signed } = paths.length ? await supabase.storage.from("receipts").createSignedUrls(paths, 60 * 60) : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const rows: RegistrationRow[] = (regs ?? []).map((r) => ({ ...r, receipt_url: urlByPath.get(r.receipt_path) ?? null }));
  const togglePublish = setSessionPublished.bind(null, session.id, !session.is_published);
  const upcoming = new Date(session.starts_at) > new Date();
  const active = rows.filter((r) => r.status !== "rejected");
  const registeredCount = active.length;

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-800">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>

      <section className="grid gap-4 rounded-md bg-brand-900 p-5 text-white md:grid-cols-[1fr_260px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-volt-300">{session.code}</p>
          <h1 className="mt-1 text-white">{formatDate(session.starts_at, { weekday: "long", month: "long" })}</h1>
          <p className="mt-1 text-white/85">{formatTimeRange(session.starts_at, session.ends_at)} · {SKILL_LABELS[session.skill_level]} · {formatMoney(session.price_cents)} per player</p>
          <p className="mt-3 flex items-start gap-1.5 text-sm text-white/85"><MapPin className="mt-0.5 size-4 shrink-0 text-volt-400" />{session.venue_name}, {session.venue_address}{session.court ? ` · ${session.court}` : ""}</p>
          {session.arrival_info && <p className="mt-1 flex items-start gap-1.5 text-sm text-white/85"><KeyRound className="mt-0.5 size-4 shrink-0 text-volt-400" />{session.arrival_info}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <form action={togglePublish}>
              <button className="inline-flex h-11 items-center gap-1.5 rounded-md border border-brand-600 bg-brand-800 px-3 text-sm font-medium hover:bg-brand-700">
                {session.is_published ? <><EyeOff className="size-4" /> Hide from public</> : <><Eye className="size-4" /> Publish</>}
              </button>
            </form>
            <DeleteSessionDialog
              sessionId={session.id}
              label={`${formatDate(session.starts_at, { weekday: "long", month: "long" })} at ${session.venue_name}`}
              registrations={active.length}
              players={active.reduce((n, r) => n + partySize(r), 0)}
              upcoming={upcoming}
            />
          </div>
        </div>
        <div className="rounded-md bg-white p-4 text-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Spots filled</p>
          <CapacityMeter filled={session.filled_spots} max={session.max_players} className="mt-1" />
        </div>
      </section>

      {upcoming ? (
        <SessionEditor session={session} registeredCount={registeredCount} />
      ) : (
        <p className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <Lock className="size-4" /> This session has started, so its details can no longer be edited.
        </p>
      )}

      <RegistrationsTable rows={rows} spotsOpen={Math.max(0, session.max_players - session.filled_spots)} />
    </div>
  );
}
