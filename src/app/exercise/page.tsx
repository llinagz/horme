import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ExerciseScreen } from "@/features/progress/exercise-screen";

export const metadata: Metadata = { title: "Ejercicio" };

export default function ExercisePage() {
  return (
    <AppShell>
      <Suspense
        fallback={<p className="centered-state">Cargando ejercicio…</p>}
      >
        <ExerciseScreen />
      </Suspense>
    </AppShell>
  );
}
