import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv, settingNamesLike } from "../server-env";

/**
 * Service-role client. Bypasses RLS — only use in server code for:
 *  - accepting public registrations (insert + receipt upload links)
 *  - one-tap review links (token already verified)
 */
export function createServiceClient() {
  const key = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || serverEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!key || key.startsWith("your-") || !url) {
    // Names only (never values), so a misnamed dashboard secret is obvious in the logs.
    const seen = settingNamesLike(/SUPA|SERVICE|ROLE/i).join(", ") || "none";
    throw new Error(
      `Supabase server settings missing: ${!key || key.startsWith("your-") ? "SUPABASE_SERVICE_ROLE_KEY" : ""} ${!url ? "NEXT_PUBLIC_SUPABASE_URL" : ""}. Related setting names found: ${seen}`,
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
