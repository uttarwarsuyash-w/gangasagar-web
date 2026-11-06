import type { NextConfig } from "next";

// Smoke tests export to their own folder so fixture pages never land in `out`.
const exportDir = process.env.NEXT_EXPORT_DIR;

const nextConfig: NextConfig = {
  output: "export",
  ...(exportDir ? { distDir: exportDir } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
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
