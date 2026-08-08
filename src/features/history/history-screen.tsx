"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { formatLocalDate } from "@/domain/dates";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import { EmptyState, PageHeading } from "@/components/ui";

export function HistoryScreen() {
  const router = useRouter();
  const sessions = useLiveQuery(() => trainingSessionRepository.list(), [], []);
  const handleDuplicate = async (trainingSessionId: string) => {
    const duplicateId =
      await trainingSessionRepository.duplicateSession(trainingSessionId);
    router.push(`/session?trainingSessionId=${duplicateId}`);
  };
  return (
    <div className="stack-large">
      <PageHeading
        eyebrow="Registro cronológico"
        title="Historial"
        description="Borradores y sesiones finalizadas, siempre disponibles en este dispositivo."
      />
      {sessions.length === 0 ? (
        <EmptyState
          title="Historial vacío"
          description="Tu primer entrenamiento aparecerá aquí."
        />
      ) : (
        <div className="history-list">
          {sessions.map((session) => (
            <article className="history-card" key={session.trainingSessionId}>
              <Link
                href={`/session?trainingSessionId=${session.trainingSessionId}`}
              >
                <span
                  className={
                    session.status === "completed"
                      ? "status-pill complete"
                      : "status-pill"
                  }
                >
                  {session.status === "completed" ? "Finalizada" : "Borrador"}
                </span>
                <h2>{formatLocalDate(session.sessionDate)}</h2>
                <p>{session.feelings || "Sin sensaciones registradas"}</p>
                <div className="mini-stats">
                  <span>
                    <small>RPE</small>
                    <strong>{session.perceivedExertion ?? "—"}</strong>
                  </span>
                  <span>
                    <small>Dolor</small>
                    <strong>{session.painLevel ?? "—"}</strong>
                  </span>
                </div>
              </Link>
              <button
                type="button"
                className="secondary-button full-width"
                onClick={() => handleDuplicate(session.trainingSessionId)}
              >
                ⧉ Duplicar sesión
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
