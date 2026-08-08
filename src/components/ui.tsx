import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? (
          <p className="muted page-description">{description}</p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </header>
  );
}

export function SectionHeading({
  title,
  link,
}: {
  title: string;
  link?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {link}
    </div>
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
    <div className="empty-state">
      <span className="olive-branch" aria-hidden="true">
        ☙
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function InlineMessage({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "error";
}) {
  return (
    <p
      className={`inline-message ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
