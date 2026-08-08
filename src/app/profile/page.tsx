import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ProfileScreen } from "@/features/profile/profile-screen";

export const metadata: Metadata = { title: "Perfil" };

export default function ProfilePage() {
  return (
    <AppShell>
      <ProfileScreen />
    </AppShell>
  );
}
