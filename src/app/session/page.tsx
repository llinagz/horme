import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/ui/states";
import { SessionScreen } from "@/features/session/session-screen";

export const metadata: Metadata = { title: "Sesión" };

export default function SessionPage() {
  return (
    <AppShell navigation={false}>
      <Suspense fallback={<LoadingState label="Abriendo sesión…" />}>
        <SessionScreen />
      </Suspense>
    </AppShell>
  );
}
