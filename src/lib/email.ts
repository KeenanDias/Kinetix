import "server-only";
import { siteConfig } from "./config";
import { formatDate, formatMoney, formatTimeRange, mapsUrl } from "./format";
import { POSITION_LABELS, SKILL_LABELS, type Registration, type Session } from "./types";

type Mail = { to: string | string[]; subject: string; html: string; replyTo?: string };

/**
 * Sends through Resend's REST API (free tier: 3,000/month). No SDK needed.
 * Without RESEND_API_KEY the email is logged instead, so local dev works.
 * Never throws — an email hiccup must not undo an approval.
 */
export async function sendEmail(mail: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Kinetix <onboarding@resend.dev>";
  if (!key) {
    // Dev mode: print the email and any links in the terminal (e.g. the one-tap review link).
    const links = Array.from(mail.html.matchAll(/href="(http[^"]+)"/g), (m) => m[1].replace(/&amp;/g, "&"));
    console.info(`\n[email:dev] to=${mail.to}\n  subject: ${mail.subject}${links.map((l) => `\n  link: ${l}`).join("")}\n`);
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: mail.to, subject: mail.subject, html: mail.html, reply_to: mail.replyTo }),
    });
    if (!res.ok) console.error("[email] Resend error", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("[email] send failed", err);
    return false;
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0b2a6b;padding:20px 24px;color:#ffffff;font-weight:800;font-size:20px;letter-spacing:.5px">
KINETIX <span style="color:#ffc20e">VOLLEYBALL</span></td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 12px;font-size:22px">${title}</h1>${body}</td></tr>
<tr><td style="padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px">Kinetix Volleyball Drop-ins${
    siteConfig.contactEmail ? ` · Questions? ${esc(siteConfig.contactEmail)}` : ""
  }</td></tr></table></td></tr></table></body></html>`;
}

function rows(items: Array<[string, string]>) {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0">${items
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;width:38%;vertical-align:top">${k}</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600">${v}</td></tr>`,
    )
    .join("")}</table>`;
}

function button(href: string, label: string, bg = "#0b2a6b", fg = "#ffffff") {
  return `<a href="${href}" style="display:inline-block;background:${bg};color:${fg};text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px;margin:4px 8px 4px 0">${label}</a>`;
}

const when = (s: Session) => `${formatDate(s.starts_at, { weekday: "long", month: "long" })}<br>${formatTimeRange(s.starts_at, s.ends_at)}`;

/** To the host: new application, with a one-tap review link. */
export function hostNewRegistrationEmail(s: Session, r: Registration, reviewUrl: string): Mail {
  const to = (process.env.HOST_NOTIFY_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return {
    to,
    replyTo: r.email,
    subject: `New drop-in signup: ${r.full_name} · ${formatDate(s.starts_at)} (${s.filled_spots}/${s.max_players} filled)`,
    html: layout(
      "New registration to review",
      `<p style="margin:0">${esc(r.full_name)} applied for <b>${esc(s.venue_name)}</b> on ${formatDate(s.starts_at)}.</p>
      ${rows([
        ["Player", esc(r.full_name)],
        ["Skill / Position", `${SKILL_LABELS[r.skill_level]} · ${POSITION_LABELS[r.position]}`],
        ["e-Transfer sender", esc(r.sender_name)],
        ["Amount expected", formatMoney(r.amount_cents)],
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
      `<p>Hi ${esc(r.full_name.split(" ")[0])}, thanks for signing up! Your application is <b>pending ${esc(
        siteConfig.hostName,
      )}'s review</b>. You'll get another email once your spot and payment are verified.</p>
      ${rows([
        ["Session", `${esc(s.venue_name)}<br>${when(s)}`],
        ["Session code", esc(s.code)],
        ["Amount sent", formatMoney(r.amount_cents)],
      ])}`,
    ),
  };
}

/** To the player: approved — the important one. Includes court + arrival info. */
export function playerApprovedEmail(s: Session, r: Registration): Mail {
  return {
    to: r.email,
    subject: `You're in! Kinetix drop-in ${formatDate(s.starts_at)} · ${s.venue_name}`,
    html: layout(
      "You're confirmed ✅",
      `<p>Hi ${esc(r.full_name.split(" ")[0])}, your payment was verified and your spot is locked in. See you on the court!</p>
      ${rows([
        ["Date & time", when(s)],
        ["Location", `${esc(s.venue_name)}<br><a href="${mapsUrl(s.venue_address)}" style="color:#0b2a6b">${esc(
          s.venue_address,
        )}</a>`],
        ["Court", s.court ? esc(s.court) : "Posted at the gym on arrival"],
        ...(s.arrival_info ? ([["Arrival info", esc(s.arrival_info).replace(/\n/g, "<br>")]] as Array<[string, string]>) : []),
        ["Amount paid", `${formatMoney(r.amount_cents)} CAD (Interac e-Transfer from ${esc(r.sender_name)})`],
        ["Session code", esc(s.code)],
      ])}
      <p style="margin:0 0 8px"><b>Bring:</b> clean indoor court shoes, water, and arrive 10 minutes early for warm-up.</p>
      <p style="color:#64748b;font-size:13px">Can't make it? Reply to this email as early as possible so we can offer your spot to the waitlist.</p>
      ${r.admin_note ? `<p style="background:#fffbeb;border-radius:8px;padding:12px">Note from ${esc(siteConfig.hostName)}: ${esc(r.admin_note)}</p>` : ""}`,
    ),
  };
}

export function playerWaitlistEmail(s: Session, r: Registration): Mail {
  return {
    to: r.email,
    subject: `Kinetix drop-in ${formatDate(s.starts_at)}: you're on the waitlist`,
    html: layout(
      "You're on the waitlist",
      `<p>Hi ${esc(r.full_name.split(" ")[0])}, the ${formatDate(s.starts_at)} game at ${esc(
        s.venue_name,
      )} is currently full. We've received your payment details and placed you on the waitlist — we'll email you right away if a spot opens. If you don't get in, your e-Transfer will be refunded.</p>
      ${r.admin_note ? `<p style="background:#fffbeb;border-radius:8px;padding:12px">${esc(r.admin_note)}</p>` : ""}`,
    ),
  };
}

export function playerRejectedEmail(s: Session, r: Registration): Mail {
  return {
    to: r.email,
    subject: `Kinetix drop-in ${formatDate(s.starts_at)}: registration update`,
    html: layout(
      "We couldn't confirm your spot",
      `<p>Hi ${esc(r.full_name.split(" ")[0])}, unfortunately we couldn't approve your registration for ${formatDate(
        s.starts_at,
      )} at ${esc(s.venue_name)}.</p>
      ${r.admin_note ? `<p style="background:#fef2f2;border-radius:8px;padding:12px"><b>Reason:</b> ${esc(r.admin_note)}</p>` : ""}
      <p>If you already sent an e-Transfer, reply to this email and we'll sort out a refund.</p>`,
    ),
  };
}
