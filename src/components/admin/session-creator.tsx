"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { createSession, type ActionState } from "@/app/admin/actions";
import { SKILL_LABELS } from "@/lib/types";
import { Button } from "../ui/button";

export function SessionCreator({ recentVenues }: { recentVenues: { name: string; address: string }[] }) {
  const [state, action, pending] = useActionState(createSession, {} as ActionState);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between p-4 text-left">
        <span className="flex items-center gap-2 font-display text-lg font-semibold uppercase text-brand-900">
          <span className="grid size-7 place-items-center rounded-full bg-volt-400"><Plus className="size-4 text-brand-950" /></span>
          Quick session creator
        </span>
        <ChevronDown className={`size-5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <form ref={formRef} action={action} className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <L label="Date"><input name="date" type="date" required className="input-base" /></L>
          <L label="Start time"><input name="time" type="time" required step={900} defaultValue="19:00" className="input-base" /></L>
          <L label="Duration">
            <select name="duration_minutes" defaultValue="120" className="input-base">
              {[60, 90, 120, 150, 180].map((m) => <option key={m} value={m}>{m / 60} hr{m > 60 ? "s" : ""}</option>)}
            </select>
          </L>
          <L label="Skill requirement">
            <select name="skill_level" defaultValue="intermediate_plus" className="input-base">
              {Object.entries(SKILL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </L>
          <L label="Venue name" className="sm:col-span-2">
            <input
              name="venue_name"
              required
              list="kx-venues"
              placeholder="e.g. Downtown Community Centre"
              className="input-base"
              onChange={(e) => {
                const match = recentVenues.find((v) => v.name === e.target.value);
                if (match && addressRef.current && !addressRef.current.value) addressRef.current.value = match.address;
              }}
            />
            <datalist id="kx-venues">{recentVenues.map((v) => <option key={v.name} value={v.name} />)}</datalist>
          </L>
          <L label="Venue address" className="sm:col-span-2"><input ref={addressRef} name="venue_address" required placeholder="123 Main St, Toronto, ON" className="input-base" /></L>
          <L label="Max players"><input name="max_players" type="number" min={1} max={200} required defaultValue={18} className="input-base" /></L>
          <L label="Price ($CAD)"><input name="price" type="number" min={0} step="0.01" required defaultValue="15.00" className="input-base" /></L>
          <L label="Court (private)" hint="Sent only in approval email"><input name="court" placeholder="Court 2" className="input-base" /></L>
          <L label="Arrival info (private)" hint="Door code, entrance, parking"><input name="arrival_info" placeholder="Use north doors, code 4821" className="input-base" /></L>

          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center lg:col-span-4">
            <Button type="submit" variant="primary" size="lg" disabled={pending} className="sm:w-auto">
              {pending ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />} Publish session
            </Button>
            {state.error && <p className="text-sm font-medium text-red-700">{state.error}</p>}
            {state.success && <p className="text-sm font-medium text-emerald-700">{state.success}</p>}
          </div>
        </form>
      )}
    </section>
  );
}

function L({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
