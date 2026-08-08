import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { HistoryScreen } from "@/features/history/history-screen";

export const metadata: Metadata = { title: "Historial" };

export default function HistoryPage() {
  return (
    <AppShell>
      <HistoryScreen />
    </AppShell>
  );
}
