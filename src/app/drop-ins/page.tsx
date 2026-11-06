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
      <section className="court-lines bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-10">
          <h1 className="font-display text-6xl font-extrabold uppercase italic leading-none tracking-tight">
            The <span className="text-volt-400">schedule</span>
          </h1>
          <p className="mt-3 max-w-md text-white/75">Spots are confirmed once your e-Transfer is verified.</p>
        </div>
      </section>
      <main className="mx-auto max-w-6xl px-4 pt-6">
        <h2 className="sr-only">Sessions</h2>
        <ScheduleList sessions={sessions} />
      </main>
      <SiteFooter />
    </>
  );
}
