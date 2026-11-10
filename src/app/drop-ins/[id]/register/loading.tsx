import { SiteHeader } from "@/components/site-header";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pt-6">
        <LoadingLabel>Loading session…</LoadingLabel>
        <Skeleton className="h-4 w-24" />
        <div className="mt-4 space-y-3 rounded-md bg-brand-900 p-5">
          <Skeleton className="h-3 w-32 bg-brand-700" />
          <Skeleton className="h-10 w-2/3 bg-brand-700" />
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-4 w-40 bg-brand-800" />
            ))}
          </div>
        </div>
        <Skeleton className="mt-6 h-40 w-full" />
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="mt-6 space-y-4 rounded-md border border-slate-200 bg-white p-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-12 w-full" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </div>
        ))}
      </main>
    </>
  );
}
