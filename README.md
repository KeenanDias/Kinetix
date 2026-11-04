# Kinetix Volleyball Drop-ins

A mobile-first site for booking volleyball drop-ins. Players pay by Interac e-Transfer and upload a screenshot, and the host approves each spot in one tap.
It costs nothing to run on the free tiers of Vercel, Supabase and Resend. There is no payment gateway.

**Stack:** Next.js 16 (App Router, React 19, TypeScript) · Tailwind CSS v4 · Supabase (Postgres + Storage + Auth) · Resend (email) · Lucide icons

## How approval works

When a player registers, the host gets an email with a **"Review & Approve →"** button.

1. The host checks their bank for the e-Transfer and taps the button. **No login is needed.** The link is signed and expires after 14 days.
2. A phone-friendly page opens with the player's details, the screenshot and the current capacity (e.g. 14/18).
3. The host taps **Approve**, **Waitlist** or **Reject** (with an optional reason).
4. On approval, the player is emailed: the **amount paid**, the **date and time**, the **venue and address** (with a Google Maps link), the **court number** and the **arrival info** (door code, entrance).

`/admin` is the full dashboard behind an email and password login. Use it to create sessions, see every registration in tabs and manage capacity.

> Why approval happens on a page and not in the email itself: email security scanners open every link in an email automatically. A plain "approve" link would approve players before the host saw them. The link opens a page, and only the button on that page approves.

## Setup (about 15 minutes)

1. **Supabase:** create a free project. In the SQL Editor, run `supabase/migrations/0001_init.sql`.
2. **Admin user:** go to Authentication → Users → *Add user* (email and password). Then run:
   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'harsh@example.com';
   ```
   Then go to Authentication → Sign In / Providers and **turn off "Allow new users to sign up"**.
3. **Resend:** create a free account and verify the domain you send from (or use `onboarding@resend.dev` while testing). Create an API key.
4. **Env:** copy `.env.example` to `.env.local` and fill it in. Generate `REVIEW_LINK_SECRET` with `openssl rand -base64 48`.
5. Run:
   ```bash
   npm install
   npm run dev
   ```
6. **Deploy:** import the repo into Vercel, paste the same env vars, and set `NEXT_PUBLIC_SITE_URL` to your domain.

## Structure

```
supabase/migrations/0001_init.sql   tables, RLS, capacity-safe status function, receipts bucket
src/proxy.ts                        refreshes the Supabase session, gates /admin
src/app/
  page.tsx                          home: hero + schedule
  drop-ins/page.tsx                 schedule (date + location filters)
  drop-ins/[id]/register/page.tsx   session summary, rules, registration form
  drop-ins/submitted/page.tsx       "Pending Harsh's Review" success screen
  drop-ins/actions.ts               submitRegistration (validate, upload receipt, insert, email)
  admin/login/page.tsx              Supabase Auth login
  admin/(portal)/page.tsx           dashboard + quick session creator
  admin/(portal)/sessions/[id]/     registrations table (Pending/Approved/Waitlist/Rejected)
  admin/actions.ts                  signIn, createSession, updateRegistrationStatus, ...
  review/[token]/                   one-tap review page from the host's email
src/components/                     SessionCard, ScheduleList, RegistrationForm, RulesCallout,
                                    admin/RegistrationsTable, admin/ReceiptModal, ...
src/lib/                            supabase clients, email templates, signed review tokens, formatting
```

## Security notes
- `registrations` and the `receipts` bucket are private. Only admins can read them, through RLS. Public sign-ups go through a server action that uses the service-role key.
- `court` and `arrival_info` are hidden from the public API (column-level grants). They are only sent in the approval email.
- Approvals go through `set_registration_status()`, which locks the session row. Two hosts cannot overfill the last spot. Approving twice has no effect and does not send a second email.
- One active registration per email per session. Honeypot field against bots. Receipts: images only, 5 MB maximum.
