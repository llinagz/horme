import type { Metadata, Viewport } from "next";
import { Commissioner, GFS_Didot } from "next/font/google";
import type { ReactNode } from "react";
import { DatabaseProvider } from "@/components/database-provider";
import { PwaLifecycle } from "@/components/pwa-lifecycle";
import { themeBootstrapScript } from "@/components/theme";
import { ConfirmProvider } from "@/components/ui/sheet";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const commissioner = Commissioner({
  subsets: ["latin"],
  variable: "--font-commissioner",
  display: "swap",
});

const didot = GFS_Didot({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-didot",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Hormé",
  title: { default: "Hormé", template: "%s · Hormé" },
  description: "Registro personal, privado y local de entrenamiento CrossFit.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Hormé" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f2ee" },
    { media: "(prefers-color-scheme: dark)", color: "#141814" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${commissioner.variable} ${didot.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <ToastProvider>
          <ConfirmProvider>
            <DatabaseProvider>{children}</DatabaseProvider>
          </ConfirmProvider>
          <PwaLifecycle />
        </ToastProvider>
      </body>
    </html>
  );
}
