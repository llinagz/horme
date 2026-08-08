"use client";

import { useEffect, useState, type ReactNode } from "react";
import { initializeDatabase } from "@/infrastructure/database";

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    void initializeDatabase().then(
      () => setState("ready"),
      () => setState("error"),
    );
  }, []);

  if (state === "loading") {
    return (
      <main className="centered-state">
        <div className="brand-mark" aria-hidden="true">
          Η
        </div>
        <p>Preparando tus datos locales…</p>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="centered-state">
        <div className="brand-mark" aria-hidden="true">
          Η
        </div>
        <h1>No se puede abrir el almacenamiento local</h1>
        <p>Comprueba que el navegador permite IndexedDB y vuelve a cargar.</p>
      </main>
    );
  }

  return children;
}
