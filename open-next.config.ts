// Cloudflare adapter config (https://opennext.js.org/cloudflare).
// Pages that never change (privacy, success page) are prerendered and served as static
// assets. Pages with live data (schedule, register, admin) render on every request, so no
// R2/KV cache bucket is needed and nothing extra is stored.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
