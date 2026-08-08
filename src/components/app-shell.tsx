"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAthleteProfile } from "./data-hooks";
import { PwaLifecycle } from "./pwa-lifecycle";

const navigationItems = [
  { href: "/", label: "Inicio", icon: "⌂" },
  { href: "/history", label: "Historial", icon: "◷" },
  { href: "/progress", label: "Progreso", icon: "↗" },
  { href: "/settings", label: "Ajustes", icon: "⚙" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useAthleteProfile();

  useEffect(() => {
    if (profile === null) router.replace("/onboarding");
  }, [profile, router]);

  if (profile === undefined || profile === null) {
    return (
      <main className="centered-state">
        <div className="brand-mark" aria-hidden="true">
          Η
        </div>
        <p>Preparando Hormé…</p>
      </main>
    );
  }

  return (
    <div className="app-frame">
      <PwaLifecycle />
      <header className="topbar">
        <Link href="/" className="wordmark" aria-label="Hormé, inicio">
          <span className="brand-mark brand-mark-small">Η</span> HORMÉ
        </Link>
        <Link
          href="/profile"
          className="profile-link"
          aria-label="Abrir perfil de usuario"
        >
          <span className="avatar">
            {profile.displayName.slice(0, 1).toLocaleUpperCase("es-ES")}
          </span>
          <span>{profile.displayName}</span>
        </Link>
      </header>
      <main className="page-content">{children}</main>
      <nav className="bottom-navigation" aria-label="Navegación principal">
        {navigationItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive ? "navigation-item active" : "navigation-item"
              }
              aria-current={isActive ? "page" : undefined}
            >
              <span className="navigation-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
