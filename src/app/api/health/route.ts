import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Settings the site needs on the server. Reported as set / not set only, never their values.
const REQUIRED = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "REVIEW_LINK_SECRET",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "HOST_NOTIFY_EMAILS",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

/**
 * Deployment check: which settings this running site can see. Shows names and yes/no only,
 * so it's safe to open in a browser after changing settings in the Cloudflare dashboard.
 */
export async function GET() {
  let cf: Record<string, unknown> = {};
  let cloudflareContext = "available";
  try {
    cf = getCloudflareContext().env as unknown as Record<string, unknown>;
  } catch (err) {
    cloudflareContext = `unavailable (${err instanceof Error ? err.message.slice(0, 80) : "error"})`;
  }

  const status = (name: string) => {
    const p = process.env[name];
    const c = cf[name];
    const value = p || (typeof c === "string" ? c : "");
    if (!value) return "missing";
    if (/^(your-|change-me|re_xxxx)/.test(value.trim())) return "placeholder value";
    return p ? "set" : "set (Cloudflare binding only)";
  };

  // Names that look related, to spot typos such as a missing "_KEY" or a trailing space.
  const allNames = [...new Set([...Object.keys(process.env), ...Object.keys(cf)])];
  const lookalikes = allNames
    .filter((n) => /SUPA|SERVICE|ROLE|SECRET|RESEND|EMAIL|CRON|REVIEW|SITE/i.test(n))
    .map((n) => JSON.stringify(n)) // quotes make stray spaces visible
    .sort();

  return NextResponse.json(
    {
      settings: Object.fromEntries(REQUIRED.map((n) => [n, status(n)])),
      relatedSettingNamesSeen: lookalikes,
      cloudflareContext,
      bindingCount: Object.keys(cf).length,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
