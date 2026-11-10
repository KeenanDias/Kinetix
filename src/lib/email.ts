import "server-only";
import { siteConfig } from "./config";
import { formatDate, formatMoney, formatTimeRange, mapsUrl } from "./format";
import { POSITION_LABELS, SKILL_LABELS, guestLabel, guestList, partySize, type Registration, type Session } from "./types";

export type Mail = { to: string | string[]; subject: string; html: string; replyTo?: string };

const RESEND_URL = "https://api.resend.com";

function sender() {
  return process.env.EMAIL_FROM ?? "Kinetix <onboarding@resend.dev>";
}

function resendKey() {
  const key = process.env.RESEND_API_KEY;
  return key && !key.startsWith("re_xxxx") ? key : null;
}

/**
 * Sends through Resend's REST API (free tier: 3,000/month). No SDK needed.
 * Without a real RESEND_API_KEY the email is logged instead, so local dev works.
 * Never throws — an email hiccup must not undo an approval.
 */
export async function sendEmail(mail: Mail): Promise<boolean> {
  const key = resendKey();
  if (!key) {
    // Dev mode: print the email and any links in the terminal (e.g. the one-tap review link).
    const links = Array.from(mail.html.matchAll(/href="(http[^"]+)"/g), (m) => m[1].replace(/&amp;/g, "&"));
    console.info(`\n[email:dev] to=${mail.to}\n  subject: ${mail.subject}${links.map((l) => `\n  link: ${l}`).join("")}\n`);
    return true;
  }
  try {
    const res = await fetch(`${RESEND_URL}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: sender(), to: mail.to, subject: mail.subject, html: mail.html, reply_to: mail.replyTo }),
    });
    if (!res.ok) console.error("[email] Resend error", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("[email] send failed", err);
    return false;
  }
}

/** Sends many emails in one request (Resend batch: up to 100 per call). Returns how many were accepted. */
export async function sendEmails(mails: Mail[]): Promise<number> {
  if (mails.length === 0) return 0;
  const key = resendKey();
  if (!key) {
    for (const m of mails) console.info(`[email:dev] to=${m.to} subject="${m.subject}"`);
    return mails.length;
  }
  let sent = 0;
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100);
    try {
      const res = await fetch(`${RESEND_URL}/emails/batch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          chunk.map((m) => ({ from: sender(), to: m.to, subject: m.subject, html: m.html, reply_to: m.replyTo })),
        ),
      });
      if (res.ok) sent += chunk.length;
      else console.error("[email] Resend batch error", res.status, await res.text());
    } catch (err) {
      console.error("[email] batch send failed", err);
    }
  }
  return sent;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const FONT = "Lato,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif";
const HEADING_FONT = "Outfit,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif";

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:${FONT};color:#0f172a;font-size:16px;line-height:1.55">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;border:1px solid #e2e8f0">
<tr><td style="background:#0b2a6b;padding:20px 24px;color:#ffffff;font-family:${HEADING_FONT};font-weight:800;font-size:20px;letter-spacing:.5px">
KINETIX <span style="color:#ffc20e">VOLLEYBALL</span></td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 12px;font-family:${HEADING_FONT};font-size:24px;font-weight:800;letter-spacing:-0.02em">${title}</h1>${body}</td></tr>
<tr><td style="padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px">Kinetix Volleyball Drop-ins${
    siteConfig.contactEmail ? ` · Questions? ${esc(siteConfig.contactEmail)}` : ""
  }</td></tr></table></td></tr></table></body></html>`;
}

function rows(items: Array<[string, string]>) {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0">${items
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;width:38%;vertical-align:top">${k}</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:700">${v}</td></tr>`,
    )
    .join("")}</table>`;
}

function button(href: string, label: string, bg = "#0b2a6b", fg = "#ffffff") {
  return `<a href="${href}" style="display:inline-block;background:${bg};color:${fg};text-decoration:none;font-weight:700;padding:14px 22px;border-radius:4px;margin:4px 8px 4px 0">${label}</a>`;
}

function note(text: string, bg = "#fffbeb") {
  return `<p style="background:${bg};border-radius:4px;padding:12px">${text}</p>`;
}

const when = (s: Session) => `${formatDate(s.starts_at, { weekday: "long", month: "long" })}<br>${formatTimeRange(s.starts_at, s.ends_at)}`;
const firstName = (r: Registration) => esc(r.full_name.split(" ")[0]);

/** "Jordan Lee" or "Jordan Lee" + one line per guest with position, + same-team request. */
function playersLine(r: Registration) {
  const guests = guestList(r);
  if (guests.length === 0) return esc(r.full_name);
  const lines = guests.map((g) => `+ ${esc(guestLabel(g))}`).join("<br>");
  const team = r.same_team ? `<br><span style="color:#92400e">Requested: same team</span>` : "";
  return `${esc(r.full_name)}<br><span style="font-weight:400;color:#475569">${lines}</span>${team}`;
}

function spotsWord(r: Registration) {
  const n = partySize(r);
  return n === 1 ? "your spot is" : `all ${n} spots are`;
}

/** To the host: new application, with a one-tap review link. */
export function hostNewRegistrationEmail(s: Session, r: Registration, reviewUrl: string): Mail {
  const to = (process.env.HOST_NOTIFY_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const n = partySize(r);
  return {
    to,
    replyTo: r.email,
    subject: `New drop-in signup: ${r.full_name}${n > 1 ? ` +${n - 1}` : ""} · ${formatDate(s.starts_at)} (${s.filled_spots}/${s.max_players} filled)`,
    html: layout(
      "New registration to review",
      `<p style="margin:0">${esc(r.full_name)} applied for <b>${n} spot${n > 1 ? "s" : ""}</b> at <b>${esc(s.venue_name)}</b> on ${formatDate(s.starts_at)}.</p>
      ${rows([
        ["Players", playersLine(r)],
        ["Skill / Position", `${SKILL_LABELS[r.skill_level]} · ${POSITION_LABELS[r.position]}`],
        ["e-Transfer sender", esc(r.sender_name)],
        ["Amount expected", `${formatMoney(r.amount_cents)}${n > 1 ? ` (${n} × ${formatMoney(r.amount_cents / n)})` : ""}`],
        ["Email / Phone", `${esc(r.email)}<br>${esc(r.phone)}`],
        ["Spots filled", `${s.filled_spots} / ${s.max_players}`],
      ])}
      <p style="margin:0 0 16px">Check your bank for the e-Transfer, then tap below to see the screenshot and approve.</p>
      ${button(reviewUrl, "Review &amp; Approve →", "#ffc20e", "#0b2a6b")}
      <p style="color:#64748b;font-size:12px;margin-top:16px">This link works without logging in for 14 days. Don't forward it.</p>`,
    ),
  };
}

/** To the player: we got your application. */
export function playerReceivedEmail(s: Session, r: Registration): Mail {
  return {
    to: r.email,
    subject: `Kinetix drop-in: application received (${formatDate(s.starts_at)})`,
    html: layout(
      "Application received 🏐",
      `<p>Hi ${firstName(r)}, thanks for signing up! Your application is <b>pending ${esc(
        siteConfig.hostName,
      )}'s review</b>. You'll get another email once ${spotsWord(r)} verified.</p>
      ${rows([
        ["Session", `${esc(s.venue_name)}<br>${when(s)}`],
        ["Players", playersLine(r)],
        ["Session code", esc(s.code)],
        ["Amount sent", formatMoney(r.amount_cents)],
      ])}`,
    ),
  };
}

/** To the player: approved — the important one. Includes court + arrival info. */
export function playerApprovedEmail(s: Session, r: Registration): Mail {
  const n = partySize(r);
  return {
    to: r.email,
    subject: `You're in! Kinetix drop-in ${formatDate(s.starts_at)} · ${s.venue_name}`,
    html: layout(
      n > 1 ? `Your group of ${n} is confirmed ✅` : "You're confirmed ✅",
      `<p>Hi ${firstName(r)}, your payment was verified and ${spotsWord(r)} locked in. See you on the court!</p>
      ${rows([
        ["Date & time", when(s)],
        ["Location", `${esc(s.venue_name)}<br><a href="${mapsUrl(s.venue_address)}" style="color:#0b2a6b">${esc(s.venue_address)}</a>`],
        ["Court", s.court ? esc(s.court) : "Posted at the gym on arrival"],
        ...(s.arrival_info ? ([["Arrival info", esc(s.arrival_info).replace(/\n/g, "<br>")]] as Array<[string, string]>) : []),
        ["Players", playersLine(r)],
        ["Amount paid", `${formatMoney(r.amount_cents)} CAD (Interac e-Transfer from ${esc(r.sender_name)})`],
        ["Session code", esc(s.code)],
      ])}
      <p style="margin:0 0 8px"><b>Bring:</b> clean indoor court shoes, water, and arrive 10 minutes early for warm-up.</p>
      ${n > 1 ? `<p style="margin:0 0 8px">Please forward the court and arrival details to your guests.</p>` : ""}
      <p style="color:#64748b;font-size:13px">Can't make it? Reply to this email as early as possible so we can offer your spot to the waitlist.</p>
      ${r.admin_note ? note(`Note from ${esc(siteConfig.hostName)}: ${esc(r.admin_note)}`) : ""}`,
    ),
  };
}

export function playerWaitlistEmail(s: Session, r: Registration): Mail {
  return {
    to: r.email,
    subject: `Kinetix drop-in ${formatDate(s.starts_at)}: you're on the waitlist`,
    html: layout(
      "You're on the waitlist",
      `<p>Hi ${firstName(r)}, the ${formatDate(s.starts_at)} game at ${esc(
        s.venue_name,
      )} doesn't have room right now. We've received your payment details and placed you on the waitlist. We'll email you right away if ${
        partySize(r) > 1 ? "enough spots open for your group" : "a spot opens"
      }. If you don't get in, your e-Transfer will be refunded.</p>
      ${r.admin_note ? note(esc(r.admin_note)) : ""}`,
    ),
  };
}

export function playerRejectedEmail(s: Session, r: Registration): Mail {
  return {
    to: r.email,
    subject: `Kinetix drop-in ${formatDate(s.starts_at)}: registration update`,
    html: layout(
      "We couldn't confirm your spot",
      `<p>Hi ${firstName(r)}, unfortunately we couldn't approve your registration for ${formatDate(s.starts_at)} at ${esc(s.venue_name)}.</p>
      ${r.admin_note ? note(`<b>Reason:</b> ${esc(r.admin_note)}`, "#fef2f2") : ""}
      <p>If you already sent an e-Transfer, reply to this email and we'll sort out a refund.</p>`,
    ),
  };
}

/** To registered players when the host deletes (cancels) a run. */
export function sessionCancelledEmail(s: Session, r: Registration, reason?: string | null): Mail {
  const host = esc(siteConfig.hostName);
  const contact = siteConfig.contactEmail
    ? `<a href="mailto:${esc(siteConfig.contactEmail)}" style="color:#0b2a6b">${esc(siteConfig.contactEmail)}</a>`
    : "replying to this email";
  return {
    to: r.email,
    replyTo: siteConfig.contactEmail || undefined,
    subject: `Cancelled: Kinetix drop-in ${formatDate(s.starts_at)} · ${s.venue_name}`,
    html: layout(
      "This run has been cancelled",
      `<p>Hi ${firstName(r)}, we're sorry, but the drop-in you registered for has been cancelled.</p>
      ${rows([
        ["Session", `${esc(s.venue_name)}<br>${when(s)}`],
        ["Players", playersLine(r)],
        ["Amount sent", `${formatMoney(r.amount_cents)} CAD`],
      ])}
      ${reason ? note(`<b>Reason from ${host}:</b> ${esc(reason).replace(/\n/g, "<br>")}`, "#fef2f2") : ""}
      <p><b>Your payment:</b> contact ${host} at ${contact} to get a refund, or to use it as credit toward the next run.</p>
      <p style="color:#64748b;font-size:13px">Check the schedule for other upcoming runs: <a href="${siteConfig.siteUrl}/drop-ins" style="color:#0b2a6b">${siteConfig.siteUrl.replace(/^https?:\/\//, "")}/drop-ins</a></p>`,
    ),
  };
}

/** One changed detail of a session, already formatted for display. */
export type SessionChange = { label: string; before: string; after: string; private?: boolean };

/**
 * To registered players when the host edits an upcoming session.
 * Private changes (court, arrival info) only go to approved players.
 */
export function sessionUpdatedEmail(s: Session, r: Registration, changes: SessionChange[], message?: string | null): Mail | null {
  const visible = changes.filter((c) => !c.private || r.status === "approved");
  if (visible.length === 0) return null;
  const strike = (v: string) => `<span style="color:#94a3b8;text-decoration:line-through;font-weight:400">${esc(v || "None")}</span>`;
  const statusLine =
    r.status === "approved"
      ? "Your spot is still confirmed, so there's nothing else you need to do."
      : r.status === "waitlist"
        ? "You're still on the waitlist."
        : `Your registration is still pending ${esc(siteConfig.hostName)}'s review.`;
  return {
    to: r.email,
    subject: `Update: Kinetix drop-in ${formatDate(s.starts_at)} · ${s.venue_name}`,
    html: layout(
      "Session details changed",
      `<p>Hi ${firstName(r)}, the drop-in you registered for (${esc(s.code)}) has been updated:</p>
      ${rows(visible.map((c) => [esc(c.label), `${strike(c.before)}<br>${esc(c.after || "None").replace(/\n/g, "<br>")}`]))}
      ${message ? note(`Message from ${esc(siteConfig.hostName)}: ${esc(message).replace(/\n/g, "<br>")}`) : ""}
      ${rows([
        ["Date & time", when(s)],
        ["Location", `${esc(s.venue_name)}<br><a href="${mapsUrl(s.venue_address)}" style="color:#0b2a6b">${esc(s.venue_address)}</a>`],
        ...(r.status === "approved" && s.court ? ([["Court", esc(s.court)]] as Array<[string, string]>) : []),
      ])}
      <p>${statusLine}</p>
      <p style="color:#64748b;font-size:13px">If the new time doesn't work for you, reply to this email and we'll sort out a refund or transfer.</p>`,
    ),
  };
}
