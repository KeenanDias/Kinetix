"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Copy, ImageUp, Loader2, Send, X } from "lucide-react";
import { submitRegistration, type RegisterState } from "@/app/drop-ins/actions";
import { MAX_RECEIPT_BYTES, RECEIPT_MIME_TYPES, siteConfig } from "@/lib/config";
import { cn, formatMoney } from "@/lib/format";
import { POSITION_LABELS, SKILL_LABELS, type PublicSession } from "@/lib/types";
import { Button } from "./ui/button";

type FieldName = keyof NonNullable<RegisterState["fieldErrors"]>;

export function RegistrationForm({ session }: { session: PublicSession }) {
  const [state, formAction, pending] = useActionState(submitRegistration.bind(null, session.id), {} as RegisterState);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const fe = state.fieldErrors ?? {};
  const amount = formatMoney(session.price_cents);
  const note = `${session.code} - ${name.trim() || "Your Name"}`;

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

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Submit via transition (not <form action>) so React doesn't reset the form if validation fails.
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("receipt_picker");
    if (file) fd.set("receipt", file);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6 space-y-6">
      <div ref={errorRef}>
        {(state.error || Object.keys(fe).length > 0) && (
          <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
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
        <label className={cn("flex cursor-pointer gap-3 rounded-xl border p-4 text-sm", fe.waiver ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50")}>
          <input type="checkbox" name="waiver" required className="mt-0.5 size-5 shrink-0 rounded accent-brand-900" />
          <span>
            <span className="font-semibold text-slate-900">I agree to the facility rules &amp; liability waiver.</span>{" "}
            <span className="text-slate-600">I understand volleyball involves risk of injury and I participate at my own risk.</span>
            {fe.waiver && <span className="mt-1 block font-medium text-red-700">{fe.waiver}</span>}
          </span>
        </label>
      </Card>

      <Card step={2} title="Payment">
        <div className="rounded-xl bg-brand-900 p-4 text-white">
          <p className="text-sm text-white/80">Send an Interac e-Transfer of</p>
          <p className="font-display text-4xl font-bold text-volt-400">{amount}</p>
          <dl className="mt-4 space-y-2.5 text-sm">
            <CopyRow label="To" value={siteConfig.etransfer.email} />
            <CopyRow label="Message / note" value={note} />
            <CopyRow label="Security question" value={siteConfig.etransfer.question} copyable={false} />
            <CopyRow label="Answer" value={siteConfig.etransfer.answer} />
          </dl>
          <p className="mt-3 text-xs text-white/60">The answer is all lowercase. If autodeposit is on, you won&apos;t be asked for it.</p>
        </div>

        <Field label="Name on the sending bank account" name="sender_name" error={fe.sender_name} hint="So we can match your transfer — if a friend or parent paid, enter their name.">
          <input id="sender_name" name="sender_name" required autoComplete="off" aria-invalid={!!fe.sender_name} className="input-base" placeholder="e.g. Jordan Lee" />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-800">e-Transfer confirmation screenshot</p>
          {preview && file ? (
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Receipt preview" className="mx-auto max-h-72 object-contain" />
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2 text-sm">
                <span className="truncate text-slate-700">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-slate-600 hover:bg-slate-100">
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
                "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
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
      </Card>

      <Button type="submit" variant="volt" size="lg" disabled={pending} className="w-full text-base">
        {pending ? (<><Loader2 className="size-5 animate-spin" /> Submitting…</>) : (<><Send className="size-5" /> Submit registration</>)}
      </Button>
      <p className="text-center text-xs text-slate-500">Your spot is confirmed only after {siteConfig.hostName} verifies your payment.</p>
    </form>
  );
}

function Card({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2.5 font-display text-xl font-semibold uppercase text-brand-900">
        <span className="grid size-7 place-items-center rounded-full bg-volt-400 text-sm text-brand-950">{step}</span>
        {title}
      </h2>
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
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2">
      <div className="min-w-0">
        <dt className="text-xs text-white/60">{label}</dt>
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
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="size-3.5 text-volt-400" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}
