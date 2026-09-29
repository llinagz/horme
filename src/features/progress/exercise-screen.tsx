"use client";

import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getExerciseProgressPoints,
  getRecordedSets,
} from "@/application/progress";
import { summarizeExercisePerformance } from "@/domain/calculations";
import { classificationLabel } from "@/domain/exercises";
import { formatNumber, formatShortDate, pluralize } from "@/domain/format";
import { exerciseDefinitionRepository } from "@/infrastructure/repositories/exercise-definition-repository";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import { LazyProgressChart } from "@/components/lazy-progress-chart";
import {
  EmptyState,
  Figure,
  LoadingState,
  PageHeader,
} from "@/components/ui/states";
import { describeSetValues } from "@/features/session/metrics";
import styles from "./progress.module.css";

const back = { href: "/progress", label: "Progreso" };

export function ExerciseScreen() {
  const exerciseDefinitionId =
    useSearchParams().get("exerciseDefinitionId") ?? "";
  // `null` distingue «no existe» de `undefined`, que significa «cargando».
  const exercise = useLiveQuery(
    async () =>
      (await exerciseDefinitionRepository.get(exerciseDefinitionId)) ?? null,
    [exerciseDefinitionId],
  );
  const history = useLiveQuery(
    () => trainingSessionRepository.listExerciseHistory(exerciseDefinitionId),
    [exerciseDefinitionId],
  );

  if (!exerciseDefinitionId)
    return (
      <EmptyState
        title="Elige un ejercicio"
        description="Abre su ficha desde Progreso."
      />
    );
  if (exercise === undefined || history === undefined)
    return <LoadingState label="Cargando la ficha…" />;
  if (exercise === null)
    return (
      <EmptyState
        title="Este ejercicio ya no existe"
        description="Puede que se eliminara al restaurar otra copia."
      />
    );

  const points = getExerciseProgressPoints(history);
  const summary = summarizeExercisePerformance(getRecordedSets(history));
  const bestSets = history
    .flatMap((entry) =>
      getRecordedSets([entry]).map((setRecord) => ({
        date: entry.session.sessionDate,
        setRecord,
      })),
    )
    .filter(({ setRecord }) => setRecord.weightKilograms !== undefined)
    .toSorted(
      (left, right) =>
        (right.setRecord.weightKilograms ?? 0) -
          (left.setRecord.weightKilograms ?? 0) ||
        (right.setRecord.repetitions ?? 0) - (left.setRecord.repetitions ?? 0),
    )
    .slice(0, 3);
  const hasLoad = summary.maximumActualWeightKilograms !== undefined;

  return (
    <div className="stack-large">
      <PageHeader
        back={back}
        title={exercise.name}
        subtitle={[
          exercise.englishAlias,
          classificationLabel(exercise),
          pluralize(history.length, "sesión", "sesiones"),
        ]
          .filter(Boolean)
          .join(", ")}
      />

      {hasLoad ? (
        <section className={styles.hero}>
          <Figure
            value={formatNumber(
              Math.round(
                summary.estimatedOneRepMaxKilograms ??
                  summary.maximumActualWeightKilograms ??
                  0,
              ),
            )}
            unit={
              summary.estimatedOneRepMaxKilograms !== undefined
                ? "kg de 1RM estimado"
                : "kg de carga máxima"
            }
          />
          <p className="muted small">
            Carga máxima real{" "}
            {formatNumber(summary.maximumActualWeightKilograms)} kg, volumen
            total {formatNumber(Math.round(summary.totalVolumeKilograms))} kg
          </p>
        </section>
      ) : (
        <p className="muted">
          {pluralize(
            summary.completedSetCount,
            "serie registrada",
            "series registradas",
          )}
        </p>
      )}

      {hasLoad ? (
        <section className="section">
          <h2 className="heading">Evolución</h2>
          <LazyProgressChart
            title={`Evolución de ${exercise.name}`}
            data={points}
            series={[
              {
                dataKey: "estimatedOneRepMaxKilograms",
                label: "1RM estimado",
                tone: "olive",
                unit: "kg",
              },
              {
                dataKey: "maximumWeightKilograms",
                label: "Carga máxima",
                tone: "ink",
                unit: "kg",
              },
            ]}
          />
        </section>
      ) : null}

      {bestSets.length > 0 ? (
        <section className="section">
          <h2 className="heading">Mejores series</h2>
          <div className="list">
            {bestSets.map(({ date, setRecord }, index) => (
              <div key={setRecord.setRecordId} className="list-row">
                <div>
                  <strong>{describeSetValues(setRecord)}</strong>
                  <p>{formatShortDate(date)}</p>
                </div>
                {index === 0 ? (
                  <span className="chip bronze">Récord</span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <h2 className="heading">Historial</h2>
        {history.length === 0 ? (
          <p className="muted small">
            Todavía no has hecho este ejercicio en ninguna sesión.
          </p>
        ) : (
          <div>
            {history.map((entry) => (
              <article
                key={entry.movement.exerciseMovementId}
                className={styles.entry}
              >
                <header className={styles.entryHead}>
                  <strong>{formatShortDate(entry.session.sessionDate)}</strong>
                  <span>{entry.block.title}</span>
                </header>
                <div className={styles.setChips}>
                  {entry.sets.length === 0 ? (
                    <span className="muted small">Sin series</span>
                  ) : (
                    entry.sets.map((setRecord) => (
                      <span
                        key={setRecord.setRecordId}
                        className={
                          setRecord.isCompleted ? "chip olive" : "chip"
                        }
                      >
                        {describeSetValues(setRecord) || "Sin datos"}
                      </span>
                    ))
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
