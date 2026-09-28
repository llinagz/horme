import Link from "next/link";
import type { ReactNode } from "react";
import { formatShortDate, formatSessionTitle } from "@/domain/format";
import type { TrainingSessionSummary } from "@/infrastructure/repositories/training-session-repository";
import styles from "./history.module.css";

function describeContent(summary: TrainingSessionSummary): string {
  const names =
    summary.exerciseNames.length > 0
      ? summary.exerciseNames
      : summary.blockTitles;
  if (names.length === 0) return "Sesión vacía";
  return names.length > 3
    ? `${names.slice(0, 3).join(", ")} y ${names.length - 3} más`
    : names.join(", ");
}

/** Una sesión en una línea: día, contenido y series hechas. */
export function SessionRow({
  summary,
  action,
}: {
  summary: TrainingSessionSummary;
  action?: ReactNode;
}) {
  const { session } = summary;
  const isDraft = session.status === "draft";
  return (
    <div className={styles.row}>
      <Link
        href={`/session?trainingSessionId=${session.trainingSessionId}`}
        className={styles.rowLink}
      >
        <span className={styles.rowDate}>
          <strong>{formatSessionTitle(session.sessionDate)}</strong>
          <span>{formatShortDate(session.sessionDate)}</span>
        </span>
        <span className={styles.rowContent}>
          <span>{describeContent(summary)}</span>
          <span className={styles.rowMeta}>
            {isDraft ? <span className="chip">Borrador</span> : null}
            {summary.setCount > 0 ? (
              <span>
                {summary.completedSetCount} de {summary.setCount} series
              </span>
            ) : null}
            {session.perceivedExertion !== undefined ? (
              <span>RPE {session.perceivedExertion}</span>
            ) : null}
          </span>
        </span>
      </Link>
      {action}
    </div>
  );
}
