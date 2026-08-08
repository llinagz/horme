import Link from "next/link";

export default function NotFound() {
  return (
    <main className="centered-state">
      <div className="brand-mark">Η</div>
      <h1>Esta sección no existe</h1>
      <Link href="/" className="primary-button">
        Volver a inicio
      </Link>
    </main>
  );
}
