import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DatabaseProvider } from "@/components/database-provider";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Hormé",
  title: { default: "Hormé · Entrenamiento", template: "%s · Hormé" },
  description: "Registro personal, privado y local de entrenamiento CrossFit.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Hormé" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#526246",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <DatabaseProvider>{children}</DatabaseProvider>
      </body>
    </html>
  );
}
