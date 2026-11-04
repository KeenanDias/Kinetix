"use client";

import { useActionState, useState } from "react";
import { Check, CheckCircle2, Hourglass, Loader2, X } from "lucide-react";
import { reviewByToken, type ReviewState } from "@/app/review/[token]/actions";
import type { RegistrationStatus } from "@/lib/types";
import { Button } from "../ui/button";

const DONE_COPY: Record<RegistrationStatus, string> = {
  approved: "Approved! The player has been emailed their court, location and payment confirmation.",
  rejected: "Rejected. The player has been notified.",
  waitlist: "Moved to the waitlist. The player has been notified.",
  pending: "Back to pending.",
};

export function QuickReview({ token, status, sessionFull }: { token: string; status: RegistrationStatus; sessionFull: boolean }) {
  const [state, action, pending] = useActionState(reviewByToken.bind(null, decodeURIComponent(token)), {} as ReviewState);
  const [showReject, setShowReject] = useState(false);
  const current = state.done ?? status;

  if (state.done) {
    return (
      <div className="mt-5 flex gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
        <CheckCircle2 className="size-6 shrink-0" />
        <p className="font-medium">{DONE_COPY[state.done]}</p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-5 space-y-3">
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>}
      {current !== "pending" && current !== "waitlist" && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">Already {current}. You can still change it below.</p>
      )}

      {current !== "approved" && (
        <Button name="status" value="approved" variant="success" size="lg" className="w-full text-base" disabled={pending || sessionFull}>
          {pending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
          {sessionFull ? "Session full" : "Approve — payment received"}
        </Button>
      )}

      <div className="grid grid-cols-2 gap-2">
        {current !== "waitlist" && (
          <Button name="status" value="waitlist" variant="outline" disabled={pending}>
            <Hourglass className="size-4" /> Waitlist
          </Button>
        )}
        {current !== "rejected" && (
          <Button type="button" variant="danger" onClick={() => setShowReject((v) => !v)} disabled={pending}>
            <X className="size-4" /> Reject…
          </Button>
        )}
      </div>

      {showReject && (
        <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/50 p-3">
          <textarea name="note" rows={2} placeholder="Optional reason (sent to player)" className="input-base" />
          <Button name="status" value="rejected" className="w-full border-red-600 bg-red-600 text-white hover:bg-red-700" disabled={pending}>
            Confirm reject
          </Button>
        </div>
      )}
    </form>
  );
}
