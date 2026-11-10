"use client";

import { startTransition, useActionState, useState } from "react";
import { ChevronDown, Loader2, Mail, Pencil, Save } from "lucide-react";
import { updateSession, type ActionState } from "@/app/admin/actions";
import { zonedInputParts } from "@/lib/format";
import type { Session } from "@/lib/types";
import { Button } from "../ui/button";
import { L, SessionFields } from "./session-fields";

/** Edit form for an upcoming session. Emails registered players about player-facing changes. */
export function SessionEditor({ session, registeredCount }: { session: Session; registeredCount: number }) {
  const [state, action, pending] = useActionState(updateSession.bind(null, session.id), {} as ActionState);
  const [open, setOpen] = useState(false);
  const { date, time } = zonedInputParts(session.starts_at);
  const durationMinutes = Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60_000);

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between p-4 text-left" aria-expanded={open}>
        <h3 className="flex items-center gap-3 text-brand-900">
          <span className="grid size-7 place-items-center rounded-full bg-volt-400"><Pencil className="size-4 text-brand-950" /></span>
          Edit session details
        </h3>
        <ChevronDown className={`size-5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {(state.error || state.success) && !open && (
        <p className={`mx-4 mb-4 rounded-md px-3 py-2 text-sm font-medium ${state.error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
          {state.error ?? state.success}
        </p>
      )}

      {open && (
        <form
          // Re-key on save so inputs pick up the saved values as their new defaults.
          key={`${session.starts_at}|${session.venue_name}|${session.max_players}|${session.price_cents}`}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => action(fd));
          }}
          className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <SessionFields
            defaults={{
              date,
              time,
              durationMinutes,
              skill_level: session.skill_level,
              venue_name: session.venue_name,
              venue_address: session.venue_address,
              max_players: session.max_players,
              price: (session.price_cents / 100).toFixed(2),
              court: session.court,
              arrival_info: session.arrival_info,
            }}
          />
          <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-4">
            Changing the price only affects new sign-ups. Players who already registered keep the amount they paid.
          </p>

          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:col-span-2 lg:col-span-4">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="notify" defaultChecked className="mt-0.5 size-5 shrink-0 accent-brand-900" />
              <span>
                <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Mail className="size-4" /> Email registered players about the changes
                </span>
                <span className="text-slate-600">
                  {registeredCount === 0
                    ? "No one is registered yet."
                    : `Goes to ${registeredCount} registration${registeredCount === 1 ? "" : "s"} (pending, approved and waitlist). Court and arrival changes only go to approved players.`}
                </span>
              </span>
            </label>
            <L label="Message to players (optional)">
              <textarea name="message" rows={2} placeholder="e.g. The gym moved us to a later slot. Sorry for the short notice!" className="input-base" />
            </L>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center lg:col-span-4">
            <Button type="submit" variant="primary" size="lg" disabled={pending} className="sm:w-auto">
              {pending ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />} Save changes
            </Button>
            {state.error && <p className="text-sm font-medium text-red-700">{state.error}</p>}
            {state.success && <p className="text-sm font-medium text-emerald-700">{state.success}</p>}
          </div>
        </form>
      )}
    </section>
  );
}
