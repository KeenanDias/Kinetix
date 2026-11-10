import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { RETENTION, siteConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy Policy" };

const LAST_UPDATED = "November 10, 2026";

export default function PrivacyPage() {
  const host = siteConfig.hostName;
  const contact = siteConfig.contactEmail;
  const contactLink = contact ? (
    <a href={`mailto:${contact}`} className="font-semibold text-brand-700 underline underline-offset-2">{contact}</a>
  ) : (
    "replying to any email we've sent you"
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pt-10">
        <h1 className="text-brand-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {LAST_UPDATED}</p>

        <div className="mt-8 space-y-10 text-slate-700 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:mt-3 [&_ul]:space-y-1.5">
          <Section title="Who we are">
            <p>
              Kinetix Volleyball runs volleyball drop-in sessions. Registrations are reviewed by {host}, who is responsible for the
              personal information collected on this site. Questions or requests: {contactLink}.
            </p>
          </Section>

          <Section title="What we collect">
            <p>When you register for a session, we collect:</p>
            <ul>
              <li>Your full name, email address and phone number</li>
              <li>Your skill level and preferred position</li>
              <li>The full names of any friends you register and pay for</li>
              <li>The name on the bank account that sent the e-Transfer</li>
              <li>A screenshot of your e-Transfer confirmation</li>
            </ul>
            <p className="mt-3">
              We don&apos;t collect banking details, card numbers or passwords, and we don&apos;t use advertising or tracking cookies.
              The host portal uses a login cookie for admins only.
            </p>
          </Section>

          <Section title="Why we collect it">
            <ul>
              <li>To confirm your spot and match your e-Transfer to your registration</li>
              <li>To email you about your registration: received, approved, waitlisted, rejected, or session changes</li>
              <li>To contact you on the day if something changes (for example a gym closure)</li>
              <li>To keep teams balanced by skill level</li>
              <li>To handle refunds</li>
            </ul>
            <p className="mt-3">We only email you about sessions you registered for. We don&apos;t send marketing emails and never sell your information.</p>
          </Section>

          <Section title="Registering friends">
            <p>
              If you register friends, you confirm they&apos;re okay with you giving us their name. We only store their names. All
              emails about the booking go to you.
            </p>
          </Section>

          <Section title="Who can see it">
            <p>
              Only the Kinetix host who reviews registrations. Payment screenshots are stored privately and are never visible to
              other players or the public. The public schedule shows only how many spots are filled, never names.
            </p>
            <p className="mt-3">We use these services to run the site. They store or process data for us and may keep it on servers outside Canada:</p>
            <ul>
              <li><b>Supabase</b>: database and private storage of screenshots</li>
              <li><b>Resend</b>: sends our emails</li>
              <li><b>Cloudflare</b>: hosts the website</li>
            </ul>
          </Section>

          <Section title="How long we keep it">
            <ul>
              <li>Payment screenshots are deleted automatically <b>{RETENTION.receiptDaysAfterSession} days</b> after the session.</li>
              <li>
                All other registration details are deleted automatically <b>{RETENTION.dataMonthsAfterSession} months</b> after the
                session.
              </li>
            </ul>
          </Section>

          <Section title="Your choices">
            <p>
              You can ask to see, correct or delete your information at any time by contacting {contactLink}. If you delete it before a
              session, we&apos;ll cancel that registration. You can also contact us with any privacy concerns, and we&apos;ll respond
              within 30 days.
            </p>
          </Section>

          <Section title="Changes">
            <p>If we change this policy, we&apos;ll update the date at the top of this page.</p>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-brand-900">{title}</h2>
      {children}
    </section>
  );
}
