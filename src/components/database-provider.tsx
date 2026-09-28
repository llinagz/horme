"use client";

import { useEffect, useState, type ReactNode } from "react";
import { initializeDatabase } from "@/infrastructure/database";
import { LoadingState } from "./ui/states";

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    void initializeDatabase().then(
      () => setState("ready"),
      () => setState("error"),
    );
  }, []);

  if (state === "loading") return <LoadingState label="Abriendo tus datos…" />;

  if (state === "error") {
    return (
      <main className="loading">
        <span className="brand-mark large" aria-hidden="true">
          Η
        </span>
        <h1 className="title-md">No se pueden abrir tus datos</h1>
        <p>
          El navegador no deja guardar datos en este sitio. Sal del modo privado
          o permite el almacenamiento y vuelve a cargar.
        </p>
      </main>
    );
  }

  return children;
}
