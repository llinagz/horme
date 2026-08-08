"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  describeSet,
  getExerciseProgressPoints,
  getRecordedSets,
} from "@/application/progress";
import { summarizeExercisePerformance } from "@/domain/calculations";
import { formatLocalDate } from "@/domain/dates";
import { exerciseDefinitionRepository } from "@/infrastructure/repositories/exercise-definition-repository";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import { EmptyState, PageHeading, SectionHeading } from "@/components/ui";

const ProgressChart = dynamic(
  () =>
    import("@/components/progress-chart").then(
      (module) => module.ProgressChart,
    ),
  { ssr: false },
);

export function ExerciseScreen() {
  const exerciseDefinitionId =
    useSearchParams().get("exerciseDefinitionId") ?? "";
  const exercise = useLiveQuery(
    async () =>
      (await exerciseDefinitionRepository.list({ includeArchived: true })).find(
        (item) => item.exerciseDefinitionId === exerciseDefinitionId,
      ),
    [exerciseDefinitionId],
  );
  const history = useLiveQuery(
    () => trainingSessionRepository.listExerciseHistory(exerciseDefinitionId),
    [exerciseDefinitionId],
    [],
  );
  const points = useLiveQuery(
    () => getExerciseProgressPoints(exerciseDefinitionId),
    [exerciseDefinitionId],
    [],
  );
  const recordedSets = getRecordedSets(history);
  const summary = summarizeExercisePerformance(recordedSets);
  const bestSets = history
    .flatMap((entry) =>
      getRecordedSets([entry]).map((setRecord) => ({
        date: entry.session.sessionDate,
        setRecord,
      })),
    )
    .toSorted(
      (left, right) =>
        (right.setRecord.weightKilograms ?? 0) -
        (left.setRecord.weightKilograms ?? 0),
    )
    .slice(0, 5);

  if (!exerciseDefinitionId)
    return (
      <EmptyState
        title="Elige un ejercicio"
        description="Abre su ficha desde Progreso."
      />
    );
  if (exercise === undefined)
    return <p className="centered-state">Cargando ficha…</p>;
  if (!exercise)
    return (
      <EmptyState
        title="Ejercicio no encontrado"
        description="Puede que se haya eliminado al restaurar otra copia."
      />
    );

  return (
    <div className="stack-large">
      <PageHeading
        eyebrow={exercise.englishAlias}
        title={exercise.name}
        description={exercise.category.replaceAll("-", " ")}
      />
      <div className="summary-grid three">
        <article className="stat-card">
          <span className="stat-label">Mayor carga</span>
          <strong>
            {summary.maximumActualWeightKilograms ?? "—"}
            <small> kg</small>
          </strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">1RM estimado</span>
          <strong>
            {summary.estimatedOneRepMaxKilograms?.toFixed(1) ?? "—"}
            <small> kg</small>
          </strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Volumen total</span>
          <strong>
            {summary.totalVolumeKilograms.toFixed(0)}
            <small> kg</small>
          </strong>
        </article>
      </div>
      <section className="chart-card">
        <SectionHeading title="Evolución" />
        <ProgressChart
          data={points}
          series={[
            {
              dataKey: "maximumWeightKilograms",
              label: "Carga máxima",
              color: "#526246",
              unit: " kg",
            },
            {
              dataKey: "estimatedOneRepMaxKilograms",
              label: "1RM estimado",
              color: "#9a6a3a",
              unit: " kg",
            },
          ]}
        />
      </section>
      <section>
        <SectionHeading title="Mejores series" />
        {bestSets.length === 0 ? (
          <div className="quiet-card">No hay series completas con datos.</div>
        ) : (
          <div className="list-card">
            {bestSets.map(({ date, setRecord }) => (
              <div className="list-row static" key={setRecord.setRecordId}>
                <span>
                  <strong>{describeSet(setRecord)}</strong>
                  <small>{formatLocalDate(date)}</small>
                </span>
                <span>★</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <section>
        <SectionHeading title="Historial" />
        <div className="list-card">
          {history.map((entry) => (
            <div
              className="history-entry"
              key={entry.movement.exerciseMovementId}
            >
              <strong>{formatLocalDate(entry.session.sessionDate)}</strong>
              <small>{entry.block.title}</small>
              <div>
                {entry.sets.map((setRecord) => (
                  <span
                    className={
                      setRecord.isCompleted ? "set-chip complete" : "set-chip"
                    }
                    key={setRecord.setRecordId}
                  >
                    {describeSet(setRecord)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
