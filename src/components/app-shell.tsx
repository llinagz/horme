"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ChartNoAxesCombined, History, House, Settings } from "lucide-react";
import { useAthleteProfile } from "./data-hooks";
import { LoadingState } from "./ui/states";
import styles from "./app-shell.module.css";

const navigationItems = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/history", label: "Historial", icon: History },
  { href: "/progress", label: "Progreso", icon: ChartNoAxesCombined },
  { href: "/settings", label: "Ajustes", icon: Settings },
] as const;

export function getInitial(displayName: string): string {
  return displayName.trim().slice(0, 1).toLocaleUpperCase("es-ES");
}

/**
 * Marco de las pantallas con perfil. `navigation={false}` deja la parte baja
 * libre para la barra de acciones de la sesión.
 */
export function AppShell({
  children,
  navigation = true,
}: {
  children: ReactNode;
  navigation?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useAthleteProfile();

  useEffect(() => {
    if (profile === null) router.replace("/onboarding");
  }, [profile, router]);

  if (profile === undefined || profile === null)
    return <LoadingState label="Preparando Hormé…" />;

  return (
    <div className={styles.frame} data-navigation={navigation}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.wordmark} aria-label="Hormé, inicio">
          <span className="brand-mark" aria-hidden="true">
            Η
          </span>
        </Link>
        <Link
          href="/profile"
          className={styles.avatar}
          aria-label={`Abrir perfil de ${profile.displayName}`}
        >
          {getInitial(profile.displayName)}
        </Link>
      </header>
      <main className={styles.content}>{children}</main>
      {navigation ? (
        <nav className={styles.navigation} aria-label="Navegación principal">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={styles.navigationItem}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon aria-hidden="true" strokeWidth={1.9} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
