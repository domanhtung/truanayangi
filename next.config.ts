import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is not yet stable on Cloudflare Workers / OpenNext
  // (HTTP 500 / Error 1101). Keep disabled until the adapter ships a fix.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
