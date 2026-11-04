import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { QuickReview } from "@/components/admin/quick-review";
import { CapacityMeter } from "@/components/admin/capacity-meter";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, formatMoney, formatTimeRange } from "@/lib/format";
import { verifyReviewToken } from "@/lib/review-token";
import { createServiceClient } from "@/lib/supabase/admin";
import { POSITION_LABELS, SKILL_LABELS, STATUS_LABELS, type Registration, type Session } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review Registration", robots: { index: false, follow: false } };

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const verified = verifyReviewToken(decodeURIComponent(token));

  if (!verified) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-slate-900">Link expired or invalid</h1>
        <p className="mt-2 text-slate-600">Review links last 14 days. Sign in to the host portal to manage registrations.</p>
        <Link href="/admin" className="mt-4 inline-block font-semibold text-brand-700 underline">Go to host portal →</Link>
      </Shell>
    );
  }

  const svc = createServiceClient();
  const { data: reg } = await svc
    .from("registrations")
    .select("*, session:sessions(*)")
    .eq("id", verified.registrationId)
    .maybeSingle<Registration & { session: Session }>();

  if (!reg) {
    return (
      <Shell>
        <h1 className="text-xl font-bold">Registration not found</h1>
        <p className="mt-2 text-slate-600">It may have been deleted.</p>
      </Shell>
    );
  }

  const { data: signed } = await svc.storage.from("receipts").createSignedUrl(reg.receipt_path, 60 * 30);
  const s = reg.session;

  return (
    <Shell>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Registration review</p>
        <Badge tone={reg.status === "approved" ? "green" : reg.status === "rejected" ? "red" : reg.status === "waitlist" ? "brand" : "amber"}>
          {STATUS_LABELS[reg.status]}
        </Badge>
      </div>
      <h1 className="mt-1 font-display text-3xl font-bold uppercase text-brand-900">{reg.full_name}</h1>
      <p className="text-sm text-slate-600">
        {SKILL_LABELS[reg.skill_level]} · {POSITION_LABELS[reg.position]} · applied {formatDateTime(reg.created_at)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Info label="Expected">{formatMoney(reg.amount_cents)}</Info>
        <Info label="Sender name">{reg.sender_name}</Info>
        <Info label="Email"><a href={`mailto:${reg.email}`} className="text-brand-700">{reg.email}</a></Info>
        <Info label="Phone"><a href={`tel:${reg.phone}`} className="text-brand-700">{reg.phone}</a></Info>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
        <p className="flex items-center gap-1.5 font-semibold text-slate-900"><CalendarDays className="size-4 text-brand-600" />{formatDate(s.starts_at)} · {formatTimeRange(s.starts_at, s.ends_at)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-slate-600"><MapPin className="size-4 text-brand-600" />{s.venue_name}{s.court ? ` · ${s.court}` : ""}</p>
        <CapacityMeter filled={s.filled_spots} max={s.max_players} className="mt-3" />
      </div>

      {signed?.signedUrl && (
        <a href={signed.signedUrl} target="_blank" rel="noreferrer" className="mt-4 block overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={signed.signedUrl} alt="e-Transfer screenshot" className="mx-auto max-h-[60dvh] w-auto object-contain" />
          <p className="bg-white py-1.5 text-center text-xs text-slate-500">Tap to open full size</p>
        </a>
      )}

      <QuickReview token={token} status={reg.status} sessionFull={s.filled_spots >= s.max_players} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-brand-900 px-4 py-6">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center gap-2">
          <Image src="/kinetix-logo.png" alt="Kinetix" width={36} height={36} className="size-9 rounded-full" />
          <span className="font-display text-lg font-bold uppercase text-white">Kinetix <span className="text-volt-400">Host</span></span>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-2xl">{children}</div>
      </div>
    </main>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="truncate font-semibold text-slate-900">{children}</p>
    </div>
  );
}
