import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <LoadingLabel>Loading dashboard…</LoadingLabel>
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
