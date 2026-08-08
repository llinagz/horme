"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <main className="centered-state">
          <h1>Hormé necesita recuperarse</h1>
          <p>Recarga la interfaz; los datos locales no se han borrado.</p>
          <button type="button" onClick={reset}>
            Recargar interfaz
          </button>
        </main>
      </body>
    </html>
  );
}
