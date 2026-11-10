import { cn } from "@/lib/format";

/** Grey placeholder block shown while a page's data loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-slate-200", className)} />;
}

/** Screen-reader text for loading states. */
export function LoadingLabel({ children = "Loading…" }: { children?: string }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}
