import { ScheduleList } from "@/components/schedule-list";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getUpcomingSessions } from "@/lib/sessions";

export const revalidate = 30;
export const metadata = { title: "Drop-in Schedule" };

export default async function DropInsPage() {
  const sessions = await getUpcomingSessions();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pt-8">
        <h1 className="font-display text-4xl font-bold uppercase text-brand-900">Drop-in schedule</h1>
        <p className="mb-6 mt-1 text-slate-600">Spots are confirmed once your e-Transfer is verified.</p>
        <ScheduleList sessions={sessions} />
      </main>
      <SiteFooter />
    </>
  );
}
