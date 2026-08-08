import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import path from "node:path";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [
    "/",
    ...[
      "/onboarding",
      "/session",
      "/history",
      "/progress",
      "/exercise",
      "/profile",
      "/settings",
    ].flatMap((url) => [url, `${url}/`]),
  ].map((url) => ({
    url,
    revision: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  })),
});

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(import.meta.dirname, "src"),
    };
    return config;
  },
};

export default withSerwist(nextConfig);
