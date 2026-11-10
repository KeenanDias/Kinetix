import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <LoadingLabel>Loading session…</LoadingLabel>
      <Skeleton className="h-4 w-24" />
      <div className="grid gap-4 rounded-md bg-brand-900 p-5 md:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28 bg-brand-700" />
          <Skeleton className="h-10 w-2/3 bg-brand-700" />
          <Skeleton className="h-4 w-1/2 bg-brand-800" />
          <Skeleton className="h-4 w-3/4 bg-brand-800" />
        </div>
        <Skeleton className="h-24 bg-white" />
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
        <Skeleton className="h-9 w-80 max-w-full" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
