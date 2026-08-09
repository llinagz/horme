"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { getCurrentBodyValues } from "@/domain/calculations";
import { formatLocalDate } from "@/domain/dates";
import { listExerciseProgress } from "@/application/progress";
import { getBackupStatus, type BackupStatus } from "@/infrastructure/backup";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import {
  useAthleteProfile,
  useBodyMeasurements,
} from "@/components/data-hooks";
import { EmptyState, SectionHeading } from "@/components/ui";

const defaultBackupStatus: BackupStatus = { shouldRemind: false };

export function HomeDashboard() {
  const router = useRouter();
  const profile = useAthleteProfile();
  const measurements = useBodyMeasurements();
  const sessions = useLiveQuery(
    () => trainingSessionRepository.listRecent(4),
    [],
    [],
  );
  const records = useLiveQuery(() => listExerciseProgress(), [], []);
  const backupStatus = useLiveQuery(
    () => getBackupStatus(),
    [],
    defaultBackupStatus,
  );
  const currentBodyValues = getCurrentBodyValues(measurements);
  const draft = sessions.find((session) => session.status === "draft");

  const handleNewSession = async () => {
    const trainingSessionId = await trainingSessionRepository.create();
    router.push(`/session?trainingSessionId=${trainingSessionId}`);
  };

  return (
    <div className="stack-large">
      <section className="hero-card marble-card">
        <div>
          <p className="eyebrow">Tu espacio de entrenamiento</p>
          <h1>Hola, {profile?.displayName}</h1>
          <p className="muted">
            Constancia, técnica y una medida honesta del progreso.
          </p>
        </div>
        {draft ? (
          <Link
            className="primary-button"
            href={`/session?trainingSessionId=${draft.trainingSessionId}`}
          >
            Continuar sesión
          </Link>
        ) : (
          <button
            className="primary-button"
            type="button"
            onClick={handleNewSession}
          >
            Nueva sesión
          </button>
        )}
      </section>

      <section>
        <SectionHeading
          title="Resumen corporal"
          link={
            <Link href="/profile" className="text-link">
              Ver perfil
            </Link>
          }
        />
        <div className="summary-grid">
          <article className="stat-card">
            <span className="stat-label">Altura</span>
            <strong>
              {currentBodyValues.heightCentimeters ?? "—"}
              <small>{currentBodyValues.heightCentimeters ? " cm" : ""}</small>
            </strong>
          </article>
          <article className="stat-card">
            <span className="stat-label">Peso actual</span>
            <strong>
              {currentBodyValues.weightKilograms ?? "—"}
              <small>{currentBodyValues.weightKilograms ? " kg" : ""}</small>
            </strong>
          </article>
        </div>
      </section>

      <section>
        <SectionHeading
          title="Últimos entrenamientos"
          link={
            <Link href="/history" className="text-link">
              Todo el historial
            </Link>
          }
        />
        {sessions.length === 0 ? (
          <EmptyState
            title="Todavía no hay sesiones"
            description="Registra tu primer entrenamiento y aparecerá aquí."
          />
        ) : (
          <div className="list-card">
            {sessions.map((session) => (
              <Link
                key={session.trainingSessionId}
                href={`/session?trainingSessionId=${session.trainingSessionId}`}
                className="list-row"
              >
                <span>
                  <strong>{formatLocalDate(session.sessionDate)}</strong>
                  <small>
                    {session.status === "draft"
                      ? "Borrador"
                      : `Finalizada${session.perceivedExertion ? ` · RPE ${session.perceivedExertion}` : ""}`}
                  </small>
                </span>
                <span aria-hidden="true">›</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          title="Récords recientes"
          link={
            <Link href="/progress" className="text-link">
              Ver progreso
            </Link>
          }
        />
        {records.length === 0 ? (
          <div className="quiet-card">
            Completa series con carga para descubrir tus marcas.
          </div>
        ) : (
          <div className="horizontal-cards">
            {records.slice(0, 4).map((record) => (
              <Link
                href={`/exercise?exerciseDefinitionId=${record.exercise.exerciseDefinitionId}`}
                className="record-card"
                key={record.exercise.exerciseDefinitionId}
              >
                <span className="eyebrow">Mejor carga</span>
                <strong>{record.maximumActualWeightKilograms ?? "—"} kg</strong>
                <span>{record.exercise.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Link
        href="/settings"
        className={
          backupStatus.shouldRemind
            ? "backup-card needs-attention"
            : "backup-card"
        }
      >
        <span aria-hidden="true">⬡</span>
        <span>
          <strong>
            {backupStatus.shouldRemind
              ? "Conviene crear una copia"
              : "Copia local al día"}
          </strong>
          <small>
            {backupStatus.reason ??
              (backupStatus.lastBackupAt
                ? `Última: ${new Date(backupStatus.lastBackupAt).toLocaleDateString("es-ES")}`
                : "Se guardará cuando tengas datos")}
          </small>
        </span>
        <span aria-hidden="true">›</span>
      </Link>
    </div>
  );
}
