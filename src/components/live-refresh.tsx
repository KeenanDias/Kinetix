"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

type Props = {
  /** Background re-check interval while the tab is visible. */
  everyMs: number;
  /** Admin only: refresh instantly when rows in this table change (Supabase Realtime, RLS-filtered). */
  realtimeTable?: "registrations";
};

const MIN_GAP_MS = 4_000;

/**
 * Keeps server-rendered data fresh without a full page reload.
 * router.refresh() re-fetches only the server data; React keeps client state,
 * so anything typed into a form stays put. Pauses while the tab is hidden.
 */
export function LiveRefresh({ everyMs, realtimeTable }: Props) {
  const router = useRouter();
  const last = useRef(Date.now());

  useEffect(() => {
    const refresh = (force = false) => {
      if (document.visibilityState !== "visible") return;
      if (!force && Date.now() - last.current < MIN_GAP_MS) return;
      last.current = Date.now();
      startTransition(() => router.refresh());
    };

    const timer = window.setInterval(() => refresh(), everyMs);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    const onOnline = () => refresh(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onOnline);

    // Instant updates for admins. If Realtime isn't enabled, the interval above still covers it.
    let stopRealtime: (() => void) | undefined;
    if (realtimeTable) {
      const supabase = getBrowserClient();
      let debounce: number | undefined;
      const channel = supabase
        .channel(`live-${realtimeTable}`)
        .on("postgres_changes", { event: "*", schema: "public", table: realtimeTable }, () => {
          // Several rows can change at once (e.g. approve + capacity); refresh once.
          window.clearTimeout(debounce);
          debounce = window.setTimeout(() => refresh(true), 400);
        })
        .subscribe();
      stopRealtime = () => {
        window.clearTimeout(debounce);
        void supabase.removeChannel(channel);
      };
    }

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onOnline);
      stopRealtime?.();
    };
  }, [router, everyMs, realtimeTable]);

  return null;
}
