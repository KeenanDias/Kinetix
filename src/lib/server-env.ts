import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Cloudflare Worker bindings (vars + secrets) for this request, or {} outside Cloudflare (e.g. `next dev`). */
function cloudflareEnv(): Record<string, unknown> {
  try {
    return getCloudflareContext().env as unknown as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Reads a server-only setting (secret). Checks process.env first (local dev, `.env.local`),
 * then the Cloudflare Worker's own bindings, so secrets added in the Cloudflare dashboard are
 * found even if they weren't copied onto process.env.
 */
export function serverEnv(name: string): string | undefined {
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess.trim();
  const fromCloudflare = cloudflareEnv()[name];
  return typeof fromCloudflare === "string" && fromCloudflare ? fromCloudflare.trim() : undefined;
}

/**
 * Names (never values) of available settings matching a pattern. Used only in error logs so a
 * misnamed secret in the dashboard is easy to spot.
 */
export function settingNamesLike(pattern: RegExp): string[] {
  const names = new Set([...Object.keys(process.env), ...Object.keys(cloudflareEnv())]);
  return [...names].filter((n) => pattern.test(n)).sort();
}
