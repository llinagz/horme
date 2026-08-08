"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="centered-state">
      <div className="brand-mark">Η</div>
      <h1>Algo no ha salido bien</h1>
      <p>Tus datos anteriores siguen guardados en este dispositivo.</p>
      <details className="error-details">
        <summary>Detalle técnico</summary>
        <code>{error.message}</code>
      </details>
      <button type="button" className="primary-button" onClick={reset}>
        Intentarlo de nuevo
      </button>
    </main>
  );
}
