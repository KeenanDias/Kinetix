import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound, MapPin } from "lucide-react";
import { setSessionPublished } from "@/app/admin/actions";
import { CapacityMeter } from "@/components/admin/capacity-meter";
import { RegistrationsTable, type RegistrationRow } from "@/components/admin/registrations-table";
import { formatDate, formatMoney, formatTimeRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { SKILL_LABELS, type Registration, type Session } from "@/lib/types";

export default async function AdminSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle<Session>();
  if (!session) notFound();

  const { data: regs } = await supabase
    .from("registrations")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true })
    .returns<Registration[]>();

  // Private bucket: create short-lived signed URLs (RLS: admins only).
  const paths = (regs ?? []).map((r) => r.receipt_path);
  const { data: signed } = paths.length ? await supabase.storage.from("receipts").createSignedUrls(paths, 60 * 60) : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const rows: RegistrationRow[] = (regs ?? []).map((r) => ({ ...r, receipt_url: urlByPath.get(r.receipt_path) ?? null }));
  const togglePublish = setSessionPublished.bind(null, session.id, !session.is_published);

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-800">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>

      <section className="grid gap-4 rounded-2xl bg-brand-900 p-5 text-white md:grid-cols-[1fr_260px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-volt-300">{session.code}</p>
          <h1 className="mt-1 font-display text-3xl font-bold uppercase">{formatDate(session.starts_at, { weekday: "long", month: "long" })}</h1>
          <p className="text-white/80">{formatTimeRange(session.starts_at, session.ends_at)} · {SKILL_LABELS[session.skill_level]} · {formatMoney(session.price_cents)}</p>
          <p className="mt-3 flex items-start gap-1.5 text-sm text-white/85"><MapPin className="mt-0.5 size-4 shrink-0 text-volt-400" />{session.venue_name}, {session.venue_address}{session.court ? ` · ${session.court}` : ""}</p>
          {session.arrival_info && <p className="mt-1 flex items-start gap-1.5 text-sm text-white/85"><KeyRound className="mt-0.5 size-4 shrink-0 text-volt-400" />{session.arrival_info}</p>}
          <form action={togglePublish} className="mt-4">
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20">
              {session.is_published ? <><EyeOff className="size-4" /> Hide from public</> : <><Eye className="size-4" /> Publish</>}
            </button>
          </form>
        </div>
        <div className="rounded-xl bg-white p-4 text-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Spots filled</p>
          <CapacityMeter filled={session.filled_spots} max={session.max_players} className="mt-1" />
        </div>
      </section>

      <RegistrationsTable rows={rows} sessionFull={session.filled_spots >= session.max_players} />
    </div>
  );
}
