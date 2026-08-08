import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ProgressScreen } from "@/features/progress/progress-screen";

export const metadata: Metadata = { title: "Progreso" };

export default function ProgressPage() {
  return (
    <AppShell>
      <ProgressScreen />
    </AppShell>
  );
}
