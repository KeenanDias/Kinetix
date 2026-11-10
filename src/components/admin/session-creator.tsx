"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { createSession, type ActionState } from "@/app/admin/actions";
import { Button } from "../ui/button";
import { SessionFields } from "./session-fields";

export function SessionCreator({ recentVenues }: { recentVenues: { name: string; address: string }[] }) {
  const [state, action, pending] = useActionState(createSession, {} as ActionState);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form only after a successful create, so a typo doesn't wipe everything.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between p-4 text-left">
        <h3 className="flex items-center gap-3 text-brand-900">
          <span className="grid size-7 place-items-center rounded-full bg-volt-400"><Plus className="size-4 text-brand-950" /></span>
          New session
        </h3>
        <ChevronDown className={`size-5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => action(fd));
          }}
          className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <SessionFields recentVenues={recentVenues} />
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
