import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { SessionScreen } from "@/features/session/session-screen";

export const metadata: Metadata = { title: "Sesión" };

export default function SessionPage() {
  return (
    <AppShell>
      <Suspense fallback={<p className="centered-state">Abriendo sesión…</p>}>
        <SessionScreen />
      </Suspense>
    </AppShell>
  );
}
