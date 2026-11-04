import { cn } from "@/lib/format";

export function CapacityMeter({ filled, max, className }: { filled: number; max: number; className?: string }) {
  const pct = Math.min(100, Math.round((filled / max) * 100));
  const full = filled >= max;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-2xl font-bold text-brand-900">
          {filled}<span className="text-slate-400">/{max}</span>
        </span>
        <span className={cn("text-xs font-semibold", full ? "text-red-600" : "text-slate-500")}>{full ? "FULL" : `${max - filled} open`}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={cn("h-full rounded-full", full ? "bg-red-500" : pct >= 80 ? "bg-volt-400" : "bg-brand-500")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
