"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="loading">
      <span className="brand-mark large" aria-hidden="true">
        Η
      </span>
      <h1 className="title-md">Esta pantalla ha fallado</h1>
      <p>Tus datos siguen guardados en este móvil.</p>
      <details className="muted small">
        <summary>Detalle técnico</summary>
        <code>{error.message}</code>
      </details>
      <button type="button" className="button primary large" onClick={reset}>
        Volver a intentarlo
      </button>
    </main>
  );
}
