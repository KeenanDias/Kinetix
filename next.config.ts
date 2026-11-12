import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The only image is the small logo. Serving it as-is avoids needing Cloudflare Images.
  images: { unoptimized: true },
  experimental: {
    serverActions: {
      // Receipts are capped at 5 MB in the action; leave headroom for multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
