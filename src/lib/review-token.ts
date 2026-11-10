import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, expiring links that let the host review a registration from the
 * notification email without logging in. Format: <registrationId>.<expiry>.<sig>
 * The link opens a review page; the actual approve/reject is a POST from that
 * page, so email link-scanners that pre-fetch URLs can't approve anyone.
 */
const TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function secret() {
  const s = process.env.REVIEW_LINK_SECRET;
  if (!s || s.length < 24 || s.startsWith("change-me")) throw new Error("REVIEW_LINK_SECRET must be set to a random 24+ char string");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createReviewToken(registrationId: string) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${registrationId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyReviewToken(token: string): { registrationId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [registrationId, expStr, sig] = parts;
  const expected = Buffer.from(sign(`${registrationId}.${expStr}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (!/^\d+$/.test(expStr) || Number(expStr) < Date.now() / 1000) return null;
  if (!/^[0-9a-f-]{36}$/i.test(registrationId)) return null;
  return { registrationId };
}
