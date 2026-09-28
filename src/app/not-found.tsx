import Link from "next/link";

export default function NotFound() {
  return (
    <main className="loading">
      <span className="brand-mark large" aria-hidden="true">
        Η
      </span>
      <h1 className="title-md">Esta página no existe</h1>
      <Link href="/" className="button primary large">
        Ir al inicio
      </Link>
    </main>
  );
}
