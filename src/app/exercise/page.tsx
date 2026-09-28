import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/ui/states";
import { ExerciseScreen } from "@/features/progress/exercise-screen";

export const metadata: Metadata = { title: "Ejercicio" };

export default function ExercisePage() {
  return (
    <AppShell>
      <Suspense fallback={<LoadingState label="Cargando la ficha…" />}>
        <ExerciseScreen />
      </Suspense>
    </AppShell>
  );
}
