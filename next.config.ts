import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

// Una revisión nueva en cada build invalida el HTML precacheado; si fuera
// constante, un service worker nuevo seguiría sirviendo páginas antiguas que
// apuntan a fragmentos JS ya eliminados.
const buildRevision = crypto.randomUUID();

const appRoutes = [
  "/onboarding",
  "/session",
  "/history",
  "/progress",
  "/exercise",
  "/profile",
  "/settings",
];

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Recargar al recuperar la conexión puede perder lo que se estaba
  // escribiendo; la aplicación funciona igual sin red.
  reloadOnOnline: false,
  additionalPrecacheEntries: [
    "/",
    ...appRoutes.flatMap((url) => [url, `${url}/`]),
    "/manifest.webmanifest",
    "/icons/icon.svg",
    "/icons/icon-maskable.svg",
  ].map((url) => ({ url, revision: buildRevision })),
});

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withSerwist(nextConfig);
