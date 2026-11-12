"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Copy, ImageUp, Loader2, Send, Trash2, UserPlus, X } from "lucide-react";
import { startReceiptUpload, submitRegistration, type RegisterState } from "@/app/drop-ins/actions";
import { getBrowserClient } from "@/lib/supabase/client";
import { MAX_RECEIPT_BYTES, RECEIPT_MIME_TYPES, siteConfig } from "@/lib/config";
import { cn, formatMoney, spotsLeft } from "@/lib/format";
import { MAX_GUESTS, MAX_PLAYER_NOTE, POSITION_LABELS, SKILL_LABELS, type PublicSession } from "@/lib/types";
import { Button } from "./ui/button";

type FieldName = keyof NonNullable<RegisterState["fieldErrors"]>;
type Guest = { id: number; name: string; position: string };

export function RegistrationForm({ session }: { session: PublicSession }) {
  const [state, formAction, pending] = useActionState(submitRegistration.bind(null, session.id), {} as RegisterState);
  const [name, setName] = useState("");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [playerNote, setPlayerNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploaded = useRef<{ file: File; registrationId: string; path: string } | null>(null);
  const busy = pending || uploading;
  const fileInput = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const nextGuestId = useRef(1);

  const fe = state.fieldErrors ?? {};
  const maxGuests = Math.max(0, Math.min(MAX_GUESTS, spotsLeft(session) - 1));
  const players = 1 + guests.length;
  const total = session.price_cents * players;
  const note = `${session.code} - ${name.trim() || "Your Name"}${guests.length ? ` +${guests.length}` : ""}`;

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (state.error || state.fieldErrors) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  function pickFile(f: File | undefined) {
    setFileError(null);
    if (!f) return;
    if (!RECEIPT_MIME_TYPES.includes(f.type)) return setFileError("Please upload an image (JPG, PNG, WEBP or HEIC).");
    if (f.size > MAX_RECEIPT_BYTES) return setFileError("That image is over 5 MB. Try a cropped screenshot.");
    setFile(f);
  }

  function addGuest() {
    if (guests.length >= maxGuests) return;
    const id = nextGuestId.current++;
    setGuests((g) => [...g, { id, name: "", position: "" }]);
    // Focus the new input once it renders.
    requestAnimationFrame(() => document.getElementById(`guest-${id}`)?.focus());
  }

  function updateGuest(id: number, patch: Partial<Omit<Guest, "id">>) {
    setGuests((all) => all.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  // If the server says the screenshot is missing, upload it again on the next submit.
  useEffect(() => {
    if (state.fieldErrors?.receipt) uploaded.current = null;
  }, [state]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Submit via transition (not <form action>) so React doesn't reset the form if validation fails.
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("receipt_picker");
    setFileError(null);
    if (!file) {
      setFileError("Upload your e-Transfer screenshot.");
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // 1) Upload the screenshot straight to private storage (reused if they resubmit with the same file).
    let done = uploaded.current?.file === file ? uploaded.current : null;
    if (!done) {
      setUploading(true);
      try {
        const ticket = await startReceiptUpload(session.id, file.type, file.size);
        if ("error" in ticket) {
          setFileError(ticket.error);
          return;
        }
        const { error } = await getBrowserClient()
          .storage.from("receipts")
          .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
        if (error) {
          setFileError("We couldn't upload your screenshot. Check your connection and try again.");
          return;
        }
        done = { file, registrationId: ticket.registrationId, path: ticket.path };
        uploaded.current = done;
      } catch {
        setFileError("We couldn't upload your screenshot. Check your connection and try again.");
        return;
      } finally {
        setUploading(false);
      }
    }

    // 2) Send the form (text only) with a reference to the uploaded screenshot.
    fd.set("registration_id", done.registrationId);
    fd.set("receipt_path", done.path);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6 space-y-6">
      <div ref={errorRef}>
        {(state.error || Object.keys(fe).length > 0 || fileError) && (
          <div role="alert" className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="size-5 shrink-0" />
            <p>{state.error ?? "Please fix the highlighted fields below."}</p>
          </div>
        )}
      </div>

      {/* Honeypot */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <Card step={1} title="Your details">
        <Field label="Full name" name="full_name" error={fe.full_name}>
          <input id="full_name" name="full_name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!fe.full_name} className="input-base" placeholder="Jordan Lee" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email address" name="email" error={fe.email}>
            <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required aria-invalid={!!fe.email} className="input-base" placeholder="you@email.com" />
          </Field>
          <Field label="Phone number" name="phone" error={fe.phone}>
            <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required aria-invalid={!!fe.phone} className="input-base" placeholder="(416) 555-0123" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your skill level" name="skill_level" error={fe.skill_level}>
            <select id="skill_level" name="skill_level" required defaultValue="" aria-invalid={!!fe.skill_level} className="input-base">
              <option value="" disabled>Select…</option>
              {Object.entries(SKILL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Preferred position" name="position" error={fe.position}>
            <select id="position" name="position" defaultValue="any" aria-invalid={!!fe.position} className="input-base">
              {Object.entries(POSITION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card step={2} title="Bringing friends?">
        <p className="-mt-1 text-sm text-slate-600">
          Pay for friends in the same e-Transfer. Add each player&apos;s full name and position, and they&apos;ll be on the list with you.
          {maxGuests < MAX_GUESTS && maxGuests > 0 && <> Only {maxGuests + 1} spots left, so you can add up to {maxGuests}.</>}
        </p>
        {guests.length > 0 && (
          <ol className="space-y-3">
            {guests.map((g, i) => (
              <li key={g.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Player {i + 2}</span>
                  <button
                    type="button"
                    onClick={() => setGuests((all) => all.filter((x) => x.id !== g.id))}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove player ${i + 2}`}
                  >
                    <Trash2 className="size-4" /> Remove
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_200px]">
                  <div>
                    <label htmlFor={`guest-${g.id}`} className="sr-only">Player {i + 2} full name</label>
                    <input
                      id={`guest-${g.id}`}
                      name="guest_name"
                      value={g.name}
                      onChange={(e) => updateGuest(g.id, { name: e.target.value })}
                      autoComplete="off"
                      placeholder="Friend's full name"
                      aria-invalid={!!fe.guests && g.name.trim().length < 2}
                      className="input-base"
                    />
                  </div>
                  <div>
                    <label htmlFor={`guest-pos-${g.id}`} className="sr-only">Player {i + 2} position</label>
                    <select
                      id={`guest-pos-${g.id}`}
                      name="guest_position"
                      value={g.position}
                      onChange={(e) => updateGuest(g.id, { position: e.target.value })}
                      aria-invalid={!!fe.guests && !g.position}
                      className="input-base"
                    >
                      <option value="" disabled>Position…</option>
                      {Object.entries(POSITION_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
        {guests.length > 0 && (
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-brand-200 bg-brand-50 p-4 text-sm">
            <input type="checkbox" name="same_team" className="mt-0.5 size-5 shrink-0 accent-brand-900" />
            <span>
              <span className="font-semibold text-slate-900">Keep us on the same team</span>
              <span className="block text-slate-600">
                {siteConfig.hostName} will try to put your group together. Teams are also balanced by skill, so this isn&apos;t guaranteed.
              </span>
            </span>
          </label>
        )}
        {fe.guests && <p className="text-sm font-medium text-red-700">{fe.guests}</p>}
        {maxGuests > 0 ? (
          <Button type="button" variant="outline" onClick={addGuest} disabled={guests.length >= maxGuests} className="w-full sm:w-auto">
            <UserPlus className="size-4" /> {guests.length >= maxGuests ? "No more spots to add" : "Add a player"}
          </Button>
        ) : (
          <p className="text-sm text-slate-500">Only one spot is left, so guests can&apos;t be added to this session.</p>
        )}
        <div className="flex items-center justify-between rounded-md bg-slate-100 px-4 py-3 text-sm">
          <span className="text-slate-600">
            {players} player{players > 1 ? "s" : ""} × {formatMoney(session.price_cents)}
          </span>
          <span className="font-display text-lg font-bold text-brand-900">{formatMoney(total)}</span>
        </div>
      </Card>

      <Card step={3} title="Payment">
        <div className="rounded-md bg-brand-900 p-4 text-white">
          <p className="text-sm text-white/80">Send an Interac e-Transfer of</p>
          <p className="font-display text-4xl font-extrabold tracking-tight text-volt-400">{formatMoney(total)}</p>
          {players > 1 && <p className="text-sm text-white/70">for {players} players</p>}
          <dl className="mt-4 space-y-2">
            <CopyRow label="To" value={siteConfig.etransfer.email} />
            <CopyRow label="Message / note" value={note} />
            <CopyRow label="Security question" value={siteConfig.etransfer.question} copyable={false} />
            <CopyRow label="Answer" value={siteConfig.etransfer.answer} />
          </dl>
          <p className="mt-3 text-xs text-white/70">The answer is all lowercase. If autodeposit is on, you won&apos;t be asked for it.</p>
        </div>

        <Field label="Name on the sending bank account" name="sender_name" error={fe.sender_name} hint="This helps us match your transfer. If a friend or parent paid, enter their name.">
          <input id="sender_name" name="sender_name" required autoComplete="off" aria-invalid={!!fe.sender_name} className="input-base" placeholder="e.g. Jordan Lee" />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-800">e-Transfer confirmation screenshot</p>
          {preview && file ? (
            <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Receipt preview" className="mx-auto max-h-72 object-contain" />
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2 text-sm">
                <span className="truncate text-slate-700">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-slate-600 hover:bg-slate-100">
                  <X className="size-4" /> Replace
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); }}
              className={cn(
                "flex w-full flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-8 text-center transition",
                dragging ? "border-brand-500 bg-brand-50" : fe.receipt || fileError ? "border-red-300 bg-red-50" : "border-slate-300 bg-slate-50 hover:border-brand-400",
              )}
            >
              <ImageUp className="size-8 text-brand-600" />
              <span className="mt-2 font-semibold text-slate-900">Tap to upload screenshot</span>
              <span className="text-xs text-slate-500">JPG, PNG or HEIC · max 5 MB</span>
            </button>
          )}
          <input ref={fileInput} type="file" name="receipt_picker" accept={RECEIPT_MIME_TYPES.join(",")} className="sr-only" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
          {(fileError || fe.receipt) && <p className="mt-1.5 text-sm font-medium text-red-700">{fileError ?? fe.receipt}</p>}
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor="player_note" className="text-sm font-semibold text-slate-800">
              Note for {siteConfig.hostName} <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <span className={cn("text-xs tabular-nums", playerNote.length > MAX_PLAYER_NOTE ? "font-semibold text-red-700" : "text-slate-500")}>
              {playerNote.length}/{MAX_PLAYER_NOTE}
            </span>
          </div>
          <textarea
            id="player_note"
            name="player_note"
            rows={3}
            value={playerNote}
            onChange={(e) => setPlayerNote(e.target.value)}
            maxLength={MAX_PLAYER_NOTE}
            aria-invalid={!!fe.player_note}
            placeholder="e.g. I might be 10 minutes late, or my friend sent the e-Transfer for both of us."
            className="input-base"
          />
          {fe.player_note ? (
            <p className="mt-1.5 text-sm font-medium text-red-700">{fe.player_note}</p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-500">Only {siteConfig.hostName} sees this, when reviewing your registration.</p>
          )}
        </div>

        <label className={cn("flex cursor-pointer gap-3 rounded-md border p-4 text-sm", fe.waiver ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50")}>
          <input type="checkbox" name="waiver" required className="mt-0.5 size-5 shrink-0 accent-brand-900" />
          <span>
            <span className="font-semibold text-slate-900">I agree to the facility rules &amp; liability waiver{players > 1 ? " on behalf of everyone I'm registering" : ""}.</span>{" "}
            <span className="text-slate-600">I understand volleyball involves risk of injury and I participate at my own risk.</span>
            {fe.waiver && <span className="mt-1 block font-medium text-red-700">{fe.waiver}</span>}
          </span>
        </label>
      </Card>

      <Button type="submit" variant="volt" size="lg" disabled={busy} className="w-full text-base">
        {uploading ? (<><Loader2 className="size-5 animate-spin" /> Uploading screenshot…</>) : pending ? (<><Loader2 className="size-5 animate-spin" /> Submitting…</>) : (<><Send className="size-5" /> Submit registration{players > 1 ? ` for ${players} players` : ""}</>)}
      </Button>
      <p className="text-center text-xs text-slate-500">
        Your spot is confirmed only after {siteConfig.hostName} verifies your payment. Your details and screenshot are handled as
        described in our{" "}
        <a href="/privacy" target="_blank" className="font-semibold text-brand-700 underline underline-offset-2">Privacy Policy</a>
        .{guests.length > 0 ? " By adding friends, you confirm they're okay with sharing their names." : ""}
      </p>
    </form>
  );
}

function Card({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-3 text-brand-900">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-volt-400 text-sm tracking-normal text-brand-950">{step}</span>
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, name, error, hint, children }: { label: string; name: FieldName; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</label>
      {children}
      {error ? <p className="mt-1.5 text-sm font-medium text-red-700">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function CopyRow({ label, value, copyable = true }: { label: string; value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-brand-700 bg-brand-800 px-3 py-2">
      <div className="min-w-0">
        <dt className="text-xs text-white/70">{label}</dt>
        <dd className="truncate font-semibold">{value}</dd>
      </div>
      {copyable && (
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-brand-600 bg-brand-900 px-2 py-1 text-xs font-semibold hover:bg-brand-700"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="size-3.5 text-volt-400" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}
