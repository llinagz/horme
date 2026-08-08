import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { SettingsScreen } from "@/features/settings/settings-screen";

export const metadata: Metadata = { title: "Ajustes" };

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsScreen />
    </AppShell>
  );
}
