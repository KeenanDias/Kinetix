"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Mail, Trash2, X } from "lucide-react";
import { deleteSession, type ActionState } from "@/app/admin/actions";
import { siteConfig } from "@/lib/config";
import { Button } from "../ui/button";

type Props = {
  sessionId: string;
  label: string; // e.g. "Wednesday, November 11 at Pakmen"
  registrations: number; // pending + approved + waitlist
  players: number; // including guests
  upcoming: boolean;
};

/** "Delete run" button + confirmation pop-up with optional cancellation email. */
export function DeleteSessionDialog({ sessionId, label, registrations, players, upcoming }: Props) {
  const [open, setOpen] = useState(false);
  const canNotify = registrations > 0 && upcoming;
  const [notify, setNotify] = useState(canNotify);
  const [confirmed, setConfirmed] = useState(false);
  const [state, action, pending] = useActionState(deleteSession.bind(null, sessionId), {} as ActionState);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (open && d && !d.open) d.showModal();
  }, [open]);

  function close() {
    if (pending) return;
    dialogRef.current?.close();
    setOpen(false);
    setConfirmed(false);
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" /> Delete run
      </Button>

      {open && (
        <dialog
          ref={dialogRef}
          onClose={close}
          onCancel={(e) => pending && e.preventDefault()}
          className="m-auto w-[min(94vw,520px)] max-h-[92dvh] overflow-auto rounded-md bg-white p-0 shadow-2xl backdrop:bg-slate-950/70"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(() => action(fd));
            }}
            className="space-y-4 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
                  <AlertTriangle className="size-5" />
                </span>
                <div>
                  <p className="text-lg font-bold text-slate-900">Delete this run?</p>
                  <p className="text-sm text-slate-600">{label}</p>
                </div>
              </div>
              <button type="button" onClick={close} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            <p className="text-sm text-slate-700">
              This removes the run from the schedule and permanently deletes its {registrations === 0 ? "details" : `${registrations} registration${registrations === 1 ? "" : "s"} and payment screenshots`}. It can&apos;t be undone.
            </p>

            {canNotify ? (
              <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input type="checkbox" name="notify" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-brand-900" />
                  <span>
                    <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <Mail className="size-4" /> Email the {registrations} registered {registrations === 1 ? "player" : "players"} that this run is cancelled
                    </span>
                    <span className="text-slate-600">
                      {players > registrations ? `Covers ${players} people including guests. ` : ""}The email tells them to contact {siteConfig.hostName} for a refund or credit toward the next run.
                    </span>
                  </span>
                </label>
                <div>
                  <label htmlFor="cancel-reason" className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Reason (included in the email)
                  </label>
                  <textarea
                    id="cancel-reason"
                    name="reason"
                    rows={3}
                    disabled={!notify}
                    placeholder="e.g. The gym closed the courts for maintenance. Sorry for the short notice!"
                    className="input-base"
                  />
                </div>
              </div>
            ) : (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {registrations === 0 ? "Nobody is registered, so no emails will be sent." : "This run has already started, so players won't be emailed."}
              </p>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm">
              <input type="checkbox" name="confirm" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-red-600" />
              <span className="font-semibold text-red-900">Yes, I want to permanently delete this run.</span>
            </label>

            {state.error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                {state.error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={close} disabled={pending}>
                Keep run
              </Button>
              <Button type="submit" variant="destructive" disabled={!confirmed || pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {notify && canNotify ? "Delete and email players" : "Delete run"}
              </Button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
