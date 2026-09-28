"use client";

// Sustituye al layout raíz, así que no carga la hoja de estilos global: los
// estilos van en línea para que la pantalla siga siendo legible.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#f1f2ee",
          color: "#1c231d",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <main style={{ display: "grid", gap: "1rem", maxWidth: "26rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
            Hormé necesita reiniciarse
          </h1>
          <p style={{ margin: 0 }}>Tus datos siguen guardados en este móvil.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 48,
              border: 0,
              borderRadius: 14,
              background: "#56703a",
              color: "#fafaf8",
              fontSize: "1rem",
              fontWeight: 600,
            }}
          >
            Reiniciar Hormé
          </button>
        </main>
      </body>
    </html>
  );
}
