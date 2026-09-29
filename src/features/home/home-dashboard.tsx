"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Copy, ShieldCheck } from "lucide-react";
import { listExerciseProgress } from "@/application/progress";
import { getCurrentBodyValues } from "@/domain/calculations";
import {
  formatNumber,
  formatSessionTitle,
  formatShortDate,
  pluralize,
} from "@/domain/format";
import { getBackupStatus } from "@/infrastructure/backup";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import {
  useAthleteProfile,
  useBodyMeasurements,
} from "@/components/data-hooks";
import { InstallHint } from "@/components/install-hint";
import { Kotinos } from "@/components/ui/kotinos";
import { Figure, LoadingState } from "@/components/ui/states";
import { useAction } from "@/components/ui/toast";
import { SessionRow } from "@/features/history/session-row";
import styles from "./home.module.css";

export function HomeDashboard() {
  const router = useRouter();
  const run = useAction();
  const profile = useAthleteProfile();
  const measurements = useBodyMeasurements();
  const summaries = useLiveQuery(() =>
    trainingSessionRepository.listSessionSummaries(),
  );
  const records = useLiveQuery(() => listExerciseProgress());
  const backupStatus = useLiveQuery(() => getBackupStatus());

  if (summaries === undefined || records === undefined)
    return <LoadingState label="Cargando tus entrenos…" />;

  const draft = summaries
    .filter((summary) => summary.session.status === "draft")
    .toSorted((left, right) =>
      right.session.updatedAt.localeCompare(left.session.updatedAt),
    )[0];
  const lastCompleted = summaries.find(
    (summary) => summary.session.status === "completed",
  );
  const recent = summaries.filter((summary) => summary !== draft).slice(0, 3);
  const bestRecords = records
    .filter((record) => record.maximumActualWeightKilograms !== undefined)
    .slice(0, 3);
  const body = getCurrentBodyValues(measurements ?? []);

  const startSession = () =>
    void run(async () => {
      const id = await trainingSessionRepository.create();
      router.push(`/session?trainingSessionId=${id}`);
    });
  const repeatLast = (trainingSessionId: string) =>
    void run(async () => {
      const id =
        await trainingSessionRepository.duplicateSession(trainingSessionId);
      router.push(`/session?trainingSessionId=${id}`);
    });

  return (
    <div className="stack-large">
      <h1 className="title">Hola, {profile?.displayName}</h1>
      <InstallHint />

      {draft ? (
        <Link
          href={`/session?trainingSessionId=${draft.session.trainingSessionId}`}
          className={styles.continue}
        >
          <div className={styles.continueText}>
            <h2>Continuar sesión</h2>
            <p>
              {formatSessionTitle(draft.session.sessionDate)}
              {draft.blockTitles.length > 0
                ? `, ${draft.blockTitles.join(" y ")}`
                : ""}
            </p>
          </div>
          <Kotinos
            total={draft.setCount}
            done={draft.completedSetCount}
            size="small"
            tone="inverse"
          />
        </Link>
      ) : (
        <section className={styles.start}>
          <button
            type="button"
            className={`button primary large full ${styles.startButton}`}
            onClick={startSession}
          >
            Empezar sesión
          </button>
          {lastCompleted ? (
            <button
              type="button"
              className="button large full"
              onClick={() =>
                repeatLast(lastCompleted.session.trainingSessionId)
              }
            >
              <Copy aria-hidden="true" size={20} />
              Repetir la del{" "}
              {formatShortDate(lastCompleted.session.sessionDate)}
            </button>
          ) : null}
        </section>
      )}

      {bestRecords.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <h2 className="heading">Tus mejores cargas</h2>
            <Link href="/progress" className="link">
              Progreso
            </Link>
          </div>
          <div className="list">
            {bestRecords.map((record) => (
              <Link
                key={record.exercise.exerciseDefinitionId}
                href={`/exercise?exerciseDefinitionId=${record.exercise.exerciseDefinitionId}`}
                className="list-row"
              >
                <div>
                  <strong>{record.exercise.name}</strong>
                  <p>
                    {record.latestSessionDate
                      ? `Último día, ${formatShortDate(record.latestSessionDate)}`
                      : "Marca registrada"}
                  </p>
                </div>
                <Figure
                  className="record"
                  value={formatNumber(record.maximumActualWeightKilograms)}
                  unit="kg"
                />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <h2 className="heading">Últimos entrenos</h2>
            <Link href="/history" className="link">
              Historial
            </Link>
          </div>
          <div className="list">
            {recent.map((summary) => (
              <SessionRow
                key={summary.session.trainingSessionId}
                summary={summary}
              />
            ))}
          </div>
        </section>
      ) : (
        <p className="muted">
          Aquí verás tus entrenos en cuanto registres el primero.
        </p>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="heading">Tu cuerpo</h2>
          <Link href="/profile" className="link">
            Mediciones
          </Link>
        </div>
        <div className="stats">
          <div className="stat">
            <span>Peso</span>
            <Figure
              value={formatNumber(body.weightKilograms) || "—"}
              unit="kg"
            />
          </div>
          <div className="stat">
            <span>Altura</span>
            <Figure
              value={formatNumber(body.heightCentimeters) || "—"}
              unit="cm"
            />
          </div>
        </div>
      </section>

      {backupStatus ? (
        <Link
          href="/settings"
          className={
            backupStatus.shouldRemind
              ? `${styles.backup} ${styles.backupDue}`
              : styles.backup
          }
        >
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>
              {backupStatus.shouldRemind
                ? "Haz una copia de tus datos"
                : "Copia al día"}
            </strong>
            <small>
              {backupStatus.reason ??
                (backupStatus.lastBackupAt
                  ? `Última el ${new Date(backupStatus.lastBackupAt).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}`
                  : `Tus ${pluralize(summaries.length, "sesión", "sesiones")} solo están en este móvil`)}
            </small>
          </span>
          <ChevronRight aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
