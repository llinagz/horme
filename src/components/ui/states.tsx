import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

/** Cabecera de pantalla: título en Didot y, si hace falta, vuelta atrás. */
export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      {back ? (
        <Link href={back.href} className="link back-link">
          <ChevronLeft aria-hidden="true" size={20} />
          {back.label}
        </Link>
      ) : null}
      <div className="page-header-row">
        <div className="page-header-text">
          <h1 className="title">{title}</h1>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="loading" role="status">
      <span className="brand-mark" aria-hidden="true">
        Η
      </span>
      <p>{label}</p>
    </div>
  );
}

export function InlineMessage({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error" | "attention";
}) {
  return (
    <p
      className={tone === "info" ? "message" : `message ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

/** Cifra con su unidad: «102,5 kg». */
export function Figure({
  value,
  unit,
  className = "",
}: {
  value: ReactNode;
  unit?: string;
  className?: string;
}) {
  return (
    <span className={`figure ${className}`.trim()}>
      {value}
      {unit ? <small>{unit}</small> : null}
    </span>
  );
}

/** Elección única entre pocas opciones, operable con el pulgar. */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  allowClear = false,
  tone = "default",
  columns,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  allowClear?: boolean;
  tone?: "default" | "olive";
  /** Rejilla regular para escalas numéricas (RPE, dolor). */
  columns?: number;
}) {
  return (
    <div
      className={[
        "segmented",
        tone === "olive" ? "olive" : "",
        columns ? "scale" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined
      }
      role="radiogroup"
      aria-label={label}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() =>
              onChange(isSelected && allowClear ? undefined : option.value)
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
