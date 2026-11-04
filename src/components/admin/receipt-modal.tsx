"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";

export function ReceiptModal({ url, title, subtitle, onClose }: { url: string; title: string; subtitle?: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // No close() in cleanup: it fires the dialog's `close` event, which would call onClose
    // and unmount the modal (React re-runs effects in dev). Unmounting removes it anyway.
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(92vw,640px)] max-h-[92dvh] overflow-hidden rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{title}</p>
          {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <a href={url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Open full size">
            <ExternalLink className="size-5" />
          </a>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
      </div>
      <div className="max-h-[calc(92dvh-60px)] overflow-auto bg-slate-100 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`e-Transfer receipt: ${title}`} className="mx-auto h-auto max-w-full rounded-lg" />
      </div>
    </dialog>
  );
}
