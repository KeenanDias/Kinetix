"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Check, Clock3, FileImage, Hourglass, Loader2, Mail, MessageSquareText, Phone, RotateCcw, Users, X } from "lucide-react";
import { updateRegistrationStatus } from "@/app/admin/actions";
import { cn, formatDateTime, formatMoney } from "@/lib/format";
import {
  POSITION_LABELS,
  SKILL_LABELS,
  STATUS_LABELS,
  guestLabel,
  guestList,
  partySize,
  type Registration,
  type RegistrationStatus,
} from "@/lib/types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ReceiptModal } from "./receipt-modal";

export type RegistrationRow = Registration & { receipt_url: string | null };

const TABS: RegistrationStatus[] = ["pending", "approved", "waitlist", "rejected"];
const TAB_TONE = { pending: "amber", approved: "green", waitlist: "brand", rejected: "red" } as const;

const URL_REUSE_MS = 50 * 60 * 1000; // signed URLs are valid for 60 min

export function RegistrationsTable({ rows: incoming, spotsOpen }: { rows: RegistrationRow[]; spotsOpen: number }) {
  // Live refreshes sign new receipt URLs each time. Reuse the first one while it's still valid so
  // thumbnails don't re-download (and flicker) on every update.
  const urlCache = useRef(new Map<string, { url: string; at: number }>());
  const rows = useMemo(
    () =>
      incoming.map((r) => {
        if (!r.receipt_url) return r;
        const hit = urlCache.current.get(r.receipt_path);
        if (hit && Date.now() - hit.at < URL_REUSE_MS) return { ...r, receipt_url: hit.url };
        urlCache.current.set(r.receipt_path, { url: r.receipt_url, at: Date.now() });
        return r;
      }),
    [incoming],
  );
  const [tab, setTab] = useState<RegistrationStatus>("pending");
  const [preview, setPreview] = useState<RegistrationRow | null>(null);
  const [rejecting, setRejecting] = useState<RegistrationRow | null>(null);
  const [flash, setFlash] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Tab counts are in players, so "Approved 14" matches the 14/18 capacity meter.
  const counts = Object.fromEntries(
    TABS.map((t) => [t, rows.filter((r) => r.status === t).reduce((n, r) => n + partySize(r), 0)]),
  ) as Record<RegistrationStatus, number>;
  const visible = rows.filter((r) => r.status === tab);
  const blockedHere = visible.some((r) => (r.status === "pending" || r.status === "waitlist") && partySize(r) > spotsOpen);

  function act(r: RegistrationRow, status: RegistrationStatus, note?: string) {
    setBusyId(r.id);
    setFlash(null);
    startTransition(async () => {
      const res = await updateRegistrationStatus(r.id, status, note);
      setBusyId(null);
      setFlash(res.error ? { tone: "err", text: res.error } : { tone: "ok", text: `${r.full_name}: ${STATUS_LABELS[status]}. ${res.success ?? ""}` });
    });
  }

  const actionsFor = (r: RegistrationRow) => {
    if (busyId === r.id) return <Loader2 className="size-5 animate-spin text-slate-400" />;
    const n = partySize(r);
    const fits = n <= spotsOpen;
    return (
      <div className="flex flex-wrap gap-2">
        {(r.status === "pending" || r.status === "waitlist") && (
          <Button
            size="sm"
            variant="success"
            onClick={() => act(r, "approved")}
            disabled={!fits}
            title={fits ? undefined : `Needs ${n} spots, only ${spotsOpen} open`}
          >
            <Check className="size-4" /> Approve{n > 1 ? ` ${n}` : ""}
          </Button>
        )}
        {(r.status === "pending" || r.status === "approved") && (
          <Button size="sm" variant="outline" onClick={() => act(r, "waitlist")}>
            <Hourglass className="size-4" /> Waitlist
          </Button>
        )}
        {r.status !== "rejected" && (
          <Button size="sm" variant="danger" onClick={() => setRejecting(r)}>
            <X className="size-4" /> Reject
          </Button>
        )}
        {r.status === "rejected" && (
          <Button size="sm" variant="outline" onClick={() => act(r, "pending")}>
            <RotateCcw className="size-4" /> Restore
          </Button>
        )}
      </div>
    );
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 p-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition",
              tab === t ? "bg-brand-900 text-white" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {STATUS_LABELS[t]}
            <span className={cn("rounded-sm px-1.5 text-xs", tab === t ? "bg-brand-700" : "bg-slate-200")}>{counts[t]}</span>
          </button>
        ))}
      </div>

      {flash && (
        <p role="status" className={cn("mx-3 mt-3 rounded-md px-3 py-2 text-sm font-medium", flash.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800")}>
          {flash.text}
        </p>
      )}
      {blockedHere && (
        <p className="mx-3 mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {spotsOpen === 0
            ? "This session is full, so approvals are turned off. Move extra players to the waitlist or raise max players."
            : `Only ${spotsOpen} spot${spotsOpen === 1 ? " is" : "s are"} open. Groups larger than that can't be approved.`}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="p-10 text-center text-sm text-slate-500">No {STATUS_LABELS[tab].toLowerCase()} registrations.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold">Players</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Skill</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 font-semibold">Receipt</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{r.full_name}</p>
                      <GuestList row={r} />
                      <PlayerNote row={r} />
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 className="size-3" />{formatDateTime(r.created_at)}</p>
                      {r.admin_note && <p className="mt-1 max-w-48 text-xs italic text-slate-500">“{r.admin_note}”</p>}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${r.email}`} className="block text-brand-700 hover:underline">{r.email}</a>
                      <a href={`tel:${r.phone}`} className="block text-slate-600">{r.phone}</a>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="brand">{SKILL_LABELS[r.skill_level]}</Badge>
                      <p className="mt-1 text-xs text-slate-500">{POSITION_LABELS[r.position]}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{formatMoney(r.amount_cents)}</p>
                      {partySize(r) > 1 && <p className="text-xs text-slate-500">{partySize(r)} players</p>}
                      <p className="text-xs text-slate-500">from {r.sender_name}</p>
                    </td>
                    <td className="px-4 py-3"><ReceiptThumb row={r} onOpen={() => setPreview(r)} /></td>
                    <td className="px-4 py-3">{actionsFor(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {visible.map((r) => (
              <li key={r.id} className="flex gap-3 p-4">
                <ReceiptThumb row={r} onOpen={() => setPreview(r)} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{r.full_name}</p>
                    <Badge tone={TAB_TONE[r.status]}>{SKILL_LABELS[r.skill_level]}</Badge>
                  </div>
                  <GuestList row={r} />
                      <PlayerNote row={r} />
                  <p className="text-xs text-slate-500">{POSITION_LABELS[r.position]} · {formatDateTime(r.created_at)}</p>
                  <p className="text-sm">
                    <b>{formatMoney(r.amount_cents)}</b>
                    {partySize(r) > 1 && <span className="text-slate-500"> for {partySize(r)}</span>}
                    <span className="text-slate-500"> from {r.sender_name}</span>
                  </p>
                  <div className="flex gap-3 text-sm">
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-brand-700"><Mail className="size-3.5" />Email</a>
                    <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 text-brand-700"><Phone className="size-3.5" />{r.phone}</a>
                  </div>
                  {r.admin_note && <p className="text-xs italic text-slate-500">“{r.admin_note}”</p>}
                  <div className="pt-1">{actionsFor(r)}</div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {preview?.receipt_url && (
        <ReceiptModal
          url={preview.receipt_url}
          title={preview.full_name}
          subtitle={`Expected ${formatMoney(preview.amount_cents)}${partySize(preview) > 1 ? ` for ${partySize(preview)} players` : ""} from “${preview.sender_name}”`}
          onClose={() => setPreview(null)}
        />
      )}
      {rejecting && (
        <RejectDialog
          row={rejecting}
          onCancel={() => setRejecting(null)}
          onConfirm={(note) => {
            act(rejecting, "rejected", note);
            setRejecting(null);
          }}
        />
      )}
    </section>
  );
}

function PlayerNote({ row }: { row: RegistrationRow }) {
  if (!row.player_note) return null;
  return (
    <div className="mt-1.5 max-w-xs rounded-md border-l-4 border-volt-500 bg-volt-400/15 px-2.5 py-1.5 text-xs text-slate-800">
      <p className="flex items-center gap-1 font-semibold text-brand-900">
        <MessageSquareText className="size-3.5 shrink-0" aria-hidden /> Note from player
      </p>
      <p className="mt-0.5 whitespace-pre-line break-words">{row.player_note}</p>
    </div>
  );
}

function GuestList({ row }: { row: RegistrationRow }) {
  const guests = guestList(row);
  if (guests.length === 0) return null;
  return (
    <div className="mt-1 text-xs text-slate-600">
      <p className="flex items-center gap-1 font-semibold">
        <Users className="size-3 shrink-0" /> +{guests.length} guest{guests.length > 1 ? "s" : ""}
        {row.same_team && <Badge tone="volt" className="ml-1">Same team</Badge>}
      </p>
      <ul className="mt-0.5 space-y-0.5 pl-4">
        {guests.map((g, i) => (
          <li key={i}>{guestLabel(g)}</li>
        ))}
      </ul>
    </div>
  );
}

function ReceiptThumb({ row, onOpen }: { row: RegistrationRow; onOpen: () => void }) {
  const [broken, setBroken] = useState(false);
  if (row.receipt_deleted_at)
    return (
      <span className="grid size-16 shrink-0 place-items-center rounded-md border border-dashed border-slate-300 text-center text-[10px] leading-tight text-slate-400">
        Deleted
        <br />
        (privacy)
      </span>
    );
  if (!row.receipt_url) return <span className="text-xs text-slate-400">Missing</span>;
  return (
    <button onClick={onOpen} className="group relative size-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100" aria-label={`View receipt for ${row.full_name}`}>
      {broken ? (
        <FileImage className="m-auto size-6 text-slate-400" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.receipt_url} alt="" className="size-full object-cover transition group-hover:scale-105" onError={() => setBroken(true)} />
      )}
      <span className="absolute inset-x-0 bottom-0 bg-slate-900 py-0.5 text-center text-[10px] font-semibold text-white">View</span>
    </button>
  );
}

function RejectDialog({ row, onCancel, onConfirm }: { row: RegistrationRow; onCancel: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState("");
  const n = partySize(row);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/60 p-4 sm:place-items-center" onClick={onCancel}>
      <div className="w-full max-w-md rounded-md bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-lg font-bold text-slate-900">Reject {row.full_name}{n > 1 ? ` (+${n - 1})` : ""}?</p>
        <p className="mt-1 text-sm text-slate-600">They&apos;ll get an email. Add an optional reason (included in the email).</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          autoFocus
          placeholder="e.g. e-Transfer not received / amount didn't match"
          className="input-base mt-3"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={() => onConfirm(note)}>
            <X className="size-4" /> Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
