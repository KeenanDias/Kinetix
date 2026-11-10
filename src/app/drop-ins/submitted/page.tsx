import Link from "next/link";
import { CheckCircle2, Inbox, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { buttonClasses } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";

export const metadata = { title: "Application Submitted" };

export default function SubmittedPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-14 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-emerald-50">
          <CheckCircle2 className="size-11 text-emerald-600" />
        </div>
        <h1 className="mt-6 text-brand-900">Application Submitted</h1>
        <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-volt-400/25 px-3 py-1 text-sm font-semibold text-amber-800">
          Pending {siteConfig.hostName}&apos;s Review
        </p>
        <p className="mt-5 text-slate-600">
          You will receive an email once your spot and payment are verified. Your confirmation will include the court, location and the amount
          you paid.
        </p>
        <ul className="mt-8 w-full space-y-3 text-left text-sm">
          <li className="flex gap-3 rounded-md border border-slate-200 bg-white p-4">
            <Inbox className="size-5 shrink-0 text-brand-700" />
            <span>We just sent a &quot;received&quot; email. Check spam/promotions if you don&apos;t see it.</span>
          </li>
          <li className="flex gap-3 rounded-md border border-slate-200 bg-white p-4">
            <ShieldCheck className="size-5 shrink-0 text-brand-700" />
            <span>Your screenshot is stored privately and only visible to the Kinetix host.</span>
          </li>
        </ul>
        <Link href="/drop-ins" className={buttonClasses("outline", "lg", "mt-8")}>
          Back to schedule
        </Link>
      </main>
    </>
  );
}
