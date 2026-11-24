import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML/JS in ./out, served by Firebase Hosting (no Node server needed;
  // the page talks to Firebase directly from the browser).
  // (cacheComponents / partialPrefetching are left off: they need a server and
  // cannot be used with static export.)
  output: "export",
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
